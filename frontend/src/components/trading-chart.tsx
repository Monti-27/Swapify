'use client';

import React, { useRef, useMemo, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, CandlestickChart } from 'lucide-react';
import { useChartData } from '@/hooks/useChartData';
import {
  getChartOptions,
  getCandlestickOptions,
  getVolumeOptions,
  formatPrice,
  formatPercentChange,
  getPriceChangeColor,
  ChartTimeframe,
} from '@/lib/chartConfig';
import { cn } from '@/lib/utils';
import { ChartHeader } from './chart-header';
import { TimeframeSelector } from './timeframe-selector';
import { ChartControls } from './chart-controls';
import {
  Chart,
  CandlestickSeries,
  HistogramSeries,
  PriceLine,
} from '@/lib/lightweight-charts-wrapper';

interface TradingChartProps {
  tokenAddress: string;
  tokenSymbol: string;
  type: 'sell' | 'buy';
  triggerPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  className?: string;
}

export function TradingChart({
  tokenAddress,
  tokenSymbol,
  type,
  triggerPrice,
  takeProfitPrice,
  stopLossPrice,
  className,
}: TradingChartProps) {
  const chartRef = useRef<IChartApi>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'>>(null);
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<ChartTimeframe>(
    ChartTimeframe.ONE_HOUR
  );

  const {
    candles,
    loading,
    error,
    currentPrice,
    priceChange24h,
    priceChange24hPercent,
    refetch,
    setTimeframe,
  } = useChartData({
    tokenAddress,
    timeframe: selectedTimeframe,
    enabled: !!tokenAddress,
    onError: (err) => {
      console.error('Chart data error:', err);
    },
  });

  // Memoize chart options to prevent unnecessary re-renders
  const chartOptions = useMemo(() => getChartOptions(), []);

  // Memoize candlestick options based on current price
  const candlestickOptions = useMemo(
    () => getCandlestickOptions(currentPrice || undefined),
    [currentPrice]
  );

  // Memoize volume options (static)
  const volumeOptions = useMemo(() => getVolumeOptions(), []);

  // Format candles for the chart (memoized)
  const formattedCandles = useMemo(() => {
    if (!candles.length) return [];

    return candles
      .filter((candle) => {
        // Validate candle data
        return (
          typeof candle.timestamp === 'number' &&
          typeof candle.open === 'number' &&
          typeof candle.high === 'number' &&
          typeof candle.low === 'number' &&
          typeof candle.close === 'number' &&
          !isNaN(candle.timestamp) &&
          !isNaN(candle.open) &&
          !isNaN(candle.high) &&
          !isNaN(candle.low) &&
          !isNaN(candle.close) &&
          candle.high >= candle.low &&
          candle.high >= Math.max(candle.open, candle.close) &&
          candle.low <= Math.min(candle.open, candle.close)
        );
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((candle) => ({
        time: candle.timestamp,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      }));
  }, [candles]);

  // Format volume data (memoized)
  const volumeData = useMemo(() => {
    if (!candles.length) return [];

    return candles.map((candle) => {
      const isUp = candle.close >= candle.open;
      return {
        time: candle.timestamp,
        value: candle.volume || 0,
        color: isUp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      };
    });
  }, [candles]);

  // Handle timeframe change with debouncing
  const handleTimeframeChange = useCallback(
    (newTimeframe: ChartTimeframe) => {
      setSelectedTimeframe(newTimeframe);
      setTimeframe(newTimeframe);
    },
    [setTimeframe]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Chart control handlers
  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().scrollToRealTime();
      console.log('📊 [TradingChart] Reset zoom - scrolled to latest');
    }
  }, []);

  const handleAutoScale = useCallback(() => {
    if (candleSeriesRef.current) {
      candleSeriesRef.current.priceScale().applyOptions({
        autoScale: true,
      });
      console.log('📊 [TradingChart] Auto scale re-enabled');
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    // Note: Fullscreen not implemented - would need a separate container ref
    console.log('📊 [TradingChart] Fullscreen not implemented');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative w-full h-full flex flex-col overflow-hidden rounded-2xl border border-white/5',
        className
      )}
    >
      {/* Professional Chart Header */}
      <ChartHeader
        tokenSymbol={tokenSymbol}
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        priceChange24hPercent={priceChange24hPercent}
        type={type}
      />

      {/* Chart Area Container */}
      <div className="relative flex-1 flex flex-col">
        {/* Top Controls Row */}
        <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-2">
          {/* Timeframe Selector */}
          <TimeframeSelector
            selected={selectedTimeframe}
            onChange={handleTimeframeChange}
          />

          {/* Chart Controls */}
          <ChartControls
            timeframe={selectedTimeframe}
            onTimeframeChange={handleTimeframeChange}
            currentPrice={currentPrice ?? undefined}
            priceChange24h={priceChange24h ?? undefined}
          />
        </div>

        {/* Loading Overlay (initial load) */}
        <AnimatePresence>
          {loading && candles.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-2xl border border-purple-500/20"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-400 text-sm"
              >
                Loading chart data for {tokenSymbol}...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Overlay */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-2xl border border-red-500/20 p-8"
            >
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                Chart Data Unavailable
              </h3>
              <p className="text-gray-400 text-sm text-center mb-2">
                {error.message || 'Unable to load chart data for this token'}
              </p>
              <p className="text-gray-500 text-xs text-center mb-6 font-mono max-w-md">
                Token: {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-8)}
              </p>
              {currentPrice && (
                <div className="mb-6">
                  <p className="text-gray-500 text-xs mb-1">Current Price</p>
                  <p className="text-2xl font-bold text-gray-200">
                    {formatPrice(currentPrice)}
                  </p>
                  {priceChange24hPercent !== null && (
                    <p
                      className={cn(
                        'text-sm font-medium',
                        getPriceChangeColor(priceChange24hPercent)
                      )}
                    >
                      {formatPercentChange(priceChange24hPercent)}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Indicator (when updating existing data) */}
        <AnimatePresence>
          {loading && candles.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-gray-900/80 backdrop-blur-lg rounded-lg border border-gray-700/50"
            >
              <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
              <span className="text-xs text-gray-400">Updating...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Indicator */}
        {
          !error && candles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-2 right-2 z-20 flex items-center gap-2 px-3 py-1.5 bg-gray-900/80 backdrop-blur-md rounded-lg border border-white/5"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"
              />
              <span className="text-xs text-gray-400 font-medium">Live</span>
            </motion.div>
          )
        }
      </div >
    </motion.div >
  );
}
