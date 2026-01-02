"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Check, RotateCcw, ExternalLink, Clock, XCircle } from 'lucide-react';
import { useSwap } from './SwapContext';

interface Transaction {
  date: string;
  fromToken: {
    symbol: string;
    amount: string;
  };
  toToken: {
    symbol: string;
    amount: string;
  };
  gasFee: string;
  status: 'completed' | 'pending' | 'failed';
  txHash: string;
}

function TokenIcon({ symbol, size = 20 }: { symbol: string; size?: number }) {
  return (
    <span 
      className="rounded-full bg-[#27272A] flex items-center justify-center text-zinc-400 font-bold shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

const transactions: Transaction[] = [
  {
    date: '17 Feb, 2025',
    fromToken: { symbol: 'SOL', amount: '2.5' },
    toToken: { symbol: 'USDC', amount: '312.45' },
    gasFee: '0.000005 SOL',
    status: 'completed',
    txHash: '5UxV7nR9KfZh8MgCw3LB4vqMnR7xKjZ9sYtNqF2pWe8x'
  },
  {
    date: '16 Feb, 2025',
    fromToken: { symbol: 'USDC', amount: '500' },
    toToken: { symbol: 'SOL', amount: '4.02' },
    gasFee: '0.000005 SOL',
    status: 'completed',
    txHash: '3KpZx8wNmR4vTqYhL2sJfD7xMnQ6bCeV9hUyWgF1pT4m'
  },
  {
    date: '15 Feb, 2025',
    fromToken: { symbol: 'SOL', amount: '10' },
    toToken: { symbol: 'BONK', amount: '45,230,000' },
    gasFee: '0.000005 SOL',
    status: 'pending',
    txHash: '7HjYx2wKnR5vTqZhM3sLfD8xPnQ7bDeW0iVyXgG2qU5n'
  },
  {
    date: '14 Feb, 2025',
    fromToken: { symbol: 'USDC', amount: '1,000' },
    toToken: { symbol: 'USDT', amount: '999.50' },
    gasFee: '0.000005 SOL',
    status: 'completed',
    txHash: '9MnWz4xRnT6vUqAhN4sKfE9xQnR8cEfX1jWzYhH3rV6o'
  },
  {
    date: '13 Feb, 2025',
    fromToken: { symbol: 'SOL', amount: '0.5' },
    toToken: { symbol: 'ETH', amount: '0.023' },
    gasFee: '0.000005 SOL',
    status: 'failed',
    txHash: '2LpAy3xSnU7vVqBhO5tMfF0xRoS9dGgY2kXzAiI4sW7p'
  }
];

export default function TransactionsTable() {
  const { setSwapData, setIsLoading } = useSwap();

  const handleRepeatSwap = (tx: Transaction) => {
    setIsLoading(true);
    setSwapData({
      fromToken: tx.fromToken,
      toToken: tx.toToken,
    });
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="bg-white dark:bg-[#0D0D12] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-card w-full flex flex-col border border-zinc-200 dark:border-[#1E1E2E]">
      <div className="p-6 border-b border-zinc-200 dark:border-[#1E1E2E]">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Transactions</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-[#0A0A0F]">
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Conversion</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Gas Fee</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tx Hash</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Repeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-[#1E1E2E] !w-full !h-[372px]">
            {transactions.map((tx, idx) =>
            <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-[#18181B]/50 transition-colors h-[72px]">
                <td className="px-6 py-4 text-sm text-zinc-900 dark:text-white font-medium">
                  {tx.date}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <TokenIcon symbol={tx.fromToken.symbol} />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">{tx.fromToken.amount}</span>
                      <span className="text-xs text-zinc-500 uppercase">{tx.fromToken.symbol}</span>
                    </div>
                    <span className="text-zinc-400 dark:text-zinc-600 text-xs">→</span>
                    <div className="flex items-center gap-1.5">
                      <TokenIcon symbol={tx.toToken.symbol} />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">{tx.toToken.amount}</span>
                      <span className="text-xs text-zinc-500 uppercase">{tx.toToken.symbol}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  {tx.gasFee}
                </td>
                <td className="px-6 py-4 text-center">
                  {tx.status === 'completed' && (
                    <div className="inline-flex items-center justify-center size-6">
                      <Check className="size-4 text-emerald-500" strokeWidth={2} />
                    </div>
                  )}
                  {tx.status === 'pending' && (
                    <div className="inline-flex items-center justify-center size-6">
                      <Clock className="size-4 text-yellow-500" strokeWidth={2} />
                    </div>
                  )}
                  {tx.status === 'failed' && (
                    <div className="inline-flex items-center justify-center size-6">
                      <XCircle className="size-4 text-red-500" strokeWidth={2} />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <a 
                    href={`https://solscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-zinc-400 hover:text-indigo-800 dark:hover:text-white transition-colors"
                  >
                    <span className="font-mono">{tx.txHash.slice(0, 4)}...{tx.txHash.slice(-4)}</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleRepeatSwap(tx)}
                    className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-[#27272A] rounded-full"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-6 flex items-center justify-between border-t border-zinc-200 dark:border-[#1E1E2E]">
        <button className="p-2 border border-zinc-200 dark:border-[#27272A] rounded-lg hover:bg-zinc-100 dark:hover:bg-[#18181B] transition-colors text-zinc-500 disabled:opacity-30">
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-sm text-zinc-500">
          Page <span className="text-zinc-900 dark:text-white font-semibold">1</span> of <span className="text-zinc-900 dark:text-white font-semibold">12</span>
        </div>
        <button className="p-2 border border-zinc-200 dark:border-[#27272A] rounded-lg hover:bg-zinc-100 dark:hover:bg-[#18181B] transition-colors text-zinc-500">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}
