'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Repeat, Droplets, Bot, Target, Percent } from 'lucide-react';

const useCases = [
  {
    icon: TrendingUp,
    title: 'Day Trading',
    description: 'Execute fast trades with minimal slippage and competitive fees. Perfect for active traders who need instant execution.',
    color: 'from-purple-500/20 to-purple-600/20',
    iconBg: 'bg-purple-500/10',
  },
  {
    icon: Repeat,
    title: 'Dollar-Cost Averaging',
    description: 'Set up automated recurring buys to build your position over time. Smart investing made simple.',
    color: 'from-violet-500/20 to-violet-600/20',
    iconBg: 'bg-violet-500/10',
  },
  {
    icon: Droplets,
    title: 'Liquidity Provision',
    description: 'Provide liquidity and earn fees from every trade in the pool. Contribute to the ecosystem and get rewarded.',
    color: 'from-indigo-500/20 to-indigo-600/20',
    iconBg: 'bg-indigo-500/10',
  },
  {
    icon: Bot,
    title: 'Automated Strategies',
    description: 'Build custom trading strategies with our advanced order types. Let automation work for you.',
    color: 'from-purple-600/20 to-purple-700/20',
    iconBg: 'bg-purple-600/10',
  },
  {
    icon: Target,
    title: 'Limit Orders',
    description: 'Set your target price and let us execute when the market reaches it. Trade on your terms.',
    color: 'from-violet-600/20 to-violet-700/20',
    iconBg: 'bg-violet-600/10',
  },
  {
    icon: Percent,
    title: 'Arbitrage',
    description: 'Exploit price differences across exchanges for profit opportunities. Maximize your trading efficiency.',
    color: 'from-indigo-600/20 to-indigo-700/20',
    iconBg: 'bg-indigo-600/10',
  },
];

export function UseCases() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
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
              Built for <span className="text-gradient-purple">Every Trading Strategy</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Whether you're a day trader, long-term investor, or liquidity provider,
              WeSwap has the tools you need.
            </p>
          </motion.div>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            
            return (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="h-full p-6 rounded-2xl border border-primary/20 bg-gradient-purple-card backdrop-blur-sm transition-all duration-300 hover-glow-purple">
                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-xl ${useCase.iconBg} border border-primary/20 mb-4`}>
                    <Icon className="h-6 w-6 text-primary" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold mb-2">{useCase.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {useCase.description}
                  </p>

                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${useCase.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/30 bg-gradient-purple-subtle backdrop-blur-sm">
            <span className="text-sm text-muted-foreground">
              Need a custom solution?
            </span>
            <a href="/contact" className="text-sm font-semibold text-primary hover:underline">
              Contact our team →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

