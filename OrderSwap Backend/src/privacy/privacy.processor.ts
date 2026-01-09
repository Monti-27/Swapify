/**
 * Privacy Processor - BullMQ Worker (FIXED)
 * 
 * CRITICAL FIX: Now uses USER's public key to find compressed accounts,
 * not the relayer's. The relayer only signs as fee-payer.
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createRpc, Rpc, LightSystemProgram, bn, selectMinCompressedSolAccountsForTransfer, buildAndSignTx } from '@lightprotocol/stateless.js';
import bs58 from 'bs58';
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
    userPublicKey: string; // CRITICAL: User's wallet for account lookup
    dbJobId?: string;      // Database job ID for status updates
}

@Processor('privacy')
export class PrivacyProcessor extends WorkerHost {
    private readonly logger = new Logger(PrivacyProcessor.name);
    private connection: Connection;
    private lightRpc: Rpc;
    private relayerKeypair: Keypair | null = null;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        super();

        const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL');
        if (!rpcUrl) {
            throw new Error('SOLANA_RPC_URL is required');
        }

        this.connection = new Connection(rpcUrl, 'confirmed');
        this.lightRpc = createRpc(rpcUrl, rpcUrl);

        this.loadRelayerKeypair();
    }

    private loadRelayerKeypair(): void {
        const privateKeyBase58 = this.configService.get<string>('RELAYER_PRIVATE_KEY');

        if (privateKeyBase58) {
            try {
                const privateKeyBytes = bs58.decode(privateKeyBase58);
                this.relayerKeypair = Keypair.fromSecretKey(privateKeyBytes);
                this.logger.log(`Worker loaded relayer keypair: ${this.relayerKeypair.publicKey.toBase58()}`);
            } catch (error) {
                this.logger.error('Failed to load relayer keypair in worker', error);
            }
        }
    }

    /**
     * Main job processor - handles unshield operations.
     */
    async process(job: Job<PrivacyJobData>): Promise<{ signature: string }> {
        const { type, chunkAmount, destinationAddress, chunkIndex, totalChunks, userPublicKey, dbJobId } = job.data;

        this.logger.log(
            `Processing job ${job.id}: ${type} - ` +
            `Chunk ${chunkIndex + 1}/${totalChunks}: ${chunkAmount} SOL ` +
            `from ${userPublicKey} to ${destinationAddress}`
        );

        // Update database status to processing
        if (dbJobId) {
            await this.updateJobStatus(dbJobId, 'processing');
        }

        if (type !== 'unshield') {
            throw new Error(`Unknown job type: ${type}`);
        }

        try {
            const result = await this.processUnshield(job.data);

            // Update database status to completed
            if (dbJobId) {
                await this.updateJobStatus(dbJobId, 'completed', result.signature);
            }

            return result;
        } catch (error: any) {
            // Update database status to failed
            if (dbJobId) {
                await this.updateJobStatus(dbJobId, 'failed', undefined, error.message);
            }
            throw error;
        }
    }

    /**
     * FIXED: Fetches compressed accounts owned by the USER, not the relayer.
     * The relayer only signs as fee-payer.
     */
    private async processUnshield(data: PrivacyJobData): Promise<{ signature: string }> {
        const { chunkAmount, destinationAddress, userPublicKey } = data;

        if (!this.relayerKeypair) {
            throw new Error('Relayer keypair not configured');
        }

        // CRITICAL FIX: Use USER's public key, not relayer's
        const userPubkey = new PublicKey(userPublicKey);
        const destination = new PublicKey(destinationAddress);
        const lamports = Math.floor(chunkAmount * 1e9);

        try {
            // FIXED: Fetch compressed accounts owned by the USER
            this.logger.log(`Fetching compressed accounts for user: ${userPublicKey}`);
            const compressedAccounts = await this.lightRpc.getCompressedAccountsByOwner(userPubkey);

            if (!compressedAccounts || compressedAccounts.items.length === 0) {
                throw new Error(`No compressed accounts found for user ${userPublicKey}`);
            }

            this.logger.log(`Found ${compressedAccounts.items.length} compressed accounts for user`);

            // Select accounts for transfer
            const [selectedAccounts] = selectMinCompressedSolAccountsForTransfer(
                compressedAccounts.items,
                bn(lamports)
            );

            if (!selectedAccounts || selectedAccounts.length === 0) {
                throw new Error('Insufficient compressed balance for unshielding');
            }

            // Get validity proof
            const proof = await this.lightRpc.getValidityProof(
                selectedAccounts.map(acc => bn(acc.hash))
            );

            // Create decompress instruction
            // NOTE: User is the owner of compressed accounts, relayer pays fees
            const decompressInstruction = await LightSystemProgram.decompress({
                payer: this.relayerKeypair.publicKey, // Relayer pays fees
                toAddress: destination,
                lamports: bn(lamports),
                inputCompressedAccounts: selectedAccounts,
                recentValidityProof: proof.compressedProof,
                recentInputStateRootIndices: proof.rootIndices,
            });

            // Build and sign transaction
            const { blockhash } = await this.lightRpc.getLatestBlockhash();

            const transaction = buildAndSignTx(
                [decompressInstruction],
                this.relayerKeypair,
                blockhash,
                [this.relayerKeypair]
            );

            // Send transaction
            const signature = await this.connection.sendTransaction(transaction, {
                maxRetries: 5,
                preflightCommitment: 'confirmed',
            });

            // Confirm transaction
            const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            this.logger.log(`Unshield successful: ${signature}`);
            return { signature };

        } catch (error: any) {
            this.logger.error(`Unshield failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Updates job status in the database.
     */
    private async updateJobStatus(
        jobId: string,
        status: string,
        txSignature?: string,
        error?: string
    ): Promise<void> {
        try {
            await this.prisma.privacyJob.update({
                where: { id: jobId },
                data: {
                    status,
                    txSignature,
                    error,
                    processedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
                },
            });
        } catch (err) {
            this.logger.error(`Failed to update job status: ${err}`);
        }
    }

    // ============================================================================
    // Worker Event Handlers
    // ============================================================================

    @OnWorkerEvent('completed')
    onCompleted(job: Job<PrivacyJobData>) {
        const { chunkAmount, destinationAddress, chunkIndex, totalChunks, userPublicKey } = job.data;
        this.logger.log(
            `✅ Job ${job.id} completed: ` +
            `Chunk ${chunkIndex + 1}/${totalChunks} - ${chunkAmount} SOL ` +
            `from ${userPublicKey} to ${destinationAddress}`
        );
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<PrivacyJobData>, error: Error) {
        const { chunkAmount, chunkIndex, totalChunks } = job.data;
        this.logger.error(
            `❌ Job ${job.id} failed: ` +
            `Chunk ${chunkIndex + 1}/${totalChunks} - ${chunkAmount} SOL`,
            error.message
        );
    }

    @OnWorkerEvent('active')
    onActive(job: Job<PrivacyJobData>) {
        const { chunkAmount, chunkIndex, totalChunks, userPublicKey } = job.data;
        this.logger.log(
            `⚡ Job ${job.id} started: ` +
            `Chunk ${chunkIndex + 1}/${totalChunks} - ${chunkAmount} SOL from ${userPublicKey}`
        );
    }
}
