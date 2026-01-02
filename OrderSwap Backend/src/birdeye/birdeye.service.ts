import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import {
  BirdeyeTimeframe,
  BirdeyeOHLCVResponse,
  BirdeyeCandle,
  BirdeyeWSMessageType,
  BirdeyeWSMessage,
  BirdeyeTradeEvent,
  BirdeyeWSTxsDataMessage,
} from './dto/birdeye.dto';
import { ChartTimeframe } from '../price/dto/price-history.dto';
import { OHLCVCandle } from '../price/dto/price-history.dto';

// Cache interface for OHLCV data
interface CachedOHLCV {
  data: OHLCVCandle[];
  timestamp: number;
}

@Injectable()
export class BirdeyeService implements OnModuleDestroy {
  private readonly logger = new Logger(BirdeyeService.name);
  private readonly apiKey: string;
  private readonly restUrl: string;
  private readonly wsUrl: string;
  private axiosInstance: AxiosInstance;

  // OHLCV Cache with 60s TTL to save Birdeye CUs
  private ohlcvCache = new Map<string, CachedOHLCV>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds

  // WebSocket connection management
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private isConnecting = false;
  private isAuthenticated = false;
  private subscriptions = new Set<string>(); // Track subscribed token addresses
  private tradeHandlers = new Map<string, Set<(trade: BirdeyeTradeEvent) => void>>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isEnabled = false;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('BIRDEYE_API_KEY') || '';
    this.restUrl = this.configService.get('BIRDEYE_REST_URL') || 'https://public-api.birdeye.so';
    this.wsUrl = this.configService.get('BIRDEYE_WS_URL') || 'wss://public-api.birdeye.so/socket/solana';

    // Check if API key is configured
    if (!this.apiKey) {
      this.logger.warn('⚠️ BIRDEYE_API_KEY not set. Birdeye service disabled - charts will use synthetic data.');
      this.isEnabled = false;
      return;
    }

    this.isEnabled = true;
    this.logger.log('✅ Birdeye service ENABLED for Mainnet charts');

    // Create axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.restUrl,
      timeout: 15000,
      headers: {
        'X-API-KEY': this.apiKey,
        'Accept': 'application/json',
      },
    });

    // Initialize WebSocket connection for live trade streaming
    this.connectWebSocket();

    // Start cache cleanup interval (every 5 minutes)
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  /**
   * Get cached OHLCV data if valid, otherwise return null
   */
  private getCachedOHLCV(cacheKey: string): OHLCVCandle[] | null {
    const cached = this.ohlcvCache.get(cacheKey);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL_MS) {
      this.ohlcvCache.delete(cacheKey);
      return null;
    }

    this.logger.debug(`📦 Cache HIT for ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
    return cached.data;
  }

  /**
   * Store OHLCV data in cache
   */
  private setCachedOHLCV(cacheKey: string, data: OHLCVCandle[]): void {
    this.ohlcvCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    this.logger.debug(`📦 Cache SET for ${cacheKey} (${data.length} candles)`);
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.ohlcvCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL_MS) {
        this.ohlcvCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Fetch historical OHLCV candles from Birdeye REST API with caching
   */
  async getHistoricalCandles(
    tokenAddress: string,
    timeframe: ChartTimeframe,
    limit: number = 200,
    from?: number,
    to?: number,
  ): Promise<OHLCVCandle[]> {
    // Skip if service is disabled
    if (!this.isEnabled) {
      this.logger.debug('Birdeye service disabled, returning empty candles');
      return [];
    }

    const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
    // Include from/to in cache key if provided
    const cacheKey = `${tokenAddress}_${timeframe}_${from || 'latest'}_${to || 'latest'}`;

    // Check cache first - CRITICAL for CU optimization
    const cachedData = this.getCachedOHLCV(cacheKey);
    if (cachedData && cachedData.length > 0) {
      this.logger.log(`📦 Serving ${cachedData.length} cached candles for ${shortAddress} (${timeframe})`);
      return cachedData;
    }

    try {
      this.logger.log(`🔄 Fetching fresh candles from Birdeye for ${shortAddress}, timeframe: ${timeframe}`);

      // Convert our timeframe to Birdeye format
      const birdeyeTimeframe = this.convertToBirdeyeTimeframe(timeframe);

      // Determine time range
      let timeFrom: number;
      let timeTo: number;

      if (from && to) {
        timeFrom = from;
        timeTo = to;
      } else {
        // Default behavior: fetch last N candles
        const now = Math.floor(Date.now() / 1000);
        const timeframeSeconds = this.getTimeframeInSeconds(timeframe);
        timeTo = now;
        timeFrom = now - (limit * timeframeSeconds);
      }

      const response = await this.axiosInstance.get<BirdeyeOHLCVResponse>(
        '/defi/ohlcv',
        {
          params: {
            address: tokenAddress,
            type: birdeyeTimeframe,
            time_from: timeFrom,
            time_to: timeTo,
          },
        },
      );

      if (!response.data || !response.data.success) {
        this.logger.error(`Birdeye API returned unsuccessful response for ${shortAddress}`);
        return [];
      }

      const rawItems = response.data.data?.items || [];

      if (rawItems.length === 0) {
        this.logger.warn(`No candles returned from Birdeye for ${shortAddress}`);
        return [];
      }

      // Log first item to debug field names (can be removed later)
      this.logger.debug(`Birdeye raw item sample: ${JSON.stringify(rawItems[0])}`);

      // Convert Birdeye candles to our format
      // Birdeye uses abbreviated keys: o, h, l, c, v, unixTime
      const ohlcvCandles: OHLCVCandle[] = rawItems.map((item: any) => ({
        timestamp: item.unixTime,
        open: Number(item.o),
        high: Number(item.h),
        low: Number(item.l),
        close: Number(item.c),
        volume: Number(item.v || 0),
      }));

      // Filter out any invalid candles
      const validCandles = ohlcvCandles.filter(c =>
        c.timestamp &&
        !isNaN(c.open) &&
        !isNaN(c.high) &&
        !isNaN(c.low) &&
        !isNaN(c.close)
      );

      if (validCandles.length !== ohlcvCandles.length) {
        this.logger.warn(`Filtered out ${ohlcvCandles.length - validCandles.length} invalid candles for ${shortAddress}`);
      }

      // Sort by timestamp ascending
      validCandles.sort((a, b) => a.timestamp - b.timestamp);

      // Store in cache for future requests
      this.setCachedOHLCV(cacheKey, validCandles);

      this.logger.log(`✅ Fetched ${validCandles.length} candles from Birdeye for ${shortAddress} (cached for 60s)`);
      return validCandles;
    } catch (error) {
      this.logger.error(`Error fetching Birdeye candles: ${error.message}`, error.stack);

      // Check if it's a rate limit error
      if (error.response?.status === 429) {
        this.logger.error('⚠️ Birdeye API rate limit exceeded - consider increasing cache TTL');
      }

      return [];
    }
  }

  /**
   * Subscribe to live trades for a token
   */
  subscribeToTrades(tokenAddress: string, handler: (trade: BirdeyeTradeEvent) => void): void {
    // Skip if service is disabled
    if (!this.isEnabled) {
      return;
    }

    if (!this.tradeHandlers.has(tokenAddress)) {
      this.tradeHandlers.set(tokenAddress, new Set());
    }

    this.tradeHandlers.get(tokenAddress)!.add(handler);

    // If WebSocket is connected and authenticated, subscribe immediately
    if (this.isAuthenticated && !this.subscriptions.has(tokenAddress)) {
      this.sendTradeSubscription(tokenAddress);
    }

    this.logger.log(`Handler registered for trades on ${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`);
  }

  /**
   * Unsubscribe from live trades for a token
   */
  unsubscribeFromTrades(tokenAddress: string, handler: (trade: BirdeyeTradeEvent) => void): void {
    const handlers = this.tradeHandlers.get(tokenAddress);
    if (handlers) {
      handlers.delete(handler);

      // If no more handlers, unsubscribe from WebSocket
      if (handlers.size === 0) {
        this.tradeHandlers.delete(tokenAddress);
        this.sendTradeUnsubscription(tokenAddress);
      }
    }
  }

  /**
   * Connect to Birdeye WebSocket
   */
  private connectWebSocket(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.logger.log('🔌 Connecting to Birdeye WebSocket...');

    try {
      // Birdeye requires API key as query parameter for WebSocket auth
      const wsUrlWithAuth = `${this.wsUrl}?x-api-key=${this.apiKey}`;
      this.logger.log(`🔌 Connecting to Birdeye WebSocket with API Key: ${this.apiKey.slice(0, 5)}...`);

      // Add echo-protocol as required by Birdeye
      this.ws = new WebSocket(wsUrlWithAuth, 'echo-protocol');

      this.ws.on('open', () => {
        this.logger.log('✅ Birdeye WebSocket connected');
        this.isConnecting = false;
        this.wsReconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Authenticate
        this.authenticate();

        // Start heartbeat
        this.startHeartbeat();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const rawMsg = data.toString();
          // Log heartbeat/pong sparingly, but log everything else
          // if (!rawMsg.includes('PONG')) {
          //   this.logger.debug(`📥 Raw WS Message: ${rawMsg.slice(0, 200)}...`);
          // }

          const message = JSON.parse(rawMsg) as BirdeyeWSMessage;
          this.handleWebSocketMessage(message);
        } catch (error) {
          this.logger.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        this.logger.error('Birdeye WebSocket error:', error.message);
      });

      this.ws.on('close', (code, reason) => {
        this.logger.warn(`Birdeye WebSocket closed: ${code} - ${reason}`);
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.subscriptions.clear();
        this.stopHeartbeat();
        this.scheduleReconnect();
      });
    } catch (error) {
      this.logger.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Authenticate with Birdeye WebSocket
   */
  private authenticate(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const authMessage: BirdeyeWSMessage = {
      type: BirdeyeWSMessageType.SUBSCRIBE,
      data: {
        apiKey: this.apiKey,
      },
    };

    this.ws.send(JSON.stringify(authMessage));
    this.logger.log('🔐 Sent authentication to Birdeye WebSocket');

    // Mark as authenticated (Birdeye doesn't send confirmation)
    // We'll assume authentication is successful if no error occurs
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.isAuthenticated = true;
        this.logger.log('✅ Birdeye WebSocket authenticated');

        // Re-subscribe to all active subscriptions
        this.resubscribeAll();
      }
    }, 1000);
  }

  /**
   * Send trade subscription message
   */
  private sendTradeSubscription(tokenAddress: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.logger.warn('Cannot subscribe to trades: WebSocket not ready');
      return;
    }

    const message: BirdeyeWSMessage = {
      type: BirdeyeWSMessageType.SUBSCRIBE_TRADE,
      data: {
        address: tokenAddress,
      },
    };

    this.ws.send(JSON.stringify(message));
    this.subscriptions.add(tokenAddress);

    const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
    this.logger.log(`📊 Subscribed to trades for ${shortAddress}`);
  }

  /**
   * Send trade unsubscription message
   */
  private sendTradeUnsubscription(tokenAddress: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: BirdeyeWSMessage = {
      type: BirdeyeWSMessageType.UNSUBSCRIBE_TRADE,
      data: {
        address: tokenAddress,
      },
    };

    this.ws.send(JSON.stringify(message));
    this.subscriptions.delete(tokenAddress);

    const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
    this.logger.log(`📊 Unsubscribed from trades for ${shortAddress}`);
  }

  /**
   * Re-subscribe to all active subscriptions (after reconnection)
   */
  private resubscribeAll(): void {
    const activeTokens = Array.from(this.tradeHandlers.keys());

    if (activeTokens.length === 0) {
      return;
    }

    this.logger.log(`Re-subscribing to ${activeTokens.length} tokens...`);

    activeTokens.forEach((tokenAddress) => {
      this.sendTradeSubscription(tokenAddress);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: BirdeyeWSMessage): void {
    if (message.type === BirdeyeWSMessageType.TRADE) {
      const tradeEvent = message as BirdeyeTradeEvent;
      const handlers = this.tradeHandlers.get(tradeEvent.data.address);

      if (handlers && handlers.size > 0) {
        handlers.forEach((handler) => {
          try {
            handler(tradeEvent);
          } catch (error) {
            this.logger.error('Error in trade handler:', error);
          }
        });
      }
    } else if (message.type === BirdeyeWSMessageType.TXS_DATA) {
      const txMessage = message as BirdeyeWSTxsDataMessage;

      // Safety check for data existence
      if (!txMessage || !txMessage.data) {
        return;
      }

      const txData = txMessage.data;

      // We only care if we have a valid token address
      if (!txData.tokenAddress) {
        return;
      }

      // Determine price based on which side is our token
      let price = 0;
      if (txData.tokenAddress === txData.from.address) {
        price = txData.from.price;
      } else if (txData.tokenAddress === txData.to.address) {
        price = txData.to.price;
      }

      // CRITICAL: Validate price to prevent chart destruction (zero/NaN candles)
      // Prices on Solana can be very small, but not 0 or negative
      if (!price || isNaN(price) || price <= 0) {
        // Skip invalid price updates
        return;
      }

      // NOISE FILTER: Ignore dust trades (< $1 USD volume)
      // This drastically reduces WS overhead and chart noise
      if ((txData.volumeUSD || 0) < 1) {
        return;
      }

      // Construct Trade Event
      const tradeEvent: BirdeyeTradeEvent = {
        type: BirdeyeWSMessageType.TRADE,
        data: {
          address: txData.tokenAddress,
          price: price,
          volume: txData.volumeUSD || 0, // Use USD volume for consistency
          timestamp: (txData.blockUnixTime || Math.floor(Date.now() / 1000)) * 1000, // Convert s to ms
          side: txData.side,
          txHash: txData.txHash,
        }
      };

      const handlers = this.tradeHandlers.get(txData.tokenAddress);
      if (handlers && handlers.size > 0) {
        handlers.forEach((handler) => {
          try {
            handler(tradeEvent);
          } catch (error) {
            this.logger.error('Error in trade handler:', error);
          }
        });
      }

    } else if (message.type === BirdeyeWSMessageType.PONG) {
      // Heartbeat response received
      this.logger.debug('Received PONG from Birdeye WebSocket');
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingMessage = {
          type: BirdeyeWSMessageType.PING,
        };
        this.ws.send(JSON.stringify(pingMessage));
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule WebSocket reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.wsReconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('❌ Max reconnection attempts reached. Giving up.');
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.wsReconnectAttempts),
      this.maxReconnectDelay,
    );

    this.wsReconnectAttempts++;
    this.logger.log(
      `⏰ Scheduling reconnection attempt ${this.wsReconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  /**
   * Convert our ChartTimeframe to Birdeye format
   */
  private convertToBirdeyeTimeframe(timeframe: ChartTimeframe): BirdeyeTimeframe {
    const mapping: Record<ChartTimeframe, BirdeyeTimeframe> = {
      [ChartTimeframe.ONE_MINUTE]: BirdeyeTimeframe.ONE_MINUTE,
      [ChartTimeframe.FIVE_MINUTES]: BirdeyeTimeframe.FIVE_MINUTES,
      [ChartTimeframe.FIFTEEN_MINUTES]: BirdeyeTimeframe.FIFTEEN_MINUTES,
      [ChartTimeframe.ONE_HOUR]: BirdeyeTimeframe.ONE_HOUR,
      [ChartTimeframe.FOUR_HOURS]: BirdeyeTimeframe.FOUR_HOURS,
      [ChartTimeframe.ONE_DAY]: BirdeyeTimeframe.ONE_DAY,
      [ChartTimeframe.ONE_WEEK]: BirdeyeTimeframe.ONE_WEEK,
    };

    return mapping[timeframe] || BirdeyeTimeframe.ONE_HOUR;
  }

  /**
   * Get timeframe duration in seconds
   */
  private getTimeframeInSeconds(timeframe: ChartTimeframe): number {
    const mapping: Record<ChartTimeframe, number> = {
      [ChartTimeframe.ONE_MINUTE]: 60,
      [ChartTimeframe.FIVE_MINUTES]: 5 * 60,
      [ChartTimeframe.FIFTEEN_MINUTES]: 15 * 60,
      [ChartTimeframe.ONE_HOUR]: 60 * 60,
      [ChartTimeframe.FOUR_HOURS]: 4 * 60 * 60,
      [ChartTimeframe.ONE_DAY]: 24 * 60 * 60,
      [ChartTimeframe.ONE_WEEK]: 7 * 24 * 60 * 60,
    };

    return mapping[timeframe] || 3600;
  }

  /**
   * Check if Birdeye service is available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up Birdeye service...');

    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.tradeHandlers.clear();
    this.subscriptions.clear();
  }
}

