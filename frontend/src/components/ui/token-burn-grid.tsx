"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, ArrowDownRight } from "lucide-react"
import React from 'react';
import WspTextBurn from '@/components/wsp-text-burn';

export function TokenBurnGrid() {
    return (
        <section className="py-24 bg-background relative overflow-hidden">

            <div className="container mx-auto px-4 relative z-10">
                <div className="mb-12 text-center max-w-2xl mx-auto">
                    {/* Badge Removed as requested */}

                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground">
                        The Swapify Burn
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        A relentless mechanism designed to reduce supply and align long-term value.
                    </p>
                </div>

                {/* Removed fixed height to prevent cutoff, used min-height instead */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 max-w-5xl mx-auto min-h-[500px] h-auto pb-8">

                    {/* Hero Card: Burning Token */}
                    {/* Changed to bg-muted/40 for a subtle gray in both modes (light gray in light mode, dark gray in dark mode) */}
                    <Card className="col-span-1 md:col-span-4 row-span-2 relative overflow-hidden border-border bg-muted/40 backdrop-blur-sm">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 grayscale"></div>

                        <CardContent className="h-full flex flex-col items-center justify-center relative z-10 p-10 min-h-[400px]">
                            {/* Burning WSP Token Visualization */}
                            <div className="relative w-full h-[300px] flex items-center justify-center mb-8">
                                <WspTextBurn />
                            </div>

                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-foreground mb-2">Sustainable Deflation</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    A relentless deflationary mechanism. We have burned <span className="font-bold text-foreground">134,000,000+ WSP</span> tokens, permanently removing them from the total supply.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Secondary Card 1: Reduced Supply */}
                    <Card className="col-span-1 md:col-span-2 border-border bg-muted/40 backdrop-blur-sm">
                        <CardContent className="h-full flex flex-col justify-between p-6 min-h-[200px]">
                            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center mb-4 ring-1 ring-border">
                                <ArrowDownRight className="text-muted-foreground w-5 h-5 group-hover:text-orange-500 transition-colors" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">134M+</div>
                                <h4 className="font-medium text-muted-foreground text-sm uppercase">Tokens Permanently Burned</h4>
                            </div>
                            {/* Mini visual */}
                            <div className="h-12 w-full mt-4 flex items-end gap-1 opacity-50">
                                {[80, 70, 60, 50, 45, 40, 35].map((h, i) => (
                                    <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gradient-to-t from-zinc-400 to-zinc-600 dark:from-zinc-600 dark:to-zinc-800 rounded-t-[2px]"></div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Secondary Card 2: Value Alignment */}
                    <Card className="col-span-1 md:col-span-2 border-border bg-muted/40 backdrop-blur-sm">
                        <CardContent className="h-full flex flex-col justify-between p-6 min-h-[200px]">
                            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center mb-4 ring-1 ring-border">
                                <TrendingUp className="text-muted-foreground w-5 h-5 group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-foreground mb-1">Value Alignment</h4>
                                <p className="text-sm text-muted-foreground">
                                    As protocol usage grows, scarcity increases. We have already removed 134M+ WSP from circulation to align long-term incentives.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>


        </section >
    )
}
