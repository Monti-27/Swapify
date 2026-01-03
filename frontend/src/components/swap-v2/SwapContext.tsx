"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import { JupiterToken } from '@/hooks/useJupiterTokens';

const SOL_TOKEN: JupiterToken = {
  address: 'So11111111111111111111111111111111111111112',
  name: 'Wrapped SOL',
  symbol: 'SOL',
  decimals: 9,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
};

const USDC_TOKEN: JupiterToken = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
};

export interface SwapTransaction {
  id: string;
  date: string;
  timestamp: number;
  fromToken: {
    symbol: string;
    amount: string;
    address: string;
    logoURI?: string;
  };
  toToken: {
    symbol: string;
    amount: string;
    address: string;
    logoURI?: string;
  };
  gasFee: string;
  status: 'completed' | 'pending' | 'cancelled';
  txHash: string;
}

interface SwapContextType {
  inputToken: JupiterToken;
  outputToken: JupiterToken;
  inputAmount: string;
  slippageBps: number;
  setInputToken: (token: JupiterToken) => void;
  setOutputToken: (token: JupiterToken) => void;
  setInputAmount: (amount: string) => void;
  setSlippageBps: (bps: number) => void;
  switchTokens: () => void;
  inputAmountLamports: string;
  transactions: SwapTransaction[];
  addTransaction: (tx: Omit<SwapTransaction, 'id' | 'date' | 'timestamp'>) => void;
  updateTransactionStatus: (txHash: string, status: SwapTransaction['status']) => void;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

const TRANSACTIONS_STORAGE_KEY = 'swap_transactions';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function SwapProvider({ children }: { children: ReactNode }) {
  const [inputToken, setInputToken] = useState<JupiterToken>(SOL_TOKEN);
  const [outputToken, setOutputToken] = useState<JupiterToken>(USDC_TOKEN);
  const [inputAmount, setInputAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);
  const [transactions, setTransactions] = useState<SwapTransaction[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTransactions(parsed);
      } catch (e) {
        console.error('Failed to parse stored transactions:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions]);

  const addTransaction = useCallback((tx: Omit<SwapTransaction, 'id' | 'date' | 'timestamp'>) => {
    const timestamp = Date.now();
    const newTx: SwapTransaction = {
      ...tx,
      id: `${timestamp}-${tx.txHash.slice(0, 8)}`,
      date: formatDate(timestamp),
      timestamp,
    };
    setTransactions(prev => [newTx, ...prev]);
  }, []);

  const updateTransactionStatus = useCallback((txHash: string, status: SwapTransaction['status']) => {
    setTransactions(prev => 
      prev.map(tx => tx.txHash === txHash ? { ...tx, status } : tx)
    );
  }, []);

  const switchTokens = useCallback(() => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount('');
  }, [inputToken, outputToken]);

  const inputAmountLamports = useMemo(() => {
    if (!inputAmount || inputAmount === '' || isNaN(parseFloat(inputAmount))) {
      return '0';
    }
    
    const cleanAmount = inputAmount.replace(/,/g, '');
    const numAmount = parseFloat(cleanAmount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return '0';
    }
    
    const lamports = Math.floor(numAmount * Math.pow(10, inputToken.decimals));
    return lamports.toString();
  }, [inputAmount, inputToken.decimals]);

  const value = useMemo(() => ({
    inputToken,
    outputToken,
    inputAmount,
    slippageBps,
    setInputToken,
    setOutputToken,
    setInputAmount,
    setSlippageBps,
    switchTokens,
    inputAmountLamports,
    transactions,
    addTransaction,
    updateTransactionStatus,
  }), [inputToken, outputToken, inputAmount, slippageBps, switchTokens, inputAmountLamports, transactions, addTransaction, updateTransactionStatus]);

  return (
    <SwapContext.Provider value={value}>
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
