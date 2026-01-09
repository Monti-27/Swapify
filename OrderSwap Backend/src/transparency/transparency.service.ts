import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HeliusService, EnhancedTransaction } from './helius.service';
import { AnalysisService, TransferEdge } from './analysis.service';
import { RiskReportDto, getRiskLevel } from './dto';

@Injectable()
export class TransparencyService {
    private readonly logger = new Logger(TransparencyService.name);

    constructor(
        private prisma: PrismaService,
        private heliusService: HeliusService,
        private analysisService: AnalysisService,
    ) { }

    /**
     * Get cached risk report for a wallet (no fresh scan)
     */
    async getCachedRisk(address: string): Promise<RiskReportDto | null> {
        const wallet = await this.prisma.monitoredWallet.findUnique({
            where: { address },
        });

        if (!wallet) {
            return null;
        }

        return this.toRiskReport(wallet, true);
    }

    /**
     * Trigger a fresh scan and update risk report
     * Uses the new Helius Paid API with incremental scanning
     * 
     * @param address - Wallet address to scan
     * @param options - Optional scan options
     * @param options.limit - Limit number of transactions to fetch (for quick scans)
     */
    async scanWallet(address: string, options?: { limit?: number }): Promise<RiskReportDto> {
        const limit = options?.limit;
        this.logger.log(
            `🔍 Starting scan for wallet: ${address.slice(0, 8)}...` +
            (limit ? ` (quick scan: ${limit} txs)` : '')
        );

        // Check if Helius is available
        if (!this.heliusService.checkAvailability()) {
            throw new Error('Transparency Engine unavailable: HELIUS_API_KEY not configured');
        }

        // Get existing wallet data for checkpoint
        const existingWallet = await this.prisma.monitoredWallet.findUnique({
            where: { address },
        });
        const lastSignature = existingWallet?.lastSignature || null;

        // Fetch new transactions using the Paid API (incremental)
        // Pass limit for quick scan mode
        const fetchResult = await this.heliusService.fetchNewTransactions(
            address,
            lastSignature,
            limit,
        );

        const { transactions } = fetchResult;

        // Handle case where no new transactions
        if (transactions.length === 0 && existingWallet) {
            this.logger.log(`No new transactions found for ${address.slice(0, 8)}...`);
            await this.prisma.monitoredWallet.update({
                where: { address },
                data: { lastScannedAt: new Date() },
            });
            return this.toRiskReport(existingWallet, false);
        }

        // Analyze transactions
        let analysisResult = this.analysisService.analyzeTransactions(transactions);

        // Extract transfer edges for graph analysis
        const edges = this.analysisService.extractTransferEdges(transactions, address);

        // Store edges in graph table
        await this.storeTransferEdges(address, edges);

        // Detect circular transfers from all stored edges
        const allEdges = await this.getAllEdgesForWallet(address);
        const circularCount = this.analysisService.detectCircularTransfers(allEdges, address);

        // Add circular penalty to result
        analysisResult = this.analysisService.addCircularPenalty(analysisResult, circularCount);

        // Compute cumulative metrics if we have existing data
        if (existingWallet) {
            analysisResult.txCount += existingWallet.txCount;
            analysisResult.failedTxCount += existingWallet.failedTxCount;
            analysisResult.burstCount += existingWallet.burstCount;

            // Recalculate TPS as weighted average
            if (existingWallet.txCount > 0 && transactions.length > 0) {
                const totalTxs = existingWallet.txCount + transactions.length;
                analysisResult.avgTps = (
                    (existingWallet.avgTps * existingWallet.txCount) +
                    (analysisResult.avgTps * transactions.length)
                ) / totalTxs;
            }

            // 🔧 Recalculate score with cumulative metrics
            analysisResult = this.analysisService.recalculateFromCumulativeData(analysisResult);
        }

        // Update checkpoint to newest signature (first in array = most recent)
        const newLastSignature = transactions.length > 0
            ? transactions[0].signature
            : lastSignature;

        // Upsert wallet data
        const updatedWallet = await this.prisma.monitoredWallet.upsert({
            where: { address },
            create: {
                address,
                riskScore: analysisResult.riskScore,
                labels: analysisResult.labels,
                lastSignature: newLastSignature,
                txCount: analysisResult.txCount,
                failedTxCount: analysisResult.failedTxCount,
                burstCount: analysisResult.burstCount,
                avgTps: analysisResult.avgTps,
                circularCount: analysisResult.circularCount,
                lastScannedAt: new Date(),
            },
            update: {
                riskScore: analysisResult.riskScore,
                labels: analysisResult.labels,
                lastSignature: newLastSignature,
                txCount: analysisResult.txCount,
                failedTxCount: analysisResult.failedTxCount,
                burstCount: analysisResult.burstCount,
                avgTps: analysisResult.avgTps,
                circularCount: analysisResult.circularCount,
                lastScannedAt: new Date(),
            },
        });

        this.logger.log(
            `✅ Scan complete for ${address.slice(0, 8)}... ` +
            `Score: ${analysisResult.riskScore}, Labels: [${analysisResult.labels.join(', ')}]`
        );

        return this.toRiskReport(updatedWallet, false);
    }

    /**
     * Store transfer edges in the graph table
     * 🚀 OPTIMIZED: Uses batched parallel processing instead of a single transaction
     * This prevents timeout errors and processes thousands of edges in seconds
     */
    private async storeTransferEdges(walletAddress: string, edges: TransferEdge[]): Promise<void> {
        if (edges.length === 0) {
            return;
        }

        const BATCH_SIZE = 50; // Process 50 edges at a time
        const startTime = Date.now();
        let successCount = 0;
        let errorCount = 0;

        try {
            // Step 1: Ensure parent wallet exists FIRST (single upsert, not in transaction)
            await this.prisma.monitoredWallet.upsert({
                where: { address: walletAddress },
                create: {
                    address: walletAddress,
                    riskScore: 0,
                    labels: [],
                    txCount: 0,
                    failedTxCount: 0,
                    burstCount: 0,
                    avgTps: 0,
                    circularCount: 0,
                },
                update: {}, // If exists, do nothing
            });

            // Step 2: Process edges in batches using Promise.all
            for (let i = 0; i < edges.length; i += BATCH_SIZE) {
                const batch = edges.slice(i, i + BATCH_SIZE);

                // Create array of upsert promises for this batch
                const upsertPromises = batch.map(edge =>
                    this.prisma.transactionGraph.upsert({
                        where: { signature: edge.signature },
                        create: {
                            fromAddress: edge.fromAddress,
                            toAddress: edge.toAddress,
                            signature: edge.signature,
                            amount: edge.amount,
                            timestamp: edge.timestamp,
                            walletAddress,
                        },
                        update: {},
                    }).then(() => {
                        successCount++;
                    }).catch((err: any) => {
                        // Silently ignore unique constraint violations
                        if (!err.message?.includes('Unique constraint')) {
                            errorCount++;
                        }
                    })
                );

                // 🚀 Execute batch in parallel!
                await Promise.all(upsertPromises);
            }

            const elapsed = Date.now() - startTime;
            this.logger.debug(
                `⚡ Stored ${successCount}/${edges.length} edges for ${walletAddress.slice(0, 8)}... ` +
                `in ${elapsed}ms (${errorCount} errors)`
            );

        } catch (error: any) {
            this.logger.error(`Failed to store edges: ${error.message}`);
        }
    }

    /**
     * Get all edges for a wallet from the graph table
     */
    private async getAllEdgesForWallet(walletAddress: string): Promise<TransferEdge[]> {
        const edges = await this.prisma.transactionGraph.findMany({
            where: { walletAddress },
            orderBy: { timestamp: 'asc' },
        });

        return edges.map(edge => ({
            fromAddress: edge.fromAddress,
            toAddress: edge.toAddress,
            signature: edge.signature,
            amount: edge.amount || 0,
            timestamp: edge.timestamp,
        }));
    }

    /**
     * Convert Prisma model to RiskReportDto
     */
    private toRiskReport(wallet: any, isCached: boolean): RiskReportDto {
        return {
            address: wallet.address,
            riskScore: wallet.riskScore,
            riskLevel: getRiskLevel(wallet.riskScore),
            labels: wallet.labels,
            txCount: wallet.txCount,
            failedTxCount: wallet.failedTxCount,
            burstCount: wallet.burstCount,
            avgTps: wallet.avgTps,
            circularCount: wallet.circularCount,
            lastScannedAt: wallet.lastScannedAt,
            isCached,
        };
    }
}
