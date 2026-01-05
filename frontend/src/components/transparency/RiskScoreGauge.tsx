'use client';

import { useMemo } from 'react';
import type { RiskLevel } from '@/types/api';

interface RiskScoreGaugeProps {
    score: number;
    riskLevel: RiskLevel;
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
}

const RISK_COLORS: Record<RiskLevel, { primary: string; secondary: string; glow: string }> = {
    LOW: { primary: '#10B981', secondary: '#059669', glow: 'rgba(16, 185, 129, 0.3)' },
    MEDIUM: { primary: '#F59E0B', secondary: '#D97706', glow: 'rgba(245, 158, 11, 0.3)' },
    HIGH: { primary: '#EF4444', secondary: '#DC2626', glow: 'rgba(239, 68, 68, 0.3)' },
    CRITICAL: { primary: '#DC2626', secondary: '#B91C1C', glow: 'rgba(220, 38, 38, 0.5)' },
};

const sizes = {
    sm: { width: 120, strokeWidth: 8, fontSize: '1.5rem' },
    md: { width: 180, strokeWidth: 12, fontSize: '2.5rem' },
    lg: { width: 240, strokeWidth: 16, fontSize: '3rem' },
};

export function RiskScoreGauge({ score, riskLevel, size = 'md', animated = false }: RiskScoreGaugeProps) {
    const { width, strokeWidth, fontSize } = sizes[size];
    const colors = RISK_COLORS[riskLevel];

    const center = width / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    // Calculate the arc length based on score (0-100)
    const progress = useMemo(() => {
        const clampedScore = Math.max(0, Math.min(100, score));
        return (clampedScore / 100) * circumference * 0.75; // 75% of circle for the gauge
    }, [score, circumference]);

    const rotation = 135; // Start angle for the gauge arc

    return (
        <div className="relative flex items-center justify-center">
            <svg
                width={width}
                height={width}
                viewBox={`0 0 ${width} ${width}`}
                className="transform -rotate-90"
                style={{ filter: `drop-shadow(0 0 20px ${colors.glow})` }}
            >
                {/* Background track */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                    transform={`rotate(${rotation} ${center} ${center})`}
                />

                {/* Progress arc */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={`url(#gauge-gradient-${riskLevel})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${progress} ${circumference}`}
                    transform={`rotate(${rotation} ${center} ${center})`}
                    className="transition-all duration-700 ease-out"
                />

                {/* Gradient definition */}
                <defs>
                    <linearGradient id={`gauge-gradient-${riskLevel}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.secondary} />
                        <stop offset="100%" stopColor={colors.primary} />
                    </linearGradient>
                </defs>
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className="font-bold tabular-nums"
                    style={{ fontSize, color: colors.primary }}
                >
                    {Math.round(score)}
                </span>
                <span className="text-xs text-white/60 uppercase tracking-wider mt-1">
                    {riskLevel}
                </span>
            </div>
        </div>
    );
}

export default RiskScoreGauge;
