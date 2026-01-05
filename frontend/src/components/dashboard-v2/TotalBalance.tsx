"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { useUserAssets } from "@/hooks/useUserAssets";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatBalance(value: number): { main: string; decimal: string } {
  if (value >= 1000000) {
    const formatted = (value / 1000000).toFixed(2);
    const [main, decimal] = formatted.split(".");
    return { main: `$${Number(main).toLocaleString()}M`, decimal: "" };
  }
  if (value >= 1000) {
    const formatted = value.toFixed(2);
    const [main, decimal] = formatted.split(".");
    return { main: `$${Number(main).toLocaleString()}`, decimal: `.${decimal}` };
  }
  const formatted = value.toFixed(2);
  const [main, decimal] = formatted.split(".");
  return { main: `$${main}`, decimal: `.${decimal}` };
}

export function TotalBalance() {
  const { connected } = useWallet();
  const { assets, loading: assetsLoading } = useUserAssets();
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const prevBalance = useRef<number>(0);

  const fetchTotalBalance = useCallback(async () => {
    if (!connected || assets.length === 0) {
      setTotalBalance(0);
      setPriceChange24h(0);
      setLoading(false);
      return;
    }

    try {
      const addresses = assets.map(a => a.mint).join(",");
      const response = await fetch(`${API_BASE}/prices?addresses=${addresses}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }

      const priceData = await response.json();
      const priceMap = new Map<string, { price: number; priceChange24h: number }>();

      priceData.forEach((item: any) => {
        priceMap.set(item.address, {
          price: item.price || 0,
          priceChange24h: item.priceChange24h || 0,
        });
      });

      let total = 0;
      let weightedChange = 0;

      assets.forEach(asset => {
        const priceInfo = priceMap.get(asset.mint) || { price: 0, priceChange24h: 0 };
        const usdValue = asset.balance * priceInfo.price;
        total += usdValue;
        weightedChange += usdValue * priceInfo.priceChange24h;
      });

      const avgChange = total > 0 ? weightedChange / total : 0;

      setTotalBalance(total);
      setPriceChange24h(avgChange);
      prevBalance.current = total;
    } catch (error) {
      console.error("Error fetching total balance:", error);
    } finally {
      setLoading(false);
    }
  }, [connected, assets]);

  useEffect(() => {
    if (!assetsLoading) {
      fetchTotalBalance();
    }
    const interval = setInterval(fetchTotalBalance, 10000);
    return () => clearInterval(interval);
  }, [fetchTotalBalance, assetsLoading]);

  const { main, decimal } = formatBalance(totalBalance);
  const isPositive = priceChange24h >= 0;

  if (!connected) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
            Total Balance
          </p>
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-gray-500" />
            <span className="text-2xl font-medium text-gray-500">
              Connect wallet to view balance
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (loading || assetsLoading) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
            Total Balance
          </p>
          <Skeleton className="h-12 w-48 bg-gray-200 dark:bg-white/5" />
        </div>
        <div className="flex items-center gap-6">
          <Skeleton className="h-8 w-20 bg-gray-200 dark:bg-white/5" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex items-end justify-between mb-6"
    >
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
          Total Balance
        </p>
        <div className="flex items-baseline gap-1">
          <motion.span 
            key={main}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight"
          >
            {main}
          </motion.span>
          <span className="text-2xl text-gray-500">{decimal}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-right"
        >
          <p className="text-xs text-gray-500 mb-1">24h Change</p>
          <div className="flex items-center justify-end gap-1">
            <span
              className={`text-sm font-medium ${
                isPositive ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
            </span>
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
