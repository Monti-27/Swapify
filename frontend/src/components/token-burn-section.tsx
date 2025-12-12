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
