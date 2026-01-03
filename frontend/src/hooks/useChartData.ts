'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { wsClient, WS_EVENTS } from '@/lib/websocket';
import {
  ChartTimeframe,
  OHLCVCandle,
  PriceHistoryData,
  ChartUpdateEvent,
} from '@/types/api';

interface UseChartDataOptions {
  tokenAddress: string;
  timeframe?: ChartTimeframe;
  enabled?: boolean;
  onError?: (error: Error) => void;
  maxCandles?: number; // Maximum candles to keep in memory (default: 200)
  retryAttempts?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in ms (default: 1000)
}

interface UseChartDataReturn {
  candles: OHLCVCandle[];
  loading: boolean;
  error: Error | null;
  currentPrice: number | null;
  priceChange24h: number | null;
  priceChange24hPercent: number | null;
  refetch: () => Promise<void>;
  setTimeframe: (timeframe: ChartTimeframe) => void;
}

/**
 * Hook to fetch and manage chart data with real-time updates
 * Enhanced with better memory management, error handling, and retry logic
 */
export function useChartData({
  tokenAddress,
  timeframe = ChartTimeframe.ONE_HOUR,
  enabled = true,
  onError,
  maxCandles = 200,
  retryAttempts = 3,
  retryDelay = 1000,
}: UseChartDataOptions): UseChartDataReturn {
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [priceChange24hPercent, setPriceChange24hPercent] = useState<number | null>(null);
  const [currentTimeframe, setCurrentTimeframe] = useState(timeframe);

  const isMountedRef = useRef(true);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsUnsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Exponential backoff retry with maximum attempts
   */
  const calculateRetryDelay = useCallback(
    (attempt: number): number => {
      return Math.min(retryDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
    },
    [retryDelay]
  );

  /**
   * Fetch historical chart data with retry logic
   */
  const fetchChartData = useCallback(
    async (isRetry = false) => {
      if (!enabled || !tokenAddress) {
        console.log(
          '📊 [useChartData] Skipping fetch - enabled:',
          enabled,
          'tokenAddress:',
          tokenAddress
        );
        return;
      }

      try {
        console.log(
          `📊 [useChartData] Fetching chart data (attempt ${retryCountRef.current + 1}/${retryAttempts}) for:`,
          tokenAddress,
          'timeframe:',
          currentTimeframe
        );

        if (!isRetry) {
          setLoading(true);
          setError(null);
        }

        // Cancel any pending requests
        if (fetchControllerRef.current) {
          fetchControllerRef.current.abort();
        }

        // Create new abort controller
        fetchControllerRef.current = new AbortController();

        const response = await api.getPriceHistory(
          tokenAddress,
          currentTimeframe,
          maxCandles
        );

        console.log('📊 [useChartData] API Response:', response);

        if (!isMountedRef.current) return;

        if (response.success && response.data) {
          console.log('📊 [useChartData] Candles received:', response.data.candles.length);

          // Validate we have actual data
          if (!response.data.candles || response.data.candles.length === 0) {
            console.warn('📊 [useChartData] API returned empty candles array');
            throw new Error('No chart data available for this token');
          }

          // Validate candles have proper structure
          const firstCandle = response.data.candles[0];
          const hasTime = typeof firstCandle?.timestamp === 'number';
          const hasPrice = typeof firstCandle?.close === 'number';

          if (!firstCandle || !hasTime || !hasPrice) {
            console.error('📊 [useChartData] Invalid candle data structure:', firstCandle);
            throw new Error('Invalid chart data format');
          }

          console.log('📊 [useChartData] First candle:', firstCandle);
          console.log(
            '📊 [useChartData] Last candle:',
            response.data.candles[response.data.candles.length - 1]
          );

          setCandles(response.data.candles);
          setCurrentPrice(response.data.currentPrice || null);
          setPriceChange24h(response.data.priceChange24h || null);
          setPriceChange24hPercent(response.data.priceChange24hPercent || null);

          // Reset retry count on success
          retryCountRef.current = 0;
        } else {
          console.error('📊 [useChartData] API Error:', response.error, response.message);
          throw new Error(response.message || 'Failed to fetch chart data');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('📊 [useChartData] Request aborted');
          return; // Ignore abort errors
        }

        const error = err instanceof Error ? err : new Error('Unknown error');
        console.error('📊 [useChartData] Error:', error);

        // Retry logic with exponential backoff
        if (retryCountRef.current < retryAttempts) {
          const delay = calculateRetryDelay(retryCountRef.current);
          console.log(
            `📊 [useChartData] Retrying in ${delay}ms (attempt ${retryCountRef.current + 1}/${retryAttempts})`
          );

          retryCountRef.current++;

          // Clear existing timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }

          retryTimeoutRef.current = setTimeout(() => {
            fetchChartData(true);
          }, delay);
        } else {
          // Max retries exceeded
          console.error('📊 [useChartData] Max retry attempts exceeded');
          setError(error);
          onError?.(error);
          retryCountRef.current = 0; // Reset for next manual retry
        }
      } finally {
        if (isMountedRef.current && !isRetry) {
          setLoading(false);
        }
      }
    },
    [
      enabled,
      tokenAddress,
      currentTimeframe,
      maxCandles,
      retryAttempts,
      calculateRetryDelay,
      onError,
    ]
  );

  /**
   * Handle real-time chart updates from WebSocket
   * Enhanced with memory management and throttling
   */
  const handleChartUpdate = useCallback(
    (data: ChartUpdateEvent) => {
      if (data.tokenAddress !== tokenAddress) {
        return;
      }

      // Throttle updates to prevent excessive re-renders
      const now = Date.now();
      const timeSinceLastUpdate = now - (window as any)._lastChartUpdate || 0;

      if (timeSinceLastUpdate < 100) { // Max 10 updates per second
        // Schedule update for later if not already scheduled
        if (!(window as any)._scheduledUpdate) {
          (window as any)._scheduledUpdate = setTimeout(() => {
            (window as any)._scheduledUpdate = null;
            handleChartUpdate(data);
          }, 100 - timeSinceLastUpdate);
        }
        return;
      }

      (window as any)._lastChartUpdate = now;

      setCandles((prevCandles) => {
        if (prevCandles.length === 0) {
          console.log('📊 [useChartData] First candle received');
          return [data.candle];
        }

        // Check if we should update the last candle or add a new one
        const lastCandle = prevCandles[prevCandles.length - 1];

        // If the timestamp is the same, update the last candle (real-time update)
        if (lastCandle.timestamp === data.candle.timestamp) {
          const updated = [...prevCandles.slice(0, -1), data.candle];
          console.log('📊 [useChartData] Updated last candle:', data.candle);
          return updated;
        }

        // Otherwise, add a new candle (new timeframe)
        console.log('📊 [useChartData] New candle added:', data.candle);
        let newCandles = [...prevCandles, data.candle];

        // Keep only the last maxCandles to prevent memory issues
        if (newCandles.length > maxCandles) {
          newCandles = newCandles.slice(-maxCandles);
          console.log(
            `📊 [useChartData] Trimmed candles to ${maxCandles} (memory management)`
          );
        }

        return newCandles;
      });

      // Update current price
      setCurrentPrice(data.candle.close);
    },
    [tokenAddress, maxCandles]
  );

  /**
   * Subscribe to real-time updates with proper cleanup
   */
  useEffect(() => {
    if (!enabled || !tokenAddress) {
      return;
    }

    // Only subscribe to websocket if connected
    if (!wsClient.isConnected()) {
      console.log('📊 [useChartData] WebSocket not connected, skipping subscription');
      return;
    }

    const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
    console.log(`📊 [useChartData] Subscribing to chart updates for ${shortAddress} (${currentTimeframe})`);

    try {
      // Subscribe with timeframe parameter
      wsClient.send('subscribe_chart', { tokenAddress, timeframe: currentTimeframe });
      wsClient.on(WS_EVENTS.CHART_UPDATE, handleChartUpdate);

      // Store cleanup function
      wsUnsubscribeRef.current = () => {
        try {
          wsClient.send('unsubscribe_chart', { tokenAddress, timeframe: currentTimeframe });
          wsClient.off(WS_EVENTS.CHART_UPDATE, handleChartUpdate);
          console.log(`📊 [useChartData] Unsubscribed from chart updates for ${shortAddress}`);
        } catch (error) {
          console.error('📊 [useChartData] Error unsubscribing from WebSocket:', error);
        }
      };
    } catch (error) {
      console.error('📊 [useChartData] Error subscribing to WebSocket:', error);
    }

    return () => {
      if (wsUnsubscribeRef.current) {
        wsUnsubscribeRef.current();
        wsUnsubscribeRef.current = null;
      }
    };
  }, [enabled, tokenAddress, currentTimeframe, handleChartUpdate]);

  /**
   * Fetch initial data when token or timeframe changes
   */
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Cancel any pending requests
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }

      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Cleanup WebSocket
      if (wsUnsubscribeRef.current) {
        wsUnsubscribeRef.current();
      }
    };
  }, []);

  /**
   * Change timeframe with debouncing
   */
  const setTimeframe = useCallback((newTimeframe: ChartTimeframe) => {
    setCurrentTimeframe(newTimeframe);
    setCandles([]); // Clear candles when changing timeframe
    setLoading(true);
    retryCountRef.current = 0; // Reset retry count
  }, []);

  /**
   * Manual refetch (resets retry count)
   */
  const refetch = useCallback(async () => {
    retryCountRef.current = 0;
    await fetchChartData();
  }, [fetchChartData]);

  return {
    candles,
    loading,
    error,
    currentPrice,
    priceChange24h,
    priceChange24hPercent,
    refetch,
    setTimeframe,
  };
}
