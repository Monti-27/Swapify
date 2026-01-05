'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import type { RiskLevel } from '@/types/api';

interface RiskScoreGaugeProps {
    score: number;
    riskLevel: RiskLevel;
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
}

const RISK_COLORS: Record<RiskLevel, { primary: string; gradient: string }> = {
    LOW: { primary: '#10B981', gradient: 'from-emerald-500 to-teal-400' },
    MEDIUM: { primary: '#F59E0B', gradient: 'from-amber-500 to-yellow-400' },
    HIGH: { primary: '#EF4444', gradient: 'from-red-500 to-orange-400' },
    CRITICAL: { primary: '#DC2626', gradient: 'from-red-600 to-rose-500' },
};

const sizes = {
    sm: { width: 140, fontSize: '2rem', labelSize: 'text-[9px]' },
    md: { width: 200, fontSize: '3rem', labelSize: 'text-[10px]' },
    lg: { width: 260, fontSize: '4rem', labelSize: 'text-xs' },
};

export function RiskScoreGauge({ score, riskLevel, size = 'md', animated = false }: RiskScoreGaugeProps) {
    const { width, fontSize, labelSize } = sizes[size];
    const colors = RISK_COLORS[riskLevel];

    const data = useMemo(() => [
        { name: 'score', value: score, fill: colors.primary }
    ], [score, colors.primary]);

    return (
        <div className="relative flex flex-col items-center justify-center" style={{ width, height: width }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="100%"
                    barSize={size === 'lg' ? 16 : size === 'md' ? 12 : 8}
                    data={data}
                    startAngle={225}
                    endAngle={-45}
                >
                    <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                    />
                    <RadialBar
                        background={{ fill: 'rgba(255,255,255,0.05)' }}
                        dataKey="value"
                        cornerRadius={10}
                        animationDuration={animated ? 1500 : 0}
                        animationEasing="ease-out"
                    />
                </RadialBarChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className="font-black tabular-nums tracking-tighter"
                    style={{ fontSize, color: colors.primary }}
                >
                    {Math.round(score)}
                </span>
                <span className={`${labelSize} font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1`}>
                    {riskLevel}
                </span>
            </div>
        </div>
    );
}

export default RiskScoreGauge;
