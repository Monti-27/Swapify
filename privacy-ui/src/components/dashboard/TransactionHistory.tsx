"use client";

import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "send";
  amount: {
    sol: string;
    lamports: number;
  };
  fee: {
    sol: string;
    lamports: number;
  };
  status: "pending" | "processing" | "completed" | "failed";
  txHash?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  explorerUrl?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading?: boolean;
}

export function TransactionHistory({ transactions, loading = false }: TransactionHistoryProps) {
  const getIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "deposit":
        return <ArrowDownIcon className="h-4 w-4 text-green-400" />;
      case "withdraw":
        return <ArrowUpIcon className="h-4 w-4 text-red-400" />;
      case "send":
        return <ArrowRightIcon className="h-4 w-4 text-blue-400" />;
    }
  };

  const getStatusColor = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "pending":
      case "processing":
        return "text-yellow-400";
      case "failed":
        return "text-red-400";
    }
  };

  const formatAmount = (amount: { sol: string; lamports: number }) => {
    return parseFloat(amount.sol).toFixed(6).replace(/\.?0+$/, '');
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">
          Recent Activity
        </h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-32"></div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">
        Recent Activity
      </h3>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No transactions yet</div>
          <div className="text-sm text-gray-600">
            Your private transactions will appear here
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-shrink-0">
                {getIcon(tx.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white capitalize">
                    {tx.type}
                  </span>
                  <span className={`text-xs ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>
                
                <div className="text-xs text-gray-400">
                  {tx.createdAt.toLocaleDateString()} {tx.createdAt.toLocaleTimeString()}
                  {tx.error && (
                    <div className="text-red-400 mt-1">
                      Error: {tx.error}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-mono text-white">
                  {formatAmount(tx.amount)} SOL
                </div>
                {tx.explorerUrl || tx.txHash ? (
                  <a
                    href={tx.explorerUrl || `https://solscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-xs text-gray-600">
                    {tx.status === 'pending' || tx.status === 'processing' ? 'Processing...' : 'No TX'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
