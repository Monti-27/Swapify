'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import TokenChart from '@/components/token-chart';
import { StrategyFormSidebar } from '@/components/strategy-form-sidebar';
import { useTokens, type Token } from '@/hooks/useTokens';
import { useChartData } from '@/hooks/useChartData';
import { ChartTimeframe } from '@/types/api';
import { ArrowLeft, LineChart, X, CandlestickChart } from 'lucide-react';
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

const TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
  { value: ChartTimeframe.ONE_MINUTE, label: '1m' },
  { value: ChartTimeframe.FIVE_MINUTES, label: '5m' },
  { value: ChartTimeframe.FIFTEEN_MINUTES, label: '15m' },
  { value: ChartTimeframe.ONE_HOUR, label: '1h' },
  { value: ChartTimeframe.FOUR_HOURS, label: '4h' },
  { value: ChartTimeframe.ONE_DAY, label: '1d' },
  { value: ChartTimeframe.ONE_WEEK, label: '1w' },
];

const TimeframePills = ({
  value,
  onChange,
}: {
  value: ChartTimeframe;
  onChange: (timeframe: ChartTimeframe) => void;
}) => (
  <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
    {TIMEFRAMES.map((tf) => (
      <button
        key={tf.value}
        onClick={() => onChange(tf.value)}
        className={cn(
          'rounded-full px-2 py-1 text-[11px] font-medium transition-colors',
          value === tf.value
            ? 'bg-white text-black shadow-[0_5px_15px_rgba(255,255,255,0.25)]'
            : 'text-white/60 hover:text-white'
        )}
      >
        {tf.label}
      </button>
    ))}
  </div>
);

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
        <CandlestickChart className="h-5 w-5" />
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

const CHART_PANEL_HEIGHT = 360;
const ChartPanel = ({
  title,
  token,
  chartData,
  emptyMessage,
  isTokenSelected,
  timeframe,
  onTimeframeChange,
}: ChartPanelProps) => {
  // const showChart = isTokenSelected && chartData.candles.length > 0 && !chartData.error;
  const showChart = false; // Force hide chart for now

  return (
    <div
      className={cn(
        'flex flex-col rounded-[26px] border border-white/5 bg-[#080312]/80',
        'shadow-[0_25px_80px_rgba(3,2,15,0.55)] backdrop-blur-xl transition-all duration-300'
      )}
      style={{ minHeight: CHART_PANEL_HEIGHT, height: CHART_PANEL_HEIGHT }}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/35">{title}</p>
          <p className="text-xl font-semibold text-white">
            {token ? token.symbol : 'Select token'}
          </p>
          {token?.name && (
            <p className="text-[13px] text-white/45">
              {token.name}
            </p>
          )}
        </div>
        <TimeframePills value={timeframe} onChange={onTimeframeChange} />
      </div>
      <div className="relative flex-1 px-4 pb-4 pt-3">
        <div className="h-full w-full relative">
          {/* Always show Coming Soon Placeholder */}
          <ComingSoonPlaceholder />

          {/* Hidden Original Logic */}
          <div className="hidden">
            {chartData.loading && chartData.candles.length === 0 ? (
              <Skeleton className="h-full w-full rounded-2xl bg-white/5" />
            ) : !isTokenSelected ? (
              <ChartPlaceholder message={emptyMessage} />
            ) : chartData.error ? (
              <ChartPlaceholder message="Unable to load chart data. Please try again." />
            ) : showChart ? (
              <div className="h-full">
                <TokenChart data={chartData.candles} height={CHART_PANEL_HEIGHT - 120} />
              </div>
            ) : (
              <ChartPlaceholder message="No market data available yet for this token." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export function StrategyBuilderFullscreen({ open, onClose, onSuccess }: StrategyBuilderFullscreenProps) {
  const { popularTokens } = useTokens();
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [triggerPrice, setTriggerPrice] = useState<number | undefined>(undefined);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number | undefined>(undefined);
  const [stopLossPrice, setStopLossPrice] = useState<number | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fromTimeframe, setFromTimeframe] = useState<ChartTimeframe>(ChartTimeframe.ONE_HOUR);
  const [toTimeframe, setToTimeframe] = useState<ChartTimeframe>(ChartTimeframe.ONE_HOUR);

  // Fetch chart data for both tokens with selected timeframe
  const fromTokenChartData = useChartData({
    tokenAddress: fromToken?.address || '',
    timeframe: fromTimeframe,
    enabled: currentStep >= 2 && !!fromToken,
  });

  const toTokenChartData = useChartData({
    tokenAddress: toToken?.address || '',
    timeframe: toTimeframe,
    enabled: currentStep >= 2 && !!toToken,
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when fullscreen is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const reachedChartStep = currentStep >= 2;
  const isFromTokenSelected = reachedChartStep && !!fromToken;
  const isToTokenSelected = reachedChartStep && !!toToken;

  const fromPanelMessage = reachedChartStep
    ? "Select a 'From' token to explore live price action."
    : "Continue to Step 2 to select a token and unlock the chart.";

  const toPanelMessage = reachedChartStep
    ? "Select a 'To' token to view its live price action."
    : "Progress to Step 2 to choose a token pair and view charts.";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />

          <motion.div
            className="relative z-10 mx-auto flex h-full w-full max-w-[1400px] flex-col px-4 pb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Top Navigation Bar */}
            <div className="flex flex-none items-center justify-between gap-4 rounded-3xl border border-white/5 bg-white/5 px-6 py-5 text-white backdrop-blur-xl shadow-[0_25px_80px_rgba(3,2,15,0.55)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2 text-white/80 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Strategies
              </Button>

              <Link href="/" className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl" />
                  <Image
                    src="/WeSwap-logo.png"
                    alt="WeSwap Logo"
                    width={36}
                    height={36}
                    className="relative drop-shadow-lg"
                    priority
                  />
                </div>
                <span className="text-xl font-semibold">WeSwap</span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-white/80 hover:text-white"
                aria-label="Close strategy builder"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Main Content */}
            <div className="mt-4 grid flex-1 gap-6 lg:grid-cols-[68%_32%]">
              {/* Left Side - Charts */}
              <div className="flex h-full flex-col gap-4 overflow-hidden">
                <div className="flex-1">
                  <ChartPanel
                    title="From"
                    token={fromToken}
                    chartData={fromTokenChartData}
                    emptyMessage={fromPanelMessage}
                    isTokenSelected={isFromTokenSelected}
                    timeframe={fromTimeframe}
                    onTimeframeChange={setFromTimeframe}
                  />
                </div>
                <div className="flex-1">
                  <ChartPanel
                    title="To"
                    token={toToken}
                    chartData={toTokenChartData}
                    emptyMessage={toPanelMessage}
                    isTokenSelected={isToTokenSelected}
                    timeframe={toTimeframe}
                    onTimeframeChange={setToTimeframe}
                  />
                </div>
              </div>

              {/* Right Side - Form */}
              <div className="h-full">
                <StrategyFormSidebar
                  onTokenChange={handleTokenChange}
                  onStrategyDataChange={handleStrategyDataChange}
                  onStepChange={handleStepChange}
                  onCancel={handleClose}
                  onComplete={handleComplete}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
