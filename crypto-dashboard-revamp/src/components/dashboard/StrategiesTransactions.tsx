"use client";

import { motion } from "framer-motion";
import { Plus, Clock } from "lucide-react";

export function ActiveStrategies() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-6 border border-white/5"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white tracking-wide">ACTIVE STRATEGIES</h3>
          <p className="text-sm text-gray-500 mt-1">Your automated trading rules</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] text-black rounded-xl font-medium text-sm hover:bg-[#e6c65c] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Strategy
        </motion.button>
      </div>

      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 text-sm">Connect your wallet to view strategies</p>
      </div>
    </motion.div>
  );
}

export function RecentTransactions() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-6 border border-white/5"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white tracking-wide">RECENT TRANSACTIONS</h3>
        <p className="text-sm text-gray-500 mt-1">Your transaction history will appear here</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-gray-400 text-sm font-medium">No transactions yet</p>
        <p className="text-gray-600 text-xs mt-1">Start swapping to see your history</p>
      </div>
    </motion.div>
  );
}
