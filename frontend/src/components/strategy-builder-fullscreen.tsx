'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import KLineChart from '@/components/kline-chart';
import { StrategyDashboard, CompactBuilderForm } from '@/components/strategy';
import { useTokens, type Token } from '@/hooks/useTokens';
import { useChartData } from '@/hooks/useChartData';
import { useStrategies } from '@/hooks/useStrategies';
import { ChartTimeframe } from '@/types/api';
import {
  ArrowLeft,
  LineChart,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StrategyBuilderFullscreenProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentStep?: number;
}

type ChartHookResult = ReturnType<typeof useChartData>;

interface ChartPanelProps {
  title: string;
  token?: Token | null;
  chartData: ChartHookResult;
  emptyMessage: string;
  isTokenSelected: boolean;
  timeframe: ChartTimeframe;
  onTimeframeChange: (timeframe: ChartTimeframe) => void;
}

const ComingSoonPlaceholder = () => (
  <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-[#050505]">
    {/* Subtle Grid Background */}
    <div
      className="absolute inset-0 opacity-[0.15]"
      style={{
        backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    />

    <div className="relative z-10 flex flex-col items-center gap-3 p-6 text-center">
      {/* Minimal Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/60 shadow-sm">
        <LineChart className="h-5 w-5" />
      </div>

      {/* Clean Typography */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-white/90">
          Chart Unavailable
        </h3>
        <p className="text-xs text-white/40 max-w-[200px] leading-relaxed">
          Advanced charting features are coming soon in the next update.
        </p>
      </div>
    </div>
  </div>
);

const ChartPlaceholder = ({ message }: { message: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 text-center text-sm text-white/60">
    <LineChart className="h-5 w-5 text-white/35" />
    <p className="max-w-[220px]">{message}</p>
  </div>
);

const ChartPanel = ({
  title,
  token,
  chartData,
  emptyMessage,
  isTokenSelected,
  timeframe,
  onTimeframeChange,
  className,
}: ChartPanelProps & { className?: string }) => {
  return (
    <div className={cn('h-full', className)}>
      {/* Show placeholder if no token selected */}
      {!isTokenSelected ? (
        <ChartPlaceholder message={emptyMessage} />
      ) : chartData.error ? (
        <ChartPlaceholder message="Unable to load chart data. Please try again." />
      ) : chartData.loading && chartData.candles.length === 0 ? (
        <div className="h-full w-full p-4">
          <Skeleton className="h-full w-full rounded bg-zinc-900/50" />
        </div>
      ) : (
        /* KLineChart with key prop to force complete remount on token change */
        /* This is the most reliable way to prevent data leakage between tokens */
        <KLineChart
          key={`chart-${token?.address || 'none'}`}
          tokenAddress={token?.address || ''}
          symbol={token?.symbol || 'TOKEN'}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
        />
      )}
    </div>
  );
};

export function StrategyBuilderFullscreen({ open, onClose, onSuccess }: StrategyBuilderFullscreenProps) {
  const { popularTokens } = useTokens();
  const { strategies, isLoading: isLoadingStrategies, refetch: refetchStrategies } = useStrategies();
  const [viewMode, setViewMode] = useState<'dashboard' | 'builder'>('dashboard');
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [triggerPrice, setTriggerPrice] = useState<number | undefined>(undefined);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number | undefined>(undefined);
  const [stopLossPrice, setStopLossPrice] = useState<number | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fromTimeframe, setFromTimeframe] = useState<ChartTimeframe>(ChartTimeframe.ONE_HOUR);
  const [toTimeframe, setToTimeframe] = useState<ChartTimeframe>(ChartTimeframe.ONE_HOUR);

  // Fetch chart data for both tokens with selected timeframe
  // Charts load immediately when tokens are selected (no step dependency)
  const fromTokenChartData = useChartData({
    tokenAddress: fromToken?.address || '',
    timeframe: fromTimeframe,
    enabled: !!fromToken,
  });

  const toTokenChartData = useChartData({
    tokenAddress: toToken?.address || '',
    timeframe: toTimeframe,
    enabled: !!toToken,
  });

  // Don't auto-select tokens - let user choose in Step 2
  // This prevents unnecessary API calls before user reaches token selection step

  const handleTokenChange = (newFromToken: Token | null, newToToken: Token | null) => {
    setFromToken(newFromToken);
    setToToken(newToToken);
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleStrategyDataChange = (data: {
    triggerValue?: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    if (data.triggerValue !== undefined) {
      setTriggerPrice(data.triggerValue);
    }
    if (data.stopLoss !== undefined) {
      setStopLossPrice(data.stopLoss);
    }
    if (data.takeProfit !== undefined) {
      setTakeProfitPrice(data.takeProfit);
    }
  };

  const handleClose = () => {
    setFromTimeframe(ChartTimeframe.ONE_HOUR);
    setToTimeframe(ChartTimeframe.ONE_HOUR);
    onClose();
  };

  const handleComplete = () => {
    handleClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleBack = () => {
    // Navigate back to strategies page
    window.history.back();
  };

  // Handle escape key and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Simple approach - just overflow hidden (position:fixed breaks modal scroll)
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Charts show immediately when tokens are selected
  const isFromTokenSelected = !!fromToken;
  const isToTokenSelected = !!toToken;

  const fromPanelMessage = fromToken
    ? "Loading chart data..."
    : "Select a 'From' token to explore live price action.";

  const toPanelMessage = toToken
    ? "Loading chart data..."
    : "Select a 'To' token to view its live price action.";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-[#030305]" />

          <motion.div
            className="relative z-10 flex h-full w-full flex-col"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* Main Content - Full Screen Split */}
            <div className="flex flex-1 gap-0 overflow-hidden">
              {/* Left Panel - Charts (70%) */}
              <div className="flex-1 h-full flex flex-col gap-4 p-6 overflow-hidden">
                {/* From Token Chart - Takes 50% height */}
                <ChartPanel
                  title="From (Sell)"
                  token={fromToken}
                  chartData={fromTokenChartData}
                  emptyMessage={fromPanelMessage}
                  isTokenSelected={isFromTokenSelected}
                  timeframe={fromTimeframe}
                  onTimeframeChange={setFromTimeframe}
                  className="flex-1 min-h-0"
                />

                {/* To Token Chart - Takes 50% height */}
                <ChartPanel
                  title="To (Buy)"
                  token={toToken}
                  chartData={toTokenChartData}
                  emptyMessage={toPanelMessage}
                  isTokenSelected={isToTokenSelected}
                  timeframe={toTimeframe}
                  onTimeframeChange={setToTimeframe}
                  className="flex-1 min-h-0"
                />
              </div>

              {/* Right Panel - Command Center (450px fixed) */}
              <div className="w-[450px] h-full border-l border-zinc-800 bg-[#0A0A0F] flex flex-col overflow-hidden">
                {viewMode === 'dashboard' ? (
                  <StrategyDashboard
                    onCreate={() => setViewMode('builder')}
                    strategies={strategies}
                    isLoading={isLoadingStrategies}
                  />
                ) : (
                  <CompactBuilderForm
                    onCancel={() => setViewMode('dashboard')}
                    onComplete={() => {
                      handleComplete();
                      setViewMode('dashboard');
                      refetchStrategies();
                    }}
                    onTokenChange={handleTokenChange}
                    onStrategyDataChange={handleStrategyDataChange}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
