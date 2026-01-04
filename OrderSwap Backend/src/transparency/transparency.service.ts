import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HeliusService } from './helius.service';
import { AnalysisService, TransferEdge } from './analysis.service';
import { RiskReportDto, getRiskLevel } from './dto';

@Injectable()
export class TransparencyService {
    private readonly logger = new Logger(TransparencyService.name);

    // Maximum signatures to fetch per scan (to limit API usage)
    private readonly MAX_SIGNATURES_PER_SCAN = 500;

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
     */
    async scanWallet(address: string): Promise<RiskReportDto> {
        this.logger.log(`🔍 Starting scan for wallet: ${address.slice(0, 8)}...`);

        // Check if Helius is available
        if (!this.heliusService.checkAvailability()) {
            throw new Error('Transparency Engine unavailable: HELIUS_API_KEY not configured');
        }

        // Get existing wallet data for checkpoint
        const existingWallet = await this.prisma.monitoredWallet.findUnique({
            where: { address },
        });
        const lastSignature = existingWallet?.lastSignature || null;

        // Fetch new signatures (incremental)
        const signatures = await this.heliusService.fetchSignatures(
            address,
            lastSignature,
            this.MAX_SIGNATURES_PER_SCAN,
        );

        if (signatures.length === 0 && existingWallet) {
            this.logger.log(`No new transactions found for ${address.slice(0, 8)}...`);
            // Update scan timestamp but keep existing data
            await this.prisma.monitoredWallet.update({
                where: { address },
                data: { lastScannedAt: new Date() },
            });
            return this.toRiskReport(existingWallet, false);
        }

        // Analyze signatures
        let analysisResult = this.analysisService.analyzeSignatures(signatures);

        // Fetch enhanced transactions for circular transfer detection
        const signatureStrings = signatures.map(s => s.signature);
        const enhancedTxs = await this.heliusService.getEnhancedTransactions(signatureStrings);

        // Extract transfer edges
        const edges = this.analysisService.extractTransferEdges(enhancedTxs, address);

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
            if (existingWallet.txCount > 0 && analysisResult.txCount > 0) {
                const totalTxs = existingWallet.txCount + signatures.length;
                analysisResult.avgTps = (
                    (existingWallet.avgTps * existingWallet.txCount) +
                    (analysisResult.avgTps * signatures.length)
                ) / totalTxs;
            }

            // 🔧 FIX: Recalculate score with cumulative metrics
            analysisResult = this.analysisService.recalculateFromCumulativeData(analysisResult);
        }

        // Update checkpoint to newest signature
        const newLastSignature = signatures.length > 0 ? signatures[0].signature : lastSignature;

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

        this.logger.log(`✅ Scan complete for ${address.slice(0, 8)}... - Score: ${analysisResult.riskScore}`);

        return this.toRiskReport(updatedWallet, false);
    }

    /**
     * Store transfer edges in the graph table
     */
    private async storeTransferEdges(walletAddress: string, edges: TransferEdge[]): Promise<void> {
        if (edges.length === 0) {
            return;
        }

        // Use upsert to avoid duplicates (signature is unique)
        for (const edge of edges) {
            try {
                await this.prisma.transactionGraph.upsert({
                    where: { signature: edge.signature },
                    create: {
                        fromAddress: edge.fromAddress,
                        toAddress: edge.toAddress,
                        signature: edge.signature,
                        amount: edge.amount,
                        timestamp: edge.timestamp,
                        walletAddress,
                    },
                    update: {}, // No update needed if exists
                });
            } catch (error) {
                // Ignore duplicate errors
                if (!error.message?.includes('Unique constraint')) {
                    this.logger.warn(`Failed to store edge: ${error.message}`);
                }
            }
        }

        this.logger.debug(`Stored ${edges.length} transfer edges`);
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
