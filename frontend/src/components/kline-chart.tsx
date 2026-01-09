"use client";

import React, { useEffect, useRef, useState } from 'react';
// KLineChartPro and CSS are dynamically imported to avoid SSR issues
import { api } from '@/lib/api';
import { ChartTimeframe, OHLCVCandle, ChartUpdateEvent } from '@/types/api';
import { wsClient, WS_EVENTS } from '@/lib/websocket';

type ChartDisplayMode = 'price' | 'mcap';

// ============================================
// Types & Interfaces
// ============================================

interface Period {
    multiplier: number;
    timespan: string;
    text: string;
}

interface SymbolInfo {
    ticker: string;
    name?: string;
    shortName?: string;
    exchange?: string;
    market?: string;
    pricePrecision?: number;
    volumePrecision?: number;
    priceCurrency?: string;
    type?: string;
    logo?: string;
}

interface KLineData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    turnover?: number;
    [key: string]: number | undefined; // Index signature for klinecharts compatibility
}

interface DatafeedSubscribeCallback {
    (data: KLineData): void;
}

interface Datafeed {
    searchSymbols?: (search?: string) => Promise<SymbolInfo[]>;
    getHistoryKLineData: (
        symbol: SymbolInfo,
        period: Period,
        from: number,
        to: number
    ) => Promise<KLineData[]>;
    subscribe: (
        symbol: SymbolInfo,
        period: Period,
        callback: DatafeedSubscribeCallback
    ) => void;
    unsubscribe: (symbol: SymbolInfo, period: Period) => void;
}

// ============================================
// Constants
// ============================================

const PERIODS: Period[] = [
    { multiplier: 1, timespan: 'minute', text: '1m' },
    { multiplier: 5, timespan: 'minute', text: '5m' },
    { multiplier: 15, timespan: 'minute', text: '15m' },
    { multiplier: 1, timespan: 'hour', text: '1H' },
    { multiplier: 4, timespan: 'hour', text: '4H' },
    { multiplier: 1, timespan: 'day', text: '1D' },
];

// Map our ChartTimeframe to KLineChart Period
const timeframeToPeriod = (tf: ChartTimeframe): Period => {
    switch (tf) {
        case ChartTimeframe.ONE_MINUTE:
            return PERIODS[0];
        case ChartTimeframe.FIVE_MINUTES:
            return PERIODS[1];
        case ChartTimeframe.FIFTEEN_MINUTES:
            return PERIODS[2];
        case ChartTimeframe.ONE_HOUR:
            return PERIODS[3];
        case ChartTimeframe.FOUR_HOURS:
            return PERIODS[4];
        case ChartTimeframe.ONE_DAY:
            return PERIODS[5];
        default:
            return PERIODS[3]; // Default to 1H
    }
};

// Map Period back to ChartTimeframe for API calls
const periodToTimeframe = (period: Period): ChartTimeframe => {
    if (period.timespan === 'minute') {
        if (period.multiplier === 1) return ChartTimeframe.ONE_MINUTE;
        if (period.multiplier === 5) return ChartTimeframe.FIVE_MINUTES;
        if (period.multiplier === 15) return ChartTimeframe.FIFTEEN_MINUTES;
    }
    if (period.timespan === 'hour') {
        if (period.multiplier === 1) return ChartTimeframe.ONE_HOUR;
        if (period.multiplier === 4) return ChartTimeframe.FOUR_HOURS;
    }
    if (period.timespan === 'day') {
        return ChartTimeframe.ONE_DAY;
    }
    return ChartTimeframe.ONE_HOUR;
};

// ============================================
// Data Mapping
// ============================================

// ============================================
// Data Mapping
// ============================================

/**
 * Maps our OHLCVCandle data to KLineChart format
 * Birdeye provides timestamp in SECONDS, KLineChart expects MILLISECONDS
 * @param multiplier - optional multiplier for MCAP mode (circulating supply)
 */
const mapToKLineData = (candles: OHLCVCandle[], multiplier: number = 1): KLineData[] => {
    return candles.map((c) => ({
        timestamp: (c.timestamp ?? 0) * 1000, // Convert seconds to milliseconds
        open: c.open * multiplier,
        high: c.high * multiplier,
        low: c.low * multiplier,
        close: c.close * multiplier,
        volume: c.volume ?? 0,
    }));
};

// ============================================
// Custom Datafeed for Birdeye API
// ============================================

class BirdeyeDatafeed implements Datafeed {
    private tokenAddress: string;
    private multiplier: number; // For MCAP mode: circulatingSupply, for price mode: 1
    private subscriptions: Map<string, NodeJS.Timeout> = new Map();
    // Track if we've reached the end of history for a specific period
    private noMoreHistory: Map<string, boolean> = new Map();

    // Keep track of loaded history to prevent overlapping fetches/duplicates
    // However, KLineChart handles data storage, we just need to provide correct ranges

    constructor(tokenAddress: string, multiplier: number = 1) {
        this.tokenAddress = tokenAddress;
        this.multiplier = multiplier;
    }

    // Not implemented - we don't have search functionality
    async searchSymbols(): Promise<SymbolInfo[]> {
        return [];
    }

    async getHistoryKLineData(
        symbol: SymbolInfo,
        period: Period,
        from: number, // Milliseconds
        to: number    // Milliseconds
    ): Promise<KLineData[]> {
        try {
            const timeframe = periodToTimeframe(period);
            const periodKey = period.text; // e.g. "1H", "15m"

            // Check if we already know there's no more history
            if (this.noMoreHistory.get(periodKey)) {
                // If we hit the end, stop fetching immediately
                // This prevents the "infinite scroll into garbage" issue
                return [];
            }

            // Convert to SECONDS for Birdeye API
            // Birdeye API expects 'to' and 'from' in seconds
            const fromSeconds = Math.floor(from / 1000);
            const toSeconds = Math.floor(to / 1000);

            console.log(
                '📊 [KLineChart] Fetching range:',
                new Date(from),
                '→',
                new Date(to),
                `(${fromSeconds} → ${toSeconds})`
            );

            // Calculate limit based on time difference and period to roughly match
            // But we can just rely on from/to being correct if the API supports it
            // api.getPriceHistory uses limit, so we might need to be careful if it ignores from/to
            // Our updated API uses from/to if provided

            // Limit is less relevant when we provide explicit from/to, but we provide a high default
            // Clamping to 500 to match backend validation MAX limit
            const limit = 500;

            const response = await api.getPriceHistory(
                this.tokenAddress,
                timeframe,
                limit,
                fromSeconds,
                toSeconds
            );

            if (!response || !response.data?.candles || response.data.candles.length === 0) {
                console.warn('📊 [KLineChart] No data received from API - End of History reached');
                this.noMoreHistory.set(periodKey, true);
                return [];
            }

            // Deduplication and Sorting (Uniqueness/Order Contract)
            // Ideally the API returns sorted unique data, but we enforce it here
            const klineData = mapToKLineData(response.data.candles, this.multiplier);

            // Deduplicate by timestamp
            const uniqueMap = new Map<number, KLineData>();
            for (const item of klineData) {
                uniqueMap.set(item.timestamp, item);
            }

            const sortedData = Array.from(uniqueMap.values()).sort((a, b) => a.timestamp - b.timestamp);

            console.log(`📊 [KLineChart] Mapped & Sorted ${sortedData.length} candles`);

            return sortedData;
        } catch (error) {
            console.error('📊 [KLineChart] Error fetching data:', error);
            return [];
        }
    }

    private callbackMap: Map<string, DatafeedSubscribeCallback> = new Map();

    subscribe(
        symbol: SymbolInfo,
        period: Period,
        callback: DatafeedSubscribeCallback
    ): void {
        const key = `${symbol.ticker}-${period.text}`;
        const timeframe = periodToTimeframe(period);

        console.log(`📊 [KLineChart] Subscribing via WebSocket to ${key}`);

        // Store callback to use when event arrives
        this.callbackMap.set(key, callback);

        // Always listen for updates (in case we reconnect or are already capable of receiving)
        // wsClient handles multiple listeners gracefully
        wsClient.on(WS_EVENTS.CHART_UPDATE, this.handleWebsocketUpdate);

        // Attempt to send subscription message
        const sendSubscription = () => {
            if (wsClient.isConnected()) {
                wsClient.send('subscribe_chart', { tokenAddress: this.tokenAddress, timeframe });
                console.log(`📊 [KLineChart] Subscription request sent for ${key}`);
                return true;
            }
            return false;
        };

        if (!sendSubscription()) {
            console.log(`📊 [KLineChart] WebSocket not ready, scheduling retry for ${key}`);

            // Retry logic: try every 1s for 30s
            let attempts = 0;
            const maxAttempts = 30;
            const interval = setInterval(() => {
                attempts++;
                if (sendSubscription() || attempts >= maxAttempts) {
                    clearInterval(interval);
                    if (attempts >= maxAttempts) {
                        console.warn(`📊 [KLineChart] Failed to subscribe to ${key} after ${maxAttempts} attempts`);
                    }
                }
            }, 1000);

            // Track this interval to clear it on unsubscribe
            this.subscriptions.set(key, interval);
        }
    }

    unsubscribe(symbol: SymbolInfo, period: Period): void {
        const key = `${symbol.ticker}-${period.text}`;
        console.log(`📊 [KLineChart] Unsubscribing from ${key}`);

        this.callbackMap.delete(key);

        // Unsubscribe from backend
        if (wsClient.isConnected()) {
            const timeframe = periodToTimeframe(period);
            wsClient.send('unsubscribe_chart', { tokenAddress: this.tokenAddress, timeframe });
        }

        // If no more callbacks, we could remove the listener, but for simplicity we keep it
        // The handler checks if callback exists
    }

    // Cleanup all subscriptions
    dispose(): void {
        // Unsubscribe all
        this.subscriptions.forEach((val, key) => {
            // ... logic if we used subscriptions map, but we use callbackMap now
        });

        // Remove global listener
        wsClient.off(WS_EVENTS.CHART_UPDATE, this.handleWebsocketUpdate);

        this.callbackMap.clear();
        this.subscriptions.clear();
    }

    /**
     * Handle incoming WebSocket updates
     * Normalizes timestamps and updates the chart via the stored callback
     */
    private handleWebsocketUpdate = (event: ChartUpdateEvent) => {
        // Verify this update is for our token
        if (event.tokenAddress !== this.tokenAddress) return;

        // Convert backend timeframe to period text to find callback
        const periodText = PERIODS.find(p => periodToTimeframe(p) === event.timeframe)?.text;
        if (!periodText) return;

        const key = `${this.tokenAddress}-${periodText}`;
        const callback = this.callbackMap.get(key);

        if (!callback) return;

        // Normalize timestamp to candle start (if not already)
        // KLineChart expects milliseconds
        const candleTimestampMs = (event.candle.timestamp ?? 0) * 1000;

        // Construct KLineData - apply multiplier for MCAP mode
        const klineData: KLineData = {
            timestamp: candleTimestampMs,
            open: event.candle.open * this.multiplier,
            high: event.candle.high * this.multiplier,
            low: event.candle.low * this.multiplier,
            close: event.candle.close * this.multiplier,
            volume: event.candle.volume ?? 0,
        };

        // Pass to KLineChart
        // The library handles "update current" vs "add new" based on timestamp matching
        callback(klineData);
    };
}

/**
 * Calculate dynamic precision based on price magnitude
 */
const calculatePrecision = (price: number): { pricePrecision: number; volumePrecision: number } => {
    if (!price || price === 0) return { pricePrecision: 2, volumePrecision: 2 };

    // Adjust logic to match plan
    if (price > 1) return { pricePrecision: 2, volumePrecision: 2 };
    if (price > 0.1) return { pricePrecision: 4, volumePrecision: 2 };
    if (price > 0.01) return { pricePrecision: 5, volumePrecision: 2 };
    if (price > 0.0001) return { pricePrecision: 6, volumePrecision: 2 };

    // For very small tokens < 0.0001
    return { pricePrecision: 10, volumePrecision: 2 };
};

/**
 * Format MCAP value with K/M/B notation
 * Used for Y-axis labels in MCAP mode
 */
const formatMcapValue = (value: number): string => {
    if (value === 0) return '$0';
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e9) {
        return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
    }
    if (absValue >= 1e6) {
        return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
    }
    if (absValue >= 1e3) {
        return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
    }
    return `${sign}$${absValue.toFixed(2)}`;
};

// ============================================
// KLineChart Component
// ============================================

interface KLineChartProps {
    tokenAddress: string;
    symbol: string;
    timeframe?: ChartTimeframe;
    onTimeframeChange?: (timeframe: ChartTimeframe) => void;
    chartMode?: ChartDisplayMode;
    onChartModeChange?: (mode: ChartDisplayMode) => void;
}

export default function KLineChart({
    tokenAddress,
    symbol,
    timeframe = ChartTimeframe.ONE_HOUR,
    onTimeframeChange,
    chartMode = 'price',
    onChartModeChange,
}: KLineChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null); // Type will be KLineChartPro but loaded dynamically
    const datafeedRef = useRef<BirdeyeDatafeed | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Track current token to detect changes
    const currentTokenRef = useRef<string>('');
    // Store circulating supply for MCAP calculation
    const [circulatingSupply, setCirculatingSupply] = useState<number>(0);
    const [localChartMode, setLocalChartMode] = useState<ChartDisplayMode>(chartMode);

    // Fetch token overview for MCAP support (silent on error)
    useEffect(() => {
        if (!tokenAddress) return;
        let isMounted = true;
        const fetchOverview = async () => {
            try {
                const overview = await api.getTokenOverview(tokenAddress);
                if (isMounted && overview && overview.circulatingSupply) {
                    setCirculatingSupply(overview.circulatingSupply);
                }
            } catch {
                // Silent fail - MCAP toggle will be disabled if supply unavailable
                if (isMounted) setCirculatingSupply(0);
            }
        };
        fetchOverview();
        return () => { isMounted = false; };
    }, [tokenAddress]);

    // ============================================
    // Cleanup function - extracted for reuse
    // ============================================
    const disposeChart = () => {
        console.log('📊 [KLineChart] Disposing chart and clearing data...');

        // Dispose datafeed subscriptions first
        if (datafeedRef.current) {
            datafeedRef.current.dispose();
            datafeedRef.current = null;
        }

        // Dispose chart instance - this clears the canvas
        if (chartRef.current) {
            try {
                // KLineChartPro should have a dispose method
                if (typeof chartRef.current.dispose === 'function') {
                    chartRef.current.dispose();
                }
                // Some versions use destroy instead
                else if (typeof chartRef.current.destroy === 'function') {
                    chartRef.current.destroy();
                }
            } catch (err) {
                console.warn('📊 [KLineChart] Error during dispose:', err);
            }
            chartRef.current = null;
        }

        // Clear the container's innerHTML to remove any lingering canvas elements
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }
    };

    // ============================================
    // Reset state when token changes
    // ============================================
    useEffect(() => {
        // If token changed, reset loading state and dispose old chart
        if (currentTokenRef.current !== tokenAddress) {
            console.log(`📊 [KLineChart] Token changed: ${currentTokenRef.current} → ${tokenAddress}`);

            // Dispose old chart immediately
            disposeChart();

            // Reset states
            setIsLoading(true);
            setError(null);

            // Update ref
            currentTokenRef.current = tokenAddress;
        }
    }, [tokenAddress]);

    // ============================================
    // Initialize chart with dynamic import
    // ============================================
    useEffect(() => {
        // Early return if no container or token
        if (!containerRef.current || !tokenAddress) {
            setIsLoading(false);
            return;
        }

        let isActive = true;

        const initChart = async () => {
            try {
                console.log(`📊 [KLineChart] Loading KLineChartPro dynamically...`);

                // Dynamically import the module and CSS
                // @ts-ignore - CSS import handled at runtime
                await import('@klinecharts/pro/dist/klinecharts-pro.css');
                const { KLineChartPro } = await import('@klinecharts/pro');

                // Check if component was unmounted or token changed during loading
                if (!isActive || !containerRef.current) {
                    console.log('📊 [KLineChart] Component no longer active, aborting init');
                    return;
                }

                // Double-check the token hasn't changed
                if (currentTokenRef.current !== tokenAddress) {
                    console.log('📊 [KLineChart] Token changed during load, aborting');
                    return;
                }

                console.log(`📊 [KLineChart] Initializing chart for ${tokenAddress}`);

                // Determine dynamic precision
                let pricePrecision = 2;
                let volumePrecision = 2;

                try {
                    // Fetch just 1 candle to check the price magnitude
                    // We use the current timeframe to be consistent
                    const history = await api.getPriceHistory(tokenAddress, timeframe, 1);
                    // Check last candle or first candle
                    const sampleCandle = history?.data?.candles?.[history.data.candles.length - 1];

                    if (sampleCandle && sampleCandle.close) {
                        const p = calculatePrecision(sampleCandle.close);
                        pricePrecision = p.pricePrecision;
                        volumePrecision = p.volumePrecision;
                        console.log(`📊 [KLineChart] Dynamic precision for $${sampleCandle.close}: ${pricePrecision}`);
                    }
                } catch (e) {
                    console.warn('📊 [KLineChart] Failed to determine dynamic precision, defaulting to 2');
                }

                // Create new datafeed for this token
                // For MCAP mode: multiply by supply, then divide by 1B to show readable values
                // This shows MCAP in billions (e.g., 77.5 instead of 77,500,000,000)
                let multiplier = 1;
                let displayScale = '';
                if (localChartMode === 'mcap' && circulatingSupply > 0) {
                    // Calculate raw MCAP scale to determine display unit
                    const estimatedMcap = 100 * circulatingSupply; // rough estimate
                    if (estimatedMcap >= 1e9) {
                        multiplier = circulatingSupply / 1e9; // Show in Billions
                        displayScale = 'B';
                    } else if (estimatedMcap >= 1e6) {
                        multiplier = circulatingSupply / 1e6; // Show in Millions
                        displayScale = 'M';
                    } else if (estimatedMcap >= 1e3) {
                        multiplier = circulatingSupply / 1e3; // Show in Thousands
                        displayScale = 'K';
                    } else {
                        multiplier = circulatingSupply;
                    }
                }
                datafeedRef.current = new BirdeyeDatafeed(tokenAddress, multiplier);
                console.log(`📊 [KLineChart] Mode: ${localChartMode}, Multiplier: ${multiplier}, Scale: ${displayScale}`);

                // Symbol name with scale indicator for MCAP mode
                const displayName = localChartMode === 'mcap' && displayScale
                    ? `${symbol} MCAP ($${displayScale})`
                    : symbol;

                // Create chart instance
                chartRef.current = new KLineChartPro({
                    container: containerRef.current,
                    // Symbol info
                    symbol: {
                        ticker: tokenAddress,
                        name: displayName,
                        shortName: displayName,
                        exchange: 'Birdeye',
                        market: 'crypto',
                        priceCurrency: 'USD',
                        type: 'crypto',
                        // For MCAP mode, values are scaled to B/M/K so use 2 decimals
                        pricePrecision: localChartMode === 'mcap' ? 2 : pricePrecision,
                        volumePrecision,
                    },
                    // Default period
                    period: timeframeToPeriod(timeframe),
                    // All available periods
                    periods: PERIODS,
                    // Dark theme
                    theme: 'dark',
                    // Show drawing toolbar on the left
                    drawingBarVisible: true,
                    // Locale
                    locale: 'en-US',
                    // Timezone
                    timezone: 'UTC',
                    // Main chart indicators
                    mainIndicators: ['MA'],
                    // Sub indicators (volume)
                    subIndicators: ['VOL'],
                    // Custom datafeed
                    datafeed: datafeedRef.current,
                    // Custom styles for dark theme
                    styles: {
                        grid: {
                            horizontal: {
                                color: '#27272a', // Zinc-800
                            },
                            vertical: {
                                color: '#27272a', // Zinc-800
                            },
                        },
                        candle: {
                            bar: {
                                upColor: '#22c55e', // Green-500
                                downColor: '#ef4444', // Red-500
                                upBorderColor: '#22c55e',
                                downBorderColor: '#ef4444',
                                upWickColor: '#22c55e',
                                downWickColor: '#ef4444',
                            },
                        },
                        xAxis: {
                            axisLine: {
                                color: '#27272a',
                            },
                        },
                        yAxis: {
                            axisLine: {
                                color: '#27272a',
                            },
                        },
                    },
                    // Price formatter for MCAP mode (K/M/B notation)
                    ...(localChartMode === 'mcap' ? {
                        priceFormatter: (value: number) => formatMcapValue(value),
                    } : {}),
                });

                console.log('📊 [KLineChart] Chart initialized successfully');

                if (isActive) {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('📊 [KLineChart] Failed to initialize chart:', err);
                if (isActive) {
                    setError('Failed to load chart');
                    setIsLoading(false);
                }
            }
        };

        initChart();

        // Cleanup on unmount or dependency change
        return () => {
            isActive = false;
            disposeChart();
        };
    }, [tokenAddress, symbol, localChartMode, circulatingSupply]); // Re-init when mode or supply changes

    // ============================================
    // Handle timeframe changes from parent
    // ============================================
    useEffect(() => {
        if (chartRef.current && timeframe) {
            const period = timeframeToPeriod(timeframe);
            try {
                chartRef.current.setPeriod(period);
            } catch (err) {
                console.warn('📊 [KLineChart] Failed to set period:', err);
            }
        }
    }, [timeframe]);

    // ============================================
    // Render
    // ============================================

    // Show nothing if no token address
    if (!tokenAddress) {
        return (
            <div className="w-full h-full min-h-[400px] bg-zinc-950 rounded-lg overflow-hidden flex items-center justify-center">
                <p className="text-zinc-500">Select a token to view chart</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full min-h-[400px] bg-zinc-950 rounded-lg overflow-hidden flex items-center justify-center">
                <p className="text-zinc-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[400px] bg-zinc-950 rounded-lg overflow-hidden relative">
            {/* MCAP/Price Toggle - Positioned to align with KLineChart Pro header toolbar */}
            <div className="absolute top-[6px] right-[140px] z-[100] flex gap-0.5 bg-zinc-900/95 p-0.5 rounded border border-zinc-700/50">
                <button
                    onClick={() => {
                        setLocalChartMode('price');
                        onChartModeChange?.('price');
                    }}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${localChartMode === 'price'
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                        }`}
                >
                    PRICE
                </button>
                <button
                    onClick={() => {
                        setLocalChartMode('mcap');
                        onChartModeChange?.('mcap');
                    }}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${localChartMode === 'mcap'
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                        }`}
                >
                    MCAP
                </button>
            </div>

            {/* Loading overlay - always on top when loading */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        <p className="text-xs text-zinc-500">Loading {symbol} chart...</p>
                    </div>
                </div>
            )}
            {/* Chart container */}
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
            />
        </div>
    );
}
