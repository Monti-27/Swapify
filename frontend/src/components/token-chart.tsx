"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  CandlestickSeries,
  HistogramSeries,
  Time
} from "lightweight-charts";

interface TokenChartProps {
  data: Array<{
    timestamp?: number; // Unix timestamp in seconds (from OHLCVCandle)
    time?: number; // Alternative field name (milliseconds or seconds)
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  height?: number;
  autoHeight?: boolean;
  onCandleUpdate?: (candle: CandlestickData) => void;
}

export default function TokenChart({ data, height = 320, autoHeight = false, onCandleUpdate }: TokenChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return;

    // Clean up existing chart if present
    if (chart.current) {
      chart.current.remove();
      chart.current = null;
      candleSeries.current = null;
      volumeSeries.current = null;
      setIsChartReady(false);
    }

    const containerHeight = autoHeight ? chartRef.current.clientHeight : height;

    chart.current = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: containerHeight || height, // Fallback if clientHeight is 0
      layout: {
        background: { color: "#0B0A14" },
        textColor: "#C3C2D4",
      },
      grid: {
        vertLines: { color: "#151320" },
        horzLines: { color: "#151320" },
      },
      rightPriceScale: {
        borderColor: "#1F1B2D",
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // Leave space for volume
        },
      },
      timeScale: {
        borderColor: "#1F1B2D",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 6,
        minBarSpacing: 2,
      },
      crosshair: {
        mode: 1, // Magnet mode
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Helper to determine precision dynamically for crypto-friendly formatting
    const formatPrice = (price: number): string => {
      if (price === 0) return '0';
      if (price < 0.00001) return price.toFixed(8); // e.g., 0.00000044
      if (price < 0.01) return price.toFixed(6);    // e.g., 0.004433
      if (price < 1) return price.toFixed(4);       // e.g., 0.4433
      return price.toFixed(2);                      // e.g., 145.20
    };

    // Add candlestick series with custom price formatting
    candleSeries.current = chart.current.addSeries(CandlestickSeries, {
      upColor: "#4ADE80",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#4ADE80",
      wickDownColor: "#EF4444",
      priceFormat: {
        type: 'custom',
        formatter: formatPrice,
        minMove: 0.00000001, // Allow micro-movements for low-value tokens
      },
    });

    // Add volume series
    volumeSeries.current = chart.current.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume", // Use separate price scale
    });

    // Configure volume price scale separately
    chart.current.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.8, // Position at bottom
        bottom: 0,
      },
    });

    // Mark chart as ready
    setIsChartReady(true);
    console.log('📊 [TokenChart] Chart initialized and ready');

    const resizeObserver = new ResizeObserver(() => {
      if (chart.current && chartRef.current) {
        const options: { width: number; height?: number } = { width: chartRef.current.clientWidth };
        if (autoHeight && chartRef.current.clientHeight > 0) {
          options.height = chartRef.current.clientHeight;
        }
        chart.current.applyOptions(options);
      }
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
        candleSeries.current = null;
        volumeSeries.current = null;
      }
    };
  }, [height, autoHeight]);

  // Process and set chart data - only when chart is ready
  useEffect(() => {
    if (!isChartReady || !candleSeries.current || !volumeSeries.current) {
      console.log('📊 [TokenChart] Waiting for chart to be ready...', { isChartReady });
      return;
    }

    if (!data || data.length === 0) {
      console.log('📊 [TokenChart] No data to display');
      return;
    }

    console.log('📊 [TokenChart] Processing data:', data.length, 'candles');

    const candleData: CandlestickData[] = [];
    const volumeData: HistogramData[] = [];

    data.forEach(c => {
      // Handle both timestamp (seconds) and time (milliseconds or seconds) fields
      const timeValue = c.timestamp ?? c.time ?? 0;
      // Normalize to seconds: if > 1e10, assume milliseconds, else assume seconds
      const timeInSeconds = timeValue > 1e10 ? Math.floor(timeValue / 1000) : Math.floor(timeValue);

      // Skip invalid candles
      if (!timeInSeconds || isNaN(c.open) || isNaN(c.close)) {
        console.warn('📊 [TokenChart] Skipping invalid candle:', c);
        return;
      }

      const candlePoint: CandlestickData = {
        time: timeInSeconds as Time,
        open: +c.open,
        high: +c.high,
        low: +c.low,
        close: +c.close,
      };

      candleData.push(candlePoint);

      // Add volume data if available
      if (c.volume !== undefined && c.volume > 0) {
        const volumePoint: HistogramData = {
          time: timeInSeconds as Time,
          value: +c.volume,
          color: c.close >= c.open ? "#4ADE8066" : "#EF444466", // Semi-transparent colors
        };
        volumeData.push(volumePoint);
      }
    });

    if (candleData.length === 0) {
      console.error('📊 [TokenChart] No valid candles after processing');
      return;
    }

    // Sort by time in ascending order (required by Lightweight Charts)
    candleData.sort((a, b) => {
      const timeA = a.time as number;
      const timeB = b.time as number;
      return timeA - timeB;
    });

    volumeData.sort((a, b) => {
      const timeA = a.time as number;
      const timeB = b.time as number;
      return timeA - timeB;
    });

    console.log('📊 [TokenChart] Setting data:', candleData.length, 'candles');

    // Update series data
    candleSeries.current.setData(candleData);
    if (volumeData.length > 0) {
      volumeSeries.current.setData(volumeData);
    }

    // Fit content to view
    if (chart.current) {
      chart.current.timeScale().fitContent();
      // Also do a delayed fitContent to handle any async rendering
      setTimeout(() => {
        chart.current?.timeScale().fitContent();
      }, 100);
    }

    // Trigger callback with latest candle
    if (onCandleUpdate && candleData.length > 0) {
      onCandleUpdate(candleData[candleData.length - 1]);
    }
  }, [data, isChartReady, onCandleUpdate]);

  return (
    <div
      className="rounded-xl bg-[#0B0A14] border border-[#1F1B2D] p-2 h-full"
      style={autoHeight ? { height: '100%' } : {}}
    >
      <div
        ref={chartRef}
        className="w-full h-full"
        style={autoHeight ? { height: '100%' } : { height: `${height}px` }}
      />
    </div>
  );
}
