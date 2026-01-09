import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    Sse,
    NotFoundException,
    UseGuards,
    HttpStatus,
    HttpException,
    MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Observable, map, catchError, of } from 'rxjs';
import { TransparencyService } from './transparency.service';
import { ClusterService, ClusterStreamEvent } from './cluster.service';
import { RiskReportDto, ClusterAnalysisDto, ClusterResultDto, ClusterMode } from './dto';

@ApiTags('transparency')
@Controller('transparency')
export class TransparencyController {
    constructor(
        private transparencyService: TransparencyService,
        private clusterService: ClusterService,
    ) { }

    @Get(':address')
    @ApiOperation({ summary: 'Get cached risk report for a wallet' })
    @ApiParam({ name: 'address', description: 'Solana wallet address' })
    @ApiResponse({ status: 200, description: 'Risk report', type: RiskReportDto })
    @ApiResponse({ status: 404, description: 'Wallet not yet scanned' })
    async getRiskReport(@Param('address') address: string): Promise<RiskReportDto> {
        const report = await this.transparencyService.getCachedRisk(address);

        if (!report) {
            throw new NotFoundException(
                `Wallet ${address.slice(0, 8)}... has not been scanned yet. Use POST /transparency/scan/:address to scan.`,
            );
        }

        return report;
    }

    @Post('scan/:address')
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 scans per minute per IP
    @ApiOperation({ summary: 'Trigger a fresh scan for a wallet' })
    @ApiParam({ name: 'address', description: 'Solana wallet address' })
    @ApiResponse({ status: 200, description: 'Fresh risk report', type: RiskReportDto })
    @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
    @ApiResponse({ status: 503, description: 'Helius API not configured' })
    async scanWallet(@Param('address') address: string): Promise<RiskReportDto> {
        try {
            return await this.transparencyService.scanWallet(address);
        } catch (error: any) {
            if (error.message?.includes('not configured')) {
                throw new HttpException(
                    'Transparency Engine unavailable: Helius API not configured',
                    HttpStatus.SERVICE_UNAVAILABLE,
                );
            }
            throw error;
        }
    }

    /**
     * SSE Endpoint for real-time cluster analysis streaming
     * Results are streamed as they are found for a live "matrix" effect
     */
    @Sse('cluster/stream')
    @ApiOperation({
        summary: 'Stream cluster analysis results in real-time (SSE)',
        description: 'Connects via Server-Sent Events and streams wallet results as they are found.',
    })
    @ApiQuery({ name: 'mints', description: 'Comma-separated token mint addresses (2-5 tokens)', required: true })
    @ApiQuery({ name: 'mode', description: 'Analysis mode: SNAPSHOT or HISTORY', required: false })
    streamCluster(
        @Query('mints') mintsParam: string,
        @Query('mode') modeParam?: string,
    ): Observable<MessageEvent> {
        // Parse mints from comma-separated string
        const mints = mintsParam
            ? mintsParam.split(',').map(m => m.trim()).filter(m => m.length > 0)
            : [];

        // Validate mint count
        if (mints.length < 2) {
            return of({
                data: JSON.stringify({ type: 'ERROR', data: { message: 'At least 2 token addresses required' } }),
            } as MessageEvent);
        }

        if (mints.length > 5) {
            return of({
                data: JSON.stringify({ type: 'ERROR', data: { message: 'Maximum 5 tokens allowed' } }),
            } as MessageEvent);
        }

        // Parse mode
        const mode: ClusterMode = modeParam === 'HISTORY' ? ClusterMode.HISTORY : ClusterMode.SNAPSHOT;

        // Stream the analysis
        return this.clusterService.streamMutualWallets(mints, mode).pipe(
            map((event: ClusterStreamEvent): MessageEvent => ({
                data: JSON.stringify(event),
            })),
            catchError((error) => {
                return of({
                    data: JSON.stringify({ type: 'ERROR', data: { message: error.message || 'Unknown error' } }),
                } as MessageEvent);
            }),
        );
    }

    /**
     * Original POST endpoint (kept for backward compatibility)
     */
    @Post('cluster')
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 cluster analyses per minute
    @ApiOperation({
        summary: 'Find mutual wallets across multiple tokens (Cabal Detector) - Batch Mode',
        description: 'Waits for full analysis to complete before returning. Use /cluster/stream for real-time results.',
    })
    @ApiBody({ type: ClusterAnalysisDto })
    @ApiResponse({ status: 200, description: 'Cluster analysis result', type: ClusterResultDto })
    @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
    @ApiResponse({ status: 503, description: 'Helius API not configured' })
    async analyzeCluster(@Body() dto: ClusterAnalysisDto): Promise<ClusterResultDto> {
        try {
            return await this.clusterService.findMutualWallets(dto.mints, dto.mode);
        } catch (error: any) {
            if (error.message?.includes('not configured')) {
                throw new HttpException(
                    'Transparency Engine unavailable: Helius API not configured',
                    HttpStatus.SERVICE_UNAVAILABLE,
                );
            }
            throw error;
        }
    }
}
