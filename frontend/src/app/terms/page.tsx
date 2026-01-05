'use client';

import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function TermsOfServicePage() {
    const sections = [
        {
            title: "Acceptance of Terms",
            content: "By accessing or using the WeSwap Protocol, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use our platform. This agreement is between you and the decentralized code of the protocol."
        },
        {
            title: "Description of Service",
            content: "WeSwap is a decentralized, non-custodial trading platform on the Solana blockchain. We provide tools for swapping tokens, managing liquidity, and enhancing transaction privacy. We do not have control over your funds or the Solana network."
        },
        {
            title: "Risk Acknowledgment",
            content: "Trading cryptocurrencies involves significant risk. You acknowledge that DeFi protocols are experimental, and you may lose some or all of your funds due to smart contract bugs, market volatility, or network failures. Use WeSwap at your own risk."
        },
        {
            title: "Prohibited Activities",
            content: "You agree not to use WeSwap for any illegal purposes, including money laundering, terrorist financing, or violating sanctions. We reserve the right to restrict access to our frontend interface for users in prohibited jurisdictions."
        },
        {
            title: "Intellectual Property",
            content: "The WeSwap interface, logos, and brand elements are protected by intellectual property laws. However, our smart contracts may be open-source under specific licenses as indicated in our documentation."
        },
        {
            title: "Limitation of Liability",
            content: "To the maximum extent permitted by law, WeSwap Protocol and its contributors shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the platform."
        }
    ];

    return (
        <div className="min-h-screen flex flex-col relative bg-background selection:bg-primary/30">
            <div className="absolute inset-0 gradient-purple-radial pointer-events-none opacity-50 dark:opacity-40" />
            <div className="relative z-10 flex-1 flex flex-col">
                <Navbar />
                <main className="flex-1 pt-40 pb-32 px-6">
                    <div className="max-w-6xl mx-auto">
                        <header className="mb-40 flex flex-col md:flex-row md:items-end justify-between gap-12">
                            <div className="max-w-2xl">
                                <span className="text-xs font-mono text-primary uppercase tracking-[0.3em] mb-6 block">Legal Documentation</span>
                                <h1 className="text-8xl md:text-[10rem] font-display font-bold tracking-[ -0.05em] leading-[1.0] text-foreground">
                                    Terms<br />
                                    <span className="text-muted-foreground/20">Of Service</span>
                                </h1>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-32">
                            {sections.map((section, index) => (
                                <section key={index} className="flex flex-col">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-8 h-[1px] bg-primary/40" />
                                        <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em]">0{index + 1}</span>
                                    </div>
                                    <h2 className="text-3xl font-display font-semibold mb-6 text-foreground tracking-tight max-w-[15ch]">
                                        {section.title}
                                    </h2>
                                    <p className="text-lg text-muted-foreground leading-relaxed font-light">
                                        {section.content}
                                    </p>
                                </section>
                            ))}
                        </div>

                        <div className="mt-60 border-t border-border/40 pt-20">
                            <div className="max-w-3xl">
                                <h3 className="text-xl font-display font-medium mb-6 text-foreground uppercase tracking-widest">Final Disclaimer</h3>
                                <p className="text-muted-foreground font-light leading-loose text-sm uppercase tracking-wider">
                                    WeSwap is a decentralized protocol. The interface provided is just one way to interact with the protocol. The protocol itself is immutable and exists on the Solana blockchain. By using this interface, you confirm you are not a citizen or resident of any restricted jurisdictions.
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}
