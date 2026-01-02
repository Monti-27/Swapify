"use client";

import { motion } from "framer-motion";
import {
  SwapProvider,
  Sidebar,
  Header,
  MainChart,
  ConversionCard,
  TransactionsTable,
} from "@/components/swap-v2";

export default function SwapV2Page() {
  return (
    <SwapProvider>
      <div className="flex min-h-screen bg-swap-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 lg:px-8">
            <Header />
            
            <main className="py-6 max-w-7xl mx-auto">
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
            </main>
          </div>
        </div>
      </div>
    </SwapProvider>
  );
}
