'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, formatVolume, formatPercentChange } from '@/lib/chartConfig';

interface ChartHeaderProps {
  tokenSymbol: string;
  currentPrice: number | null;
  priceChange24h?: number | null;
  priceChange24hPercent?: number | null;
  volume?: number | null;
  type: 'sell' | 'buy';
  className?: string;
}

export function ChartHeader({
  tokenSymbol,
  currentPrice,
  priceChange24h,
  priceChange24hPercent,
  volume,
  type,
  className,
}: ChartHeaderProps) {
  const isPositiveChange = priceChange24hPercent !== null && priceChange24hPercent !== undefined && priceChange24hPercent >= 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3',
        'bg-gray-900/40 backdrop-blur-sm',
        'border-b border-white/5',
        className
      )}
    >
      {/* Left Side: Token Info and Price */}
      <div className="flex items-center gap-4">
        {/* Token Symbol */}
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-white">
            {tokenSymbol}
            <span className="text-gray-500 text-sm font-normal">/USD</span>
          </h3>
        </div>

        {/* Current Price */}
        {currentPrice && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatPrice(currentPrice)}
            </span>

            {/* 24h Change */}
            {priceChange24hPercent !== null && priceChange24hPercent !== undefined && (
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium tabular-nums',
                  isPositiveChange
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                )}
              >
                {isPositiveChange ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{formatPercentChange(priceChange24hPercent)}</span>
              </div>
            )}
          </div>
        )}

        {/* Volume (optional) */}
        {volume !== null && volume !== undefined && (
          <div className="hidden md:flex flex-col">
            <span className="text-xs text-gray-500">24h Volume</span>
            <span className="text-sm font-medium text-gray-300 tabular-nums">
              {formatVolume(volume)}
            </span>
          </div>
        )}
      </div>

      {/* Right Side: Chart Type Badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium',
            type === 'sell'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          )}
        >
          {type === 'sell' ? 'Sell Token' : 'Buy Token'}
        </span>
      </div>
    </div>
  );
}
