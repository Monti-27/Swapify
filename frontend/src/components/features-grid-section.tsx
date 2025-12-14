'use client';

import { Zap, ShieldCheck, Fingerprint, Layers, Settings2, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FeatureCard } from '@/components/ui/grid-feature-cards';

const features = [
    {
        title: 'Zero Latency',
        icon: Zap,
        description: 'Powered by Jupiter Aggregator for lightning-fast, best-price execution across all Solana DEXs.',
    },
    {
        title: 'Non-Custodial',
        icon: Fingerprint,
        description: 'You maintain full control. Strategies execute via on-chain instructions without accessing your private keys.',
    },
    {
        title: 'Smart Triggers',
        icon: Layers,
        description: 'Set complex conditions based on Market Cap, Price Action, and Volume to enter or exit positions automatically.',
    },
    {
        title: 'Automated DCA',
        icon: Settings2,
        description: 'Systematic accumulation. Schedule buy orders over time to smooth out volatility and average your entry price.',
    },
    {
        title: 'On-Chain Reliability',
        icon: ShieldCheck,
        description: 'No off-chain database dependencies for execution. Your strategies live on the Solana blockchain.',
    },
    {
        title: 'MEV Protection',
        icon: Sparkles,
        description: 'Built-in safeguards against front-running and sandwich attacks to ensure you get the price you expect.',
    },
];

export function FeaturesGridSection() {
    return (
        <section className="py-24 md:py-32 bg-background relative overflow-hidden">
            <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-5 dark:opacity-20"></div>
            <div className="mx-auto w-full max-w-6xl space-y-12 px-4 sm:px-6">
                <AnimatedContainer className="mx-auto max-w-3xl text-center space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight text-balance md:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
                        Power. Speed. Control.
                    </h2>
                    <p className="text-muted-foreground text-lg tracking-wide text-balance md:text-xl max-w-2xl mx-auto">
                        Everything you need to build fast, secure, and scalable trading strategies on Solana.
                    </p>
                </AnimatedContainer>

                <AnimatedContainer
                    delay={0.2}
                    className="grid grid-cols-1 divide-border border-border sm:grid-cols-2 md:grid-cols-3 border-l border-t"
                >
                    {/* Manual grid borders for clearer separation if needed, or rely on the component's inner borders if we adjust it. 
                        The original component uses general classes. Let's wrap it to enforce the grid lines style requested in standard shadcn grids.
                    */}
                    {features.map((feature, i) => (
                        <FeatureCard
                            key={i}
                            feature={feature}
                            className="border-r border-b border-border bg-card/20 hover:bg-accent/50 transition-colors duration-300"
                        />
                    ))}
                </AnimatedContainer>
            </div>
        </section>
    );
}

type ViewAnimationProps = {
    delay?: number;
    className?: string;
    children: React.ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
            whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
