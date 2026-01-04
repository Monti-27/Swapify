"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Clock, Target, ArrowDownRight, ExternalLink, 
  CheckCircle2, XCircle, Filter, ChevronDown, Search
} from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api as apiClient } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWalletInit } from "@/contexts/WalletInitContext";
import { useTransactionStore } from "@/store/transactionStore";
import type { Strategy } from "@/types/api";
import { POPULAR_TOKENS } from "@/lib/tokens";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function ActiveStrategies() {
  const { connected, connecting } = useWallet();
  const { isAuthenticated, isAuthenticating } = useAuthContext();
  const { isInitializing } = useWalletInit();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const getTokenSymbol = (address: string) => {
    const token = POPULAR_TOKENS.find(t => t.address === address);
    return token?.symbol || address.slice(0, 6);
  };

  const loadStrategies = async () => {
    if (!connected || !isAuthenticated) return;
    setLoading(true);
    try {
      const data = await apiClient.getStrategies();
      setStrategies(data);
      hasLoadedRef.current = true;
    } catch (error) {
      console.log('Failed to load strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && isAuthenticated) {
      if (!hasLoadedRef.current) {
        loadStrategies();
      }
    } else {
      setStrategies([]);
      setLoading(false);
      hasLoadedRef.current = false;
    }
  }, [connected, isAuthenticated]);

  const activeStrategies = strategies.filter(s => s.status === 'active');

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#141414] rounded-2xl p-6 border border-gray-200 dark:border-white/5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-wide uppercase">ACTIVE STRATEGIES</h3>
          <p className="text-sm text-gray-500 mt-1">Your automated trading rules</p>
        </div>
        <Link href="/strategies">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] text-black rounded-xl font-medium text-sm hover:bg-[#e6c65c] transition-colors shadow-lg shadow-[#d4af37]/10"
          >
            <Plus className="w-4 h-4" />
            New Strategy
          </motion.button>
        </Link>
      </div>

      {!connected ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">Connect your wallet to view strategies</p>
        </div>
      ) : (isInitializing || connecting || isAuthenticating || loading) ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12" />
                  <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <Skeleton className="h-4 w-12" />
                  <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : activeStrategies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm mb-4 font-medium">No active strategies yet</p>
          <Link href="/strategies">
            <button className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              Create First Strategy
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activeStrategies.slice(0, 5).map((strategy) => (
            <div
              key={strategy.id}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all group cursor-pointer"
            >
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-[#d4af37] transition-colors">
                  {strategy.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="font-medium text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-white/5">{getTokenSymbol(strategy.fromToken)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-white/5">{getTokenSymbol(strategy.toToken)}</span>
                  <span className="text-gray-300 dark:text-gray-700 mx-1">•</span>
                  <span className="flex items-center gap-1">
                    {strategy.triggerType} <span className="text-gray-400">@</span> <span className="font-mono text-[#d4af37]">${Number(strategy.triggerValue).toLocaleString()}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full border border-green-500/20 tracking-wider">
                  ACTIVE
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
              </div>
            </div>
          ))}
          {activeStrategies.length > 5 && (
            <Link href="/strategies" className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500 hover:text-[#d4af37] transition-colors font-medium border-t border-gray-100 dark:border-white/5 mt-4">
              View all {activeStrategies.length} strategies
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function RecentTransactions() {
  const { transactions } = useTransactionStore();
  const { connected } = useWallet();
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatSignature = (sig: string) => {
    return `${sig.slice(0, 4)}...${sig.slice(-4)}`;
  };

  const formatAmount = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0.00';
    if (num < 0.0001) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const getTokenDisplay = (token: string): string => {
    const tokenMap: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
    };
    if (token.length > 20) return tokenMap[token] || `${token.slice(0, 4)}...${token.slice(-4)}`;
    return token;
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }
    return filtered.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [transactions, statusFilter]);

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#141414] rounded-2xl p-6 border border-gray-200 dark:border-white/5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-wide uppercase">RECENT TRANSACTIONS</h3>
          <p className="text-sm text-gray-500 mt-1">Your transaction history will appear here</p>
        </div>
        {connected && transactions.length > 0 && (
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5">
              {['all', 'success', 'pending', 'failed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                    statusFilter === s 
                      ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!connected || filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-gray-400 dark:text-gray-600" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            {statusFilter !== 'all' ? `No ${statusFilter} transactions` : 'No transactions yet'}
          </p>
          <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Start swapping to see your history</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${
                  tx.status === 'success' 
                    ? 'bg-green-500/10 text-green-500 border border-green-500/10' 
                    : tx.status === 'failed' 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/10' 
                      : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/10'
                }`}>
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Swap {getTokenDisplay(tx.fromToken)} to {getTokenDisplay(tx.toToken)}
                    </span>
                    {getStatusIcon(tx.status)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span className="font-medium">{formatTime(tx.timestamp)}</span>
                    <span className="text-gray-300 dark:text-gray-800">•</span>
                    <span className="font-mono bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{formatSignature(tx.signature)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-gray-900 dark:text-white">
                  +{formatAmount(tx.toAmount || '0')} <span className="text-xs font-medium text-gray-500">{getTokenDisplay(tx.toToken)}</span>
                </div>
                <div className="text-xs font-medium text-gray-500 mt-0.5">
                  -{formatAmount(tx.fromAmount || '0')} {getTokenDisplay(tx.fromToken)}
                </div>
                {tx.explorerUrl && (
                  <a
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-[#d4af37] font-semibold hover:underline mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    SOLSCAN <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {transactions.length > 10 && (
             <div className="flex items-center justify-center pt-4 border-t border-gray-100 dark:border-white/5">
                <p className="text-xs text-gray-400">Showing last 10 transactions</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
