'use client';

import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function PrivacyPolicyPage() {
    const sections = [
        {
            title: "1. Introduction",
            content: "WeSwap Protocol ('we', 'our', or 'us') is committed to protecting your privacy. This Privacy Policy explains how we handle information in connection with our decentralized platform on the Solana blockchain."
        },
        {
            title: "2. Information Collection",
            content: "WeSwap is a non-custodial DeFi platform. We do not collect personal information such as names, emails, or IP addresses. We only interact with public wallet addresses provided by you through your browser-based wallet extension."
        },
        {
            title: "3. On-Chain Data",
            content: "Please note that all transactions on the Solana network are public. While WeSwap provides privacy features like the Privacy Vault to obfuscate links between wallets, the underlying blockchain data remains permanent and accessible to anyone via block explorers."
        },
        {
            title: "4. Privacy Vault & Security",
            content: "Our Privacy Vault uses advanced ZK compression and relayer technology to enhance your anonymity. However, no technology can guarantee 100% privacy. Users are encouraged to follow best practices for on-chain privacy."
        },
        {
            title: "5. Third-Party Services",
            content: "Our platform may use third-party RPC providers and data indexers. These services may collect technical data such as your IP address. We recommend using private RPCs if you require maximum privacy."
        },
        {
            title: "6. Changes to Policy",
            content: "We may update this policy from time to time. Any changes will be reflected by the 'Last Updated' date at the top of this page. Continued use of the platform constitutes acceptance of the updated policy."
        }
    ];

    return (
        <div className="min-h-screen flex flex-col relative bg-background selection:bg-primary/30">
            <div className="absolute inset-0 gradient-purple-radial pointer-events-none opacity-50 dark:opacity-40" />
            <div className="relative z-10 flex-1 flex flex-col">
                <Navbar />
                <main className="flex-1 pt-40 pb-32 px-6">
                    <div className="max-w-4xl mx-auto">
                        <header className="mb-32">
                            <h1 className="text-7xl md:text-9xl font-display font-bold tracking-tighter mb-12 bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent leading-[1.0]">
                                Privacy<br />Policy
                            </h1>
                            <div className="flex items-center gap-6 text-xs font-mono tracking-[0.2em] text-primary uppercase">
                                <span className="opacity-80">Last Revision</span>
                                <div className="h-[1px] w-12 bg-primary/30" />
                                <span className="font-semibold">Jan 04, 2026</span>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-x-12 gap-y-24">
                            {sections.map((section, index) => (
                                <React.Fragment key={index}>
                                    <div className="hidden lg:block">
                                        <span className="text-xs font-mono text-primary/60 sticky top-40 tracking-widest uppercase">
                                            Section_{String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <section className="group">
                                        <div className="lg:hidden mb-4">
                                            <span className="text-xs font-mono text-primary/60 tracking-widest uppercase">
                                                Section_{String(index + 1).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-display font-medium mb-8 text-foreground group-hover:text-primary transition-colors duration-500 ease-out tracking-tight">
                                            {section.title.split('. ')[1]}
                                        </h2>
                                        <div className="prose prose-indigo dark:prose-invert max-w-none">
                                            <p className="text-xl text-muted-foreground leading-relaxed font-light">
                                                {section.content}
                                            </p>
                                        </div>
                                        <div className="h-[1px] w-full bg-border/50 mt-24 group-last:hidden" />
                                    </section>
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="mt-48 pt-20 border-t border-dashed border-border/60">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                                <p className="text-sm text-muted-foreground/60 max-w-sm text-center md:text-left font-light tracking-wide leading-relaxed uppercase italic">
                                    Our commitment to your anonymity is baked into our code. No logs, no tracking, just pure protocol.
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
