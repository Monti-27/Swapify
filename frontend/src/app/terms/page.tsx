'use client';

import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AlertTriangle, FileWarning, Scale } from 'lucide-react';

export default function TermsOfServicePage() {
    const sections = [
        {
            icon: AlertTriangle,
            number: "01",
            title: "Experimental Technology",
            content: "VexProtocol uses experimental cryptographic technology (Zero-Knowledge Proofs). You acknowledge that using this software involves significant risk, including potential bugs in the smart contract code that could result in total loss of funds."
        },
        {
            icon: FileWarning,
            number: "02",
            title: '"As Is" Warranty',
            content: 'The software is provided "AS IS", without warranty of any kind, express or implied. The developers of VexProtocol are not responsible for any damages, losses, or exploits that occur during use.'
        },
        {
            icon: Scale,
            number: "03",
            title: "Compliance & Responsible Use",
            content: "VexProtocol is a privacy tool designed for legitimate personal security. You agree not to use this protocol for money laundering, illicit financing, or any activity proscribed by OFAC sanctions or local laws. You are solely responsible for compliance with the laws of your jurisdiction."
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
                            <span className="text-xs font-mono text-primary uppercase tracking-[0.3em] mb-6 block">Legal</span>
                            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter mb-8 bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent leading-[1.1]">
                                Terms of<br />Service
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Effective Date</span>
                                <div className="h-[1px] w-8 bg-border" />
                                <span className="font-mono text-primary">January 2026</span>
                            </div>
                        </header>

                        {/* Agreement Statement */}
                        <section className="mb-16 p-8 rounded-2xl bg-muted/20 border border-border/50">
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                By accessing VexProtocol, you agree to the following terms:
                            </p>
                        </section>

                        {/* Terms Sections */}
                        <div className="space-y-12">
                            {sections.map((section, index) => (
                                <section key={index} className="group">
                                    <div className="flex items-start gap-6">
                                        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                            <section.icon className="h-7 w-7 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                <span className="text-xs font-mono text-primary/60 tracking-widest">{section.number}</span>
                                                <div className="h-[1px] flex-1 bg-border/50" />
                                            </div>
                                            <h2 className="text-2xl font-display font-semibold mb-4 text-foreground group-hover:text-primary transition-colors">
                                                {section.title}
                                            </h2>
                                            <p className="text-lg text-muted-foreground leading-relaxed">
                                                {section.content}
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            ))}
                        </div>

                        {/* Final Disclaimer */}
                        <section className="mt-24 pt-12 border-t border-dashed border-border/50">
                            <p className="text-sm text-muted-foreground/60 uppercase tracking-wider leading-loose text-center max-w-2xl mx-auto">
                                VexProtocol is a decentralized privacy protocol. By using this interface, you confirm you understand the risks of experimental cryptographic software.
                            </p>
                        </section>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}
