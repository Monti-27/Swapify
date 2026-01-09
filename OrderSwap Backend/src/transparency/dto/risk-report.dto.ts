import { ApiProperty } from '@nestjs/swagger';

export class RiskReportDto {
    @ApiProperty({ description: 'Wallet address', example: 'DfU2a3TJoJPjLhMCAQ9V3uPBhC98kD5gDqQHLiPvWpwq' })
    address: string;

    @ApiProperty({ description: 'Risk score from 0-100', example: 75 })
    riskScore: number;

    @ApiProperty({ description: 'Risk level classification', example: 'HIGH' })
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

    @ApiProperty({ description: 'Applied risk labels', example: ['BOT', 'HIGH_TPS'] })
    labels: string[];

    @ApiProperty({ description: 'Total transactions analyzed', example: 1500 })
    txCount: number;

    @ApiProperty({ description: 'Failed transaction count', example: 45 })
    failedTxCount: number;

    @ApiProperty({ description: 'Sub-second burst count', example: 23 })
    burstCount: number;

    @ApiProperty({ description: 'Average transactions per second', example: 0.75 })
    avgTps: number;

    @ApiProperty({ description: 'Circular transfer patterns detected', example: 2 })
    circularCount: number;

    @ApiProperty({ description: 'Last scan timestamp', example: '2026-01-04T08:00:00.000Z' })
    lastScannedAt: Date | null;

    @ApiProperty({ description: 'Whether this is cached data or fresh scan', example: true })
    isCached: boolean;
}

export class RiskMetricsDto {
    @ApiProperty({ description: 'Transactions per second', example: 0.75 })
    tps: number;

    @ApiProperty({ description: 'Number of sub-second bursts detected', example: 23 })
    bursts: number;

    @ApiProperty({ description: 'Failure rate percentage', example: 3.5 })
    failureRate: number;

    @ApiProperty({ description: 'Number of circular transfer patterns', example: 2 })
    circularTransfers: number;
}

// Helper to classify risk level from score
export function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score < 25) return 'LOW';
    if (score < 50) return 'MEDIUM';
    if (score < 75) return 'HIGH';
    return 'CRITICAL';
}
