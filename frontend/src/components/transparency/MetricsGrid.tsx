'use client';

import { Activity, Zap, XCircle, RefreshCcw } from 'lucide-react';

interface MetricsGridProps {
    avgTps: number;
    burstCount: number;
    failedTxCount: number;
    txCount: number;
    circularCount: number;
}

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subLabel?: string;
    colorClass: string;
}

function MetricCard({ icon, label, value, subLabel, colorClass }: MetricCardProps) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card backdrop-blur-sm p-4 transition-all hover:border-primary/30 hover:bg-accent/50">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                        {icon}
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
                </div>

                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground tabular-nums">{value}</span>
                    {subLabel && (
                        <span className="text-xs text-muted-foreground">{subLabel}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function MetricsGrid({
    avgTps,
    burstCount,
    failedTxCount,
    txCount,
    circularCount,
}: MetricsGridProps) {
    const failureRate = txCount > 0 ? ((failedTxCount / txCount) * 100).toFixed(1) : '0';

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
                icon={<Activity size={18} className="text-blue-500" />}
                label="TPS"
                value={avgTps.toFixed(3)}
                subLabel="tx/sec"
                colorClass="bg-blue-500/10"
            />
            <MetricCard
                icon={<Zap size={18} className="text-yellow-500" />}
                label="Bursts"
                value={burstCount}
                subLabel="< 1 sec"
                colorClass="bg-yellow-500/10"
            />
            <MetricCard
                icon={<XCircle size={18} className="text-red-500" />}
                label="Failed"
                value={failedTxCount}
                subLabel={`${failureRate}%`}
                colorClass="bg-red-500/10"
            />
            <MetricCard
                icon={<RefreshCcw size={18} className="text-violet-500" />}
                label="Circular"
                value={circularCount}
                subLabel="patterns"
                colorClass="bg-violet-500/10"
            />
        </div>
    );
}

export default MetricsGrid;
