'use client';

import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Shield, Lock, Eye } from 'lucide-react';

export default function AboutUsPage() {
    return (
        <div className="min-h-screen flex flex-col relative bg-background selection:bg-primary/30">
            <div className="absolute inset-0 gradient-vex-radial pointer-events-none opacity-50 dark:opacity-40" />
            <div className="relative z-10 flex-1 flex flex-col">
                <Navbar />
                <main className="flex-1 pt-40 pb-32 px-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Hero Section */}
                        <header className="mb-24">
                            <span className="text-xs font-mono text-primary uppercase tracking-[0.3em] mb-6 block">About VexProtocol</span>
                            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter mb-8 bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent leading-[1.1]">
                                Reclaiming<br />Financial Privacy
                            </h1>
                            <div className="h-[1px] w-24 bg-primary/50" />
                        </header>

                        {/* Main Content */}
                        <div className="space-y-16">
                            <section>
                                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-light">
                                    VexProtocol is a non-custodial privacy shield built on Solana. We believe financial privacy is a fundamental human right, not a crime.
                                </p>
                            </section>

                            <section>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Unlike traditional mixers, VexProtocol leverages Light Protocol's Zero-Knowledge (ZK) Compression technology. This allows users to shield their assets and break the on-chain link between sender and receiver without removing funds from the Solana network.
                                </p>
                            </section>

                            {/* Mission Section */}
                            <section className="border-l-2 border-primary/50 pl-8 py-4">
                                <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">Our Mission</h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    To provide a seamless, mathematical guarantee of privacy for every DeFi user, protecting you from MEV bots, wallet trackers, and surveillance.
                                </p>
                            </section>

                            {/* Features Grid */}
                            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                                <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
                                    <Shield className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Non-Custodial</h3>
                                    <p className="text-sm text-muted-foreground">Your keys, your crypto. We never have access to your funds.</p>
                                </div>
                                <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
                                    <Lock className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">ZK-Powered</h3>
                                    <p className="text-sm text-muted-foreground">Mathematical privacy guarantees using Zero-Knowledge proofs.</p>
                                </div>
                                <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
                                    <Eye className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">On-Chain Privacy</h3>
                                    <p className="text-sm text-muted-foreground">Break the link between wallets without leaving Solana.</p>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}
