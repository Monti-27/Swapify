"use client";

import { motion } from "framer-motion";

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <h1 className="text-4xl font-semibold text-[#d4af37] font-display tracking-wide">
        Dashboard
      </h1>
    </motion.header>
  );
}
