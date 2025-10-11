import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PriceService } from './price.service';
import { GetPriceDto, GetBatchPricesDto } from './dto/price.dto';

@ApiTags('prices')
@Controller('prices')
export class PriceController {
  constructor(private priceService: PriceService) {}

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
}

