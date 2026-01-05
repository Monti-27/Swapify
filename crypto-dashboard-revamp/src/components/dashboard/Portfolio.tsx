"use client";

import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";

const portfolioData = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    percentage: "37%",
    change: "+2.5%",
    positive: true,
    color: "#f7931a",
    icon: "₿",
  },
  {
    name: "Tether",
    symbol: "USDT",
    percentage: "23%",
    change: "-3.5%",
    positive: false,
    color: "#26a17b",
    icon: "₮",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    percentage: "20%",
    change: "-1.5%",
    positive: false,
    color: "#627eea",
    icon: "Ξ",
  },
  {
    name: "Ripple",
    symbol: "XLA",
    percentage: "17%",
    change: "+3.5%",
    positive: true,
    color: "#23292f",
    icon: "✕",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    percentage: "20%",
    change: "+2.5%",
    positive: true,
    color: "#8c8dfc",
    icon: "◆",
  },
];

export function Portfolio() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-gradient-to-br from-[#f5f0e1] to-[#ebe5d3] rounded-2xl p-5 h-full"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-black">My Portfolio</h3>
        <button className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-gray-600 hover:bg-white transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {portfolioData.map((item, index) => (
          <motion.div
            key={`${item.symbol}-${index}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.05 }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/30 transition-colors cursor-pointer"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: item.color }}
            >
              {item.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-black">{item.name}</p>
              <p className="text-xs text-gray-500">{item.symbol}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-black">{item.percentage}</p>
              <p
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.positive
                    ? "bg-emerald-500/20 text-emerald-600"
                    : "bg-red-500/20 text-red-600"
                }`}
              >
                {item.change}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
