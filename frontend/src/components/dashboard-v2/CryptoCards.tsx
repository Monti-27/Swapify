"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  color: string;
  icon: string;
  logoUrl?: string;
}

interface TokenPriceData {
  address: string;
  price: number;
  priceChange24h: number;
  liquidity?: number;
  volume24h?: number;
  updateTime: number;
}

interface TokenMetadata {
  address?: string;
  id?: string;
  name: string;
  symbol: string;
  icon?: string;
  logoURI?: string;
  decimals: number;
}

const TOKENS: TokenConfig[] = [
  {
    address: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Solana",
    color: "#00ffa3",
    icon: "◎",
    logoUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  },
  {
    address: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    symbol: "BTC",
    name: "Bitcoin (Wormhole)",
    color: "#f7931a",
    icon: "₿",
  },
  {
    address: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
    symbol: "TRUMP",
    name: "Official Trump",
    color: "#c41e3a",
    icon: "🇺🇸",
    logoUrl: "https://pbs.twimg.com/profile_images/1880404849047461888/8JEz8vfi_400x400.jpg",
  },
  {
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    color: "#f9a825",
    icon: "🐕",
    logoUrl: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
  },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatPrice(price: number): { prefix: string; value: string; isSmall: boolean } {
  if (price === 0) return { prefix: "$", value: "0.00", isSmall: false };
  
  if (price >= 1000) {
    return {
      prefix: "$",
      value: price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      isSmall: false,
    };
  }
  if (price >= 1) {
    return {
      prefix: "$",
      value: price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
      isSmall: false,
    };
  }
  if (price >= 0.0001) {
    return {
      prefix: "$",
      value: price.toLocaleString("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      }),
      isSmall: false,
    };
  }
  
  const priceStr = price.toFixed(12);
  return {
    prefix: "$",
    value: priceStr.replace(/0+$/, '').slice(0, 12),
    isSmall: true,
  };
}

function formatLiquidity(value?: number): string {
  if (!value) return "N/A";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function LivePrice({ price, flash }: { price: number; flash: "up" | "down" | null }) {
  const { prefix, value, isSmall } = formatPrice(price);
  
  return (
    <motion.span
      animate={{
        textShadow: flash === "up" 
          ? "0 0 15px rgba(52, 211, 153, 0.6)" 
          : flash === "down" 
          ? "0 0 15px rgba(248, 113, 113, 0.6)" 
          : "0 0 0px rgba(255, 255, 255, 0)",
        scale: flash ? 1.02 : 1,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.1
      }}
      className={`font-bold tabular-nums block text-gray-900 dark:text-white ${
        isSmall ? "text-sm" : "text-2xl"
      }`}
    >
      <span className={flash === "up" ? "text-emerald-500" : flash === "down" ? "text-red-500" : ""}>
        {prefix}{value}
      </span>
    </motion.span>
  );
}

function CryptoCardSkeleton() {
  return (
    <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#141414] rounded-2xl p-5 border border-gray-200 dark:border-white/5 overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-white/5" />
          <Skeleton className="h-3 w-12 bg-gray-200 dark:bg-white/5" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 bg-gray-200 dark:bg-white/5" />
        <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-white/5" />
      </div>
      <div className="absolute bottom-5 right-5">
        <Skeleton className="h-8 w-16 bg-gray-200 dark:bg-white/5" />
      </div>
    </div>
  );
}

function CryptoCard({ 
  token, 
  priceData, 
  metadata,
  flash 
}: { 
  token: TokenConfig; 
  priceData: TokenPriceData | null;
  metadata: TokenMetadata | null;
  flash: "up" | "down" | null;
}) {
  const price = priceData?.price ?? 0;
  const priceChange = priceData?.priceChange24h ?? 0;
  const positive = priceChange >= 0;
  const logoUrl = metadata?.icon || metadata?.logoURI || token.logoUrl;

  if (!priceData) {
    return <CryptoCardSkeleton />;
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#141414] rounded-2xl p-5 border border-gray-200 dark:border-white/5 overflow-hidden card-hover cursor-pointer shadow-sm dark:shadow-none"
    >
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold overflow-hidden"
          style={{ backgroundColor: `${token.color}20`, color: token.color }}
        >
          {logoUrl ? (
            <Image 
              src={logoUrl} 
              alt={token.symbol} 
              width={40} 
              height={40}
              className="rounded-full"
              unoptimized
            />
          ) : (
            token.icon
          )}
        </div>
        <div>
          <p className="text-gray-900 dark:text-white font-medium text-sm">{metadata?.name || token.name}</p>
          <p className="text-gray-500 text-xs">{metadata?.symbol || token.symbol}</p>
        </div>
      </div>

      <div className="relative z-10">
        <LivePrice price={price} flash={flash} />
        <div className="flex items-center gap-1 mt-1">
          <span
            className={`text-xs font-medium tabular-nums transition-colors duration-300 ${
              positive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {positive ? "+" : ""}{priceChange.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 text-right flex flex-col gap-1">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Liquidity</span>
          <span className="text-xs text-gray-700 dark:text-white/80 font-mono">{formatLiquidity(priceData?.liquidity)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export function CryptoCards() {
  const [prices, setPrices] = useState<Map<string, TokenPriceData>>(new Map());
  const [metadata, setMetadata] = useState<Map<string, TokenMetadata>>(new Map());
  const [flashes, setFlashes] = useState<Map<string, "up" | "down" | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevPrices = useRef<Map<string, number>>(new Map());

  const fetchPrices = useCallback(async () => {
    try {
      const addresses = TOKENS.map(t => t.address).join(",");
      const response = await fetch(`${API_BASE}/prices?addresses=${addresses}`);
      if (!response.ok) throw new Error("Failed to fetch prices");
      
      const data: TokenPriceData[] = await response.json();
      const newPrices = new Map<string, TokenPriceData>();
      const newFlashes = new Map<string, "up" | "down" | null>();

      data.forEach((item) => {
        newPrices.set(item.address, item);
        
        const prevPrice = prevPrices.current.get(item.address);
        if (prevPrice !== undefined && Math.abs(prevPrice - item.price) > 0.00000001) {
          newFlashes.set(item.address, item.price > prevPrice ? "up" : "down");
        }
        prevPrices.current.set(item.address, item.price);
      });

      setPrices(newPrices);
      setFlashes(newFlashes);
      setLoading(false);
      setError(null);

      setTimeout(() => {
        setFlashes(new Map());
      }, 1000);
    } catch (error) {
      console.error("Error fetching prices:", error);
      setError("Failed to update prices");
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const newMetadata = new Map<string, TokenMetadata>();
      
      for (const token of TOKENS) {
        try {
          const response = await fetch(`${API_BASE}/tokens/${token.address}`);
          if (response.ok) {
            const text = await response.text();
            if (text && text.trim()) {
              try {
                const data: TokenMetadata = JSON.parse(text);
                if (data && data.symbol) {
                  newMetadata.set(token.address, data);
                }
              } catch {
              }
            }
          }
        } catch (e) {
        }
      }
      
      setMetadata(newMetadata);
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchMetadata();

    const priceInterval = setInterval(fetchPrices, 2000);
    
    return () => {
      clearInterval(priceInterval);
    };
  }, [fetchPrices, fetchMetadata]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {TOKENS.map((token) => (
          <CryptoCardSkeleton key={token.address} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {TOKENS.map((token) => (
        <CryptoCard
          key={token.address}
          token={token}
          priceData={prices.get(token.address) || null}
          metadata={metadata.get(token.address) || null}
          flash={flashes.get(token.address) || null}
        />
      ))}
    </div>
  );
}
