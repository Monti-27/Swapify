import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TradeService } from './trade.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrepareTradeDto, ExecuteTradeDto, SimulateTradeDto } from './dto/trade.dto';

@ApiTags('trades')
@Controller('trades')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TradeController {
  constructor(private tradeService: TradeService) {}

  @Post('prepare')
  @ApiOperation({ summary: 'Prepare a trade (get quote and transaction)' })
  async prepareTrade(@Request() req, @Body() dto: PrepareTradeDto) {
    return this.tradeService.prepareTrade({
      userId: req.user.userId,
      walletId: req.user.walletId,
      fromToken: dto.fromToken,
      toToken: dto.toToken,
      amount: dto.amount,
      strategyId: dto.strategyId,
    });
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a prepared trade with signed transaction' })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  async executeTrade(@Param('id') id: string, @Body() dto: ExecuteTradeDto) {
    return this.tradeService.executeTrade(id, dto);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate a trade to estimate outcome' })
  async simulateTrade(@Body() dto: SimulateTradeDto) {
    return this.tradeService.simulateTrade({
      fromToken: dto.fromToken,
      toToken: dto.toToken,
      amount: dto.amount,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get trade history' })
  @ApiQuery({ name: 'walletId', required: false })
  @ApiQuery({ name: 'strategyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTradeHistory(
    @Request() req,
    @Query('walletId') walletId?: string,
    @Query('strategyId') strategyId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.tradeService.getTradeHistory(req.user.userId, {
      walletId,
      strategyId,
      status,
      limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get trade statistics' })
  async getStats(@Request() req) {
    return this.tradeService.getTradeStats(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trade by ID' })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  async getTrade(@Request() req, @Param('id') id: string) {
    return this.tradeService.getTrade(id, req.user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending trade' })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  async cancelTrade(@Request() req, @Param('id') id: string) {
    return this.tradeService.cancelTrade(id, req.user.userId);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a trade execution (after user signs)' })
  @ApiParam({ name: 'id', description: 'Trade ID' })
  async confirmTrade(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { signature: string; status: 'success' | 'failed' },
  ) {
    return this.tradeService.confirmTradeExecution(id, req.user.userId, body.signature, body.status);
  }
}

