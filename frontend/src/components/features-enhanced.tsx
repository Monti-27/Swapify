'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Shield,
  TrendingUp,
  Wallet,
  BarChart3,
  Lock,
  Globe,
  Layers,
  Target,
} from 'lucide-react';

// GPU-friendly easing
const smoothEase = [0.43, 0.13, 0.23, 0.96] as const;

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Execute trades in milliseconds with our optimized routing engine built on Solana.',
    gradient: 'from-purple-500 to-purple-700',
    size: 'large',
  },
  {
    icon: Shield,
    title: 'Secure & Audited',
    description:
      'Smart contracts audited by leading security firms. Your funds are always safe.',
    gradient: 'from-violet-500 to-violet-700',
    size: 'normal',
  },
  {
    icon: TrendingUp,
    title: 'Best Prices',
    description:
      'Aggregated liquidity from multiple DEXs ensures you always get the best rates.',
    gradient: 'from-indigo-500 to-indigo-700',
    size: 'normal',
  },
  {
    icon: Wallet,
    title: 'Non-Custodial',
    description:
      'You maintain full control of your assets. We never hold your private keys.',
    gradient: 'from-purple-600 to-purple-800',
    size: 'normal',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description:
      'Real-time charts, portfolio tracking, and comprehensive trading history.',
    gradient: 'from-violet-600 to-violet-800',
    size: 'normal',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description:
      'Trade anonymously without KYC. Your privacy is our priority.',
    gradient: 'from-indigo-600 to-indigo-800',
    size: 'large',
  },
];

export const FeaturesEnhanced = React.memo(function FeaturesEnhanced() {
  return (
    <section id="features" className="py-24 sm:py-32 relative bg-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: smoothEase }}
            viewport={{ once: true, margin: "-50px" }}
            style={{
              willChange: 'transform, opacity',
              transform: 'translateZ(0)',
            }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 font-display">
              Why Choose <span className="text-gradient-purple">WeSwap</span>?
            </h2>
            <p className="text-lg text-muted-foreground font-sans">
              Built for traders who demand speed, security, and simplicity.
            </p>
          </motion.div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isLarge = feature.size === 'large';
            
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: smoothEase }}
                viewport={{ once: true, margin: "-50px" }}
                style={{
                  willChange: 'transform, opacity',
                  transform: 'translateZ(0)',
                }}
                className={`
                  group relative overflow-hidden rounded-2xl border border-primary/20 
                  bg-gradient-purple-card backdrop-blur-sm p-8
                  transition-all duration-300 hover-glow-purple
                  ${isLarge ? 'md:col-span-2 lg:col-span-1' : ''}
                `}
              >
                {/* Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon Container with Glow */}
                  <div className="mb-6">
                    <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-purple-soft group-hover:shadow-purple-glow transition-shadow duration-300`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-3 group-hover:text-gradient-purple transition-all duration-300 font-display">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed font-sans">
                    {feature.description}
                  </p>

                  {/* Decorative Element */}
                  <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
});

