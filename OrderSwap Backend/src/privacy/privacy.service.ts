/**
 * Privacy Service - Production-Grade with Database Persistence
 * 
 * SECURITY FEATURES:
 * - Simulation-based ZK proof verification (Anti-Drain)
 * - BullMQ persistent job scheduling with database tracking
 * - Encrypted cloud backup (non-custodial)
 * - Randomized amount splitting with heuristic-defeating math
 */

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
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Updated job interface with userPublicKey
export interface PrivacyJobData {
    type: 'unshield';
    chunkAmount: number;
    destinationAddress: string;
    commitment: string;
    originalAmount: number;
    chunkIndex: number;
    totalChunks: number;
    userPublicKey: string; // CRITICAL: User's wallet for processor lookup
    dbJobId?: string;      // Database job ID for status updates
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

// Constants
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
        this.logger.log('PrivacyService initialized with database persistence');
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

            const balance = await this.connection.getBalance(this.relayerKeypair.publicKey);
            this.logger.log(`Relayer balance: ${balance / 1e9} SOL`);
        } catch (error) {
            this.logger.error('Failed to load relayer keypair', error);
        }
    }

    // ============================================================================
    // Phase 3: Cloud Backup (Non-Custodial)
    // ============================================================================

    /**
     * Stores an encrypted commitment note for recovery.
     * SECURITY: Backend stores ONLY encrypted blob - cannot decrypt.
     */
    async backupNote(dto: BackupNoteDto): Promise<{ id: string }> {
        const { walletAddress, encryptedNote, noteHash, amount } = dto;

        // Validate wallet address
        try {
            new PublicKey(walletAddress);
        } catch {
            throw new BadRequestException('Invalid wallet address');
        }

        // Check for duplicate
        const existing = await this.prisma.privacyCommitment.findUnique({
            where: { noteHash },
        });

        if (existing) {
            return { id: existing.id };
        }

        // Create backup record
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

    /**
     * Retrieves encrypted commitment notes for a wallet.
     * SECURITY: Returns only encrypted data - user decrypts client-side.
     */
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

    /**
     * Records a privacy transaction for audit trail.
     */
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

    /**
     * Gets transaction history for a wallet.
     */
    async getTransactionHistory(walletAddress: string): Promise<any[]> {
        return this.prisma.privacyTransaction.findMany({
            where: { walletAddress },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    // ============================================================================
    // Relayer Submission with Simulation
    // ============================================================================

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

            // Debug: Log full simulation result
            this.logger.debug('Simulation result:', JSON.stringify({
                err: simulation.value.err,
                unitsConsumed: simulation.value.unitsConsumed,
                logs: simulation.value.logs?.slice(-10), // Last 10 logs
            }, null, 2));

            if (simulation.value.unitsConsumed && simulation.value.unitsConsumed > 400000) {
                this.logger.warn('Transaction uses excessive compute units');
                return false;
            }

            if (simulation.value.err === null) {
                this.logger.log('ZK proof verification PASSED');
                return true;
            }

            // Log detailed error
            this.logger.error('ZK proof verification FAILED:', {
                error: simulation.value.err,
                logs: simulation.value.logs,
            });
            return false;
        } catch (error) {
            this.logger.error('Simulation exception:', error);
            return false;
        }
    }

    // ============================================================================
    // Randomized Transfer Scheduling (with Database Tracking)
    // ============================================================================

    /**
     * Schedules a randomized, chunked transfer.
     * FIXED: Now includes userPublicKey in job data for processor.
     */
    async scheduleRandomizedTransfer(
        amount: number,
        destination: string,
        commitment: string,
        userPublicKey: string, // REQUIRED: User's wallet
        commitmentId?: string,
    ): Promise<{ jobIds: string[]; chunks: number[]; delays: number[] }> {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        // Validate addresses
        try {
            new PublicKey(destination);
            new PublicKey(userPublicKey);
        } catch {
            throw new BadRequestException('Invalid address');
        }

        const chunks = this.splitAmount(amount);
        const jobIds: string[] = [];
        const delays: number[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const delay = this.getRandomDelay();
            delays.push(delay);

            // Create database record first
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

            // Create job with userPublicKey included
            const jobData: PrivacyJobData = {
                type: 'unshield',
                chunkAmount: chunks[i],
                destinationAddress: destination,
                commitment,
                originalAmount: amount,
                chunkIndex: i,
                totalChunks: chunks.length,
                userPublicKey, // CRITICAL: Processor needs this
                dbJobId: dbJob.id,
            };

            const job = await this.privacyQueue.add('process-unshield', jobData, {
                delay,
                attempts: 3,
                backoff: { type: 'exponential', delay: 60000 },
                removeOnComplete: { age: 86400 },
                removeOnFail: false,
            });

            // Update database with BullMQ job ID
            await this.prisma.privacyJob.update({
                where: { id: dbJob.id },
                data: { bullmqJobId: job.id },
            });

            jobIds.push(dbJob.id);

            this.logger.log(
                `Scheduled chunk ${i + 1}/${chunks.length}: ${chunks[i].toFixed(4)} SOL ` +
                `for user ${userPublicKey} with delay ${Math.round(delay / 60000)}m`
            );
        }

        return { jobIds, chunks, delays };
    }

    /**
     * Gets pending jobs for a user.
     */
    async getUserPendingJobs(userPublicKey: string): Promise<any[]> {
        return this.prisma.privacyJob.findMany({
            where: {
                userPublicKey,
                status: { in: ['pending', 'processing'] },
            },
            orderBy: { scheduledAt: 'asc' },
        });
    }

    // ============================================================================
    // Splitter Math
    // ============================================================================

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

    // ============================================================================
    // Legacy methods for existing queue
    // ============================================================================

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
        // Cancel in database
        const dbJob = await this.prisma.privacyJob.findFirst({
            where: { id: jobId, status: 'pending' },
        });

        if (dbJob) {
            await this.prisma.privacyJob.update({
                where: { id: jobId },
                data: { status: 'cancelled' },
            });

            // Cancel in BullMQ if exists
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
