"use client";
import React from "react";
import Link from "next/link";
import {
    NotepadTextDashed,
    Twitter,
    Linkedin,
    Github,
    Mail,
    FacebookIcon,
    InstagramIcon,
    YoutubeIcon,
    Grid2X2Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface FooterLink {
    label: string;
    href: string;
}

interface SocialLink {
    icon: React.ReactNode;
    href: string;
    label: string;
}

interface FooterProps {
    brandName?: string;
    brandDescription?: string;
    socialLinks?: SocialLink[];
    navLinks?: FooterLink[]; // Kept for backward compat, but we might reorganize
    creatorName?: string;
    creatorUrl?: string;
    brandIcon?: React.ReactNode;
    className?: string;
}

export const ModemAnimatedFooter = ({
    brandName = "Swapify",
    brandDescription = "The future of decentralized trading on Solana. Fast, non-custodial, and fully automated.",
    socialLinks = [],
    creatorName,
    creatorUrl,
    brandIcon,
    className,
}: FooterProps) => {

    const productLinks = [
        { title: 'Swap', href: '/swap' },
        { title: 'Strategies', href: '/strategies' },
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Privacy', href: '/privacy' },
        { title: 'Anti-Privacy', href: '/transparency' },
    ];

    const companyLinks = [
        { title: 'About Us', href: '/about' },
        { title: 'Docs', href: 'https://docs.swapify.fun/' },
        { title: 'Privacy Policy', href: '/privacy-policy' },
        { title: 'Terms of Service', href: '/terms' },
    ];

    return (
        <section className={cn("relative w-full mt-0 overflow-hidden", className)}>
            <footer className="border-t bg-background mt-20 relative">

                {/* Upper Section: MinimalFooter Design Refined */}
                <div className="relative px-4 py-16 sm:px-6 lg:px-8">
                    <div className="bg-[radial-gradient(35%_80%_at_30%_0%,var(--color-foreground)/0.1,transparent)] mx-auto max-w-6xl md:border-x border-border/40">
                        <div className="bg-border/40 absolute inset-x-0 top-0 h-px w-full" />

                        <div className="grid grid-cols-2 gap-8 p-6 md:p-8 md:grid-cols-5 lg:gap-12">
                            {/* Brand Column */}
                            <div className="col-span-2 md:col-span-3 flex flex-col gap-6">
                                <div className="flex items-center gap-2 opacity-90">
                                    {/* Small Brand Icon if needed, or just text */}
                                    <div className="relative w-8 h-8">
                                        <Image
                                            src="/swap-logo.svg"
                                            alt="Swapify"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="text-xl font-bold font-sans tracking-tight">{brandName}</span>
                                </div>
                                <p className="text-muted-foreground max-w-md font-sans text-sm leading-relaxed text-balance">
                                    {brandDescription}
                                </p>
                                <div className="flex gap-3 mt-2">
                                    {socialLinks.map((item, i) => (
                                        <a
                                            key={i}
                                            className="hover:bg-accent/50 hover:text-foreground text-muted-foreground rounded-md border border-border/50 p-2 transition-colors duration-200"
                                            target="_blank"
                                            href={item.href}
                                            rel="noopener noreferrer"
                                        >
                                            <div className="w-4 h-4">
                                                {item.icon}
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Product Links */}
                            <div className="col-span-1 md:col-span-1">
                                <span className="text-foreground/90 font-semibold mb-4 block text-sm mt-1.5">
                                    Product
                                </span>
                                <div className="flex flex-col gap-2.5">
                                    {productLinks.map(({ href, title }, i) => (
                                        <Link
                                            key={i}
                                            className="w-max text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                                            href={href}
                                            target={href.startsWith('http') ? '_blank' : undefined}
                                            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        >
                                            {title}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Company Links */}
                            <div className="col-span-1 md:col-span-1">
                                <span className="text-foreground/90 font-semibold mb-4 block text-sm mt-1.5">
                                    Company
                                </span>
                                <div className="flex flex-col gap-2.5">
                                    {companyLinks.map(({ href, title }, i) => (
                                        <Link
                                            key={i}
                                            className="w-max text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                                            href={href}
                                            target={href.startsWith('http') ? '_blank' : undefined}
                                            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        >
                                            {title}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="bg-border/40 absolute inset-x-0 bottom-0 h-px w-full" />
                    </div>
                </div>


                {/* Spacing for Bottom Big Text Area */}
                <div className="min-h-[24rem] md:min-h-[30rem] relative w-full">
                    {/* Large background text - FIXED */}
                    <div
                        className="bg-gradient-to-b from-foreground/20 via-foreground/10 to-transparent bg-clip-text text-transparent leading-none absolute left-1/2 -translate-x-1/2 top-10 font-display font-bold tracking-tighter pointer-events-none select-none text-center px-4"
                        style={{
                            fontSize: 'clamp(5rem, 21vw, 25rem)',
                            maxWidth: '100vw',
                            width: '100%'
                        }}
                    >
                        {brandName.toUpperCase()}
                    </div>

                    {/* Bottom logo */}
                    <div className="absolute top-24 sm:top-40 md:top-48 left-1/2 -translate-x-1/2 z-20">
                        <div className="hover:border-primary/50 duration-500 drop-shadow-[0_0px_30px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_0px_30px_rgba(255,255,255,0.1)] backdrop-blur-md rounded-3xl bg-background/30 border border-border/50 p-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-zinc-800 to-black dark:from-zinc-100 dark:to-zinc-300 rounded-2xl flex items-center justify-center shadow-xl">
                                {brandIcon || (
                                    <NotepadTextDashed className="w-10 h-10 text-white dark:text-black" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Copyright */}
                    <div className="absolute bottom-8 left-0 right-0 text-center">
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} {brandName} Protocol. All rights reserved.
                        </p>
                        {creatorName && creatorUrl && (
                            <p className="text-xs text-muted-foreground/60 mt-2">
                                Crafted by <Link href={creatorUrl} className="hover:text-foreground transition-colors">{creatorName}</Link>
                            </p>
                        )}
                    </div>
                </div>

                {/* Bottom shadow effect from original footer */}
                <div className="bg-gradient-to-t from-background via-background/80 blur-[2em] to-transparent absolute bottom-0 w-full h-32 pointer-events-none"></div>
            </footer>
        </section>
    );
};
