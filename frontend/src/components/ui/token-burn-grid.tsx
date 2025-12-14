"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Lock, ArrowDownRight, Flame } from "lucide-react"

export function TokenBurnGrid() {
    return (
        <section className="py-24 bg-background relative overflow-visible">

            <div className="container mx-auto px-4 relative z-10">
                <div className="mb-12 text-center max-w-2xl mx-auto">
                    {/* Badge Removed as requested */}

                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground">
                        The WeSwap Burn
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
                            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                                {/* Outer Glow - Subtle */}
                                <div className="absolute inset-x-0 bottom-0 top-1/2 bg-orange-500/10 blur-[50px] rounded-full animate-pulse-slow"></div>

                                {/* Particle Embers System */}
                                <div className="absolute inset-0 overflow-visible">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i}
                                            className={`absolute bg-orange-500/60 rounded-full blur-[1px] animate-ember-${i + 1}`}
                                            style={{
                                                width: Math.random() * 3 + 1 + 'px',
                                                height: Math.random() * 3 + 1 + 'px',
                                                left: '50%',
                                                top: '60%',
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* The Token - Semantic Border/Bg */}
                                <div className="relative w-32 h-32 bg-card rounded-full border border-border flex items-center justify-center shadow-2xl z-20 group">
                                    {/* Inner Burn Effect */}
                                    <div className="absolute inset-0 rounded-full overflow-hidden">
                                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-orange-600/30 to-transparent blur-md opacity-60 animate-burn-internal"></div>
                                    </div>

                                    <div className="relative z-30 flex flex-col items-center">
                                        <span className="text-4xl font-black text-foreground select-none">WSP</span>
                                        <span className="text-[10px] text-orange-500/80 font-mono mt-1 tracking-widest uppercase">Burn</span>
                                    </div>

                                    <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                </div>
                            </div>

                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-foreground mb-2">Sustainable Deflation</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    A portion of every transaction fee is used to buy back and burn WSP tokens, permanently removing them from circulation.
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
                                <div className="text-3xl font-bold text-foreground mb-1">-2.5%</div>
                                <h4 className="font-medium text-muted-foreground text-sm">Circulating Supply / Year</h4>
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
                                <TrendingUp className="text-muted-foreground w-5 h-5 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-foreground mb-1">Value Alignment</h4>
                                <p className="text-sm text-muted-foreground">
                                    As protocol usage grows, scarcity increases, aligning incentives for holders.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            <style jsx global>{`
        @keyframes pulse-slow {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
        }
        
        @keyframes ember-rise {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            100% { transform: translateY(-50px) scale(0); opacity: 0; }
        }
        .animate-ember-1 { animation: ember-rise 2s ease-out infinite; animation-delay: 0s; left: 45% !important; }
        .animate-ember-2 { animation: ember-rise 2.5s ease-out infinite; animation-delay: 0.5s; left: 55% !important; }
        .animate-ember-3 { animation: ember-rise 1.8s ease-out infinite; animation-delay: 0.2s; left: 48% !important; }
        .animate-ember-4 { animation: ember-rise 3s ease-out infinite; animation-delay: 1s; left: 52% !important; }
        .animate-ember-5 { animation: ember-rise 2.2s ease-out infinite; animation-delay: 0.8s; left: 42% !important; }
        .animate-ember-6 { animation: ember-rise 2.7s ease-out infinite; animation-delay: 1.5s; left: 58% !important; }
        
        @keyframes burn-internal {
            0%, 100% { height: 40%; opacity: 0.4; }
            50% { height: 55%; opacity: 0.7; }
        }
        .animate-burn-internal {
            animation: burn-internal 3s ease-in-out infinite;
        }
      `}</style>
        </section>
    )
}
