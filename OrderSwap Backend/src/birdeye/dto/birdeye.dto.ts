import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Birdeye timeframe format mapping
 */
export enum BirdeyeTimeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1H',
  FOUR_HOURS = '4H',
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
}

/**
 * Birdeye OHLCV Response from REST API
 */
export interface BirdeyeOHLCVResponse {
  success: boolean;
  data: {
    items: BirdeyeCandle[];
  };
}

/**
 * Birdeye candle structure
 */
export interface BirdeyeCandle {
  unixTime: number; // Unix timestamp in seconds
  type: string; // Timeframe type
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Birdeye WebSocket message types
 */
export enum BirdeyeWSMessageType {
  SUBSCRIBE = 'SUBSCRIBE',
  SUBSCRIBE_TRADE = 'SUBSCRIBE_TXS',
  UNSUBSCRIBE_TRADE = 'UNSUBSCRIBE_TXS',
  TRADE = 'TRADE',
  TXS_DATA = 'TXS_DATA',
  PRICE_DATA = 'PRICE_DATA',
  PING = 'PING',
  PONG = 'PONG',
}

/**
 * Birdeye WebSocket subscription message
 */
export interface BirdeyeWSSubscribeMessage {
  type: BirdeyeWSMessageType.SUBSCRIBE;
  data: {
    apiKey: string;
  };
}

/**
 * Birdeye WebSocket trade subscription message
 */
export interface BirdeyeWSTradeSubscribeMessage {
  type: BirdeyeWSMessageType.SUBSCRIBE_TRADE;
  data: {
    address: string; // Token mint address
  };
}

/**
 * Birdeye WebSocket trade unsubscribe message
 */
export interface BirdeyeWSTradeUnsubscribeMessage {
  type: BirdeyeWSMessageType.UNSUBSCRIBE_TRADE;
  data: {
    address: string;
  };
}

/**
 * Birdeye WebSocket trade event
 */
export interface BirdeyeTradeEvent {
  type: BirdeyeWSMessageType.TRADE;
  data: {
    address: string; // Token mint address
    price: number; // Trade price in USD
    volume: number; // Trade volume
    timestamp: number; // Unix timestamp in milliseconds
    side: 'buy' | 'sell';
    txHash?: string;
  };
}

export interface BirdeyeWSTxsDataMessage {
  type: BirdeyeWSMessageType.TXS_DATA;
  data: {
    blockUnixTime: number;
    owner: string;
    source: string;
    txHash: string;
    side: 'buy' | 'sell';
    tokenAddress: string;
    volumeUSD: number;
    from: {
      address: string;
      price: number;
      uiAmount: number;
      symbol: string;
    };
    to: {
      address: string;
      price: number;
      uiAmount: number;
      symbol: string;
    };
  };
}

/**
 * Birdeye WebSocket message union type
 */
export type BirdeyeWSMessage =
  | BirdeyeWSSubscribeMessage
  | BirdeyeWSTradeSubscribeMessage
  | BirdeyeWSTradeUnsubscribeMessage
  | BirdeyeTradeEvent
  | BirdeyeWSTxsDataMessage
  | { type: BirdeyeWSMessageType.PRICE_DATA } // Placeholder
  | { type: BirdeyeWSMessageType.PING | BirdeyeWSMessageType.PONG };

/**
 * Internal live candle structure for aggregation
 */
export interface LiveCandle {
  tokenAddress: string;
  timeframe: string;
  timestamp: number; // Unix timestamp in seconds (aligned to timeframe boundary)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
  lastUpdateTime: number; // Last time this candle was updated
}

/**
 * Candle subscription info
 */
export interface CandleSubscription {
  tokenAddress: string;
  timeframe: string;
  active: boolean;
  startTime: number;
}

export interface BirdeyePriceResponse {
  success: boolean;
  data: {
    value: number;
    updateUnixTime: number;
    updateHumanTime: string;
    priceChange24h: number;
    liquidity?: number;
  };
}

export interface BirdeyeMultiPriceResponse {
  success: boolean;
  data: {
    [address: string]: {
      value: number;
      updateUnixTime: number;
      updateHumanTime: string;
      priceChange24h: number;
      liquidity?: number;
    };
  };
}

export interface TokenPriceData {
  address: string;
  price: number;
  priceChange24h: number;
  liquidity?: number;
  volume24h?: number;
  updateTime: number;
}

/**
 * Token overview data with market cap from Birdeye
 */
export interface TokenOverviewData {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  mc: number;              // Market Cap in USD
  fdv: number;             // Fully Diluted Valuation
  circulatingSupply: number;
  totalSupply: number;
  liquidity: number;
  volume24h: number;
  updateTime: number;
}

export interface BirdeyeTokenOverviewResponse {
  success: boolean;
  data: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    liquidity: number;
    price: number;
    priceChange24hPercent: number;
    mc: number;
    realMc: number;
    fdv: number;
    circulatingSupply: number;
    supply: number;
    v24hUSD: number;
    holder: number;
    lastTradeUnixTime: number;
  };
}
