'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
 */
export function useChartData({
  tokenAddress,
  timeframe = ChartTimeframe.ONE_HOUR,
  enabled = true,
  onError,
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

  /**
   * Fetch historical chart data
   */
  const fetchChartData = useCallback(async () => {
    if (!enabled || !tokenAddress) {
      console.log('📊 [useChartData] Skipping fetch - enabled:', enabled, 'tokenAddress:', tokenAddress);
      return;
    }

    try {
      console.log('📊 [useChartData] Fetching chart data for:', tokenAddress, 'timeframe:', currentTimeframe);
      setLoading(true);
      setError(null);

      // Cancel any pending requests
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }

      // Create new abort controller
      fetchControllerRef.current = new AbortController();

      const response = await api.getPriceHistory(
        tokenAddress,
        currentTimeframe,
        200
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
        if (!firstCandle || typeof firstCandle.timestamp !== 'number' || typeof firstCandle.close !== 'number') {
          console.error('📊 [useChartData] Invalid candle data structure:', firstCandle);
          throw new Error('Invalid chart data format');
        }

        console.log('📊 [useChartData] First candle:', firstCandle);
        console.log('📊 [useChartData] Last candle:', response.data.candles[response.data.candles.length - 1]);

        setCandles(response.data.candles);
        setCurrentPrice(response.data.currentPrice || null);
        setPriceChange24h(response.data.priceChange24h || null);
        setPriceChange24hPercent(response.data.priceChange24hPercent || null);
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
      setError(error);
      onError?.(error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, tokenAddress, currentTimeframe, onError]);

  /**
   * Handle real-time chart updates from WebSocket
   */
  const handleChartUpdate = useCallback(
    (data: ChartUpdateEvent) => {
      if (data.tokenAddress !== tokenAddress) {
        return;
      }

      setCandles((prevCandles) => {
        if (prevCandles.length === 0) {
          return [data.candle];
        }

        // Check if we should update the last candle or add a new one
        const lastCandle = prevCandles[prevCandles.length - 1];

        // If the timestamp is the same, update the last candle
        if (lastCandle.timestamp === data.candle.timestamp) {
          return [...prevCandles.slice(0, -1), data.candle];
        }

        // Otherwise, add a new candle
        const newCandles = [...prevCandles, data.candle];

        // Keep only the last 200 candles to prevent memory issues
        if (newCandles.length > 200) {
          return newCandles.slice(-200);
        }

        return newCandles;
      });

      // Update current price
      setCurrentPrice(data.candle.close);
    },
    [tokenAddress]
  );

  /**
   * Subscribe to real-time updates
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

    console.log(`📊 [useChartData] Subscribing to chart updates for ${tokenAddress}`);

    // Subscribe to WebSocket updates
    try {
      wsClient.subscribeToChart(tokenAddress, currentTimeframe);
      wsClient.on(WS_EVENTS.CHART_UPDATE, handleChartUpdate);
    } catch (error) {
      console.error('📊 [useChartData] Error subscribing to WebSocket:', error);
    }

    return () => {
      console.log(`📊 [useChartData] Unsubscribing from chart updates for ${tokenAddress}`);
      try {
        wsClient.unsubscribeFromChart(tokenAddress);
        wsClient.off(WS_EVENTS.CHART_UPDATE, handleChartUpdate);
      } catch (error) {
        console.error('📊 [useChartData] Error unsubscribing from WebSocket:', error);
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
    };
  }, []);

  /**
   * Change timeframe
   */
  const setTimeframe = useCallback((newTimeframe: ChartTimeframe) => {
    setCurrentTimeframe(newTimeframe);
    setCandles([]); // Clear candles when changing timeframe
    setLoading(true);
  }, []);

  return {
    candles,
    loading,
    error,
    currentPrice,
    priceChange24h,
    priceChange24hPercent,
    refetch: fetchChartData,
    setTimeframe,
  };
}
