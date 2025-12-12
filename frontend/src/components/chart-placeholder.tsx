'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { Token } from '@/lib/tokens';

interface ChartPlaceholderProps {
  type: 'sell' | 'buy';
  token: Token | null;
  price?: string;
}

export function ChartPlaceholder({ type, token, price }: ChartPlaceholderProps) {
  const getPlaceholderPrice = () => {
    if (price) return price;
    
    // Generate realistic placeholder prices based on token symbol
    const prices: Record<string, string> = {
      'SOL': '$98.45',
      'USDC': '$1.00',
      'USDT': '$1.00',
      'BONK': '$0.000823',
      'JTO': '$2.34',
      'mSOL': '$99.12',
      'jitoSOL': '$98.78',
      'jupSOL': '$98.56',
    };
    
    return prices[token?.symbol || 'SOL'] || '$0.00';
  };

  const getChartTitle = () => {
    return type === 'sell' ? 'Chart 1' : 'Chart 2';
  };

  const getChartDescription = () => {
    return type === 'sell' ? 'What we are holding' : 'What we want to buy';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.43, 0.13, 0.23, 0.96] }}
      className="relative h-full rounded-xl overflow-hidden group"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 to-gray-950/50" />
      
      {/* Animated border with glow */}
      <div className="absolute inset-0 rounded-xl border-2 border-primary/30 group-hover:border-primary/50 transition-all duration-300 shadow-lg group-hover:shadow-xl" />
      
      {/* Pulse animation overlay */}
      <div className="absolute inset-0 rounded-xl border-2 border-primary/20 animate-pulse" />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
        {/* Chart icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
          className="mb-4"
        >
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
        </motion.div>
        
        {/* Chart title */}
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-2"
        >
          <h3 className="text-2xl font-bold text-white font-display">
            {getChartTitle()}
          </h3>
        </motion.div>
        
        {/* Chart description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="mb-4"
        >
          <p className="text-lg text-primary font-semibold">
            {getChartDescription()}
          </p>
        </motion.div>
        
        {/* Status text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          <p className="mb-1">
            {type === 'sell' ? 'Selling' : 'Buying'} {token?.symbol || 'SOL'}
          </p>
          <p className="text-xs opacity-75">Live chart coming soon</p>
        </motion.div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }} />
        </div>
      </div>
      
      {/* Corner accent */}
      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary opacity-60" />
    </motion.div>
  );
}
