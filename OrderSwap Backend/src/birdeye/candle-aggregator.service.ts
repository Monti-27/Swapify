import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { BirdeyeService } from './birdeye.service';
import { BirdeyeTradeEvent } from './dto/birdeye.dto';
import { LiveCandle } from './dto/birdeye.dto';
import { ChartTimeframe } from '../price/dto/price-history.dto';
import { OHLCVCandle } from '../price/dto/price-history.dto';

type CandleUpdateCallback = (tokenAddress: string, candle: OHLCVCandle) => void;

@Injectable()
export class CandleAggregatorService implements OnModuleDestroy {
  private readonly logger = new Logger(CandleAggregatorService.name);

  // Live candles being aggregated (key: "tokenAddress_timeframe")
  private liveCandles = new Map<string, LiveCandle>();

  // Subscribers to candle updates (key: "tokenAddress_timeframe")
  private candleSubscribers = new Map<string, Set<CandleUpdateCallback>>();

  // Active token subscriptions (key: tokenAddress, value: set of timeframes)
  private tokenSubscriptions = new Map<string, Set<string>>();

  // Throttle intervals for broadcasting updates (max 1 update per second per token/timeframe)
  private throttleMap = new Map<string, NodeJS.Timeout>();
  private pendingUpdates = new Map<string, OHLCVCandle>();

  constructor(private birdeyeService: BirdeyeService) { }

  /**
   * Subscribe to live candle updates for a token/timeframe
   */
  subscribeToCandles(
    tokenAddress: string,
    timeframe: ChartTimeframe,
    callback: CandleUpdateCallback,
  ): void {
    const key = this.getKey(tokenAddress, timeframe);

    // Register callback
    if (!this.candleSubscribers.has(key)) {
      this.candleSubscribers.set(key, new Set());
    }
    this.candleSubscribers.get(key)!.add(callback);

    // Track subscription
    if (!this.tokenSubscriptions.has(tokenAddress)) {
      this.tokenSubscriptions.set(tokenAddress, new Set());

      // Subscribe to Birdeye trades for this token
      this.birdeyeService.subscribeToTrades(
        tokenAddress,
        this.handleTrade.bind(this),
      );

      const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
      this.logger.log(`📊 Started aggregating candles for ${shortAddress}`);
    }

    this.tokenSubscriptions.get(tokenAddress)!.add(timeframe);
    this.logger.log(`Added subscriber for ${key}`);
  }

  /**
   * Unsubscribe from live candle updates
   */
  unsubscribeFromCandles(
    tokenAddress: string,
    timeframe: ChartTimeframe,
    callback: CandleUpdateCallback,
  ): void {
    const key = this.getKey(tokenAddress, timeframe);

    // Remove callback
    const subscribers = this.candleSubscribers.get(key);
    if (subscribers) {
      subscribers.delete(callback);

      if (subscribers.size === 0) {
        this.candleSubscribers.delete(key);
      }
    }

    // Check if we should unsubscribe from token
    const timeframes = this.tokenSubscriptions.get(tokenAddress);
    if (timeframes) {
      timeframes.delete(timeframe);

      if (timeframes.size === 0) {
        this.tokenSubscriptions.delete(tokenAddress);
        this.birdeyeService.unsubscribeFromTrades(
          tokenAddress,
          this.handleTrade.bind(this),
        );

        const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
        this.logger.log(`📊 Stopped aggregating candles for ${shortAddress}`);
      }
    }

    // Clean up live candle
    this.liveCandles.delete(key);
  }

  /**
   * Get current live candle for a token/timeframe
   */
  getCurrentCandle(
    tokenAddress: string,
    timeframe: ChartTimeframe,
  ): OHLCVCandle | null {
    const key = this.getKey(tokenAddress, timeframe);
    const liveCandle = this.liveCandles.get(key);

    if (!liveCandle) {
      return null;
    }

    return this.liveCandleToOHLCV(liveCandle);
  }

  /**
   * Handle incoming trade from Birdeye
   */
  private handleTrade(tradeEvent: BirdeyeTradeEvent): void {
    const { address: tokenAddress, price, volume, timestamp } = tradeEvent.data;

    // Process for all active timeframes for this token
    const timeframes = this.tokenSubscriptions.get(tokenAddress);
    if (!timeframes || timeframes.size === 0) {
      return;
    }

    timeframes.forEach((timeframe) => {
      this.aggregateTrade(tokenAddress, timeframe as ChartTimeframe, price, volume, timestamp);
    });
  }

  /**
   * Aggregate a trade into the appropriate candle
   */
  private aggregateTrade(
    tokenAddress: string,
    timeframe: ChartTimeframe,
    price: number,
    volume: number,
    timestamp: number, // milliseconds
  ): void {
    const key = this.getKey(tokenAddress, timeframe);
    const timeframeMs = this.getTimeframeInMs(timeframe);
    const timestampSeconds = Math.floor(timestamp / 1000);

    // Align timestamp to timeframe boundary
    const alignedTimestamp = Math.floor(timestampSeconds / (timeframeMs / 1000)) * (timeframeMs / 1000);

    // Get or create live candle
    let candle = this.liveCandles.get(key);

    // Strict monotonic check: Ignore trades from the past
    if (candle && alignedTimestamp < candle.timestamp) {
      // Latency or out-of-order packet - ignore strictly to preserve chart history
      return;
    }

    // If timestamp moved forward, create new candle
    if (!candle || alignedTimestamp > candle.timestamp) {
      // If there was an old candle, finalize it
      if (candle) {
        this.finalizeCandle(key, candle);
      }

      // Create new candle
      candle = {
        tokenAddress,
        timeframe,
        timestamp: alignedTimestamp,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume,
        tradeCount: 1,
        lastUpdateTime: Date.now(),
      };

      this.liveCandles.set(key, candle);
      this.logger.debug(`Created new candle for ${key} at ${new Date(alignedTimestamp * 1000).toISOString()}`);
    } else {
      // Update existing candle
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      candle.volume += volume;
      candle.tradeCount++;
      candle.lastUpdateTime = Date.now();
    }

    // Broadcast update (with throttling)
    this.broadcastCandleUpdate(key, candle);
  }

  /**
   * Finalize a candle (when moving to new timeframe)
   */
  private finalizeCandle(key: string, candle: LiveCandle): void {
    this.logger.debug(`Finalizing candle for ${key}: OHLC [${candle.open.toFixed(6)}, ${candle.high.toFixed(6)}, ${candle.low.toFixed(6)}, ${candle.close.toFixed(6)}], Volume: ${candle.volume.toFixed(2)}, Trades: ${candle.tradeCount}`);

    // Send final update without throttle
    const ohlcvCandle = this.liveCandleToOHLCV(candle);
    const subscribers = this.candleSubscribers.get(key);

    if (subscribers && subscribers.size > 0) {
      subscribers.forEach((callback) => {
        try {
          callback(candle.tokenAddress, ohlcvCandle);
        } catch (error) {
          this.logger.error(`Error in candle subscriber callback: ${error.message}`);
        }
      });
    }
  }

  /**
   * Broadcast candle update to subscribers (with throttling)
   */
  private broadcastCandleUpdate(key: string, candle: LiveCandle): void {
    const ohlcvCandle = this.liveCandleToOHLCV(candle);

    // Store pending update
    this.pendingUpdates.set(key, ohlcvCandle);

    // Check if we have an active throttle for this key
    if (this.throttleMap.has(key)) {
      return; // Update will be sent when throttle expires
    }

    // Send update immediately
    this.sendCandleUpdate(key, ohlcvCandle);

    // Set throttle (1 second)
    const throttleTimeout = setTimeout(() => {
      this.throttleMap.delete(key);

      // Send pending update if any
      const pendingUpdate = this.pendingUpdates.get(key);
      if (pendingUpdate) {
        this.sendCandleUpdate(key, pendingUpdate);
        this.pendingUpdates.delete(key);
      }
    }, 1000);

    this.throttleMap.set(key, throttleTimeout);
  }

  /**
   * Send candle update to subscribers
   */
  private sendCandleUpdate(key: string, candle: OHLCVCandle): void {
    const subscribers = this.candleSubscribers.get(key);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const [tokenAddress] = key.split('_');

    subscribers.forEach((callback) => {
      try {
        callback(tokenAddress, candle);
      } catch (error) {
        this.logger.error(`Error in candle subscriber callback: ${error.message}`);
      }
    });
  }

  /**
   * Convert LiveCandle to OHLCVCandle
   */
  private liveCandleToOHLCV(candle: LiveCandle): OHLCVCandle {
    return {
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    };
  }

  /**
   * Generate key for maps
   */
  private getKey(tokenAddress: string, timeframe: ChartTimeframe | string): string {
    return `${tokenAddress}_${timeframe}`;
  }

  /**
   * Get timeframe duration in milliseconds
   */
  private getTimeframeInMs(timeframe: ChartTimeframe): number {
    const mapping: Record<ChartTimeframe, number> = {
      [ChartTimeframe.ONE_MINUTE]: 60 * 1000,
      [ChartTimeframe.FIVE_MINUTES]: 5 * 60 * 1000,
      [ChartTimeframe.FIFTEEN_MINUTES]: 15 * 60 * 1000,
      [ChartTimeframe.ONE_HOUR]: 60 * 60 * 1000,
      [ChartTimeframe.FOUR_HOURS]: 4 * 60 * 60 * 1000,
      [ChartTimeframe.ONE_DAY]: 24 * 60 * 60 * 1000,
      [ChartTimeframe.ONE_WEEK]: 7 * 24 * 60 * 60 * 1000,
    };

    return mapping[timeframe] || 60 * 60 * 1000;
  }

  /**
   * Get statistics about active aggregations
   */
  getStats(): {
    activeTokens: number;
    activeCandles: number;
    totalSubscribers: number;
  } {
    let totalSubscribers = 0;
    this.candleSubscribers.forEach((subscribers) => {
      totalSubscribers += subscribers.size;
    });

    return {
      activeTokens: this.tokenSubscriptions.size,
      activeCandles: this.liveCandles.size,
      totalSubscribers,
    };
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up CandleAggregatorService...');

    // Clear all throttle timeouts
    this.throttleMap.forEach((timeout) => clearTimeout(timeout));
    this.throttleMap.clear();

    // Clear all data
    this.liveCandles.clear();
    this.candleSubscribers.clear();
    this.tokenSubscriptions.clear();
    this.pendingUpdates.clear();
  }
}

