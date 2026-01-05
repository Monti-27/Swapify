"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

const timeFilters = [
  { label: "Today", value: "-2.5%", negative: true },
  { label: "7 Days", value: "+4.25%", negative: false },
  { label: "30 Days", value: "+11.5%", negative: false },
];

export function TotalBalance() {
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
          <span className="text-5xl font-bold text-white tracking-tight">
            $154,610
          </span>
          <span className="text-2xl text-gray-500">.00</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {timeFilters.map((filter, index) => (
          <motion.div
            key={filter.label}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="text-right"
          >
            <p className="text-xs text-gray-500 mb-1">{filter.label}</p>
            <div className="flex items-center justify-end gap-1">
              <span
                className={`text-sm font-medium ${
                  filter.negative ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {filter.value}
              </span>
              {filter.negative ? (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
