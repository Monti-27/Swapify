"use client";

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, RotateCcw, ExternalLink, Clock, XCircle, Inbox } from 'lucide-react';
import { useSwap, SwapTransaction } from './SwapContext';

function TokenIcon({ logoURI, symbol, size = 20 }: { logoURI?: string; symbol: string; size?: number }) {
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
      className="rounded-full bg-[#27272A] flex items-center justify-center text-zinc-400 font-bold shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

const ITEMS_PER_PAGE = 5;

export default function TransactionsTable() {
  const { transactions, setInputToken, setOutputToken, setInputAmount } = useSwap();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(transactions.length / ITEMS_PER_PAGE));
  
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return transactions.slice(start, end);
  }, [transactions, currentPage]);

  const handleRepeatSwap = (tx: SwapTransaction) => {
    setInputToken({
      address: tx.fromToken.address,
      symbol: tx.fromToken.symbol,
      name: tx.fromToken.symbol,
      decimals: tx.fromToken.symbol === 'SOL' ? 9 : 6,
      logoURI: tx.fromToken.logoURI,
    });
    setOutputToken({
      address: tx.toToken.address,
      symbol: tx.toToken.symbol,
      name: tx.toToken.symbol,
      decimals: tx.toToken.symbol === 'SOL' ? 9 : 6,
      logoURI: tx.toToken.logoURI,
    });
    setInputAmount(tx.fromToken.amount);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
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
          <tbody className="divide-y divide-zinc-100 dark:divide-[#1E1E2E]">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16">
                  <div className="flex flex-col items-center justify-center text-zinc-500">
                    <Inbox className="size-12 mb-3 text-zinc-400" />
                    <p className="text-sm font-medium">No transactions yet</p>
                    <p className="text-xs text-zinc-500 mt-1">Your swap transactions will appear here</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-[#18181B]/50 transition-colors h-[72px]">
                  <td className="px-6 py-4 text-sm text-zinc-900 dark:text-white font-medium">
                    {tx.date}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <TokenIcon logoURI={tx.fromToken.logoURI} symbol={tx.fromToken.symbol} />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{tx.fromToken.amount}</span>
                        <span className="text-xs text-zinc-500 uppercase">{tx.fromToken.symbol}</span>
                      </div>
                      <span className="text-zinc-400 dark:text-zinc-600 text-xs">→</span>
                      <div className="flex items-center gap-1.5">
                        <TokenIcon logoURI={tx.toToken.logoURI} symbol={tx.toToken.symbol} />
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
                    {tx.status === 'cancelled' && (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {transactions.length > 0 && (
        <div className="p-6 flex items-center justify-between border-t border-zinc-200 dark:border-[#1E1E2E]">
          <button 
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 border border-zinc-200 dark:border-[#27272A] rounded-lg hover:bg-zinc-100 dark:hover:bg-[#18181B] transition-colors text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-sm text-zinc-500">
            Page <span className="text-zinc-900 dark:text-white font-semibold">{currentPage}</span> of <span className="text-zinc-900 dark:text-white font-semibold">{totalPages}</span>
          </div>
          <button 
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 border border-zinc-200 dark:border-[#27272A] rounded-lg hover:bg-zinc-100 dark:hover:bg-[#18181B] transition-colors text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </section>
  );
}
