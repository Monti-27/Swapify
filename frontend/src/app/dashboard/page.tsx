"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Header } from "@/components/dashboard/Header";
import { TotalBalance } from "@/components/dashboard/TotalBalance";
import { CryptoCards } from "@/components/dashboard/CryptoCards";
import { Portfolio } from "@/components/dashboard/Portfolio";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { ActiveStrategies, RecentTransactions } from "@/components/dashboard/StrategiesTransactions";

export default function DashboardPage() {
  return (
    <div className="min-h-screen relative bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white transition-colors duration-300">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(212,175,55,0.03)_0%,_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(212,175,55,0.05)_0%,_transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(212,175,55,0.02)_0%,_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,_rgba(212,175,55,0.03)_0%,_transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10">
        <Navbar />
        
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="max-w-[1400px] mx-auto"
            >
              <Header />
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
        
        <Footer />
      </div>
    </div>
  );
}
