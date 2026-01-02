"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TokenInfo {
  icon?: string;
  symbol: string;
  amount: string;
}

interface SwapData {
  fromToken: TokenInfo;
  toToken: TokenInfo;
}

interface SwapContextType {
  swapData: SwapData | null;
  setSwapData: (data: SwapData | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: ReactNode }) {
  const [swapData, setSwapData] = useState<SwapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <SwapContext.Provider value={{ swapData, setSwapData, isLoading, setIsLoading }}>
      {children}
    </SwapContext.Provider>
  );
}

export function useSwap() {
  const context = useContext(SwapContext);
  if (context === undefined) {
    throw new Error('useSwap must be used within a SwapProvider');
  }
  return context;
}
