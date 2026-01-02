"use client";

import React from 'react';
import {
    // Top Bar Icons
    CandlestickChart,
    ChevronDown,
    FunctionSquare, // For fx indicators
    Undo2, // Curved undo
    Redo2, // Curved redo
    Settings,
    Camera,
    Maximize,
    Eye,
    // Left Bar Icons
    Crosshair,
    TrendingUp,
    Slash, // Line
    Paintbrush,
    Type,
    Ruler,
    ZoomIn,
    Magnet,
    Lock,
    EyeOff,
    Smile,
    Trash2,
    MoreHorizontal,
    SlidersHorizontal, // For Fib
    Share2, // For Patterns
    GitCommitHorizontal, // For Prediction
    PenTool, // For Drawing Mode
} from 'lucide-react';
import { ChartTimeframe } from '@/types/api';

interface ChartProWrapperProps {
    children: React.ReactNode;
    symbol: string;
    timeframe: ChartTimeframe;
    onTimeframeChange?: (timeframe: ChartTimeframe) => void;
    priceInfo?: {
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        change?: number;
        changePercent?: number;
        volume?: number;
    };
}

const TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
    { value: ChartTimeframe.ONE_MINUTE, label: '1m' },
    { value: ChartTimeframe.FIVE_MINUTES, label: '5m' },
    { value: ChartTimeframe.FIFTEEN_MINUTES, label: '15m' },
    { value: ChartTimeframe.ONE_HOUR, label: '1h' },
    { value: ChartTimeframe.FOUR_HOURS, label: '4h' },
    { value: ChartTimeframe.ONE_DAY, label: 'D' },
];

// Helper to format price with high precision
const formatPrice = (price: number): string => {
    if (price === 0) return '0';
    if (price < 0.00001) return price.toFixed(8);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
};

const formatVolume = (vol?: number): string => {
    if (!vol) return '0';
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(3)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(3)}K`;
    return vol.toFixed(2);
};

export const ChartProWrapper = ({
    children,
    symbol,
    timeframe,
    onTimeframeChange,
    priceInfo
}: ChartProWrapperProps) => {
    const changeColor = (priceInfo?.changePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
    const timeframeLabel = TIMEFRAMES.find(t => t.value === timeframe)?.label || '1h';

    return (
        <div className="flex flex-col w-full h-full bg-[#131722] border border-[#2A2E39] rounded-sm overflow-hidden font-sans select-none">

            {/* === 1. TOP TOOLBAR === */}
            <div className="h-[38px] border-b border-[#2A2E39] flex items-center justify-between px-2 bg-[#131722] flex-shrink-0">

                {/* LEFT COMPONENT */}
                <div className="flex items-center h-full text-[#B2B5BE]">
                    {/* Timeframes */}
                    <div className="flex items-center gap-0.5 mr-3">
                        {TIMEFRAMES.map(tf => (
                            <button
                                key={tf.value}
                                onClick={() => onTimeframeChange?.(tf.value)}
                                className={`
                  px-2 h-[26px] text-[13px] font-medium rounded hover:bg-[#2A2E39] transition-colors
                  ${tf.value === timeframe ? 'text-[#2962FF] bg-[#2962FF]/10' : 'hover:text-white'}
                `}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-[1px] h-5 bg-[#2A2E39] mx-1" />

                    {/* Chart Types */}
                    <ToolbarGroup>
                        <ToolbarBtn icon={CandlestickChart} />
                    </ToolbarGroup>

                    <div className="w-[1px] h-5 bg-[#2A2E39] mx-1" />

                    {/* Indicators */}
                    <button className="flex items-center gap-1.5 px-2 h-[26px] hover:bg-[#2A2E39] rounded text-[13px] font-medium hover:text-white transition-colors">
                        <FunctionSquare className="w-4 h-4" />
                        <span>Indicators</span>
                    </button>
                </div>

                {/* RIGHT COMPONENT */}
                <div className="flex items-center gap-0.5 text-[#B2B5BE]">
                    {/* Price/MCap (Custom toggle for this app) */}
                    <div className="flex items-center bg-[#1E222D] rounded p-0.5 mr-2">
                        <button className="px-2 py-0.5 text-[11px] font-bold text-[#2962FF] bg-[#2A2E39] rounded shadow-sm">Price</button>
                        <button className="px-2 py-0.5 text-[11px] font-medium hover:text-white">MCap</button>
                    </div>

                    <div className="w-[1px] h-5 bg-[#2A2E39] mx-1" />
                    <ToolbarBtn icon={Undo2} tooltip="Undo" />
                    <ToolbarBtn icon={Redo2} tooltip="Redo" />
                    <div className="w-[1px] h-5 bg-[#2A2E39] mx-1" />
                    <ToolbarBtn icon={Settings} tooltip="Chart properties" />
                    <ToolbarBtn icon={Maximize} tooltip="Fullscreen mode" />
                    <ToolbarBtn icon={Camera} tooltip="Take a snapshot" />
                    <button className="h-[26px] px-3 ml-2 bg-[#2962FF] hover:bg-[#1E53E5] text-white text-[13px] font-medium rounded flex items-center transition-colors">
                        Publish
                    </button>
                </div>
            </div>

            {/* === 2. MAIN CONTENT AREA === */}
            <div className="flex-1 flex min-h-0 relative bg-[#131722]">

                {/* --- LEFT SIDEBAR (Drawing Tools) --- */}
                <div className="w-[52px] border-r border-[#2A2E39] flex flex-col items-center bg-[#131722] z-20 flex-shrink-0 text-[#B2B5BE] overflow-hidden">

                    {/* Scrollable Tools Area */}
                    <div className="flex-1 w-full flex flex-col items-center gap-3 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                        <SidebarBtn icon={Crosshair} active tooltip="Crosshair" />
                        <div className="w-4 h-[1px] bg-[#2A2E39] shrink-0" />
                        <SidebarBtn icon={Slash} tooltip="Trend Line" />
                        <SidebarBtn icon={SlidersHorizontal} tooltip="Fib Retracement" />
                        <SidebarBtn icon={Share2} tooltip="Geometric Shapes" />
                        <SidebarBtn icon={GitCommitHorizontal} tooltip="Prediction Tools" />
                        <SidebarBtn icon={Paintbrush} tooltip="Brush" />
                        <SidebarBtn icon={Type} tooltip="Text" />
                        <SidebarBtn icon={Smile} tooltip="Icons" />

                        <div className="w-4 h-[1px] bg-[#2A2E39] shrink-0" />

                        <SidebarBtn icon={Ruler} tooltip="Measure" />
                        <SidebarBtn icon={ZoomIn} tooltip="Zoom In" />

                        <div className="w-4 h-[1px] bg-[#2A2E39] shrink-0" />

                        <SidebarBtn icon={Magnet} tooltip="Weak Magnet" />
                        <SidebarBtn icon={PenTool} tooltip="Stay in Drawing Mode" />
                        <SidebarBtn icon={Lock} tooltip="Lock All Drawing Tools" />
                        <SidebarBtn icon={EyeOff} tooltip="Hide All Drawings" />
                    </div>

                    {/* Fixed Bottom Action */}
                    <div className="w-full flex justify-center py-2 border-t border-[#2A2E39]/30 bg-[#131722]">
                        <SidebarBtn icon={Trash2} tooltip="Remove Objects" />
                    </div>
                </div>

                {/* --- CHART CANVAS WRAPPER --- */}
                <div className="flex-1 relative min-w-0">

                    {/* OVERLAY: Token Info & OHLC */}
                    {/* Positioned absolute top-left inside the chart area */}
                    <div className="absolute top-3 left-4 z-10 flex flex-col pointer-events-none">
                        {/* Row 1: Token Name, Timeframe, Exchange */}
                        <div className="flex items-baseline gap-2 text-[15px]">
                            <span className="font-bold text-white">{symbol}</span>
                            <span className="font-medium text-white">{timeframeLabel}</span>
                            <span className="text-[#B2B5BE] text-[11px] font-normal">birdeye.so</span>
                        </div>

                        {/* Row 2: Status & OHLC */}
                        {priceInfo && (
                            <div className="flex items-center text-[11px] gap-2 mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-emerald-500/30" />
                                <div className="flex gap-2 font-mono">
                                    <span className="text-[#B2B5BE]">O<span className="text-[#2962FF] ml-1">{formatPrice(priceInfo.open ?? 0)}</span></span>
                                    <span className="text-[#B2B5BE]">H<span className="text-[#2962FF] ml-1">{formatPrice(priceInfo.high ?? 0)}</span></span>
                                    <span className="text-[#B2B5BE]">L<span className="text-[#2962FF] ml-1">{formatPrice(priceInfo.low ?? 0)}</span></span>
                                    <span className="text-[#B2B5BE]">C<span className="text-[#2962FF] ml-1">{formatPrice(priceInfo.close ?? 0)}</span></span>
                                    <span className={changeColor}>
                                        {priceInfo.changePercent ? `${priceInfo.changePercent >= 0 ? '+' : ''}${priceInfo.changePercent.toFixed(2)}%` : ''}
                                    </span>
                                    {priceInfo.volume !== undefined && (
                                        <span className="text-[#B2B5BE] ml-2">Vol<span className="text-[#2962FF] ml-1">{formatVolume(priceInfo.volume)}</span></span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actual Chart Component */}
                    {children}
                </div>
            </div>

            {/* === 3. BOTTOM BAR === */}
            <div className="h-[28px] border-t border-[#2A2E39] flex items-center justify-between px-3 bg-[#131722] text-[11px] text-[#B2B5BE] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button className="hover:text-white transition-colors">1D</button>
                    <button className="hover:text-white transition-colors">5D</button>
                    <button className="hover:text-white transition-colors">1M</button>
                    <button className="hover:text-white transition-colors">3M</button>
                    <button className="hover:text-white transition-colors">6M</button>
                    <button className="text-[#2962FF] font-medium">YTD</button>
                    <button className="hover:text-white transition-colors">1Y</button>
                    <button className="hover:text-white transition-colors">5Y</button>
                    <button className="hover:text-white transition-colors">ALL</button>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hover:text-white cursor-pointer">{new Date().toLocaleTimeString()} (UTC)</span>
                    <span className="hover:text-white cursor-pointer">%</span>
                    <span className="hover:text-white cursor-pointer">log</span>
                    <span className="text-[#2962FF] font-medium cursor-pointer">auto</span>
                </div>
            </div>
        </div>
    );
};

// --- Helper Components ---

const ToolbarGroup = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center">{children}</div>
);

const ToolbarBtn = ({ icon: Icon, tooltip }: { icon: any; tooltip?: string }) => (
    <button
        className="w-[26px] h-[26px] flex items-center justify-center rounded hover:bg-[#2A2E39] text-[#B2B5BE] hover:text-white transition-colors"
        title={tooltip}
    >
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
    </button>
);

const SidebarBtn = ({ icon: Icon, active, tooltip }: { icon: any; active?: boolean; tooltip?: string }) => (
    <button
        className={`
      w-8 h-8 flex items-center justify-center rounded hover:bg-[#2A2E39] transition-colors
      ${active ? 'text-[#2962FF]' : 'text-[#B2B5BE] hover:text-white'}
    `}
        title={tooltip}
    >
        <Icon className="w-5 h-5" strokeWidth={1.5} />
    </button>
);

export default ChartProWrapper;
