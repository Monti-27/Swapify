"use client";

import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  User, 
  LineChart, 
  Wallet, 
  Newspaper, 
  Settings, 
  LogOut,
  Moon
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: User, label: "Account", active: false },
  { icon: LineChart, label: "Chart", active: false },
  { icon: Wallet, label: "Wallet", active: false },
  { icon: Newspaper, label: "News", active: false },
  { icon: Settings, label: "Settings", active: false },
];

export function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed left-0 top-0 h-screen w-[200px] bg-[#0a0a0a] border-r border-white/5 flex flex-col py-6 px-4 z-50"
    >
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 rounded-full border-2 border-[#d4af37] flex items-center justify-center">
          <Moon className="w-5 h-5 text-[#d4af37]" />
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 + 0.2 }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              item.active
                ? "bg-[#d4af37] text-black font-medium"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 mt-auto"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-sm">Log out</span>
      </motion.button>
    </motion.aside>
  );
}
