import { IsString, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ChartTimeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
}

export class GetPriceHistoryDto {
  @ApiProperty({
    description: 'Token address (mint address)',
    example: 'So11111111111111111111111111111111111111112',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Chart timeframe',
    enum: ChartTimeframe,
    example: ChartTimeframe.ONE_HOUR,
    default: ChartTimeframe.ONE_HOUR,
  })
  @IsEnum(ChartTimeframe)
  @IsOptional()
  timeframe?: ChartTimeframe;

  @ApiProperty({
    description: 'Number of candles to return',
    example: 200,
    default: 200,
    minimum: 1,
    maximum: 500,
  })
  @IsNumber()
  @Min(1)
  @Max(500)
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: 'Start timestamp (Unix seconds)',
    example: 1678886400,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  from?: number;

  @ApiProperty({
    description: 'End timestamp (Unix seconds)',
    example: 1678972800,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  to?: number;
}

export interface OHLCVCandle {
  timestamp: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceHistoryResponse {
  success: boolean;
  data?: {
    tokenAddress: string;
    timeframe: ChartTimeframe;
    candles: OHLCVCandle[];
    currentPrice?: number;
    priceChange24h?: number;
    priceChange24hPercent?: number;
  };
  error?: string;
  message?: string;
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  pairCreatedAt: number;
}

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[] | null;
}
