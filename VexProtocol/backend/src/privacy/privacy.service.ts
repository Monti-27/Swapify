import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
    Connection,
    VersionedTransaction,
    Keypair,
    PublicKey,
    SendTransactionError
} from '@solana/web3.js';
import { createRpc, Rpc } from '@lightprotocol/stateless.js';
import bs58 from 'bs58';
import { PrismaService } from '../prisma/prisma.service';

export interface PrivacyJobData {
    type: 'unshield';
    chunkAmount: number;
    destinationAddress: string;
    commitment: string;
    originalAmount: number;
    chunkIndex: number;
    totalChunks: number;
    userPublicKey: string;
    dbJobId?: string;
}

export interface RelayerSubmission {
    transaction: string;
    proof: string;
}

export interface BackupNoteDto {
    walletAddress: string;
    encryptedNote: string;
    noteHash: string;
    amount: number;
}

export interface RecordTransactionDto {
    walletAddress: string;
    type: 'shield' | 'unshield';
    amount: number;
    txSignature?: string;
    destinationAddress?: string;
    commitmentId?: string;
}

const RELAYER_FEE_LAMPORTS = 5000;
const MIN_CHUNK_SIZE_SOL = 0.01;

@Injectable()
export class PrivacyService implements OnModuleInit {
    private readonly logger = new Logger(PrivacyService.name);
    private connection: Connection;
    private lightRpc: Rpc;
    private relayerKeypair: Keypair | null = null;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
        @InjectQueue('privacy') private privacyQueue: Queue<PrivacyJobData>,
    ) {
        const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL');

        if (!rpcUrl) {
            throw new Error('SOLANA_RPC_URL is required');
        }

        this.connection = new Connection(rpcUrl, 'confirmed');
        this.lightRpc = createRpc(rpcUrl, rpcUrl);
    }

    async onModuleInit() {
        await this.loadRelayerKeypair();
        this.logger.log('PrivacyService initialized for VexProtocol');
    }

    private async loadRelayerKeypair(): Promise<void> {
        const privateKeyBase58 = this.configService.get<string>('RELAYER_PRIVATE_KEY');

        if (!privateKeyBase58) {
            this.logger.warn('RELAYER_PRIVATE_KEY not set - relayer signing disabled');
            return;
        }

        try {
            const privateKeyBytes = bs58.decode(privateKeyBase58);
            this.relayerKeypair = Keypair.fromSecretKey(privateKeyBytes);
            this.logger.log(`Relayer keypair loaded: ${this.relayerKeypair.publicKey.toBase58()}`);
        } catch (error) {
            this.logger.error('Failed to load relayer keypair', error);
        }
    }

    async backupNote(dto: BackupNoteDto): Promise<{ id: string }> {
        const { walletAddress, encryptedNote, noteHash, amount } = dto;

        try {
            new PublicKey(walletAddress);
        } catch {
            throw new BadRequestException('Invalid wallet address');
        }

        const existing = await this.prisma.privacyCommitment.findUnique({
            where: { noteHash },
        });

        if (existing) {
            return { id: existing.id };
        }

        const commitment = await this.prisma.privacyCommitment.create({
            data: {
                walletAddress,
                encryptedNote,
                noteHash,
                amount,
                isRedeemed: false,
            },
        });

        this.logger.log(`Backed up commitment note for ${walletAddress}: ${commitment.id}`);
        return { id: commitment.id };
    }

    async getBackedUpNotes(walletAddress: string): Promise<any[]> {
        const notes = await this.prisma.privacyCommitment.findMany({
            where: { walletAddress, isRedeemed: false },
            orderBy: { createdAt: 'desc' },
        });

        return notes.map(n => ({
            id: n.id,
            encryptedNote: n.encryptedNote,
            amount: n.amount,
            createdAt: n.createdAt,
        }));
    }

    async recordTransaction(dto: RecordTransactionDto): Promise<{ id: string }> {
        const { walletAddress, type, amount, txSignature, destinationAddress, commitmentId } = dto;

        const transaction = await this.prisma.privacyTransaction.create({
            data: {
                walletAddress,
                type,
                amount,
                txSignature,
                destinationAddress,
                commitmentId,
                status: txSignature ? 'confirmed' : 'pending',
                confirmedAt: txSignature ? new Date() : null,
            },
        });

        this.logger.log(`Recorded ${type} transaction for ${walletAddress}: ${transaction.id}`);
        return { id: transaction.id };
    }

    async getTransactionHistory(walletAddress: string): Promise<any[]> {
        return this.prisma.privacyTransaction.findMany({
            where: { walletAddress },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async submitWithRelayer(submission: RelayerSubmission): Promise<{ signature: string }> {
        this.logger.log('Processing relayer submission');

        let transaction: VersionedTransaction;
        try {
            const txBuffer = Buffer.from(submission.transaction, 'base64');
            transaction = VersionedTransaction.deserialize(txBuffer);
        } catch (error) {
            throw new BadRequestException('Invalid transaction format');
        }

        const isValidProof = await this.verifyZkProof(transaction);

        if (!isValidProof) {
            throw new BadRequestException('Invalid ZK proof - simulation failed');
        }

        if (!this.relayerKeypair) {
            throw new BadRequestException('Relayer keypair not configured');
        }

        transaction.sign([this.relayerKeypair]);

        let signature: string;
        try {
            signature = await this.connection.sendRawTransaction(transaction.serialize(), {
                maxRetries: 5,
                preflightCommitment: 'confirmed',
                skipPreflight: false,
            });
        } catch (error) {
            if (error instanceof SendTransactionError) {
                this.logger.error(`Transaction send failed: ${error.message}`, error.logs);
            }
            throw new BadRequestException('Failed to broadcast transaction');
        }

        const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
            throw new BadRequestException('Transaction failed on-chain');
        }

        this.logger.log(`Transaction confirmed: ${signature}`);
        return { signature };
    }

    private async verifyZkProof(transaction: VersionedTransaction): Promise<boolean> {
        try {
            const simulation = await this.connection.simulateTransaction(transaction, {
                sigVerify: false,
                replaceRecentBlockhash: true,
                commitment: 'confirmed',
            });

            if (simulation.value.unitsConsumed && simulation.value.unitsConsumed > 400000) {
                return false;
            }

            if (simulation.value.err === null) {
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    async scheduleRandomizedTransfer(
        amount: number,
        destination: string,
        commitment: string,
        userPublicKey: string,
        commitmentId?: string,
    ): Promise<{ jobIds: string[]; chunks: number[]; delays: number[] }> {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        const chunks = this.splitAmount(amount);
        const jobIds: string[] = [];
        const delays: number[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const delay = this.getRandomDelay();
            delays.push(delay);

            const dbJob = await this.prisma.privacyJob.create({
                data: {
                    userPublicKey,
                    commitmentId,
                    chunkAmount: chunks[i],
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    destinationAddress: destination,
                    delayMs: delay,
                    status: 'pending',
                },
            });

            const jobData: PrivacyJobData = {
                type: 'unshield',
                chunkAmount: chunks[i],
                destinationAddress: destination,
                commitment,
                originalAmount: amount,
                chunkIndex: i,
                totalChunks: chunks.length,
                userPublicKey,
                dbJobId: dbJob.id,
            };

            const job = await this.privacyQueue.add('process-unshield', jobData, {
                delay,
                attempts: 3,
                backoff: { type: 'exponential', delay: 60000 },
                removeOnComplete: { age: 86400 },
                removeOnFail: false,
            });

            await this.prisma.privacyJob.update({
                where: { id: dbJob.id },
                data: { bullmqJobId: job.id },
            });

            jobIds.push(dbJob.id);
        }

        return { jobIds, chunks, delays };
    }

    async getUserPendingJobs(userPublicKey: string): Promise<any[]> {
        return this.prisma.privacyJob.findMany({
            where: {
                userPublicKey,
                status: { in: ['pending', 'processing'] },
            },
            orderBy: { scheduledAt: 'asc' },
        });
    }

    private splitAmount(totalAmount: number): number[] {
        const numChunks = Math.floor(Math.random() * 3) + 3;
        const totalFees = numChunks * (RELAYER_FEE_LAMPORTS / 1e9);
        const availableAmount = totalAmount - totalFees;

        if (availableAmount < MIN_CHUNK_SIZE_SOL * numChunks) {
            return [parseFloat(availableAmount.toFixed(4))];
        }

        const chunks: number[] = [];
        let remaining = availableAmount;

        for (let i = 0; i < numChunks - 1; i++) {
            const pct = Math.random() * 0.5 + 0.1;
            let chunk = Math.max(remaining * pct, MIN_CHUNK_SIZE_SOL);
            chunk = parseFloat((chunk + (Math.random() - 0.5) * 0.005).toFixed(4));
            chunk = Math.min(chunk, remaining - MIN_CHUNK_SIZE_SOL);

            if (chunk > 0) {
                chunks.push(chunk);
                remaining = parseFloat((remaining - chunk).toFixed(4));
            }
        }

        if (remaining > 0) {
            chunks.push(parseFloat(remaining.toFixed(4)));
        }

        this.shuffleArray(chunks);
        return chunks;
    }

    private getRandomDelay(): number {
        const isDev = this.configService.get('NODE_ENV') === 'development';

        if (isDev) {
            return Math.floor(Math.random() * 50000 + 10000);
        }

        const baseHours = Math.random() * 22 + 2;
        const noiseMin = (Math.random() - 0.5) * 60;
        return Math.floor((baseHours * 60 + noiseMin) * 60 * 1000);
    }

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async getPendingJobs(): Promise<any[]> {
        const waiting = await this.privacyQueue.getWaiting();
        const delayed = await this.privacyQueue.getDelayed();
        const active = await this.privacyQueue.getActive();

        return [
            ...waiting.map(j => ({ ...j.data, status: 'waiting', id: j.id })),
            ...delayed.map(j => ({ ...j.data, status: 'delayed', id: j.id })),
            ...active.map(j => ({ ...j.data, status: 'active', id: j.id })),
        ];
    }

    async cancelJob(jobId: string): Promise<boolean> {
        const dbJob = await this.prisma.privacyJob.findFirst({
            where: { id: jobId, status: 'pending' },
        });

        if (dbJob) {
            await this.prisma.privacyJob.update({
                where: { id: jobId },
                data: { status: 'cancelled' },
            });

            if (dbJob.bullmqJobId) {
                const job = await this.privacyQueue.getJob(dbJob.bullmqJobId);
                if (job) {
                    await job.remove();
                }
            }

            return true;
        }

        return false;
    }
}
