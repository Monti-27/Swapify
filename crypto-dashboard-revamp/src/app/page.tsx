"use client";

import { TotalBalance } from "@/components/dashboard/TotalBalance";
import { CryptoCards } from "@/components/dashboard/CryptoCards";
import { Portfolio } from "@/components/dashboard/Portfolio";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { ActiveStrategies, RecentTransactions } from "@/components/dashboard/StrategiesTransactions";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(212,175,55,0.05)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(212,175,55,0.03)_0%,_transparent_50%)]" />
      
      <main className="p-8 relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-[1400px] mx-auto"
        >
          <TotalBalance />
          <CryptoCards />

          <div className="grid grid-cols-[350px_1fr] gap-6 mb-6">
            <Portfolio />
            <PriceChart />
          </div>

          <div className="space-y-6">
            <ActiveStrategies />
            <RecentTransactions />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
