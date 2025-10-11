'use client';

import { motion } from 'framer-motion';
import { Wallet, ArrowRightLeft, Zap, CheckCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Wallet,
    title: 'Connect Your Wallet',
    description: 'Securely connect your Solana wallet in seconds. We support all major wallet providers.',
  },
  {
    number: '02',
    icon: ArrowRightLeft,
    title: 'Select Tokens',
    description: 'Choose the tokens you want to swap. Access hundreds of SPL tokens with real-time pricing.',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Execute Trade',
    description: 'Review the best route and execute your swap instantly with minimal slippage.',
  },
  {
    number: '04',
    icon: CheckCircle,
    title: 'Track & Manage',
    description: 'Monitor your transactions and manage your portfolio with our advanced dashboard.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Start Trading in <span className="text-gradient-purple">4 Simple Steps</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started with WeSwap in under a minute. No registration required.
            </p>
          </motion.div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative group"
              >
                {/* Connecting Line (hidden on last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-[calc(50%+40px)] w-[calc(100%-40px)] h-[2px] bg-gradient-to-r from-primary/40 to-transparent" />
                )}

                <div className="relative h-full">
                  {/* Card */}
                  <div className="h-full p-6 rounded-2xl border border-primary/20 bg-gradient-purple-card backdrop-blur-sm transition-all duration-300 hover-glow-purple">
                    {/* Step Number */}
                    <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-purple-hero flex items-center justify-center text-white font-bold text-lg shadow-purple-glow">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="mb-4 mt-2">
                      <div className="inline-flex p-3 rounded-xl bg-gradient-purple-subtle border border-primary/20">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

