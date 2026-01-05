"use client";

import { MoreHorizontal, Wallet } from "lucide-react";
import { useUserAssets, Asset } from "@/hooks/useUserAssets";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface PortfolioItem extends Asset {
  usdValue: number;
  percentage: number;
  priceChange24h: number;
}

const TOKEN_COLORS: Record<string, string> = {
  SOL: "#00ffa3",
  USDC: "#2775ca",
  USDT: "#26a17b",
  BTC: "#f7931a",
  ETH: "#627eea",
  BONK: "#f9a825",
  TRUMP: "#c41e3a",
  JUP: "#7c3aed",
  RAY: "#3875fb",
  PYTH: "#6366f1",
};

const TOKEN_ICONS: Record<string, string> = {
  SOL: "◎",
  USDC: "$",
  USDT: "₮",
  BTC: "₿",
  ETH: "Ξ",
  BONK: "🐕",
  TRUMP: "🇺🇸",
};

function getTokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol] || `hsl(${Math.abs(symbol.charCodeAt(0) * 37) % 360}, 70%, 50%)`;
}

function getTokenIcon(symbol: string): string {
  return TOKEN_ICONS[symbol] || symbol.charAt(0).toUpperCase();
}

export function Portfolio() {
  const { connected } = useWallet();
  const { assets, loading: assetsLoading, refetch } = useUserAssets();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const hasFetchedRef = useRef(false);
  const assetsStringRef = useRef("");

  const fetchPricesAndCalculate = useCallback(async () => {
    if (!connected || assets.length === 0) {
      setPortfolioItems([]);
      setTotalValue(0);
      setLoading(false);
      return;
    }

    setLoading(true);

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
      const items: PortfolioItem[] = assets.map(asset => {
        const priceInfo = priceMap.get(asset.mint) || { price: 0, priceChange24h: 0 };
        const usdValue = asset.balance * priceInfo.price;
        total += usdValue;
        return {
          ...asset,
          usdValue,
          percentage: 0,
          priceChange24h: priceInfo.priceChange24h,
        };
      });

      const itemsWithPercentage = items
        .map(item => ({
          ...item,
          percentage: total > 0 ? (item.usdValue / total) * 100 : 0,
        }))
        .filter(item => item.usdValue > 0.01)
        .sort((a, b) => b.usdValue - a.usdValue)
        .slice(0, 5);

      setPortfolioItems(itemsWithPercentage);
      setTotalValue(total);
    } catch (error) {
      console.error("Error fetching portfolio prices:", error);
    } finally {
      setLoading(false);
    }
  }, [connected, assets]);

  useEffect(() => {
    const currentAssetsString = JSON.stringify(assets.map(a => a.mint).sort());
    
    if (assets.length > 0 && currentAssetsString !== assetsStringRef.current) {
      assetsStringRef.current = currentAssetsString;
      fetchPricesAndCalculate();
    } else if (assets.length === 0 && !assetsLoading) {
      setLoading(false);
    }
  }, [assets, assetsLoading, fetchPricesAndCalculate]);

  useEffect(() => {
    if (!connected) {
      setLoading(false);
      setPortfolioItems([]);
      hasFetchedRef.current = false;
      assetsStringRef.current = "";
    }
  }, [connected]);

  if (!connected) {
    return (
      <div className="bg-gradient-to-br from-[#f5f0e1] to-[#ebe5d3] rounded-2xl p-5 h-full flex flex-col items-center justify-center">
        <Wallet className="w-12 h-12 text-gray-500 mb-3" />
        <h3 className="text-lg font-semibold text-black mb-1">My Portfolio</h3>
        <p className="text-sm text-gray-600 text-center">
          Connect your wallet to see your holdings
        </p>
      </div>
    );
  }

  if (loading || assetsLoading) {
    return (
      <div className="bg-gradient-to-br from-[#f5f0e1] to-[#ebe5d3] rounded-2xl p-5 h-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-black">My Portfolio</h3>
          <Skeleton className="w-8 h-8 rounded-full bg-black/5" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="w-10 h-10 rounded-full bg-black/5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24 bg-black/5" />
                <Skeleton className="h-3 w-16 bg-black/5" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-4 w-16 bg-black/5" />
                <Skeleton className="h-5 w-12 bg-black/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (portfolioItems.length === 0) {
    return (
      <div className="bg-gradient-to-br from-[#f5f0e1] to-[#ebe5d3] rounded-2xl p-5 h-full flex flex-col items-center justify-center">
        <Wallet className="w-12 h-12 text-gray-500 mb-3" />
        <h3 className="text-lg font-semibold text-black mb-1">My Portfolio</h3>
        <p className="text-sm text-gray-600 text-center">
          No tokens found in your wallet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#f5f0e1] to-[#ebe5d3] rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-black">My Portfolio</h3>
        <button 
          onClick={() => refetch()}
          className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-gray-600 hover:bg-black/10 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {portfolioItems.map((item, index) => (
          <div
            key={item.mint}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden"
              style={{ backgroundColor: getTokenColor(item.symbol) }}
            >
              {item.logoURI ? (
                <Image
                  src={item.logoURI}
                  alt={item.symbol}
                  width={40}
                  height={40}
                  className="rounded-full"
                  unoptimized
                />
              ) : (
                getTokenIcon(item.symbol)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black truncate">{item.name}</p>
              <p className="text-xs text-gray-600">{item.symbol}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-black">
                ${item.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.priceChange24h >= 0
                    ? "bg-emerald-500/20 text-emerald-600"
                    : "bg-red-500/20 text-red-600"
                }`}
              >
                {item.priceChange24h >= 0 ? "+" : ""}{item.priceChange24h.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
