"use client";

import { useEffect, useRef } from "react";
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
  onCandleUpdate?: (candle: CandlestickData) => void;
}

export default function TokenChart({ data, height = 320, onCandleUpdate }: TokenChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!chartRef.current || chart.current) return;

    chart.current = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
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

    // Add candlestick series
    candleSeries.current = chart.current.addSeries(CandlestickSeries, {
      upColor: "#4ADE80",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#4ADE80",
      wickDownColor: "#EF4444",
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

    const resizeObserver = new ResizeObserver(() => {
      if (chart.current && chartRef.current) {
        chart.current.applyOptions({ width: chartRef.current.clientWidth });
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
  }, [height]);

  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current || !data || data.length === 0) return;

    // Throttle updates to max 10 per second for smooth performance
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) {
      return;
    }
    lastUpdateRef.current = now;

    const candleData: CandlestickData[] = [];
    const volumeData: HistogramData[] = [];

    data.forEach(c => {
      // Handle both timestamp (seconds) and time (milliseconds or seconds) fields
      const timeValue = c.timestamp ?? c.time ?? 0;
      // Normalize to seconds: if > 1e10, assume milliseconds, else assume seconds
      const timeInSeconds = timeValue > 1e10 ? Math.floor(timeValue / 1000) : Math.floor(timeValue);

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

    // Update series data
    candleSeries.current.setData(candleData);
    if (volumeData.length > 0) {
      volumeSeries.current.setData(volumeData);
    }

    // Fit content to view
    if (chart.current) {
      chart.current.timeScale().fitContent();
    }

    // Trigger callback with latest candle
    if (onCandleUpdate && candleData.length > 0) {
      onCandleUpdate(candleData[candleData.length - 1]);
    }
  }, [data, onCandleUpdate]);

  return (
    <div className="rounded-xl bg-[#0B0A14] border border-[#1F1B2D] p-2">
      <div ref={chartRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}
