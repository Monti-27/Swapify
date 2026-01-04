import { Injectable, Logger } from '@nestjs/common';
import { HeliusSignature, HeliusEnhancedTransaction } from './helius.service';

export interface AnalysisResult {
    riskScore: number;
    labels: string[];
    txCount: number;
    failedTxCount: number;
    burstCount: number;
    avgTps: number;
    circularCount: number;
}

export interface TransferEdge {
    fromAddress: string;
    toAddress: string;
    signature: string;
    amount: number;
    timestamp: Date;
}

@Injectable()
export class AnalysisService {
    private readonly logger = new Logger(AnalysisService.name);

    // ============================================================
    // 🎯 SCORING WEIGHTS (Tuned for Bot Detection)
    // ============================================================
    private readonly SCORE_WEIGHTS = {
        // TPS Scoring (Tiered)
        TPS_MEDIUM: 20,         // TPS > 0.5
        TPS_HIGH: 50,           // TPS > 2.0

        // Burst Scoring
        BURST_PENALTY: 2,       // Per burst
        BURST_MAX: 40,          // Maximum burst contribution

        // Failure Scoring
        FAILURE_PENALTY: 5,     // Per failed tx
        FAILURE_MAX: 20,        // Maximum failure contribution

        // Circular Transfer (Sybil)
        CIRCULAR_PENALTY: 25,   // Per circular pattern
    };

    // Thresholds for labeling
    private readonly THRESHOLDS = {
        TPS_MEDIUM: 0.5,         // TPS threshold for "elevated"
        TPS_HIGH: 2.0,           // TPS threshold for "high"
        BURST_MIN_FOR_LABEL: 5,  // Minimum bursts for HIGH_BURSTS label
        FAILURE_MIN_FOR_LABEL: 3, // Minimum failures for HIGH_FAILURES label
        SNIPER_BURST_MIN: 10,    // Minimum bursts for sniper label
        SNIPER_TPS_MIN: 0.3,     // Minimum TPS for sniper label
        BOT_SCORE_MIN: 50,       // Minimum score for BOT label
    };

    /**
     * Analyze transaction signatures and calculate risk metrics
     */
    analyzeSignatures(signatures: HeliusSignature[]): AnalysisResult {
        if (signatures.length === 0) {
            return this.createEmptyResult();
        }

        const txCount = signatures.length;
        const failedTxCount = signatures.filter(sig => sig.err !== null).length;
        const burstCount = this.detectBursts(signatures);
        const avgTps = this.calculateTps(signatures);

        // Calculate risk score using the new tuned weights
        const { riskScore, labels } = this.calculateRiskScore(
            avgTps,
            burstCount,
            failedTxCount,
            0, // circularCount - calculated separately
        );

        this.logger.log(
            `📊 Analysis: txCount=${txCount}, bursts=${burstCount}, failures=${failedTxCount}, ` +
            `TPS=${avgTps.toFixed(4)}, score=${riskScore}, labels=[${labels.join(', ')}]`
        );

        return {
            riskScore,
            labels,
            txCount,
            failedTxCount,
            burstCount,
            avgTps,
            circularCount: 0,
        };
    }

    /**
     * Calculate risk score from metrics (can be called with cumulative data)
     */
    calculateRiskScore(
        avgTps: number,
        burstCount: number,
        failedTxCount: number,
        circularCount: number,
    ): { riskScore: number; labels: string[] } {
        let riskScore = 0;
        const labels: string[] = [];

        // ============================================================
        // TPS Scoring (Tiered)
        // ============================================================
        if (avgTps > this.THRESHOLDS.TPS_HIGH) {
            riskScore += this.SCORE_WEIGHTS.TPS_HIGH;
            labels.push('EXTREME_TPS');
            this.logger.debug(`TPS ${avgTps.toFixed(4)} > ${this.THRESHOLDS.TPS_HIGH} → +${this.SCORE_WEIGHTS.TPS_HIGH} points`);
        } else if (avgTps > this.THRESHOLDS.TPS_MEDIUM) {
            riskScore += this.SCORE_WEIGHTS.TPS_MEDIUM;
            labels.push('HIGH_TPS');
            this.logger.debug(`TPS ${avgTps.toFixed(4)} > ${this.THRESHOLDS.TPS_MEDIUM} → +${this.SCORE_WEIGHTS.TPS_MEDIUM} points`);
        }

        // ============================================================
        // Burst Scoring (2 points per burst, max 40)
        // ============================================================
        const burstPenalty = Math.min(
            burstCount * this.SCORE_WEIGHTS.BURST_PENALTY,
            this.SCORE_WEIGHTS.BURST_MAX,
        );
        riskScore += burstPenalty;

        if (burstCount >= this.THRESHOLDS.BURST_MIN_FOR_LABEL) {
            labels.push('HIGH_BURSTS');
        }

        if (burstPenalty > 0) {
            this.logger.debug(`Bursts: ${burstCount} × ${this.SCORE_WEIGHTS.BURST_PENALTY} = +${burstPenalty} points (cap: ${this.SCORE_WEIGHTS.BURST_MAX})`);
        }

        // ============================================================
        // Failure Scoring (5 points per failure, max 20)
        // ============================================================
        const failurePenalty = Math.min(
            failedTxCount * this.SCORE_WEIGHTS.FAILURE_PENALTY,
            this.SCORE_WEIGHTS.FAILURE_MAX,
        );
        riskScore += failurePenalty;

        if (failedTxCount >= this.THRESHOLDS.FAILURE_MIN_FOR_LABEL) {
            labels.push('HIGH_FAILURES');
        }

        if (failurePenalty > 0) {
            this.logger.debug(`Failures: ${failedTxCount} × ${this.SCORE_WEIGHTS.FAILURE_PENALTY} = +${failurePenalty} points (cap: ${this.SCORE_WEIGHTS.FAILURE_MAX})`);
        }

        // ============================================================
        // Circular Transfer Penalty
        // ============================================================
        if (circularCount > 0) {
            const circularPenalty = circularCount * this.SCORE_WEIGHTS.CIRCULAR_PENALTY;
            riskScore += circularPenalty;
            labels.push('SYBIL');
            this.logger.debug(`Circular: ${circularCount} × ${this.SCORE_WEIGHTS.CIRCULAR_PENALTY} = +${circularPenalty} points`);
        }

        // ============================================================
        // Sniper Detection (High bursts + Moderate TPS)
        // ============================================================
        if (burstCount >= this.THRESHOLDS.SNIPER_BURST_MIN && avgTps >= this.THRESHOLDS.SNIPER_TPS_MIN) {
            if (!labels.includes('SNIPER')) {
                labels.push('SNIPER');
            }
        }

        // ============================================================
        // Bot Classification (Score >= 50)
        // ============================================================
        if (riskScore >= this.THRESHOLDS.BOT_SCORE_MIN) {
            if (!labels.includes('BOT')) {
                labels.push('BOT');
            }
        }

        // Cap score at 100
        riskScore = Math.min(riskScore, 100);

        this.logger.log(`🎯 Final Risk Score: ${riskScore}/100, Labels: [${labels.join(', ')}]`);

        return { riskScore, labels };
    }

    /**
     * Recalculate score from cumulative metrics (called after merging with existing data)
     */
    recalculateFromCumulativeData(result: AnalysisResult): AnalysisResult {
        const { riskScore, labels } = this.calculateRiskScore(
            result.avgTps,
            result.burstCount,
            result.failedTxCount,
            result.circularCount,
        );

        return {
            ...result,
            riskScore,
            labels,
        };
    }

    /**
     * Analyze enhanced transactions for circular transfers (Sybil detection)
     */
    extractTransferEdges(
        transactions: HeliusEnhancedTransaction[],
        targetAddress: string,
    ): TransferEdge[] {
        const edges: TransferEdge[] = [];

        for (const tx of transactions) {
            // Process native SOL transfers
            for (const transfer of tx.nativeTransfers || []) {
                if (transfer.fromUserAccount === targetAddress || transfer.toUserAccount === targetAddress) {
                    edges.push({
                        fromAddress: transfer.fromUserAccount,
                        toAddress: transfer.toUserAccount,
                        signature: tx.signature,
                        amount: transfer.amount / 1e9,
                        timestamp: new Date(tx.timestamp * 1000),
                    });
                }
            }

            // Process token transfers
            for (const transfer of tx.tokenTransfers || []) {
                if (transfer.fromUserAccount === targetAddress || transfer.toUserAccount === targetAddress) {
                    edges.push({
                        fromAddress: transfer.fromUserAccount,
                        toAddress: transfer.toUserAccount,
                        signature: tx.signature,
                        amount: transfer.tokenAmount,
                        timestamp: new Date(tx.timestamp * 1000),
                    });
                }
            }
        }

        return edges;
    }

    /**
     * Detect circular transfer patterns (A -> B -> A)
     */
    detectCircularTransfers(edges: TransferEdge[], targetAddress: string): number {
        const outgoingEdges = new Map<string, Set<string>>();

        for (const edge of edges) {
            if (!outgoingEdges.has(edge.fromAddress)) {
                outgoingEdges.set(edge.fromAddress, new Set());
            }
            outgoingEdges.get(edge.fromAddress)!.add(edge.toAddress);
        }

        let circularCount = 0;
        const targetOutgoing = outgoingEdges.get(targetAddress);

        if (targetOutgoing) {
            for (const intermediary of targetOutgoing) {
                const intermediaryOutgoing = outgoingEdges.get(intermediary);
                if (intermediaryOutgoing && intermediaryOutgoing.has(targetAddress)) {
                    circularCount++;
                    this.logger.debug(`🔄 Circular: ${targetAddress.slice(0, 8)}... → ${intermediary.slice(0, 8)}... → back`);
                }
            }
        }

        if (circularCount > 0) {
            this.logger.log(`🔄 Detected ${circularCount} circular transfer patterns`);
        }

        return circularCount;
    }

    /**
     * Add circular transfer penalty to existing result
     */
    addCircularPenalty(result: AnalysisResult, circularCount: number): AnalysisResult {
        if (circularCount === 0) {
            return result;
        }

        // Recalculate with circular count included
        const { riskScore, labels } = this.calculateRiskScore(
            result.avgTps,
            result.burstCount,
            result.failedTxCount,
            circularCount,
        );

        return {
            ...result,
            riskScore,
            labels,
            circularCount,
        };
    }

    /**
     * Detect sub-second transaction bursts
     */
    private detectBursts(signatures: HeliusSignature[]): number {
        if (signatures.length < 2) {
            return 0;
        }

        const sorted = [...signatures]
            .filter(sig => sig.blockTime !== null)
            .sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0));

        let burstCount = 0;

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i].blockTime;
            const previous = sorted[i - 1].blockTime;

            if (current !== null && previous !== null) {
                // blockTime is in seconds, so delta in seconds
                const deltaSec = current - previous;
                // Sub-second means same second (delta = 0) or within same block
                if (deltaSec === 0) {
                    burstCount++;
                }
            }
        }

        return burstCount;
    }

    /**
     * Calculate average transactions per second
     */
    private calculateTps(signatures: HeliusSignature[]): number {
        if (signatures.length < 2) {
            return 0;
        }

        const withTime = signatures.filter(sig => sig.blockTime !== null);
        if (withTime.length < 2) {
            return 0;
        }

        const times = withTime.map(sig => sig.blockTime!);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const timeSpanSeconds = maxTime - minTime;

        if (timeSpanSeconds <= 0) {
            return 0;
        }

        return withTime.length / timeSpanSeconds;
    }

    /**
     * Create empty analysis result
     */
    private createEmptyResult(): AnalysisResult {
        return {
            riskScore: 0,
            labels: [],
            txCount: 0,
            failedTxCount: 0,
            burstCount: 0,
            avgTps: 0,
            circularCount: 0,
        };
    }
}
