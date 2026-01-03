import {
  DeepPartial,
  ChartOptions,
  ColorType,
  LineStyle,
  CandlestickSeriesPartialOptions,
  HistogramSeriesPartialOptions,
} from 'lightweight-charts';
import { ChartTimeframe } from '@/types/api';

// Re-export ChartTimeframe for convenience
export { ChartTimeframe } from '@/types/api';

/**
 * ========================================
 * CENTRALIZED THEME CONFIGURATION
 * ========================================
 */

export const CHART_COLORS = {
  // Background colors
  background: {
    primary: '#0a0a0a', // Main chart background (TradingView style)
    secondary: '#0B0A14', // Secondary background for TokenChart
  },
  // Text colors
  text: {
    primary: '#94a3b8', // Muted gray for axis text
    secondary: '#C3C2D4', // Lighter gray for secondary text
  },
  // Grid colors
  grid: {
    vertical: 'rgba(255, 255, 255, 0.08)', // Subtle vertical lines
    horizontal: 'rgba(255, 255, 255, 0.1)', // Slightly more visible horizontal lines
    secondaryVertical: '#151320', // Secondary grid for TokenChart
    secondaryHorizontal: '#151320',
  },
  // Border colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',
    secondary: '#1F1B2D',
  },
  // Candlestick colors
  candle: {
    upColor: '#10b981', // Emerald green for bullish
    downColor: '#ef4444', // Red for bearish
    upColorAlt: '#4ADE80', // Alternative green for TokenChart
    downColorAlt: '#EF4444', // Alternative red
  },
  // Volume colors
  volume: {
    base: 'rgba(100, 116, 139, 0.2)', // Very subtle gray-blue
    up: 'rgba(16, 185, 129, 0.3)', // Green transparent
    down: 'rgba(239, 68, 68, 0.3)', // Red transparent
  },
  // Crosshair colors
  crosshair: {
    line: 'rgba(255, 255, 255, 0.3)',
    labelBackground: 'rgba(139, 92, 246, 0.9)', // Purple label
  },
  // Price line colors
  priceLine: {
    trigger: '#a855f7', // Purple for trigger price
    current: '#c084fa', // Lighter purple for current price
    takeProfit: '#10b981', // Green
    stopLoss: '#ef4444', // Red
    default: '#ffffff',
  },
} as const;

/**
 * ========================================
 * TIMEFRAME CONFIGURATION
 * ========================================
 */

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
 * ========================================
 * CHART OPTION PRESETS
 * ========================================
 */

/**
 * Get professional chart options with premium dark theme (TradingChart)
 */
export function getChartOptions(): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: {
        type: ColorType.Solid,
        color: CHART_COLORS.background.primary,
      },
      textColor: CHART_COLORS.text.primary,
      fontSize: 12,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
    },
    grid: {
      vertLines: {
        color: CHART_COLORS.grid.vertical,
        style: LineStyle.Solid,
        visible: true,
      },
      horzLines: {
        color: CHART_COLORS.grid.horizontal,
        style: LineStyle.Solid,
        visible: true,
      },
    },
    crosshair: {
      mode: 1, // Magnet mode - snaps to candles
      vertLine: {
        color: CHART_COLORS.crosshair.line,
        width: 1,
        style: LineStyle.Solid,
        labelBackgroundColor: CHART_COLORS.crosshair.labelBackground,
        labelVisible: true,
      },
      horzLine: {
        color: CHART_COLORS.crosshair.line,
        width: 1,
        style: LineStyle.Solid,
        labelBackgroundColor: CHART_COLORS.crosshair.labelBackground,
        labelVisible: true,
      },
    },
    rightPriceScale: {
      autoScale: true, // CRITICAL: Enable auto-scaling for proper price range
      mode: 0, // Normal mode (not logarithmic)
      invertScale: false,
      borderColor: CHART_COLORS.border.primary,
      borderVisible: false, // Cleaner look without border
      scaleMargins: {
        top: 0.1, // 10% empty space at top
        bottom: 0.2, // 20% empty space at bottom for volume
      },
      alignLabels: true,
      textColor: CHART_COLORS.text.primary,
      visible: true,
      entireTextOnly: false,
    },
    timeScale: {
      borderColor: CHART_COLORS.border.primary,
      borderVisible: false, // Cleaner look without border
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: false, // Allow scrolling to edges
      fixRightEdge: false,
      lockVisibleTimeRangeOnResize: false, // Allow resizing to adjust visible range
      rightOffset: 12, // Space on the right (TradingView style)
      barSpacing: 8, // CRITICAL: 8 pixels between bars for better visibility
      minBarSpacing: 0.5, // Minimum spacing when zoomed in
      rightBarStaysOnScroll: true, // Keep latest bar visible when scrolling
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
 * Get simple chart options for TokenChart
 */
export function getSimpleChartOptions(height: number = 320): DeepPartial<ChartOptions> {
  return {
    width: undefined, // Auto-size width
    height,
    layout: {
      background: {
        type: ColorType.Solid,
        color: CHART_COLORS.background.secondary,
      },
      textColor: CHART_COLORS.text.secondary,
    },
    grid: {
      vertLines: { color: CHART_COLORS.grid.secondaryVertical },
      horzLines: { color: CHART_COLORS.grid.secondaryHorizontal },
    },
    rightPriceScale: {
      borderColor: CHART_COLORS.border.secondary,
      autoScale: true,
    },
    timeScale: {
      borderColor: CHART_COLORS.border.secondary,
      timeVisible: true,
      secondsVisible: false,
    },
    crosshair: {
      mode: 1, // Magnet mode
    },
  };
}

/**
 * ========================================
 * DYNAMIC PRECISION CALCULATION
 * ========================================
 */

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
 * ========================================
 * SERIES OPTIONS
 * ========================================
 */

/**
 * Get professional candlestick series options
 * @param currentPrice - Optional current price for dynamic precision calculation
 */
export function getCandlestickOptions(
  currentPrice?: number
): CandlestickSeriesPartialOptions {
  const priceFormat = currentPrice
    ? getDynamicPrecision(currentPrice)
    : { precision: 2, minMove: 0.01 }; // Default fallback

  return {
    upColor: CHART_COLORS.candle.upColor,
    downColor: CHART_COLORS.candle.downColor,
    borderVisible: true,
    wickVisible: true,
    wickUpColor: CHART_COLORS.candle.upColor,
    wickDownColor: CHART_COLORS.candle.downColor,
    borderUpColor: CHART_COLORS.candle.upColor,
    borderDownColor: CHART_COLORS.candle.downColor,
    priceFormat: {
      type: 'price' as const,
      precision: priceFormat.precision,
      minMove: priceFormat.minMove,
    },
    lastValueVisible: true, // Show last value on price scale
    priceLineVisible: true, // Show price line
    priceLineWidth: 1,
    priceLineColor: CHART_COLORS.priceLine.default,
    priceLineStyle: 2, // Dashed
  };
}

/**
 * Get simple candlestick options for TokenChart
 */
export function getSimpleCandlestickOptions(): CandlestickSeriesPartialOptions {
  return {
    upColor: CHART_COLORS.candle.upColorAlt,
    downColor: CHART_COLORS.candle.downColorAlt,
    borderVisible: false,
    wickUpColor: CHART_COLORS.candle.upColorAlt,
    wickDownColor: CHART_COLORS.candle.downColorAlt,
    priceFormat: {
      type: 'price' as const,
      precision: 4,
      minMove: 0.0001,
    },
  };
}

/**
 * Get professional volume histogram options
 */
export function getVolumeOptions(): HistogramSeriesPartialOptions {
  return {
    color: CHART_COLORS.volume.base,
    priceFormat: {
      type: 'volume' as const,
    },
    priceScaleId: 'volume', // Separate scale for volume
    lastValueVisible: false, // Don't show volume value on price scale
    priceLineVisible: false,
  };
}

/**
 * ========================================
 * PRICE LINE OPTIONS
 * ========================================
 */

/**
 * Get trigger price line options (user's strategy trigger)
 */
export function getTriggerLineOptions(color: string = CHART_COLORS.priceLine.trigger) {
  return {
    price: 0,
    color,
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
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
    color: CHART_COLORS.priceLine.current,
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
    color: CHART_COLORS.priceLine.takeProfit,
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
    color: CHART_COLORS.priceLine.stopLoss,
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: 'Stop Loss',
  };
}

/**
 * ========================================
 * FORMATTING UTILITIES
 * ========================================
 */

/**
 * Format price based on magnitude
 */
export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';

  if (price < 0.00000001) {
    return `$${price.toFixed(12)}`;
  } else if (price < 0.0000001) {
    return `$${price.toFixed(11)}`;
  } else if (price < 0.000001) {
    return `$${price.toFixed(10)}`;
  } else if (price < 0.00001) {
    return `$${price.toFixed(9)}`;
  } else if (price < 0.0001) {
    return `$${price.toFixed(8)}`;
  } else if (price < 0.001) {
    return `$${price.toFixed(7)}`;
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
  return percent >= 0 ? CHART_COLORS.candle.upColor : CHART_COLORS.candle.downColor;
}

/**
 * ========================================
 * MOCK DATA GENERATION
 * ========================================
 */

/**
 * Generate mock OHLCV data for testing/fallback
 */
export function generateMockCandles(
  count: number = 200,
  basePrice: number = 1.0
): Array<{
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
