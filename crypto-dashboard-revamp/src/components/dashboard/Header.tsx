"use client";

import { motion } from "framer-motion";
import { Search, Mail, Bell } from "lucide-react";
import Image from "next/image";

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between mb-8"
    >
      <h1 className="text-2xl font-semibold text-[#d4af37] font-display tracking-wide">
        Dashboard
      </h1>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search"
            className="w-[280px] h-11 bg-[#141414] border border-white/10 rounded-full pl-11 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#d4af37]/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-[#141414] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#d4af37]/30 transition-all"
          >
            <Mail className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-[#141414] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#d4af37]/30 transition-all relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#d4af37] rounded-full" />
          </motion.button>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#d4af37]/50 cursor-pointer"
          >
            <Image
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
              alt="Profile"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
