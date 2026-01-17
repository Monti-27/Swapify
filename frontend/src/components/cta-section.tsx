'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlowingEffect } from '@/components/ui/glowing-effect';

export function CTASection() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl"
        >
          {/* Main CTA Card */}
          <div className="relative group">
            {/* Glowing Border Effect */}
            <GlowingEffect
              disabled={false}
              blur={20}
              spread={80}
              proximity={100}
              borderWidth={2}
              className="rounded-3xl"
            />

            <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-background via-primary/[0.03] to-background backdrop-blur-xl p-12 md:p-16 shadow-purple-glow overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

              {/* Content */}
              <div className="relative z-10 text-center">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-gradient-purple-subtle mb-6"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    Join the Future of Trading
                  </span>
                </motion.div>

                {/* Heading */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 font-display"
                >
                  Ready to Start{' '}
                  <span className="text-gradient-purple">Trading?</span>
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-sans"
                >
                  Join thousands of traders who trust Swapify for fast, secure,
                  and efficient crypto trading on Solana.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  viewport={{ once: true }}
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                >
                  <Button size="lg" className="group text-base px-8 py-6" asChild>
                    <Link href="/dashboard" className="inline-flex items-center">
                      <span>Launch App</span>
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>

                </motion.div>

                {/* Trust Indicators */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  viewport={{ once: true }}
                  className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>No registration required</span>
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-border" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>Start trading in seconds</span>
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-border" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>Non-custodial & secure</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </section>
  );
}

