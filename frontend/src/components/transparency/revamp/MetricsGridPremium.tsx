'use client';

import { ResponsiveContainer, BarChart, Bar, Cell, Tooltip, XAxis, YAxis } from 'recharts';

interface MetricsGridProps {
    avgTps: number;
    burstCount: number;
    failedTxCount: number;
    txCount: number;
    circularCount: number;
}

export function MetricsGrid({
    avgTps,
    burstCount,
    failedTxCount,
    txCount,
    circularCount,
}: MetricsGridProps) {
    const failureRate = txCount > 0 ? ((failedTxCount / txCount) * 100) : 0;

    const chartData = [
        { name: 'TPS', value: avgTps, maxValue: Math.max(avgTps * 2, 1), color: '#6366f1' },
        { name: 'Bursts', value: burstCount, maxValue: Math.max(burstCount * 2, 20), color: '#8b5cf6' },
        { name: 'Failed', value: failureRate, maxValue: 100, color: '#ef4444' },
        { name: 'Circular', value: circularCount, maxValue: Math.max(circularCount * 2, 10), color: '#a855f7' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* TPS */}
            <div className="p-6 rounded-2xl bg-background border border-border/40 hover:border-border/60 transition-all">
                <div className="flex items-baseline justify-between mb-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">TPS</span>
                    <span className="text-[10px] text-muted-foreground/60">tx/sec</span>
                </div>
                <div className="text-3xl font-black text-foreground tabular-nums tracking-tight">
                    {avgTps.toFixed(3)}
                </div>
                <div className="mt-4 h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((avgTps / Math.max(avgTps * 2, 1)) * 100, 100)}%` }}
                    />
                </div>
            </div>

            {/* Bursts */}
            <div className="p-6 rounded-2xl bg-background border border-border/40 hover:border-border/60 transition-all">
                <div className="flex items-baseline justify-between mb-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Bursts</span>
                    <span className="text-[10px] text-muted-foreground/60">&lt;1 sec</span>
                </div>
                <div className="text-3xl font-black text-foreground tabular-nums tracking-tight">
                    {burstCount}
                </div>
                <div className="mt-4 h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((burstCount / Math.max(burstCount * 2, 20)) * 100, 100)}%` }}
                    />
                </div>
            </div>

            {/* Failed */}
            <div className="p-6 rounded-2xl bg-background border border-border/40 hover:border-border/60 transition-all">
                <div className="flex items-baseline justify-between mb-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Failed</span>
                    <span className="text-[10px] text-muted-foreground/60">{failureRate.toFixed(1)}%</span>
                </div>
                <div className="text-3xl font-black text-foreground tabular-nums tracking-tight">
                    {failedTxCount}
                </div>
                <div className="mt-4 h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(failureRate, 100)}%` }}
                    />
                </div>
            </div>

            {/* Circular */}
            <div className="p-6 rounded-2xl bg-background border border-border/40 hover:border-border/60 transition-all">
                <div className="flex items-baseline justify-between mb-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Circular</span>
                    <span className="text-[10px] text-muted-foreground/60">patterns</span>
                </div>
                <div className="text-3xl font-black text-foreground tabular-nums tracking-tight">
                    {circularCount}
                </div>
                <div className="mt-4 h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((circularCount / Math.max(circularCount * 2, 10)) * 100, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
