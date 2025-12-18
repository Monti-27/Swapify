"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface BalanceInfo {
  lamports: number;
  sol: number;
  formatted: string;
}

interface BalanceCardProps {
  title: string;
  balance: BalanceInfo | null;
  loading: boolean;
  className?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function BalanceCard({ title, balance, loading, className = "", onRefresh, refreshing = false }: BalanceCardProps) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh balance"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="text-gray-400 hover:text-white transition-colors"
            title={isVisible ? "Hide balance" : "Show balance"}
          >
            {isVisible ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeSlashIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-32"></div>
          </div>
        ) : (
          <div className="text-2xl font-mono text-white">
            {isVisible ? (
              balance ? `${balance.formatted} SOL` : "0 SOL"
            ) : (
              "••••••"
            )}
          </div>
        )}
        
        {balance && isVisible && (
          <div className="text-xs text-gray-500 font-mono">
            {balance.lamports.toLocaleString()} lamports
          </div>
        )}
      </div>
    </div>
  );
}
