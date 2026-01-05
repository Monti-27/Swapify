import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import {
  ChartTimeframe,
  OHLCVCandle,
  PriceHistoryResponse,
  DexScreenerResponse,
} from './dto/price-history.dto';
import { BirdeyeService } from '../birdeye/birdeye.service';
import { CandleAggregatorService } from '../birdeye/candle-aggregator.service';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private dexScreenerUrl: string;
  private jupiterPriceUrl: string;
  private cacheTimeout = 5000; // 5 seconds cache
  private chartCacheTimeout = 300000; // 5 minutes cache for chart data
  private chartDataCache = new Map<string, { data: OHLCVCandle[]; timestamp: number }>();

  // ============================================================
  // 🕵️ MOCK PRICES FOR DEVNET TESTING
  // These tokens will NEVER hit external APIs - total isolation
  // ============================================================
  private readonly MOCK_PRICES: Record<string, { price: number; symbol: string }> = {
    // Wrapped SOL (Mainnet & Devnet)
    'So11111111111111111111111111111111111111112': { price: 570.00, symbol: 'SOL' },
    // Devnet USDC
    '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': { price: 1.00, symbol: 'USDC' },
    // Mainnet USDC (in case of testing)
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { price: 1.00, symbol: 'USDC' },
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private birdeyeService: BirdeyeService,
    private candleAggregator: CandleAggregatorService,
  ) {
    this.dexScreenerUrl = this.configService.get('DEXSCREENER_API_URL') || 'https://api.dexscreener.com/latest';
    this.jupiterPriceUrl = 'https://api.jup.ag/price/v2';

    // Log mock prices on startup
    // Log startup
    this.logger.log('✅ Price Service initialized');
  }

  /**
   * Get token price with caching and multiple fallbacks
   */
  async getTokenPrice(tokenAddress: string): Promise<number> {
    const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;

    // ============================================================
    // 🕵️ MOCK-FIRST GUARD: If token is mocked, return immediately
    // This ensures ZERO external API calls for test tokens
    // ============================================================
    const mockData = this.MOCK_PRICES[tokenAddress];
    if (mockData) {
      this.logger.debug(`🕵️ [TEST MODE] Forcing Mock Price for ${mockData.symbol}: $${mockData.price}`);
      return mockData.price;
    }

    // Check cache first
    const cached = await this.getCachedPrice(tokenAddress);
    if (cached) {
      this.logger.debug(`✅ Price for ${shortAddress} from cache: $${cached.price}`);
      return cached.price;
    }

    let price = 0;
    let source = '';

    // Try DexScreener first
    try {
      price = await this.fetchPriceFromDexScreener(tokenAddress);
      source = 'dexscreener';

      if (price > 0) {
        this.logger.debug(`✅ Price for ${shortAddress} from DexScreener: $${price}`);
      } else {
        this.logger.warn(`⚠️  DexScreener returned 0 price for ${shortAddress}, trying Jupiter...`);
      }
    } catch (error) {
      this.logger.warn(`⚠️  DexScreener failed for ${shortAddress}: ${error.message}`);
    }

    // Fallback to Jupiter if DexScreener failed or returned 0
    if (price === 0) {
      try {
        price = await this.fetchPriceFromJupiter(tokenAddress);
        source = 'jupiter';

        if (price > 0) {
          this.logger.debug(`✅ Price for ${shortAddress} from Jupiter: $${price}`);
        } else {
          this.logger.debug(`❌ Both DexScreener and Jupiter returned 0 for ${shortAddress}`);
        }
      } catch (error) {
        this.logger.error(`❌ Jupiter also failed for ${shortAddress}: ${error.message}`);
      }
    }

    // Update cache if we got a valid price
    if (price > 0) {
      await this.updatePriceCache(tokenAddress, {
        price,
        source,
      });
    }

    return price;
  }

  /**
   * Get token market cap
   */
  async getTokenMarketCap(tokenAddress: string): Promise<number> {
    // Check cache first
    const cached = await this.getCachedPrice(tokenAddress);
    if (cached && cached.marketCap) {
      return cached.marketCap;
    }

    // Fetch from DexScreener
    try {
      const data = await this.fetchTokenDataFromDexScreener(tokenAddress);

      // Update cache
      await this.updatePriceCache(tokenAddress, {
        price: data.priceUsd,
        marketCap: data.marketCap,
        volume24h: data.volume24h,
        source: 'dexscreener',
      });

      return data.marketCap || 0;
    } catch (error) {
      console.error('Error fetching market cap:', error);
      return 0;
    }
  }

  /**
   * Fetch price from DexScreener
   */
  private async fetchPriceFromDexScreener(tokenAddress: string): Promise<number> {
    try {
      const response = await axios.get(
        `${this.dexScreenerUrl}/dex/tokens/${tokenAddress}`,
        { timeout: 5000 }
      );

      const pairs = response.data?.pairs || [];
      if (pairs.length === 0) {
        return 0;
      }

      // Get the most liquid pair
      const mostLiquid = pairs.reduce((prev: any, current: any) =>
        (current.liquidity?.usd || 0) > (prev.liquidity?.usd || 0) ? current : prev
      );

      return parseFloat(mostLiquid.priceUsd || '0');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch price from Jupiter Price API
   */
  private async fetchPriceFromJupiter(tokenAddress: string): Promise<number> {
    try {
      const response = await axios.get(
        `${this.jupiterPriceUrl}`,
        {
          params: { ids: tokenAddress },
          timeout: 5000
        }
      );

      const priceData = response.data?.data?.[tokenAddress];
      if (!priceData) {
        return 0;
      }

      return parseFloat(priceData.price || '0');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch full token data from DexScreener
   */
  private async fetchTokenDataFromDexScreener(tokenAddress: string) {
    try {
      const response = await axios.get(
        `${this.dexScreenerUrl}/dex/tokens/${tokenAddress}`,
      );

      const pairs = response.data?.pairs || [];
      if (pairs.length === 0) {
        return { priceUsd: 0, marketCap: 0, volume24h: 0 };
      }

      // Get the most liquid pair
      const mostLiquid = pairs.reduce((prev: any, current: any) =>
        (current.liquidity?.usd || 0) > (prev.liquidity?.usd || 0) ? current : prev
      );

      // Use FDV (Fully Diluted Valuation) as primary, fallback to marketCap
      const marketCapValue = mostLiquid.fdv || mostLiquid.marketCap || 0;

      return {
        priceUsd: parseFloat(mostLiquid.priceUsd || '0'),
        marketCap: typeof marketCapValue === 'string' ? parseFloat(marketCapValue) : marketCapValue,
        volume24h: parseFloat(mostLiquid.volume?.h24 || '0'),
        priceChange24h: parseFloat(mostLiquid.priceChange?.h24 || '0'),
        liquidity: mostLiquid.liquidity?.usd || 0,
      };
    } catch (error) {
      console.error('DexScreener API error:', error);
      return { priceUsd: 0, marketCap: 0, volume24h: 0 };
    }
  }

  /**
   * Get cached price
   */
  private async getCachedPrice(tokenAddress: string) {
    const cached = await this.prisma.priceCache.findUnique({
      where: { tokenAddress },
    });

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const now = new Date();
    const cacheAge = now.getTime() - cached.updatedAt.getTime();

    if (cacheAge > this.cacheTimeout) {
      return null;
    }

    return cached;
  }

  /**
   * Update price cache
   */
  private async updatePriceCache(
    tokenAddress: string,
    data: {
      price: number;
      marketCap?: number;
      volume24h?: number;
      source: string;
    },
  ) {
    return this.prisma.priceCache.upsert({
      where: { tokenAddress },
      create: {
        tokenAddress,
        price: data.price,
        marketCap: data.marketCap,
        volume24h: data.volume24h,
        source: data.source,
      },
      update: {
        price: data.price,
        marketCap: data.marketCap,
        volume24h: data.volume24h,
        source: data.source,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get multiple token prices in batch
   */
  async getBatchPrices(tokenAddresses: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    // Process in parallel with limited concurrency
    const batchSize = 5;
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      const batchPrices = await Promise.all(
        batch.map(async (address) => ({
          address,
          price: await this.getTokenPrice(address),
        })),
      );

      batchPrices.forEach(({ address, price }) => {
        prices[address] = price;
      });
    }

    return prices;
  }

  /**
   * Get multiple token prices with MOCK DATA support for Devnet
   * Uses centralized MOCK_PRICES for consistency
   */
  async getMultipleTokenPrices(tokenAddresses: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    if (tokenAddresses.length === 0) {
      return priceMap;
    }

    // ============================================================
    // 🕵️ MOCK-FIRST GUARD: Filter out mocked tokens first
    // These tokens will NEVER hit external APIs
    // ============================================================
    const realTokensToFetch: string[] = [];

    for (const address of tokenAddresses) {
      const mockData = this.MOCK_PRICES[address];
      if (mockData) {
        priceMap.set(address, mockData.price);
        this.logger.debug(`🕵️ [TEST MODE] Mock Price for ${mockData.symbol}: $${mockData.price}`);
      } else {
        realTokensToFetch.push(address);
      }
    }

    // If we only have mock tokens, we are done!
    if (realTokensToFetch.length === 0) {
      return priceMap;
    }
    // ============================================================

    // Check cache for the REAL tokens
    const uncachedTokens: string[] = [];
    for (const address of realTokensToFetch) {
      const cached = await this.getCachedPrice(address);
      if (cached) {
        priceMap.set(address, cached.price);
        this.logger.debug(`Cache hit for ${address.slice(0, 8)}...`);
      } else {
        uncachedTokens.push(address);
      }
    }

    // If all cached, return early
    if (uncachedTokens.length === 0) {
      return priceMap;
    }

    // Batch fetch uncached tokens from Jupiter
    const batchSize = 100;
    for (let i = 0; i < uncachedTokens.length; i += batchSize) {
      const batch = uncachedTokens.slice(i, i + batchSize);

      try {
        const response = await axios.get(this.jupiterPriceUrl, {
          params: { ids: batch.join(',') },
          timeout: 10000,
        });

        const data = response.data?.data || {};

        for (const address of batch) {
          const priceData = data[address];
          const price = priceData ? parseFloat(priceData.price || '0') : 0;

          if (price > 0) {
            priceMap.set(address, price);
            await this.updatePriceCache(address, { price, source: 'jupiter-batch' });
          } else {
            // Fallback to DexScreener
            try {
              const fallbackPrice = await this.fetchPriceFromDexScreener(address);
              if (fallbackPrice > 0) {
                priceMap.set(address, fallbackPrice);
                await this.updatePriceCache(address, { price: fallbackPrice, source: 'dexscreener' });
              }
            } catch (err) {
              this.logger.debug(`No price found for ${address.slice(0, 8)}...`);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Jupiter batch request failed: ${error.message}`);
      }
    }

    return priceMap;
  }

  /**
   * Get token info
   */
  async getTokenInfo(tokenAddress: string) {
    // ============================================================
    // 🕵️ MOCK-FIRST GUARD: Return synthetic data for mocked tokens
    // ============================================================
    const mockData = this.MOCK_PRICES[tokenAddress];
    if (mockData) {
      this.logger.debug(`🕵️ [TEST MODE] Returning mock TokenInfo for ${mockData.symbol}`);
      return {
        priceUsd: mockData.price,
        marketCap: 0,  // Synthetic value
        volume24h: 0,  // Synthetic value
        priceChange24h: 0,
        liquidity: 0,
      };
    }

    const data = await this.fetchTokenDataFromDexScreener(tokenAddress);

    // Update cache
    await this.updatePriceCache(tokenAddress, {
      price: data.priceUsd,
      marketCap: data.marketCap,
      volume24h: data.volume24h,
      source: 'dexscreener',
    });

    return data;
  }

  /**
   * Clear old price cache entries
   */
  async clearOldCache() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    await this.prisma.priceCache.deleteMany({
      where: {
        updatedAt: {
          lt: oneHourAgo,
        },
      },
    });
  }

  /**
   * Get historical price data for charts
   */
  async getPriceHistory(
    tokenAddress: string,
    timeframe: ChartTimeframe = ChartTimeframe.ONE_HOUR,
    limit: number = 200,
    from?: number,
    to?: number,
  ): Promise<PriceHistoryResponse> {
    try {
      const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
      this.logger.log(`Fetching chart data for ${shortAddress}, timeframe: ${timeframe}`);

      // Check cache first
      // Include from/to/limit in cache key to ensure uniqueness for historical queries
      const cacheKey = `${tokenAddress}_${timeframe}_${limit}_${from || 'latest'}_${to || 'latest'}`;
      const cached = this.chartDataCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.chartCacheTimeout) {
        this.logger.debug(`Returning cached chart data for ${shortAddress}`);

        // Still fetch current price and changes for fresh data
        const tokenInfo = await this.getTokenInfo(tokenAddress);

        return {
          success: true,
          data: {
            tokenAddress,
            timeframe,
            candles: cached.data, // Return exact cached data (already sliced/filtered by key)
            currentPrice: tokenInfo.priceUsd,
            priceChange24h: tokenInfo.priceChange24h,
            priceChange24hPercent: tokenInfo.priceChange24h,
          },
        };
      }

      // Try to fetch from Birdeye first
      let candles: OHLCVCandle[] = [];

      if (this.birdeyeService.isAvailable()) {
        this.logger.log(`Fetching historical candles from Birdeye for ${shortAddress}`);
        candles = await this.birdeyeService.getHistoricalCandles(
          tokenAddress,
          timeframe,
          limit,
          from,
          to,
        );
      }

      // Fallback to synthetic candles if Birdeye fails or returns no data
      if (!candles || candles.length === 0) {
        this.logger.warn(`Birdeye returned no data for ${shortAddress}, falling back to synthetic candles`);
        candles = await this.generateSyntheticCandles(
          tokenAddress,
          timeframe,
          limit,
        );
      }

      // Validate candles were generated
      if (!candles || candles.length === 0) {
        this.logger.error(`No candles available for ${shortAddress}`);
        return {
          success: false,
          error: 'NO_DATA',
          message: 'No chart data available for this token. The token may not have sufficient price data.',
        };
      }

      // Validate candle structure
      const firstCandle = candles[0];
      if (!firstCandle || typeof firstCandle.timestamp !== 'number' || typeof firstCandle.close !== 'number') {
        this.logger.error(`Invalid candle structure for ${shortAddress}:`, firstCandle);
        return {
          success: false,
          error: 'INVALID_DATA',
          message: 'Chart data format is invalid',
        };
      }

      this.logger.log(`✅ Successfully fetched ${candles.length} candles for ${shortAddress}`);

      // Cache the data
      this.chartDataCache.set(cacheKey, {
        data: candles,
        timestamp: Date.now(),
      });

      // Get current price and changes
      const tokenInfo = await this.getTokenInfo(tokenAddress);

      return {
        success: true,
        data: {
          tokenAddress,
          timeframe,
          candles,
          currentPrice: tokenInfo.priceUsd,
          priceChange24h: tokenInfo.priceChange24h,
          priceChange24hPercent: tokenInfo.priceChange24h,
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching chart data: ${error.message}`);
      return {
        success: false,
        error: 'FETCH_ERROR',
        message: error.message,
      };
    }
  }

  /**
   * Generate synthetic OHLCV candles based on current price data
   * This is a workaround since DexScreener free API doesn't provide historical candles
   */
  private async generateSyntheticCandles(
    tokenAddress: string,
    timeframe: ChartTimeframe,
    limit: number,
  ): Promise<OHLCVCandle[]> {
    try {
      // Get current token data
      const tokenInfo = await this.getTokenInfo(tokenAddress);

      if (!tokenInfo.priceUsd || tokenInfo.priceUsd === 0) {
        return [];
      }

      const currentPrice = tokenInfo.priceUsd;
      const priceChange24h = tokenInfo.priceChange24h || 0;
      const volume24h = tokenInfo.volume24h || 0;

      // Calculate timeframe in milliseconds
      const timeframeMs = this.getTimeframeInMs(timeframe);
      const now = Date.now();

      const candles: OHLCVCandle[] = [];

      // Generate candles going backwards in time
      for (let i = 0; i < limit; i++) {
        const timestamp = Math.floor((now - i * timeframeMs) / 1000);

        // Calculate price with some variation based on 24h change
        // Add random walk effect for realistic looking chart
        const progress = i / limit; // 0 to 1, where 0 is most recent
        const priceVariation = (priceChange24h / 100) * progress;
        const randomWalk = (Math.random() - 0.5) * 0.02; // ±1% random variation

        const basePrice = currentPrice * (1 - priceVariation);
        const adjustedPrice = basePrice * (1 + randomWalk);

        // Generate OHLC with realistic variations
        const volatility = 0.005; // 0.5% intra-candle volatility
        const open = adjustedPrice;
        const high = open * (1 + Math.random() * volatility);
        const low = open * (1 - Math.random() * volatility);
        const close = low + Math.random() * (high - low);

        // Distribute volume across candles
        const avgVolume = volume24h / limit;
        const volumeVariation = (Math.random() - 0.5) * 0.5; // ±25% variation
        const volume = avgVolume * (1 + volumeVariation);

        candles.unshift({
          timestamp,
          open,
          high,
          low,
          close,
          volume: Math.max(0, volume),
        });
      }

      // Validate we generated candles
      if (candles.length === 0) {
        this.logger.warn(`Generated 0 candles for ${tokenAddress}`);
      } else {
        this.logger.log(`Generated ${candles.length} synthetic candles for token`);
      }

      return candles;
    } catch (error) {
      this.logger.error(`Error generating synthetic candles: ${error.message}`);
      return [];
    }
  }

  /**
   * Get the latest candle for real-time updates
   */
  async getLatestCandle(
    tokenAddress: string,
    timeframe: ChartTimeframe = ChartTimeframe.ONE_HOUR,
  ): Promise<OHLCVCandle | null> {
    try {
      // Try to get live candle from aggregator first
      const liveCandle = this.candleAggregator.getCurrentCandle(tokenAddress, timeframe);

      if (liveCandle) {
        return liveCandle;
      }

      // Fallback to fetching current price and creating a candle
      const tokenInfo = await this.getTokenInfo(tokenAddress);

      if (!tokenInfo.priceUsd || tokenInfo.priceUsd === 0) {
        return null;
      }

      const currentPrice = tokenInfo.priceUsd;
      const timeframeMs = this.getTimeframeInMs(timeframe);
      const now = Date.now();

      // Align timestamp to timeframe boundary
      const alignedTimestamp = Math.floor(now / timeframeMs) * timeframeMs;

      // For real-time candle, use current price with minimal variation
      const volatility = 0.002; // 0.2% intra-candle volatility
      const open = currentPrice * (1 - Math.random() * volatility * 0.5);
      const high = Math.max(open, currentPrice) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, currentPrice) * (1 - Math.random() * volatility * 0.5);
      const close = currentPrice;

      return {
        timestamp: Math.floor(alignedTimestamp / 1000),
        open,
        high,
        low,
        close,
        volume: tokenInfo.volume24h / 200, // Rough estimate
      };
    } catch (error) {
      this.logger.error(`Error generating latest candle: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert timeframe enum to milliseconds
   */
  private getTimeframeInMs(timeframe: ChartTimeframe): number {
    const timeframeMap: Record<ChartTimeframe, number> = {
      [ChartTimeframe.ONE_MINUTE]: 60 * 1000,
      [ChartTimeframe.FIVE_MINUTES]: 5 * 60 * 1000,
      [ChartTimeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
      [ChartTimeframe.ONE_HOUR]: 60 * 60 * 1000,
      [ChartTimeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
      [ChartTimeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
      [ChartTimeframe.ONE_WEEK]: 7 * 24 * 60 * 60 * 1000,
    };

    return timeframeMap[timeframe] || timeframeMap[ChartTimeframe.ONE_HOUR];
  }

  /**
   * Clear old chart cache entries (call periodically)
   */
  clearChartCache() {
    const now = Date.now();
    for (const [key, value] of this.chartDataCache.entries()) {
      if (now - value.timestamp > this.chartCacheTimeout) {
        this.chartDataCache.delete(key);
      }
    }
  }
}

