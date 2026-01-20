"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  SwapProvider,
  MainChart,
  ConversionCard,
  TransactionsTable,
} from "@/components/swap-v2";

export default function SwapV2Page() {
  return (
    <SwapProvider>
        <div className="min-h-screen relative bg-background">
          <div className="absolute inset-0 gradient-purple-radial pointer-events-none" style={{ willChange: 'auto' }} />
          <div className="relative z-10" style={{ willChange: 'auto' }}>
          <Navbar />
          
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-32" style={{ willChange: 'auto' }}>
            <div className="max-w-7xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col lg:flex-row gap-6 mb-6"
              >
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex-1"
                >
                  <MainChart />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <ConversionCard />
                </motion.div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <TransactionsTable />
              </motion.div>
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </SwapProvider>
  );
}
