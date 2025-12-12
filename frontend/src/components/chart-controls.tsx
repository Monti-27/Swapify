'use client';

import { ChartTimeframe } from '@/types/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChartControlsProps {
  timeframe: ChartTimeframe;
  onTimeframeChange: (timeframe: ChartTimeframe) => void;
  currentPrice?: number;
  priceChange24h?: number;
  volume24h?: number;
  className?: string;
}

const TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
  { value: ChartTimeframe.ONE_MINUTE, label: '1m' },
  { value: ChartTimeframe.FIVE_MINUTES, label: '5m' },
  { value: ChartTimeframe.FIFTEEN_MINUTES, label: '15m' },
  { value: ChartTimeframe.ONE_HOUR, label: '1h' },
  { value: ChartTimeframe.FOUR_HOURS, label: '4h' },
  { value: ChartTimeframe.ONE_DAY, label: '1d' },
  { value: ChartTimeframe.ONE_WEEK, label: '1w' },
];

export function ChartControls({
  timeframe,
  onTimeframeChange,
  currentPrice,
  priceChange24h,
  volume24h,
  className,
}: ChartControlsProps) {
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined || isNaN(price)) {
      return 'N/A';
    }
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(8)}`;
    }
  };

  const formatVolume = (volume: number | null | undefined) => {
    if (volume === null || volume === undefined || isNaN(volume) || volume <= 0) {
      return 'N/A';
    }
    if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `$${(volume / 1_000).toFixed(2)}K`;
    } else {
      return `$${volume.toFixed(2)}`;
    }
  };

  const priceChangePercent = priceChange24h !== null && priceChange24h !== undefined 
    ? (priceChange24h * 100).toFixed(2) 
    : null;
  const isPositiveChange = priceChange24h !== null && priceChange24h !== undefined 
    ? priceChange24h >= 0 
    : false;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Price Info */}
      {currentPrice !== null && currentPrice !== undefined && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">
              {formatPrice(currentPrice)}
            </span>
            {priceChangePercent && (
              <span
                className={cn(
                  'text-sm font-medium',
                  isPositiveChange ? 'text-green-500' : 'text-red-500'
                )}
              >
                {isPositiveChange ? '+' : ''}
                {priceChangePercent}%
              </span>
            )}
          </div>
          {volume24h !== null && volume24h !== undefined && volume24h > 0 && (
            <div className="text-sm text-muted-foreground">
              Vol: {formatVolume(volume24h)}
            </div>
          )}
        </div>
      )}

      {/* Timeframe Selector */}
      <div className="flex gap-1 flex-wrap">
        {TIMEFRAMES.map((tf) => (
          <Button
            key={tf.value}
            variant={timeframe === tf.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTimeframeChange(tf.value)}
            className={cn(
              'px-3 py-1 h-auto text-xs',
              timeframe === tf.value &&
                'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {tf.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
