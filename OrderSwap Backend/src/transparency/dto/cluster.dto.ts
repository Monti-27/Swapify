import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsString, ArrayMinSize, ArrayMaxSize, Matches } from 'class-validator';

export enum ClusterMode {
    SNAPSHOT = 'SNAPSHOT',   // Current holders
    HISTORY = 'HISTORY',     // Historical interactors
}

export class ClusterAnalysisDto {
    @ApiProperty({
        description: 'Array of token mint addresses to analyze',
        example: ['DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'],
        minItems: 2,
        maxItems: 5,
    })
    @IsArray()
    @ArrayMinSize(2, { message: 'At least 2 token mints are required for cluster analysis' })
    @ArrayMaxSize(5, { message: 'Maximum 5 token mints allowed per analysis' })
    @IsString({ each: true })
    @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, { each: true, message: 'Invalid Solana address format' })
    mints: string[];

    @ApiProperty({
        description: 'Analysis mode: SNAPSHOT (current holders) or HISTORY (past interactors)',
        enum: ClusterMode,
        example: ClusterMode.SNAPSHOT,
    })
    @IsEnum(ClusterMode)
    mode: ClusterMode;
}

export class ClusterWalletDto {
    @ApiProperty({ description: 'Wallet address' })
    address: string;

    @ApiProperty({ description: 'Risk score 0-100' })
    riskScore: number;

    @ApiProperty({ description: 'Risk level classification' })
    riskLevel: string;

    @ApiProperty({ description: 'Risk labels' })
    labels: string[];

    @ApiProperty({ description: 'Whether risk data is from cache' })
    isCached: boolean;

    @ApiProperty({ description: 'Whether scan was skipped due to rate limits' })
    scanSkipped: boolean;
}

export class ClusterResultDto {
    @ApiProperty({ description: 'Number of tokens analyzed' })
    tokenCount: number;

    @ApiProperty({ description: 'Token mints analyzed' })
    mints: string[];

    @ApiProperty({ description: 'Analysis mode used' })
    mode: ClusterMode;

    @ApiProperty({ description: 'Number of mutual wallets found' })
    mutualWalletCount: number;

    @ApiProperty({ description: 'Mutual wallets sorted by risk score (ascending)' })
    wallets: ClusterWalletDto[];

    @ApiProperty({ description: 'Processing statistics' })
    stats: {
        addressesPerToken: Record<string, number>;
        intersectionSize: number;
        scannedCount: number;
        cachedCount: number;
        skippedCount: number;
    };
}
