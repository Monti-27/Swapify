"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, Settings, ArrowDown, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSwap } from './SwapContext';
import { TokenSelectModal } from './TokenSelectModal';
import { SlippageSettingsModal } from './SlippageSettings';
import { useJupiterQuote } from '@/hooks/useJupiterQuote';
import { useJupiterSwap } from '@/hooks/useJupiterSwap';
import { JupiterToken } from '@/hooks/useJupiterTokens';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBalance } from '@/contexts/BalanceContext';

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-700/50 rounded-lg ${className}`} />
  );
}

function TokenIcon({ logoURI, symbol, size = 24 }: { logoURI?: string; symbol: string; size?: number }) {
  if (logoURI) {
    return (
      <img 
        src={logoURI} 
        alt={symbol} 
        width={size} 
        height={size} 
        className="rounded-full"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return (
    <span 
      className="rounded-full bg-[#3F3F46] flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

function formatAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount) / Math.pow(10, decimals);
  if (num === 0) return '0';
  if (num < 0.00000001) return num.toFixed(12);
  if (num < 0.0000001) return num.toFixed(11);
  if (num < 0.000001) return num.toFixed(10);
  if (num < 0.00001) return num.toFixed(9);
  if (num < 0.0001) return num.toFixed(8);
  if (num < 0.001) return num.toFixed(7);
  if (num < 0.01) return num.toFixed(6);
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function RefreshIndicator({ countdown, isRefreshing, onRefresh }: { 
  countdown: number; 
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <button 
      onClick={onRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{isRefreshing ? 'Updating...' : `${countdown}s`}</span>
    </button>
  );
}

export default function ConversionCard() {
  const { 
    inputToken, 
    outputToken, 
    inputAmount, 
    slippageBps,
    setInputToken, 
    setOutputToken, 
    setInputAmount,
    switchTokens,
    inputAmountLamports,
    addTransaction
  } = useSwap();
  
  const { connected } = useWallet();
  const { balance } = useBalance();
  
  const [isFromModalOpen, setIsFromModalOpen] = useState(false);
  const [isToModalOpen, setIsToModalOpen] = useState(false);
  const [isSlippageModalOpen, setIsSlippageModalOpen] = useState(false);
  const [displayAmount, setDisplayAmount] = useState('');

  const { 
    quote, 
    isLoading: isQuoteLoading, 
    isFetching,
    isRefreshing,
    priceImpact,
    isHighPriceImpact,
    isVeryHighPriceImpact,
    refreshCountdown,
    refetch,
    error
  } = useJupiterQuote({
    inputMint: inputToken.address,
    outputMint: outputToken.address,
    amount: inputAmountLamports,
    slippageBps,
    enabled: inputAmountLamports !== '0',
  });

  const { executeSwap, isSwapping, status } = useJupiterSwap();

  useEffect(() => {
    if (quote?.outAmount) {
      const formatted = formatAmount(quote.outAmount, outputToken.decimals);
      setDisplayAmount(formatted);
    } else if (inputAmountLamports === '0' || !inputAmount) {
      setDisplayAmount('');
    }
  }, [quote, outputToken.decimals, inputAmountLamports, inputAmount]);

  const rate = useMemo(() => {
    if (!quote?.inAmount || !quote?.outAmount) return null;
    const inNum = parseFloat(quote.inAmount) / Math.pow(10, inputToken.decimals);
    const outNum = parseFloat(quote.outAmount) / Math.pow(10, outputToken.decimals);
    if (inNum === 0) return null;
    const rateValue = outNum / inNum;
    return `1 ${inputToken.symbol} = ${rateValue.toFixed(6)} ${outputToken.symbol}`;
  }, [quote, inputToken, outputToken]);

  const inputBalance = useMemo(() => {
    if (inputToken.symbol === 'SOL') {
      return balance || '0.00';
    }
    return '—';
  }, [inputToken.symbol, balance]);

  const hasInsufficientBalance = useMemo(() => {
    if (inputToken.symbol === 'SOL' && balance) {
      const inputNum = parseFloat(inputAmount.replace(/,/g, '') || '0');
      const balanceNum = parseFloat(balance);
      return inputNum > balanceNum;
    }
    return false;
  }, [inputToken.symbol, inputAmount, balance]);

  const handleSwap = useCallback(async () => {
    if (!quote) return;
    const result = await executeSwap(quote);
    if (result) {
      addTransaction({
        fromToken: {
          symbol: inputToken.symbol,
          amount: formatAmount(quote.inAmount, inputToken.decimals),
          address: inputToken.address,
          logoURI: inputToken.logoURI,
        },
        toToken: {
          symbol: outputToken.symbol,
          amount: formatAmount(quote.outAmount, outputToken.decimals),
          address: outputToken.address,
          logoURI: outputToken.logoURI,
        },
        gasFee: '~0.000005 SOL',
        status: 'completed',
        txHash: result.signature,
      });
      setInputAmount('');
    }
  }, [quote, executeSwap, addTransaction, inputToken, outputToken, setInputAmount]);

  const handleFromTokenSelect = useCallback((token: JupiterToken) => {
    if (token.address === outputToken.address) {
      switchTokens();
    } else {
      setInputToken(token);
    }
  }, [outputToken.address, setInputToken, switchTokens]);

  const handleToTokenSelect = useCallback((token: JupiterToken) => {
    if (token.address === inputToken.address) {
      switchTokens();
    } else {
      setOutputToken(token);
    }
  }, [inputToken.address, setOutputToken, switchTokens]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > inputToken.decimals) return;
    setInputAmount(value);
  }, [setInputAmount, inputToken.decimals]);

  const canSwap = connected && quote && !isSwapping && !hasInsufficientBalance && inputAmountLamports !== '0';

  const getButtonText = () => {
    if (!connected) return 'Connect Wallet';
    if (inputAmountLamports === '0') return 'Enter Amount';
    if (hasInsufficientBalance) return 'Insufficient Balance';
    if (isSwapping) {
      if (status === 'building') return 'Building...';
      if (status === 'signing') return 'Confirm in Wallet';
      if (status === 'confirming') return 'Confirming...';
    }
    if (isQuoteLoading) return 'Getting Quote...';
    if (error) return 'Quote Error - Try Again';
    return 'Swap';
  };

  const showRefreshIndicator = inputAmountLamports !== '0' && quote && !isQuoteLoading;

  return (
    <div className="lg:w-[360px] shrink-0 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <div 
          role="tablist" 
          className="flex w-full bg-white dark:bg-[#27272A]/64 p-0 shadow-md rounded-md overflow-hidden dark:inset-shadow-[0_1px_rgb(255_255_255/0.15)]"
        >
          <button 
            role="tab" 
            aria-selected="true"
            className="flex-1 py-1.5 text-sm font-medium text-foreground transition-all outline-none relative hover:text-foreground/80"
          >
            Convert
          </button>
          <button 
            role="tab" 
            aria-selected="false"
            className="flex-1 py-1.5 text-sm font-medium text-muted-foreground transition-all outline-none relative hover:text-foreground before:absolute before:inset-y-2 before:-left-px before:w-px before:bg-border first:before:hidden"
          >
            Buy
          </button>
          <button 
            role="tab" 
            aria-selected="false"
            className="flex-1 py-1.5 text-sm font-medium text-muted-foreground transition-all outline-none relative hover:text-foreground before:absolute before:inset-y-2 before:-left-px before:w-px before:bg-border first:before:hidden"
          >
            Send
          </button>
        </div>
        <button 
          onClick={() => setIsSlippageModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent size-8 shrink-0 text-muted-foreground hover:text-foreground/80 outline-none"
        >
          <Settings className="size-5" />
          <span className="sr-only">Settings</span>
        </button>
      </div>

        <div className="bg-[#18181B] rounded-2xl p-2.5 shadow-xl relative">
          <div className="relative flex flex-col items-center gap-1 mb-5">
            <div 
              className="bg-[#27272A] text-white rounded-xl shadow-lg relative w-full flex flex-row items-center justify-between gap-2 p-5 [mask-image:radial-gradient(ellipse_32px_30px_at_50%_100%,transparent_0,transparent_28px,black_29px)]"
            >
              <div className="grow">
                <input 
                  type="text" 
                  inputMode="decimal"
                  placeholder="0.00"
                  value={inputAmount}
                  onChange={handleInputChange}
                  className="w-full max-w-40 text-2xl font-bold bg-transparent border-none outline-none p-0 mb-1 focus:ring-0 text-white placeholder:text-zinc-600"
                />
                <div className="text-[12px] text-zinc-500 font-medium">
                  Balance: {inputBalance}
                </div>
              </div>
              <div>
                <button 
                  onClick={() => setIsFromModalOpen(true)}
                  className="flex items-center gap-2 bg-[#3F3F46] hover:bg-[#52525B] transition-colors rounded-full pl-1 pr-2.5 py-1 text-white shadow-lg border-0 outline-none"
                >
                  <TokenIcon logoURI={inputToken.logoURI} symbol={inputToken.symbol} />
                  <span className="uppercase text-[12px] font-bold tracking-tight">{inputToken.symbol}</span>
                  <ChevronDown className="size-4 text-zinc-400" />
                </button>
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button 
                onClick={switchTokens}
                className="size-10 flex items-center justify-center rounded-full bg-[#5850EC] hover:bg-[#4338CA] transition-colors shadow-lg border border-black/10"
              >
                <ArrowDown className="size-5 text-white" />
              </button>
            </div>

            <div 
              className="bg-[#27272A] text-white rounded-xl shadow-lg relative w-full flex flex-row items-center justify-between gap-2 p-5 [mask-image:radial-gradient(ellipse_32px_30px_at_50%_0%,transparent_0,transparent_28px,black_29px)]"
            >
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[58px] h-[29px] rounded-b-full border-b border-x border-white/5"></div>
            
            <div className="grow">
              {isQuoteLoading && inputAmountLamports !== '0' ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <>
                  <div className={`w-full max-w-40 text-2xl font-bold p-0 mb-1 min-h-[32px] transition-all duration-200 ${isRefreshing ? 'text-zinc-400' : 'text-white'}`}>
                    {displayAmount || '0.00'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-zinc-500 font-medium">
                      Balance: —
                    </span>
                    {showRefreshIndicator && (
                      <RefreshIndicator 
                        countdown={refreshCountdown} 
                        isRefreshing={isRefreshing}
                        onRefresh={refetch}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
            <div>
              <button 
                onClick={() => setIsToModalOpen(true)}
                className="flex items-center gap-2 bg-[#3F3F46] hover:bg-[#52525B] transition-colors rounded-full pl-1 pr-2.5 py-1 text-white shadow-lg border-0 outline-none"
              >
                <TokenIcon logoURI={outputToken.logoURI} symbol={outputToken.symbol} />
                <span className="uppercase text-[12px] font-bold tracking-tight">{outputToken.symbol}</span>
                <ChevronDown className="size-4 text-zinc-400" />
              </button>
            </div>
          </div>
        </div>

        {isHighPriceImpact && quote && (
          <div className={`mx-1.5 mb-3 px-3 py-2 rounded-lg flex items-center gap-2 ${isVeryHighPriceImpact ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
            <AlertTriangle className={`w-4 h-4 ${isVeryHighPriceImpact ? 'text-red-400' : 'text-orange-400'}`} />
            <span className={`text-xs font-medium ${isVeryHighPriceImpact ? 'text-red-400' : 'text-orange-400'}`}>
              High price impact: {priceImpact.toFixed(2)}%
            </span>
          </div>
        )}

        {error && inputAmountLamports !== '0' && (
          <div className="mx-1.5 mb-3 px-3 py-2 rounded-lg flex items-center gap-2 bg-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-red-400">
              Failed to get quote. Please try again.
            </span>
          </div>
        )}

        <div className="px-1.5">
          <div className="mb-3 ps-3 uppercase text-zinc-600 text-[11px] font-bold tracking-widest flex items-center justify-between">
            <span>Summary</span>
            {isRefreshing && (
              <span className="text-[10px] text-[#5850EC] flex items-center gap-1 normal-case font-normal">
                <Loader2 className="w-3 h-3 animate-spin" />
                Live
              </span>
            )}
          </div>
          <div className="bg-[#242427] rounded-xl p-4 flex flex-col gap-3 shadow-inner">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Rate</span>
              {isQuoteLoading && inputAmountLamports !== '0' ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <span className={`font-bold text-xs transition-colors ${isRefreshing ? 'text-zinc-400' : 'text-white'}`}>
                  {rate || '—'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Price Impact</span>
              <span className={`font-bold ${isVeryHighPriceImpact ? 'text-red-400' : isHighPriceImpact ? 'text-orange-400' : 'text-white'}`}>
                {quote ? `${priceImpact.toFixed(4)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Slippage</span>
              <span className="text-white font-bold">{(slippageBps / 100).toFixed(1)}%</span>
            </div>
            <div className="h-px bg-white/5 my-1"></div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Min. Received</span>
              {isQuoteLoading && inputAmountLamports !== '0' ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <span className={`font-bold transition-colors ${isRefreshing ? 'text-zinc-400' : 'text-white'}`}>
                  {quote ? formatAmount(quote.otherAmountThreshold, outputToken.decimals) : '—'} {quote ? outputToken.symbol : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 px-1.5 pb-2">
          <button 
            onClick={handleSwap}
            disabled={!canSwap}
            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg mb-4 transition-colors flex items-center justify-center gap-2 ${
              canSwap 
                ? 'bg-[#5850EC] hover:bg-[#4338CA] text-white' 
                : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {isSwapping && <Loader2 className="w-4 h-4 animate-spin" />}
            {getButtonText()}
          </button>
          
          {rate && (
            <div className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              {rate}
            </div>
          )}
        </div>
      </div>

      <TokenSelectModal
        isOpen={isFromModalOpen}
        onClose={() => setIsFromModalOpen(false)}
        onSelect={handleFromTokenSelect}
        excludeToken={outputToken.address}
      />

      <TokenSelectModal
        isOpen={isToModalOpen}
        onClose={() => setIsToModalOpen(false)}
        onSelect={handleToTokenSelect}
        excludeToken={inputToken.address}
      />

      <SlippageSettingsModal
        isOpen={isSlippageModalOpen}
        onClose={() => setIsSlippageModalOpen(false)}
      />
    </div>
  );
}
