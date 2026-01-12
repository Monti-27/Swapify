'use client';

import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ShieldCheck, Database, Cookie, UserX } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const sections = [
        {
            icon: Database,
            title: "Non-Custodial Nature",
            content: "We do not have access to your private keys, funds, or personal data. VexProtocol is purely a client-side interface that interacts directly with the Solana Blockchain."
        },
        {
            icon: ShieldCheck,
            title: "No IP Logging",
            content: "We do not track, store, or log user IP addresses."
        },
        {
            icon: Cookie,
            title: "No Cookies",
            content: "This site does not use tracking cookies or analytics pixel tags."
        },
        {
            icon: UserX,
            title: "No KYC",
            content: "As a non-custodial protocol, we do not collect personal identification."
        }
    ];

    return (
        <div className="min-h-screen flex flex-col relative bg-background selection:bg-primary/30">
            <div className="absolute inset-0 gradient-purple-radial pointer-events-none opacity-50 dark:opacity-40" />
            <div className="relative z-10 flex-1 flex flex-col">
                <Navbar />
                <main className="flex-1 pt-40 pb-32 px-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Hero Section */}
                        <header className="mb-24">
                            <span className="text-xs font-mono text-primary uppercase tracking-[0.3em] mb-6 block">Data Policy</span>
                            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter mb-8 bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent leading-[1.1]">
                                VexProtocol<br />
                                <span className="text-muted-foreground/30">Zero-Logs</span>
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Last Updated</span>
                                <div className="h-[1px] w-8 bg-border" />
                                <span className="font-mono text-primary">January 2026</span>
                            </div>
                        </header>

                        {/* Main Statement */}
                        <section className="mb-16 p-8 rounded-2xl bg-primary/5 border border-primary/20">
                            <p className="text-xl md:text-2xl text-foreground font-medium leading-relaxed">
                                VexProtocol operates under a strict <span className="text-primary">No-Logs Policy</span>.
                            </p>
                        </section>

                        {/* Zero Data Collection Section */}
                        <section className="mb-16">
                            <h2 className="text-2xl font-display font-semibold mb-8 text-foreground">Zero Data Collection</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {sections.map((section, index) => (
                                    <div key={index} className="p-6 rounded-xl bg-muted/20 border border-border/50 group hover:border-primary/30 transition-colors">
                                        <section.icon className="h-6 w-6 text-primary mb-4 group-hover:scale-110 transition-transform" />
                                        <h3 className="text-lg font-semibold mb-2 text-foreground">{section.title}</h3>
                                        <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* On-Chain Data Notice */}
                        <section className="border-l-2 border-amber-500/50 pl-8 py-4 bg-amber-500/5 rounded-r-xl">
                            <h2 className="text-xl font-display font-semibold mb-4 text-foreground">On-Chain Data</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Please be aware that while VexProtocol breaks the link between wallets using ZK proofs, the interaction with the smart contract itself is visible on the public ledger. True privacy requires proper operational security (OpSec) on the user's end.
                            </p>
                        </section>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}
