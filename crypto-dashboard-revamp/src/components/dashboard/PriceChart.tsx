"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const chartData = [
  { time: "20:00", value: 20000 },
  { time: "20:10", value: 32000 },
  { time: "20:20", value: 28000 },
  { time: "20:30", value: 35000 },
  { time: "20:40", value: 30000 },
  { time: "20:50", value: 38252.02 },
];

const timeFilters = ["1h", "3h", "1d", "1w", "1m"];

export function PriceChart() {
  const [activeFilter, setActiveFilter] = useState("1d");

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-white/5 h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Chart</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-500">USD</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">Bitcoin/BTC</span>
            <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">$38,252.02</p>
        </div>

        <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-full p-1">
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === filter
                  ? "bg-[#d4af37] text-black"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] -mx-2" style={{ minWidth: 0, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height={280} minWidth={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4af37" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666", fontSize: 11 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)},000`}
              dx={-10}
              domain={[10000, 50000]}
              ticks={[10000, 20000, 30000, 40000, 50000]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "12px",
              }}
              labelStyle={{ color: "#888" }}
              itemStyle={{ color: "#d4af37" }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Price"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#d4af37"
              strokeWidth={2}
              fill="url(#chartGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
