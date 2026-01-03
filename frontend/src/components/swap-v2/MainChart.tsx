"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { createChart, IChartApi, ISeriesApi, LineSeries, CrosshairMode } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSwap } from "./SwapContext";
import { useChartData } from "@/hooks/useChartData";
import { ChartTimeframe } from "@/types/api";

const filters = [
  { label: "1H", value: ChartTimeframe.ONE_HOUR },
  { label: "1D", value: ChartTimeframe.ONE_DAY },
  { label: "1W", value: ChartTimeframe.ONE_WEEK },
];

function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price < 0.00000001) return `$${price.toFixed(12)}`;
  if (price < 0.0000001) return `$${price.toFixed(11)}`;
  if (price < 0.000001) return `$${price.toFixed(10)}`;
  if (price < 0.00001) return `$${price.toFixed(9)}`;
  if (price < 0.0001) return `$${price.toFixed(8)}`;
  if (price < 0.001) return `$${price.toFixed(7)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 0.1) return `$${price.toFixed(5)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 1000) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function ChartSkeleton() {
  return (
    <div className="w-full h-full flex flex-col animate-pulse">
      <div className="flex-1 relative">
        <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between py-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          ))}
        </div>
        <div className="absolute left-20 right-4 top-4 bottom-8">
          <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            <path
              d="M0,150 Q50,140 100,120 T200,100 T300,80 T400,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-zinc-200 dark:text-zinc-800"
            />
          </svg>
        </div>
        <div className="absolute left-20 right-4 bottom-0 flex justify-between">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MainChart() {
  const [activeFilter, setActiveFilter] = React.useState(ChartTimeframe.ONE_HOUR);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { outputToken } = useSwap();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  const { candles, loading, currentPrice, priceChange24h, priceChange24hPercent, setTimeframe } = useChartData({
    tokenAddress: outputToken.address,
    timeframe: activeFilter,
    enabled: true,
  });

  const chartData = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    
    return candles.map((candle) => ({
      time: (candle.timestamp || candle.time || 0) as number,
      value: candle.close,
    })).sort((a, b) => a.time - b.time);
  }, [candles]);

  const priceChangePercent = priceChange24hPercent ?? 0;
  const isPositive = priceChangePercent >= 0;
  const lineColor = isPositive ? '#22C55E' : '#EF4444';

    useEffect(() => {
      if (!containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        layout: {
          background: { color: "transparent" },
          textColor: isDark ? "#A1A1AA" : "#71717A",
          fontFamily: "'SF Pro Rounded', system-ui, -apple-system, sans-serif",
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: isDark ? "#27272A" : "#E4E4E7", style: 1 },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: lineColor,
            width: 1,
            style: 2,
            labelVisible: false,
          },
          horzLine: {
            color: lineColor,
            width: 1,
            style: 2,
            labelVisible: true,
          },
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          secondsVisible: false,
        },
        handleScale: false,
        handleScroll: false,
      });

      const lineSeries = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: lineColor,
        crosshairMarkerBorderColor: isDark ? "#0D0D12" : "#FFFFFF",
        crosshairMarkerBorderWidth: 2,
        priceFormat: {
          type: "custom",
          formatter: (price: number) => formatPrice(price).replace("$", ""),
        },
      });

      chartRef.current = chart;
      seriesRef.current = lineSeries;
      setIsChartReady(true);

      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
        setIsChartReady(false);
      };
    }, []); // Only initialize once

    useEffect(() => {
      if (chartRef.current && seriesRef.current) {
        chartRef.current.applyOptions({
          layout: {
            textColor: isDark ? "#A1A1AA" : "#71717A",
          },
          grid: {
            horzLines: { color: isDark ? "#27272A" : "#E4E4E7" },
          },
        });
        seriesRef.current.applyOptions({
          crosshairMarkerBorderColor: isDark ? "#0D0D12" : "#FFFFFF",
        });
      }
    }, [isDark]);

  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      seriesRef.current.applyOptions({
        color: lineColor,
        crosshairMarkerBackgroundColor: lineColor,
      });
      chartRef.current.applyOptions({
        crosshair: {
          vertLine: { color: lineColor },
          horzLine: { color: lineColor },
        },
      });
    }
  }, [lineColor]);

  useEffect(() => {
    if (seriesRef.current && chartData.length > 0 && isChartReady) {
      seriesRef.current.setData(chartData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [chartData, isChartReady]);

  const handleFilterChange = (value: ChartTimeframe) => {
    setActiveFilter(value);
    setTimeframe(value);
  };

  return (
    <div className="bg-white dark:bg-[#0D0D12] rounded-[1rem] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-card border border-zinc-200 dark:border-[#1E1E2E]/50 transition-all flex flex-col h-full min-h-[460px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          {loading ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
              </div>
              <div className="h-10 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse mt-1" />
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse mt-2" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                {outputToken.logoURI && (
                  <img 
                    src={outputToken.logoURI} 
                    alt={outputToken.symbol}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{outputToken.symbol}</span>
              </div>
              <h2 className="text-[2.25rem] font-bold tracking-tight text-swap-foreground leading-tight">
                {formatPrice(currentPrice || 0)}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                {priceChange24h !== null && (
                  <>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={isPositive ? "text-green-500 mb-0.5" : "text-red-500 mb-0.5 rotate-180"}
                    >
                      <polyline points="7 17 17 7 17 17" />
                      <polyline points="7 7 17 7" />
                    </svg>
                    <span className={`text-[0.875rem] font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPrice(Math.abs(priceChange24h))} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex bg-[#E5E5E5] dark:bg-[#18181B] p-1 rounded-md gap-1">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleFilterChange(filter.value)}
              className={cn(
                "px-2.5 py-1 text-[0.75rem] font-medium rounded transition-colors",
                activeFilter === filter.value
                  ? "bg-white dark:bg-[#27272A] text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 w-full min-h-[280px] relative">
        {loading && <ChartSkeleton />}
        {!loading && chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
            No chart data available
          </div>
        )}
      </div>
    </div>
  );
}
