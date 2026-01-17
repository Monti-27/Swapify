'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LampContainer } from '@/components/ui/lamp';
import { motion } from 'framer-motion';

// GPU-friendly easing for buttery-smooth animations
const smoothEase = [0.43, 0.13, 0.23, 0.96] as const;

export const Hero = React.memo(function Hero() {
  return (
    <LampContainer className="!bg-background !min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: smoothEase,
        }}
        style={{
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
        className="w-full pt-24"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center relative">
            {/* Floating Logo Background */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 0.03, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: smoothEase }}
              style={{
                willChange: 'transform, opacity',
                transform: 'translateZ(0)',
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              {/* Swapify logo placeholder - add logo image when ready */}
              <span className="font-display font-bold text-8xl text-[#00FF94]/10">Swapify</span>
            </motion.div>

            {/* Badge */}
            <div className="mb-6 inline-flex items-center rounded-full border border-primary/30 bg-gradient-purple-subtle px-4 py-1.5 text-sm shadow-purple-soft relative z-10">
              <Zap className="mr-2 h-4 w-4 text-primary" />
              <span className="font-semibold text-primary font-sans">Lightning-fast swaps on Solana</span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl relative z-10 font-display">
              Trade Crypto with
              <br />
              <span className="text-gradient-purple">
                Confidence
              </span>
            </h1>

            {/* Subtext */}
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto relative z-10 font-sans font-normal">
              Experience seamless cryptocurrency trading with advanced order types,
              real-time analytics, and institutional-grade security. Join thousands
              of traders on Swapify.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center mb-12 relative z-10">
              <Button size="lg" className="group inline-flex items-center" asChild>
                <Link href="/dashboard" className="inline-flex items-center">
                  <span>Start Trading</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>

          </div>
        </div>
      </motion.div>
    </LampContainer >
  );
});

