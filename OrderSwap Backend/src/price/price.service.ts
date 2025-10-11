import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private dexScreenerUrl: string;
  private jupiterPriceUrl: string;
  private cacheTimeout = 5000; // 5 seconds cache

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.dexScreenerUrl = this.configService.get('DEXSCREENER_API_URL') || 'https://api.dexscreener.com/latest';
    this.jupiterPriceUrl = 'https://api.jup.ag/price/v2';
  }

  /**
   * Get token price with caching and multiple fallbacks
   */
  async getTokenPrice(tokenAddress: string): Promise<number> {
    const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
    
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
        this.logger.log(`✅ Price for ${shortAddress} from DexScreener: $${price}`);
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
          this.logger.log(`✅ Price for ${shortAddress} from Jupiter: $${price}`);
        } else {
          this.logger.error(`❌ Both DexScreener and Jupiter returned 0 for ${shortAddress}`);
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
   * Get token info
   */
  async getTokenInfo(tokenAddress: string) {
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
}

