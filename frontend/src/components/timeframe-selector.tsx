'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChartTimeframe, TIMEFRAME_LABELS } from '@/lib/chartConfig';

interface TimeframeSelectorProps {
  selected: ChartTimeframe;
  onChange: (timeframe: ChartTimeframe) => void;
  timeframes?: ChartTimeframe[];
  className?: string;
}

export function TimeframeSelector({
  selected,
  onChange,
  timeframes = [
    ChartTimeframe.ONE_MINUTE,
    ChartTimeframe.FIVE_MINUTES,
    ChartTimeframe.FIFTEEN_MINUTES,
    ChartTimeframe.ONE_HOUR,
    ChartTimeframe.FOUR_HOURS,
    ChartTimeframe.ONE_DAY,
    ChartTimeframe.ONE_WEEK,
  ],
  className,
}: TimeframeSelectorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1',
        'bg-gray-900/60 backdrop-blur-md rounded-lg border border-white/5',
        'overflow-x-auto scrollbar-hide',
        className
      )}
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {timeframes.map((timeframe) => {
        const isActive = selected === timeframe;
        return (
          <button
            key={timeframe}
            onClick={() => onChange(timeframe)}
            className={cn(
              'relative px-3 py-1.5 min-w-[44px] rounded-md',
              'text-xs font-medium transition-all duration-200',
              'whitespace-nowrap cursor-pointer',
              'hover:scale-105 active:scale-95',
              isActive
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Active background with gradient */}
            {isActive && (
              <motion.div
                layoutId="activeTimeframe"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-md shadow-lg shadow-purple-500/20"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}

            {/* Label */}
            <span className="relative z-10">{TIMEFRAME_LABELS[timeframe]}</span>

            {/* Hover glow effect */}
            {!isActive && (
              <div className="absolute inset-0 rounded-md opacity-0 hover:opacity-100 transition-opacity duration-200 border border-purple-500/20" />
            )}
          </button>
        );
      })}
    </div>
  );
}
