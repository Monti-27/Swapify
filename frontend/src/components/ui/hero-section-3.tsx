'use client'
import React from 'react'
import { Mail, SendHorizonal } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { cn } from '@/lib/utils'
import { Variants } from 'framer-motion'
import { ShaderBackground } from './neural-network-shader'

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring' as const,
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

export function HeroSection() {
    return (
        <main className="overflow-hidden relative">
            <ShaderBackground />
            <section>
                <div className="relative mx-auto max-w-6xl px-6 pt-32 lg:pb-16 lg:pt-48">
                    <div className="relative z-10 mx-auto max-w-3xl text-center">
                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.75,
                                        },
                                    },
                                },
                                ...transitionVariants,
                            }}
                        >
                            <div className="mx-auto mb-6 w-fit rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-inner">
                                v1.0 Now Live on Solana
                            </div>
                            <h1
                                className="text-balance text-5xl font-medium md:text-7xl text-foreground tracking-tight">
                                Automated Solana Trading.
                            </h1>

                            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
                                Non-custodial, on-chain strategy builder. Deploy DCA and market-cap triggers without code.
                            </p>

                            <div className="mt-12 flex justify-center">
                                <Button asChild size="lg" className="rounded-full px-8 font-semibold bg-foreground text-background hover:bg-foreground/90">
                                    <Link href="/strategies">Launch App</Link>
                                </Button>
                            </div>

                            <div
                                aria-hidden
                                className="bg-radial from-muted/20 relative mx-auto mt-32 max-w-2xl to-transparent to-55% text-left"
                            >
                                <div className="bg-background border-border/50 absolute inset-0 mx-auto w-72 sm:w-80 -translate-x-2 -translate-y-12 rounded-[2rem] border p-2 [mask-image:linear-gradient(to_bottom,#000_50%,transparent_90%)] sm:-translate-x-6">
                                    <div className="relative h-96 overflow-hidden rounded-[1.5rem] border border-border/50 p-2 pb-12 before:absolute before:inset-0 before:bg-[repeating-linear-gradient(-45deg,var(--border),var(--border)_1px,transparent_1px,transparent_6px)] before:opacity-20 before:dark:opacity-50"></div>
                                </div>
                                <div className="bg-card/50 border-white/10 dark:border-white/10 border-border/50 mx-auto w-72 sm:w-80 translate-x-2 rounded-[2rem] border p-2 backdrop-blur-3xl [mask-image:linear-gradient(to_bottom,#000_50%,transparent_90%)] sm:translate-x-8">
                                    <div className="bg-card space-y-2 overflow-hidden rounded-[1.5rem] border border-border/50 p-2 shadow-2xl shadow-black/5 dark:shadow-black">
                                        <StrategyCard />

                                        <div className="bg-muted/50 rounded-[1rem] p-4 pb-16"></div>
                                    </div>
                                </div>

                            </div>
                        </AnimatedGroup>
                    </div>
                </div>
            </section>
        </main>
    )
}

const StrategyCard = () => {
    return (
        <div className="relative space-y-3 rounded-[1rem] bg-card/50 border border-border/50 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <div className="text-sm font-medium">Strategy Active</div>
            </div>
            <div className="space-y-3">
                <div className="text-muted-foreground border-b border-border/50 pb-3 text-sm font-medium">
                    Selling <span className="text-foreground font-bold">SOL</span> for <span className="text-foreground font-bold">USDC</span> every 1h
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Total Volume</span>
                        <span className="text-foreground font-mono">$12,450.00</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">P&L (24h)</span>
                        <span className="text-emerald-500 dark:text-emerald-400 font-mono">+8.4%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-emerald-500 w-[65%] rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
