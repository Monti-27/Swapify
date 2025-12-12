import {
  DeepPartial,
  ChartOptions,
  ColorType,
  LineStyle,
} from 'lightweight-charts';
import { ChartTimeframe } from '@/types/api';

// Re-export ChartTimeframe for convenience
export { ChartTimeframe } from '@/types/api';

export const TIMEFRAME_LABELS: Record<ChartTimeframe, string> = {
  [ChartTimeframe.ONE_MINUTE]: '1m',
  [ChartTimeframe.FIVE_MINUTES]: '5m',
  [ChartTimeframe.FIFTEEN_MINUTES]: '15m',
  [ChartTimeframe.ONE_HOUR]: '1h',
  [ChartTimeframe.FOUR_HOURS]: '4h',
  [ChartTimeframe.ONE_DAY]: '1D',
  [ChartTimeframe.ONE_WEEK]: '1W',
};

export const TIMEFRAMES = [
  ChartTimeframe.ONE_MINUTE,
  ChartTimeframe.FIVE_MINUTES,
  ChartTimeframe.FIFTEEN_MINUTES,
  ChartTimeframe.ONE_HOUR,
  ChartTimeframe.FOUR_HOURS,
  ChartTimeframe.ONE_DAY,
  ChartTimeframe.ONE_WEEK,
];

/**
 * Get professional chart options with premium dark theme
 */
export function getChartOptions(): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: {
        type: ColorType.Solid,
        color: '#0a0a0a', // Explicit dark background (TradingView style)
      },
      textColor: '#94a3b8', // Muted gray for axis text
      fontSize: 12,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
    },
    grid: {
      vertLines: {
        color: 'rgba(255, 255, 255, 0.08)', // Subtle vertical lines (TradingView style)
        style: LineStyle.Solid,
        visible: true,
      },
      horzLines: {
        color: 'rgba(255, 255, 255, 0.1)', // Slightly more visible horizontal lines (TradingView style)
        style: LineStyle.Solid,
        visible: true,
      },
    },
    crosshair: {
      mode: 1, // Magnet mode - snaps to candles
      vertLine: {
        color: 'rgba(255, 255, 255, 0.3)',
        width: 1,
        style: LineStyle.Solid,
        labelBackgroundColor: 'rgba(139, 92, 246, 0.9)', // Purple label
        labelVisible: true,
      },
      horzLine: {
        color: 'rgba(255, 255, 255, 0.3)',
        width: 1,
        style: LineStyle.Solid,
        labelBackgroundColor: 'rgba(139, 92, 246, 0.9)', // Purple label
        labelVisible: true,
      },
    },
    rightPriceScale: {
      autoScale: true, // CRITICAL: Enable auto-scaling for proper price range
      mode: 0, // Normal mode (not logarithmic)
      invertScale: false,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderVisible: false, // Cleaner look without border
      scaleMargins: {
        top: 0.1, // 10% empty space at top (better than 5%)
        bottom: 0.2, // 20% empty space at bottom for volume (TradingView standard)
      },
      alignLabels: true,
      textColor: '#94a3b8',
      visible: true,
      entireTextOnly: false,
    },
    timeScale: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderVisible: false, // Cleaner look without border
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: false, // Allow scrolling to edges
      fixRightEdge: false,
      lockVisibleTimeRangeOnResize: false, // Allow resizing to adjust visible range
      rightOffset: 12, // Space on the right (TradingView style)
      barSpacing: 8, // CRITICAL: 8 pixels between bars for better visibility
      minBarSpacing: 0.5, // Minimum spacing when zoomed in
      rightBarStaysOnScroll: true, // Keep latest bar visible when scrolling (TradingView behavior)
      shiftVisibleRangeOnNewBar: true, // Auto-scroll on new data
      visible: true,
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
    kineticScroll: {
      touch: true,
      mouse: false,
    },
  };
}

/**
 * Calculate dynamic precision based on price magnitude
 * This ensures all token prices display correctly (from $0.000001 to $1000+)
 */
export function getDynamicPrecision(price: number): { precision: number; minMove: number } {
  if (price >= 1000) {
    return { precision: 2, minMove: 0.01 }; // $1000+ → 2 decimals
  } else if (price >= 1) {
    return { precision: 2, minMove: 0.01 }; // $1-$999 → 2 decimals
  } else if (price >= 0.01) {
    return { precision: 4, minMove: 0.0001 }; // $0.01-$0.99 → 4 decimals
  } else if (price >= 0.0001) {
    return { precision: 6, minMove: 0.000001 }; // $0.0001-$0.0099 → 6 decimals
  } else {
    return { precision: 8, minMove: 0.00000001 }; // < $0.0001 → 8 decimals
  }
}

/**
 * Get professional candlestick series options
 * @param currentPrice - Optional current price for dynamic precision calculation
 */
export function getCandlestickOptions(currentPrice?: number) {
  const priceFormat = currentPrice
    ? getDynamicPrecision(currentPrice)
    : { precision: 2, minMove: 0.01 }; // Default fallback

  return {
    upColor: '#10b981', // Emerald green for bullish
    downColor: '#ef4444', // Red for bearish
    borderVisible: true,
    wickVisible: true,
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444',
    borderUpColor: '#10b981',
    borderDownColor: '#ef4444',
    priceFormat: {
      type: 'price' as const,
      precision: priceFormat.precision,
      minMove: priceFormat.minMove,
    },
    lastValueVisible: true, // Show last value on price scale
    priceLineVisible: true, // Show price line
    priceLineWidth: 1,
    priceLineColor: '#ffffff',
    priceLineStyle: 2, // Dashed
  };
}

/**
 * Get professional volume histogram options
 */
export function getVolumeOptions() {
  return {
    color: 'rgba(100, 116, 139, 0.2)', // Very subtle gray-blue
    priceFormat: {
      type: 'volume' as const,
    },
    priceScaleId: 'volume', // Separate scale for volume
    lastValueVisible: false, // Don't show volume value on price scale
    priceLineVisible: false,
  };
}

/**
 * Get trigger price line options (user's strategy trigger)
 */
export function getTriggerLineOptions(color: string = '#8b5cf6') {
  return {
    price: 0,
    color,
    lineWidth: 2,
    lineStyle: LineStyle.Dashed, // Dashed for trigger price
    axisLabelVisible: true,
    title: 'Trigger',
  };
}

/**
 * Get current price line options
 */
export function getCurrentPriceLineOptions() {
  return {
    price: 0,
    color: '#a78bfa', // Lighter purple for current price
    lineWidth: 2,
    lineStyle: LineStyle.Solid,
    axisLabelVisible: true,
    title: 'Current',
  };
}

/**
 * Get take profit line options
 */
export function getTakeProfitLineOptions() {
  return {
    price: 0,
    color: '#10b981', // Green
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: 'Take Profit',
  };
}

/**
 * Get stop loss line options
 */
export function getStopLossLineOptions() {
  return {
    price: 0,
    color: '#ef4444', // Red
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: 'Stop Loss',
  };
}

/**
 * Format price based on magnitude
 */
export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';

  if (price < 0.00001) {
    return `$${price.toExponential(2)}`;
  } else if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  } else if (price < 1) {
    return `$${price.toFixed(4)}`;
  } else if (price < 1000) {
    return `$${price.toFixed(2)}`;
  } else if (price < 1000000) {
    return `$${(price / 1000).toFixed(2)}K`;
  } else {
    return `$${(price / 1000000).toFixed(2)}M`;
  }
}

/**
 * Format volume
 */
export function formatVolume(volume: number): string {
  if (volume === 0) return '0';

  if (volume < 1000) {
    return volume.toFixed(0);
  } else if (volume < 1000000) {
    return `${(volume / 1000).toFixed(2)}K`;
  } else if (volume < 1000000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  } else {
    return `${(volume / 1000000000).toFixed(2)}B`;
  }
}

/**
 * Format percentage change
 */
export function formatPercentChange(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Get color for price change
 */
export function getPriceChangeColor(percent: number): string {
  return percent >= 0 ? '#10b981' : '#ef4444';
}

/**
 * Generate mock OHLCV data for testing/fallback
 */
export function generateMockCandles(count: number = 200, basePrice: number = 1.0): Array<{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const candles = [];
  const now = Math.floor(Date.now() / 1000);
  const interval = 3600; // 1 hour

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * interval;
    const trend = Math.sin(i / 20) * 0.1; // Create wave pattern
    const noise = (Math.random() - 0.5) * 0.05; // Add randomness

    const open = basePrice * (1 + trend + noise);
    const close = open * (1 + (Math.random() - 0.5) * 0.03);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.random() * 100000 + 50000;

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}
