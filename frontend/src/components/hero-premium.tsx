'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Smooth easing for premium animations
const smoothEase = [0.43, 0.13, 0.23, 0.96] as const;

export const HeroPremium = React.memo(function HeroPremium() {

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0f]">
      {/* Gradient Background Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a24] to-[#0a0a0f]" />

      {/* Bottom-left green glow */}
      <div
        className="absolute -bottom-48 -left-48 w-[800px] h-[800px] opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.4) 0%, rgba(0, 255, 136, 0.1) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Top-right purple glow */}
      <div
        className="absolute -top-48 -right-48 w-[800px] h-[800px] opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, rgba(168, 85, 247, 0.3) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      >
        {/* Optional subtle pulse animation */}
        <motion.div
          className="w-full h-full"
          animate={{
            opacity: [0.4, 0.5, 0.4],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(168, 85, 247, 0.2) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Spacer for navbar */}
        <div className="h-20" />

        {/* Hero Content - Centered */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: smoothEase,
            }}
            className="w-full max-w-7xl mx-auto text-center"
          >
            {/* Overline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-6 inline-flex items-center justify-center"
            >
              <span
                className="text-sm sm:text-base font-mono font-semibold tracking-wide"
                style={{ color: '#00ff88' }}
              >
                Lightning-fast automated trading on Solana
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: smoothEase }}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 leading-tight"
            >
              Trade Smarter with{' '}
              <span className="text-gradient-purple">WeSwap</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-base sm:text-lg lg:text-xl text-gray-400 mb-10 max-w-[700px] mx-auto leading-relaxed"
            >
              Convenient and clear personal order management, capable of order inquiry,
              proactive delivery, and automated strategy execution. Experience the future
              of decentralized trading on Solana.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.5, ease: smoothEase }}
              className="mb-16"
            >
              <Button
                size="lg"
                className="group inline-flex items-center bg-white text-black hover:bg-gray-100 rounded-full px-8 py-6 text-lg font-semibold shadow-2xl transition-all duration-200 hover:scale-105"
                asChild
              >
                <Link href="/dashboard" className="inline-flex items-center">
                  <span>Start Trading</span>
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>


          </motion.div>
        </div>


      </div>
    </div>
  );
});

