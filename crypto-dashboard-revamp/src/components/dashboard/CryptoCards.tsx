"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

interface CryptoCardProps {
  name: string;
  symbol: string;
  basePrice: number;
  color: string;
  icon: string;
  delay: number;
}

const cryptoData: CryptoCardProps[] = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    basePrice: 52291,
    color: "#f7931a",
    icon: "₿",
    delay: 0,
  },
  {
    name: "Litecoin",
    symbol: "LTC",
    basePrice: 82.91,
    color: "#345d9d",
    icon: "Ł",
    delay: 0.1,
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    basePrice: 2829.1,
    color: "#627eea",
    icon: "Ξ",
    delay: 0.2,
  },
  {
    name: "Solana",
    symbol: "SOL",
    basePrice: 142.91,
    color: "#00ffa3",
    icon: "◎",
    delay: 0.3,
  },
];

function useRealtimePrice(basePrice: number) {
  const [price, setPrice] = useState(basePrice);
  const [prevPrice, setPrevPrice] = useState(basePrice);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const initialPrice = useRef(basePrice);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrice((currentPrice) => {
        const volatility = 0.0015;
        const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
        const newPrice = Math.max(currentPrice + change, currentPrice * 0.9);
        
        setPrevPrice(currentPrice);
        
        if (newPrice > currentPrice) {
          setFlash("up");
        } else if (newPrice < currentPrice) {
          setFlash("down");
        }
        
        setTimeout(() => setFlash(null), 150);
        
        return newPrice;
      });
    }, 400 + Math.random() * 400);

    return () => clearInterval(interval);
  }, []);

  const changePercent = ((price - initialPrice.current) / initialPrice.current) * 100;

  return { price, prevPrice, flash, changePercent };
}

function MarketStats({ symbol }: { symbol: string }) {
  // Dummy stats based on symbol
  const stats = {
    BTC: { vol: "42.1B", liq: "2.1B" },
    LTC: { vol: "1.2B", liq: "450M" },
    ETH: { vol: "18.5B", liq: "1.2B" },
    SOL: { vol: "4.8B", liq: "890M" },
  }[symbol as keyof typeof stats] || { vol: "0", liq: "0" };

  return (
    <div className="absolute bottom-5 right-5 text-right flex flex-col gap-1">
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">24h Vol</span>
        <span className="text-xs text-white/80 font-mono">${stats.vol}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Liquidity</span>
        <span className="text-xs text-white/80 font-mono">${stats.liq}</span>
      </div>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function LivePrice({ price, flash }: { price: number; flash: "up" | "down" | null }) {
  return (
    <motion.span
      animate={{
        color: flash === "up" ? "#34d399" : flash === "down" ? "#f87171" : "#ffffff",
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
      className="text-2xl font-bold tabular-nums block"
    >
      {formatPrice(price)}
    </motion.span>
  );
}

function CryptoCard({ name, symbol, basePrice, color, icon, delay }: CryptoCardProps) {
  const { price, flash, changePercent } = useRealtimePrice(basePrice);
  const positive = changePercent >= 0;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: delay + 0.2 }}
      whileHover={{ y: -4 }}
      className="relative bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/5 overflow-hidden card-hover cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-white font-medium text-sm">{name}</p>
          <p className="text-gray-500 text-xs">{symbol}</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="ml-auto w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <ArrowUpRight className="w-4 h-4" style={{ color }} />
        </motion.div>
      </div>

      <div className="relative z-10">
        <LivePrice price={price} flash={flash} />
        <div className="flex items-center gap-1 mt-1">
          <span
            className={`text-xs font-medium tabular-nums transition-colors duration-300 ${
              positive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {positive ? "+" : ""}{changePercent.toFixed(2)}%
          </span>
          {positive ? (
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-red-500" />
          )}
        </div>
      </div>

      <MarketStats symbol={symbol} />
    </motion.div>
  );
}

export function CryptoCards() {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cryptoData.map((crypto) => (
        <CryptoCard key={crypto.symbol} {...crypto} />
      ))}
    </div>
  );
}
