"use client";

import React, { useEffect, useState } from 'react';
import { ChevronDown, Settings, ArrowDown, Loader2, Coins } from 'lucide-react';
import { useSwap } from './SwapContext';

interface TokenState {
  icon?: string;
  symbol: string;
  amount: string;
  balance: string;
}

function TokenIcon({ icon, symbol, size = 24 }: { icon?: string; symbol: string; size?: number }) {
  if (icon) {
    return (
      <img 
        src={icon} 
        alt={symbol} 
        width={size} 
        height={size} 
        className="rounded-full"
      />
    );
  }
  return (
    <span 
      className="rounded-full bg-swap-muted flex items-center justify-center text-swap-foreground font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

const ConversionCard = () => {
  const { swapData, isLoading } = useSwap();
  
  const [fromToken, setFromToken] = useState<TokenState>({
    symbol: 'SOL',
    amount: '15,494.9',
    balance: '24,579'
  });
  
  const [toToken, setToToken] = useState<TokenState>({
    symbol: 'USDC',
    amount: '12,984.2',
    balance: '1,379.2'
  });

  const [quote, setQuote] = useState({
    transactionValue: '$2,867',
    networkFees: '$31.2',
    orderNet: '$2,898.2',
    rate: '1 USDC = 1,574.04 SOL'
  });

  useEffect(() => {
    if (swapData) {
      setFromToken({
        icon: swapData.fromToken.icon,
        symbol: swapData.fromToken.symbol,
        amount: swapData.fromToken.amount,
        balance: '10,000'
      });
      setToToken({
        icon: swapData.toToken.icon,
        symbol: swapData.toToken.symbol,
        amount: '—',
        balance: '5,000'
      });
      
      setTimeout(() => {
        const mockAmount = (parseFloat(swapData.fromToken.amount.replace(/,/g, '')) * 1.05).toLocaleString();
        setToToken(prev => ({
          ...prev,
          amount: mockAmount
        }));
        setQuote({
          transactionValue: `$${(parseFloat(swapData.fromToken.amount.replace(/,/g, '')) * 125).toLocaleString()}`,
          networkFees: '$0.25',
          orderNet: `$${(parseFloat(swapData.fromToken.amount.replace(/,/g, '')) * 125 + 0.25).toLocaleString()}`,
          rate: `1 ${swapData.fromToken.symbol} = ${(1.05).toFixed(4)} ${swapData.toToken.symbol}`
        });
      }, 800);
    }
  }, [swapData]);

  return (
    <div className="lg:w-[360px] shrink-0 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <div 
            role="tablist" 
            className="flex w-full bg-swap-muted p-0 shadow-md rounded-md overflow-hidden"
          >
          <button 
            role="tab" 
            aria-selected="true"
            className="flex-1 py-1.5 text-sm font-medium text-swap-foreground transition-all outline-none relative hover:opacity-80"
          >
            Convert
          </button>
          <button 
            role="tab" 
            aria-selected="false"
            className="flex-1 py-1.5 text-sm font-medium text-swap-muted-foreground transition-all outline-none relative hover:text-swap-foreground before:absolute before:inset-y-2 before:-left-px before:w-px before:bg-swap-border first:before:hidden"
          >
            Buy
          </button>
          <button 
            role="tab" 
            aria-selected="false"
            className="flex-1 py-1.5 text-sm font-medium text-swap-muted-foreground transition-all outline-none relative hover:text-swap-foreground before:absolute before:inset-y-2 before:-left-px before:w-px before:bg-swap-border first:before:hidden"
          >
            Send
          </button>
        </div>
        <button 
          className="inline-flex items-center justify-center rounded-md transition-colors hover:bg-swap-accent size-8 shrink-0 text-swap-muted-foreground hover:text-swap-foreground/80 outline-none"
        >
          <Settings className="size-5" />
          <span className="sr-only">Settings</span>
        </button>
      </div>

      <div className="bg-swap-card rounded-2xl p-2.5 shadow-xl relative border border-swap-border/50">
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 dark:bg-black/50 rounded-2xl flex items-center justify-center z-20">
            <Loader2 className="size-8 text-swap-primary animate-spin" />
          </div>
        )}
        <div className="relative flex flex-col items-center gap-1 mb-5">
          <div 
            className="bg-swap-muted text-swap-foreground rounded-xl shadow-lg relative w-full flex flex-row items-center justify-between gap-2 p-5 [mask-image:radial-gradient(ellipse_32px_30px_at_50%_100%,transparent_0,transparent_28px,black_29px)]"
          >
            <div className="grow">
              <input 
                type="text" 
                value={fromToken.amount}
                onChange={(e) => setFromToken(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full max-w-40 text-2xl font-bold bg-transparent border-none outline-none p-0 mb-1 focus:ring-0 text-swap-foreground"
              />
              <div className="text-[12px] text-swap-muted-foreground font-medium">
                Balance: {fromToken.balance}
              </div>
            </div>
            <div>
              <button 
                className="flex items-center gap-2 bg-swap-accent hover:bg-swap-accent/80 transition-colors rounded-full pl-1 pr-2.5 py-1 text-swap-foreground shadow-lg border-0 outline-none"
              >
                <TokenIcon icon={fromToken.icon} symbol={fromToken.symbol} />
                <span className="uppercase text-[12px] font-bold tracking-tight">{fromToken.symbol}</span>
                <ChevronDown className="size-4 text-swap-muted-foreground" />
              </button>
            </div>
          </div>

          <div 
            className="size-10 flex items-center justify-center rounded-full bg-swap-primary absolute top-1/2 -translate-y-1/2 z-10 shadow-lg border border-swap-border"
          >
            <ArrowDown className="size-5 text-white" />
          </div>

          <div 
            className="bg-swap-muted text-swap-foreground rounded-xl shadow-lg relative w-full flex flex-row items-center justify-between gap-2 p-5 [mask-image:radial-gradient(ellipse_32px_30px_at_50%_0%,transparent_0,transparent_28px,black_29px)]"
          >
             <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[58px] h-[29px] rounded-b-full border-b border-x border-swap-border/30"></div>
            
            <div className="grow">
              <input 
                type="text" 
                value={toToken.amount}
                onChange={(e) => setToToken(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full max-w-40 text-2xl font-bold bg-transparent border-none outline-none p-0 mb-1 focus:ring-0 text-swap-foreground"
              />
              <div className="text-[12px] text-swap-muted-foreground font-medium">
                Balance: {toToken.balance}
              </div>
            </div>
            <div>
              <button 
                className="flex items-center gap-2 bg-swap-accent hover:bg-swap-accent/80 transition-colors rounded-full pl-1 pr-2.5 py-1 text-swap-foreground shadow-lg border-0 outline-none"
              >
                <TokenIcon icon={toToken.icon} symbol={toToken.symbol} />
                <span className="uppercase text-[12px] font-bold tracking-tight">{toToken.symbol}</span>
                <ChevronDown className="size-4 text-swap-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-1.5">
          <div className="mb-3 ps-3 uppercase text-swap-muted-foreground text-[11px] font-bold tracking-widest">
            Summary
          </div>
          <div className="bg-swap-muted/50 rounded-xl p-4 flex flex-col gap-3 shadow-inner border border-swap-border/30">
            <div className="flex justify-between items-center text-sm">
              <span className="text-swap-muted-foreground font-medium">Transaction Value</span>
              <span className="text-swap-foreground font-bold">{quote.transactionValue}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-swap-muted-foreground font-medium">Network Fees</span>
              <span className="text-swap-foreground font-bold">{quote.networkFees}</span>
            </div>
            <div className="h-px bg-swap-border/50 my-1"></div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-swap-muted-foreground font-medium">Order Net</span>
              <span className="text-swap-foreground font-bold">{quote.orderNet}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 px-1.5 pb-2">
          <button 
            className="w-full bg-swap-primary hover:bg-swap-primary/90 transition-colors text-white py-3.5 rounded-xl font-bold text-sm shadow-lg mb-4"
          >
            Confirm
          </button>
          
          <div className="text-center text-[10px] text-swap-muted-foreground font-bold uppercase tracking-wider">
            {quote.rate}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionCard;
