'use client';

import {
  Zap,
  Shield,
  TrendingUp,
  Wallet,
  BarChart3,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Execute trades in milliseconds with our optimized routing engine built on Solana.',
  },
  {
    icon: Shield,
    title: 'Secure & Audited',
    description:
      'Smart contracts audited by leading security firms. Your funds are always safe.',
  },
  {
    icon: TrendingUp,
    title: 'Best Prices',
    description:
      'Aggregated liquidity from multiple DEXs ensures you always get the best rates.',
  },
  {
    icon: Wallet,
    title: 'Non-Custodial',
    description:
      'You maintain full control of your assets. We never hold your private keys.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description:
      'Real-time charts, portfolio tracking, and comprehensive trading history.',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description:
      'Trade anonymously without KYC. Your privacy is our priority.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Why Choose <span className="text-gradient-purple">WeSwap</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            Built for traders who demand speed, security, and simplicity.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="transition-all hover:border-primary/50 bg-gradient-purple-card shadow-purple-card hover-glow-purple border-primary/10"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-purple-subtle border border-primary/20">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

