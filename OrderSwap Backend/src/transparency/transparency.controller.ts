import {
    Controller,
    Get,
    Post,
    Param,
    NotFoundException,
    UseGuards,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TransparencyService } from './transparency.service';
import { RiskReportDto } from './dto';

@ApiTags('transparency')
@Controller('transparency')
export class TransparencyController {
    constructor(private transparencyService: TransparencyService) { }

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
        } catch (error) {
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
