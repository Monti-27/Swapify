import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { BirdeyeService } from '../birdeye/birdeye.service';
import { TransparencyService } from './transparency.service';
import { ClusterMode, ClusterResultDto, ClusterWalletDto } from './dto/cluster.dto';

// SSE Event Types
export interface ClusterStreamEvent {
    type: 'INIT' | 'TOKEN_FETCHED' | 'INTERSECTION' | 'WALLET' | 'DONE' | 'ERROR';
    data: any;
}

@Injectable()
export class ClusterService {
    private readonly logger = new Logger(ClusterService.name);

    // Configuration for hybrid analysis
    // Birdeye returns pre-indexed top 500 holders - instant!
    private readonly TOP_HOLDERS_LIMIT = 500;
    // Limit risk scans to prevent Helius credit exhaustion
    private readonly MAX_RISK_SCANS = 50;

    constructor(
        private birdeyeService: BirdeyeService,
        private transparencyService: TransparencyService,
    ) { }

    /**
     * Stream mutual wallet discovery using HYBRID architecture:
     * - Birdeye: Fast top-holder discovery (pre-indexed, instant)
     * - Helius: Deep risk analysis on mutual whales only
     */
    streamMutualWallets(mints: string[], mode: ClusterMode): Observable<ClusterStreamEvent> {
        const subject = new Subject<ClusterStreamEvent>();

        // Run analysis in background
        this.runHybridAnalysis(subject, mints, mode);

        return subject.asObservable();
    }

    /**
     * Hybrid Analysis: Birdeye Discovery + Helius Deep Scan
     */
    private async runHybridAnalysis(
        subject: Subject<ClusterStreamEvent>,
        mints: string[],
        mode: ClusterMode,
    ): Promise<void> {
        this.logger.log(`Starting HYBRID cluster analysis for ${mints.length} tokens`);
        this.logger.log(`Strategy: Birdeye (Top Holders) -> Fuzzy Overlap -> Helius (Risk Scan)`);

        const stats = {
            holdersPerToken: {} as Record<string, number>,
            intersectionSize: 0,
            scannedCount: 0,
            cachedCount: 0,
            skippedCount: 0,
        };

        try {
            // Emit INIT event
            subject.next({
                type: 'INIT',
                data: {
                    tokenCount: mints.length,
                    mints,
                    mode,
                    strategy: 'HYBRID_BIRDEYE_HELIUS',
                },
            });

            // ============================================================
            // STEP 1: BIRDEYE DISCOVERY - Get top holders for each token
            // This is instant because Birdeye has pre-indexed holder data
            // ============================================================
            const holderSets: Set<string>[] = [];

            for (const mint of mints) {
                this.logger.log(`Fetching top ${this.TOP_HOLDERS_LIMIT} holders for ${mint.slice(0, 8)}...`);

                const holders = await this.birdeyeService.getTopHolders(mint, this.TOP_HOLDERS_LIMIT);
                stats.holdersPerToken[mint] = holders.length;

                if (holders.length === 0) {
                    this.logger.warn(`No holders found for ${mint.slice(0, 8)}... - Token may not exist on Birdeye`);
                }

                holderSets.push(new Set(holders));

                // Emit TOKEN_FETCHED event
                subject.next({
                    type: 'TOKEN_FETCHED',
                    data: {
                        mint,
                        count: holders.length,
                        source: 'BIRDEYE_TOP_HOLDERS',
                    },
                });
            }

            // ============================================================
            // STEP 2: FUZZY OVERLAP - Find wallets appearing in 2+ tokens
            // Uses frequency counting instead of strict intersection
            // ============================================================
            const overlappingWallets = this.calculateFuzzyOverlap(holderSets);
            stats.intersectionSize = overlappingWallets.length;

            this.logger.log(`Found ${overlappingWallets.length} overlapping wallets (in 2+ tokens)`);

            // Emit INTERSECTION event
            subject.next({
                type: 'INTERSECTION',
                data: {
                    mutualWalletCount: overlappingWallets.length,
                    message: overlappingWallets.length > 0
                        ? `Found ${overlappingWallets.length} wallets appearing in 2+ tokens`
                        : 'No overlapping wallets found - these tokens have distinct holder bases',
                },
            });

            // ============================================================
            // STEP 3: HELIUS DEEP SCAN - Analyze mutual whales IN PARALLEL
            // Each wallet emits its result immediately when ready
            // ============================================================
            this.logger.log(`Starting PARALLEL risk analysis for ${overlappingWallets.length} wallets...`);
            const startTime = Date.now();

            // Track stats with atomic counters
            let scannedCount = 0;
            let cachedCount = 0;
            let skippedCount = 0;

            // Define the analysis task for a single wallet
            const analyzeWallet = async (walletInfo: { address: string; overlapCount: number }, index: number): Promise<void> => {
                const { address, overlapCount } = walletInfo;
                try {
                    // Try cached risk first (free!)
                    const cachedRisk = await this.transparencyService.getCachedRisk(address);

                    let walletData: ClusterWalletDto;

                    if (cachedRisk) {
                        walletData = {
                            address,
                            riskScore: cachedRisk.riskScore,
                            riskLevel: cachedRisk.riskLevel,
                            labels: cachedRisk.labels,
                            isCached: true,
                            scanSkipped: false,
                        };
                        cachedCount++;
                    } else if (scannedCount < this.MAX_RISK_SCANS) {
                        // 🚀 QUICK SCAN: Only fetch 100 transactions for speed
                        this.logger.debug(`🔍 Quick scanning whale ${address.slice(0, 8)}... (limit: 100 txs)`);
                        const freshRisk = await this.transparencyService.scanWallet(address, { limit: 100 });
                        walletData = {
                            address,
                            riskScore: freshRisk.riskScore,
                            riskLevel: freshRisk.riskLevel,
                            labels: freshRisk.labels,
                            isCached: false,
                            scanSkipped: false,
                        };
                        scannedCount++;
                    } else {
                        // Scan limit reached - skip but still report
                        walletData = {
                            address,
                            riskScore: -1,
                            riskLevel: 'UNKNOWN',
                            labels: [],
                            isCached: false,
                            scanSkipped: true,
                        };
                        skippedCount++;
                    }

                    // 🚀 Emit WALLET event IMMEDIATELY when this wallet finishes
                    subject.next({
                        type: 'WALLET',
                        data: { ...walletData, index },
                    });

                } catch (error: any) {
                    this.logger.warn(`Failed to analyze whale ${address.slice(0, 8)}...: ${error.message}`);

                    subject.next({
                        type: 'WALLET',
                        data: {
                            address,
                            riskScore: -1,
                            riskLevel: 'ERROR',
                            labels: [],
                            isCached: false,
                            scanSkipped: true,
                            index,
                        },
                    });
                    skippedCount++;
                }
            };

            // Execute ALL analysis tasks in PARALLEL
            await Promise.all(
                overlappingWallets.map((walletInfo, idx) => analyzeWallet(walletInfo, idx + 1))
            );

            const elapsed = Date.now() - startTime;
            this.logger.log(`Parallel analysis completed in ${elapsed}ms`);

            // Update stats
            stats.scannedCount = scannedCount;
            stats.cachedCount = cachedCount;
            stats.skippedCount = skippedCount;

            // Emit DONE event
            this.logger.log(
                `Hybrid analysis complete: ${overlappingWallets.length} overlapping wallets ` +
                `(${stats.cachedCount} cached, ${stats.scannedCount} scanned, ${stats.skippedCount} skipped)`
            );

            subject.next({
                type: 'DONE',
                data: {
                    tokenCount: mints.length,
                    mutualWalletCount: overlappingWallets.length,
                    stats,
                    strategy: 'HYBRID_BIRDEYE_HELIUS',
                },
            });

            subject.complete();

        } catch (error: any) {
            this.logger.error(`Hybrid analysis failed: ${error.message}`);
            subject.next({
                type: 'ERROR',
                data: { message: error.message },
            });
            subject.complete();
        }
    }

    /**
     * Batch method (kept for backward compatibility with POST endpoint)
     */
    async findMutualWallets(
        mints: string[],
        mode: ClusterMode,
    ): Promise<ClusterResultDto> {
        this.logger.log(`🎯 Starting HYBRID batch analysis for ${mints.length} tokens`);

        const stats = {
            addressesPerToken: {} as Record<string, number>,
            intersectionSize: 0,
            scannedCount: 0,
            cachedCount: 0,
            skippedCount: 0,
        };

        // Step 1: Birdeye discovery
        const holderSets: Set<string>[] = [];

        for (const mint of mints) {
            const holders = await this.birdeyeService.getTopHolders(mint, this.TOP_HOLDERS_LIMIT);
            stats.addressesPerToken[mint] = holders.length;
            holderSets.push(new Set(holders));
        }


        // Step 2: Fuzzy Overlap (wallets in 2+ tokens)
        const overlappingWallets = this.calculateFuzzyOverlap(holderSets);
        stats.intersectionSize = overlappingWallets.length;

        // Step 3: Helius deep scan
        const walletResults: ClusterWalletDto[] = [];

        for (const { address } of overlappingWallets) {
            try {
                const cachedRisk = await this.transparencyService.getCachedRisk(address);

                if (cachedRisk) {
                    walletResults.push({
                        address,
                        riskScore: cachedRisk.riskScore,
                        riskLevel: cachedRisk.riskLevel,
                        labels: cachedRisk.labels,
                        isCached: true,
                        scanSkipped: false,
                    });
                    stats.cachedCount++;
                } else if (stats.scannedCount < this.MAX_RISK_SCANS) {
                    const freshRisk = await this.transparencyService.scanWallet(address, { limit: 100 });
                    walletResults.push({
                        address,
                        riskScore: freshRisk.riskScore,
                        riskLevel: freshRisk.riskLevel,
                        labels: freshRisk.labels,
                        isCached: false,
                        scanSkipped: false,
                    });
                    stats.scannedCount++;
                } else {
                    walletResults.push({
                        address,
                        riskScore: -1,
                        riskLevel: 'UNKNOWN',
                        labels: [],
                        isCached: false,
                        scanSkipped: true,
                    });
                    stats.skippedCount++;
                }
            } catch (error: any) {
                walletResults.push({
                    address,
                    riskScore: -1,
                    riskLevel: 'ERROR',
                    labels: [],
                    isCached: false,
                    scanSkipped: true,
                });
                stats.skippedCount++;
            }
        }

        // Sort by risk score descending
        walletResults.sort((a, b) => {
            if (a.riskScore === -1 && b.riskScore === -1) return 0;
            if (a.riskScore === -1) return 1;
            if (b.riskScore === -1) return -1;
            return b.riskScore - a.riskScore;
        });

        return {
            tokenCount: mints.length,
            mints,
            mode,
            mutualWalletCount: overlappingWallets.length,
            wallets: walletResults,
            stats,
        };
    }

    /**
     * Calculate FUZZY overlap using frequency counting
     * Returns wallets appearing in 2+ token lists, sorted by overlap count descending
     */
    private calculateFuzzyOverlap(sets: Set<string>[]): { address: string; overlapCount: number }[] {
        if (sets.length === 0) return [];
        if (sets.length === 1) {
            return Array.from(sets[0]).map(addr => ({ address: addr, overlapCount: 1 }));
        }

        // Count how many times each wallet appears across all token lists
        const frequencyMap = new Map<string, number>();

        for (const set of sets) {
            for (const address of set) {
                frequencyMap.set(address, (frequencyMap.get(address) || 0) + 1);
            }
        }

        // Filter: Keep wallets that appear in 2+ tokens
        const overlappingWallets: { address: string; overlapCount: number }[] = [];

        for (const [address, count] of frequencyMap) {
            if (count >= 2) {
                overlappingWallets.push({ address, overlapCount: count });
            }
        }

        // Sort by overlap count descending (highest overlap = most suspicious)
        overlappingWallets.sort((a, b) => b.overlapCount - a.overlapCount);

        return overlappingWallets;
    }
}
