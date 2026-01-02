import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PriceService } from './price.service';
import { GetPriceDto, GetBatchPricesDto } from './dto/price.dto';
import { GetPriceHistoryDto, ChartTimeframe } from './dto/price-history.dto';

@ApiTags('prices')
@Controller('prices')
export class PriceController {
  constructor(private priceService: PriceService) { }

  @Get()
  @ApiOperation({ summary: 'Get token price' })
  @ApiQuery({ name: 'token', description: 'Token address' })
  async getPrice(@Query() dto: GetPriceDto) {
    const price = await this.priceService.getTokenPrice(dto.token);
    return { token: dto.token, price };
  }

  @Post('batch')
  @ApiOperation({ summary: 'Get multiple token prices' })
  async getBatchPrices(@Body() dto: GetBatchPricesDto) {
    const prices = await this.priceService.getBatchPrices(dto.tokens);
    return { prices };
  }

  @Get('info')
  @ApiOperation({ summary: 'Get detailed token information' })
  @ApiQuery({ name: 'token', description: 'Token address' })
  async getTokenInfo(@Query() dto: GetPriceDto) {
    const info = await this.priceService.getTokenInfo(dto.token);
    return { token: dto.token, ...info };
  }

  @Get('market-cap')
  @ApiOperation({ summary: 'Get token market cap' })
  @ApiQuery({ name: 'token', description: 'Token address' })
  async getMarketCap(@Query() dto: GetPriceDto) {
    const marketCap = await this.priceService.getTokenMarketCap(dto.token);
    return { token: dto.token, marketCap };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get historical price data for charts' })
  @ApiQuery({ name: 'token', description: 'Token address', required: true })
  @ApiQuery({
    name: 'timeframe',
    description: 'Chart timeframe',
    required: false,
    enum: ChartTimeframe,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of candles to return (max 500)',
    required: false,
    type: Number,
  })
  async getPriceHistory(@Query() dto: GetPriceHistoryDto) {
    const timeframe = dto.timeframe || ChartTimeframe.ONE_HOUR;
    const limit = dto.limit || 200;
    const { from, to } = dto;

    return this.priceService.getPriceHistory(dto.token, timeframe, limit, from, to);
  }
}

