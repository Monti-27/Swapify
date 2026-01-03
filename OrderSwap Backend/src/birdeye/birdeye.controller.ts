import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BirdeyeService } from './birdeye.service';
import { TokenPriceData } from './dto/birdeye.dto';

@ApiTags('prices')
@Controller('prices')
export class BirdeyeController {
  constructor(private readonly birdeyeService: BirdeyeService) {}

  @Get()
  @ApiOperation({ summary: 'Get prices for multiple tokens' })
  @ApiResponse({ status: 200, description: 'Returns token prices with 24h change' })
  @ApiQuery({ name: 'addresses', required: true, type: String, description: 'Comma-separated token addresses' })
  async getMultiplePrices(@Query('addresses') addresses: string): Promise<TokenPriceData[]> {
    const addressList = addresses.split(',').map(a => a.trim()).filter(Boolean);
    return this.birdeyeService.getMultipleTokenPrices(addressList);
  }

  @Get('single')
  @ApiOperation({ summary: 'Get price for a single token' })
  @ApiResponse({ status: 200, description: 'Returns token price with 24h change' })
  @ApiQuery({ name: 'address', required: true, type: String, description: 'Token address' })
  async getSinglePrice(@Query('address') address: string): Promise<TokenPriceData | null> {
    return this.birdeyeService.getTokenPrice(address);
  }
}
