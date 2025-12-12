'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartEmptyStateProps {
  message?: string;
  currentStep?: number;
  className?: string;
}

export function ChartEmptyState({
  message = "Select trading pairs in Step 2 to view live price charts",
  currentStep = 1,
  className
}: ChartEmptyStateProps) {
  return (
    <div className={cn(
      'relative w-full h-full flex items-center justify-center overflow-hidden',
      'bg-gradient-to-br from-gray-900/30 via-purple-900/10 to-gray-950/30',
      'backdrop-blur-sm rounded-2xl border border-purple-500/10',
      className
    )}>
      {/* Animated background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-600/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-6 p-8 max-w-md text-center"
      >
        {/* Icon with pulsing animation */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative"
        >
          <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full animate-pulse" />
          <div className="relative p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
            <TrendingUp className="w-12 h-12 text-purple-400" />
          </div>
        </motion.div>

        {/* Message */}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-gray-200">
            No Chart Data Yet
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Step indicator */}
        {currentStep < 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20"
          >
            <span className="text-xs text-gray-400">Continue to Step 2</span>
            <ArrowRight className="w-3 h-3 text-purple-400" />
          </motion.div>
        )}

        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-500" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
