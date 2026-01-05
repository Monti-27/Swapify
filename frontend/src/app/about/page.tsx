'use client';

import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';
import { Zap, ShieldCheck, Layers, EyeOff, Target, Globe, Lock, Cpu, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AboutPage() {
    const features = [
        {
            title: "Smart Swap Engine",
            icon: Zap,
            description: "WeSwap integrates an intelligent routing mechanism that optimizes trade execution across the Solana network to ensure minimal slippage and the best possible rates."
        },
        {
            title: "Privacy Vault",
            icon: ShieldCheck,
            description: "Our signature privacy feature utilizes a specialized pool and relayer architecture to sever the traceable link between deposit and destination wallets."
        },
        {
            title: "Chunked Technology",
            icon: Layers,
            description: "Features a 'Chunked' mode that splits withdrawals into random amounts sent over randomized time intervals to maximize anonymity."
        },
        {
            title: "Advanced Obfuscation",
            icon: EyeOff,
            description: "By varying both amounts and timing, our technology makes it nearly impossible for on-chain analysis tools to link user activity."
        }
    ];

    const values = [
        {
            title: "Privacy First",
            description: "We believe privacy is a human right, not a luxury. Every line of code we write is dedicated to protecting your financial identity.",
            icon: Lock
        },
        {
            title: "Global Access",
            description: "Decentralized finance should be available to everyone, everywhere, without permission or borders.",
            icon: Globe
        },
        {
            title: "Innovation",
            description: "We push the boundaries of what's possible on Solana, bringing cutting-edge zero-knowledge concepts to life.",
            icon: Cpu
        }
    ];

    return (
        <div className="min-h-screen flex flex-col relative bg-white dark:bg-black text-slate-900 dark:text-slate-200 overflow-x-hidden transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/10 blur-[120px] rounded-full opacity-50 dark:opacity-30" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full opacity-30 dark:opacity-20" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
                <Navbar />
                <main className="flex-1">
                    {/* Hero Section */}
                    <section className="pt-40 pb-24 px-4">
                        <div className="max-w-6xl mx-auto text-center">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="h-[10rem] md:h-[16rem] flex items-center justify-center mb-8"
                            >
                                <TextHoverEffect text="WESWAP" />
                            </motion.div>
                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-slate-500"
                            >
                                The Future of Private Trading
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed"
                            >
                                A comprehensive DeFi ecosystem built on Solana, designed for users who value speed, 
                                efficiency, and above all, their financial privacy.
                            </motion.p>
                        </div>
                    </section>

                    {/* Mission Section */}
                    <section className="py-32 relative">
                        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-20 items-center">
                            <div className="space-y-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-widest uppercase">
                                    <Target className="w-3.5 h-3.5" />
                                    Our Mission
                                </div>
                                <h2 className="text-4xl md:text-5xl font-bold font-display leading-[1.1] text-slate-900 dark:text-white transition-colors">
                                    Redefining Anonymity in the <span className="text-emerald-500 dark:text-emerald-400">On-Chain</span> Era
                                </h2>
                                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                                    In an era of total transparency, your financial history is a public book. 
                                    WeSwap was born from the belief that you should decide who gets to read it. 
                                    We build powerful privacy tools that make institutional-grade anonymity available to everyone.
                                </p>
                                <div className="flex gap-12 pt-4">
                                    <div className="space-y-1">
                                        <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">$100M+</div>
                                        <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Volume Target</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">100%</div>
                                        <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Non-Custodial</div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Refined Mission Visual */}
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl blur opacity-20" />
                                <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-background/40 backdrop-blur-2xl p-16 flex flex-col items-center justify-center shadow-2xl transition-colors">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent)] pointer-events-none" />
                                    <motion.div 
                                        animate={{ 
                                            y: [0, -10, 0],
                                        }}
                                        transition={{ 
                                            duration: 4, 
                                            repeat: Infinity,
                                            ease: "easeInOut" 
                                        }}
                                        className="relative"
                                    >
                                        <div className="w-40 h-40 rounded-full bg-emerald-500/10 flex items-center justify-center relative border border-emerald-500/20">
                                            <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-20" />
                                            <ShieldCheck className="w-20 h-20 text-emerald-500 dark:text-emerald-400" />
                                        </div>
                                    </motion.div>
                                    <div className="mt-12 text-center">
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white mb-3 transition-colors">Security Verified</div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-[240px] mx-auto transition-colors">
                                            Zero-knowledge principles applied to every transaction across the ecosystem.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Core Values */}
                    <section className="py-32 px-4 relative">
                        <div className="max-w-6xl mx-auto">
                            <div className="grid md:grid-cols-3 gap-6">
                                {values.map((val, i) => (
                                    <motion.div 
                                        key={i} 
                                        whileHover={{ y: -5 }}
                                        className="p-10 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/40 dark:bg-background/40 hover:bg-slate-100/60 dark:hover:bg-background/60 transition-all group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform border border-emerald-500/20">
                                            <val.icon className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 transition-colors">{val.title}</h3>
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                                            {val.description}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Technology Section */}
                    <section className="py-32 px-4 relative">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
                                <div className="space-y-4">
                                    <h2 className="text-4xl md:text-6xl font-bold font-display text-slate-900 dark:text-white transition-colors">Core Technology</h2>
                                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-xl transition-colors">Innovation at the intersection of speed and anonymity.</p>
                                </div>
                                <div className="hidden md:block">
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer group">
                                        View Documentation <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 rounded-[40px] overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-background/40 backdrop-blur-md divide-x divide-y divide-slate-100 dark:divide-white/5 transition-colors">
                                {features.map((feature, index) => (
                                    <FeatureCard 
                                        key={index} 
                                        feature={feature} 
                                        icon={feature.icon}
                                        className="bg-transparent hover:bg-slate-900/5 dark:hover:bg-white/[0.02] transition-colors p-12"
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                </main>
                <Footer />
            </div>
        </div>
    );
}
