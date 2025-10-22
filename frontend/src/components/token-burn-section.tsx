'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame, ExternalLink, TrendingDown, Clock } from 'lucide-react';
import { useBurnStore } from '@/store/burnStore';
import { useEffect, useRef, useState } from 'react';

// Smooth buttery easing
const smoothEase = [0.43, 0.13, 0.23, 0.96] as const;

// Animated counter component - optimized with React.memo
const AnimatedCounter = React.memo(function AnimatedCounter({ 
  value, 
  duration = 2 
}: { 
  value: number; 
  duration?: number 
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Smooth easing function
      const easeProgress = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      setCount(Math.floor(easeProgress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
});

export const TokenBurnSection = React.memo(function TokenBurnSection() {
  const { totalBurned, burnRate, lastTx } = useBurnStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure video plays smoothly with GPU acceleration
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log('Video autoplay prevented:', err));
    }
  }, []);

  return (
    <section
      className="relative py-32 sm:py-40 overflow-hidden bg-background"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      
      {/* Top gradient fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-[1]" />
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[1]" />

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Main Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: smoothEase }}
            viewport={{ once: true, margin: "-50px" }}
            style={{
              willChange: 'transform, opacity',
              transform: 'translateZ(0)',
            }}
            className="relative"
          >
            {/* Outer glow effect */}
            <motion.div
              className="absolute -inset-4 rounded-3xl opacity-60"
              animate={{
                boxShadow: [
                  '0 0 60px rgba(168, 85, 247, 0.4), 0 0 100px rgba(168, 85, 247, 0.2)',
                  '0 0 80px rgba(168, 85, 247, 0.5), 0 0 120px rgba(168, 85, 247, 0.3)',
                  '0 0 60px rgba(168, 85, 247, 0.4), 0 0 100px rgba(168, 85, 247, 0.2)',
                ],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
              }}
            />
            
            {/* Main card with video inside */}
            <div className="relative backdrop-blur-sm bg-card/30 border border-primary/40 rounded-3xl overflow-hidden shadow-purple-glow">
              {/* Video Background - ORIGINAL QUALITY */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover"
                  style={{
                    mixBlendMode: 'screen',
                    transform: 'translateZ(0) scale(1.05) translateY(-3%)',
                    backfaceVisibility: 'hidden',
                    willChange: 'auto',
                    objectPosition: 'center 45%',
                  }}
                >
                  <source src="/videos/token-burn.mp4.mp4" type="video/mp4" />
                </video>
                
                {/* Subtle overlay to make text readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-background/60" />
              </div>

              {/* Content container */}
              <div className="relative z-10 p-8 sm:p-12">
                  {/* Header */}
                <div className="flex flex-col items-center text-center mb-12">
                  <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: smoothEase }}
                    viewport={{ once: true, margin: "-50px" }}
                    className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 font-display text-white"
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                      textShadow: '0 0 40px rgba(168, 85, 247, 0.6), 0 0 80px rgba(168, 85, 247, 0.3), 0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    Burned tokens
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: smoothEase }}
                    viewport={{ once: true, margin: "-50px" }}
                    className="text-lg sm:text-xl text-white/90 max-w-2xl font-sans"
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    We continuously burn tokens to reduce supply, creating deflationary pressure and increasing value for holders.
                  </motion.p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  {/* Total Burned */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.4, ease: smoothEase }}
                    viewport={{ once: true, margin: "-50px" }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -8,
                      transition: { duration: 0.3, ease: smoothEase }
                    }}
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                    }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
                    <div className="relative bg-black/70 dark:bg-black/60 backdrop-blur-md border border-primary/40 rounded-2xl p-6 group-hover:border-primary/60 transition-all duration-500">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingDown className="w-5 h-5 text-purple-300 dark:text-purple-300" />
                        <p className="text-sm text-white/90 dark:text-white/80 font-sans">Total Burned</p>
                      </div>
                      <p 
                        className="text-3xl font-bold text-white font-display"
                        style={{
                          textShadow: '0 0 20px rgba(168, 85, 247, 0.5), 0 2px 4px rgba(0,0,0,0.5)',
                        }}
                      >
                        <AnimatedCounter value={totalBurned} />
                      </p>
                      <p className="text-xs text-white/80 dark:text-white/70 mt-1 font-sans">WESWAP tokens</p>
                    </div>
                  </motion.div>

                  {/* Burn Rate */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.5, ease: smoothEase }}
                    viewport={{ once: true, margin: "-50px" }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -8,
                      transition: { duration: 0.3, ease: smoothEase }
                    }}
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                    }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-violet-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
                    <div className="relative bg-black/70 dark:bg-black/60 backdrop-blur-md border border-primary/40 rounded-2xl p-6 group-hover:border-primary/60 transition-all duration-500">
                      <div className="flex items-center gap-3 mb-2">
                        <Flame className="w-5 h-5 text-purple-300 dark:text-purple-300" />
                        <p className="text-sm text-white/90 dark:text-white/80 font-sans">Burn Rate</p>
                      </div>
                      <p 
                        className="text-3xl font-bold text-white font-display"
                        style={{
                          textShadow: '0 0 20px rgba(168, 85, 247, 0.5), 0 2px 4px rgba(0,0,0,0.5)',
                        }}
                      >
                        {burnRate}%
                      </p>
                      <p className="text-xs text-white/80 dark:text-white/70 mt-1 font-sans">per transaction</p>
                    </div>
                  </motion.div>

                  {/* Last Burn */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.6, ease: smoothEase }}
                    viewport={{ once: true, margin: "-50px" }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -8,
                      transition: { duration: 0.3, ease: smoothEase }
                    }}
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                    }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-indigo-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
                    <div className="relative bg-black/70 dark:bg-black/60 backdrop-blur-md border border-primary/40 rounded-2xl p-6 group-hover:border-primary/60 transition-all duration-500">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-purple-300 dark:text-purple-300" />
                        <p className="text-sm text-white/90 dark:text-white/80 font-sans">Last Burn</p>
                      </div>
                      <p 
                        className="text-3xl font-bold text-white font-display tracking-wide"
                        style={{
                          textShadow: '0 0 20px rgba(168, 85, 247, 0.5), 0 2px 4px rgba(0,0,0,0.5)',
                        }}
                      >
                        {lastTx}
                      </p>
                      <p className="text-xs text-white/80 dark:text-white/70 mt-1 font-sans">2 minutes ago</p>
                    </div>
                  </motion.div>
                </div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.7, ease: smoothEase }}
                  viewport={{ once: true, margin: "-50px" }}
                  style={{
                    willChange: 'transform, opacity',
                    transform: 'translateZ(0)',
                  }}
                  className="flex justify-center"
                >
                  <motion.a
                    href={`https://solscan.io/tx/${lastTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ 
                      scale: 1.05, 
                      y: -4,
                      transition: { duration: 0.3, ease: smoothEase }
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-xl border-2 border-purple-400/50 shadow-purple-glow hover:shadow-purple-glow transition-all duration-500 font-sans"
                    style={{
                      boxShadow: '0 0 30px rgba(168, 85, 247, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <span>View on Explorer</span>
                    <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500 ease-out" />
                    
                    {/* Animated border glow */}
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 rounded-xl border-2 border-purple-300/50 blur-sm"
                    />
                  </motion.a>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom decorative glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-64 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
    </section>
  );
});
