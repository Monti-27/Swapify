'use client'
import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { cn } from '@/lib/utils'
import { ShaderBackground } from './neural-network-shader'
import {
    Wallet,
    ChartBar,
    ShieldCheck,
    ArrowsLeftRight,
    CaretRight,
    Lightning,
    Play
} from '@phosphor-icons/react'
import {
    createChart,
    IChartApi,
    ISeriesApi,
    CandlestickData,
    CandlestickSeries,
    Time
} from 'lightweight-charts'

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
        <div className="overflow-hidden relative bg-background">
            <ShaderBackground />
            <section>
                <div className="relative mx-auto w-full max-w-[90%] px-6 pt-32 lg:pb-16 lg:pt-48">
                    <div className="relative z-10 mx-auto w-full max-w-full text-center">
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
                            <div className="mx-auto mb-6 w-fit rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-inner">
                                Swapify Protocol
                            </div>
                            <h1
                                className="text-balance text-5xl md:text-7xl text-foreground tracking-tight italic font-normal" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
                                Automate Everything.<br />Trust Nothing.
                            </h1>

                            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
                                Strategies. Privacy. Transparency. One protocol.
                            </p>

                            <div className="mt-12 flex justify-center gap-4">
                                <Button asChild size="lg" className="rounded-full px-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 relative z-20">
                                    <Link href="/strategies">Start Trading</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="rounded-full px-8 font-semibold relative z-20">
                                    <Link href="/privacy">Privacy Vault</Link>
                                </Button>
                            </div>

                            {/* Dashboard Skeleton - Extra Wide */}
                            <div
                                aria-hidden
                                className="relative mx-auto mt-20 w-full [mask-image:linear-gradient(to_bottom,#000_10%,transparent_98%)]"
                            >
                                <DashboardSkeleton />
                            </div>
                        </AnimatedGroup>
                    </div>
                </div>
            </section>
        </div>
    )
}

const DashboardSkeleton = () => {
    return (
        // Thicker translucent border container using semantic variables (foreground/5)
        // This handles Dark (White/5) and Light (Black/5) automatically via CSS vars
        <div className="rounded-[32px] border border-foreground/5 bg-foreground/5 p-3 backdrop-blur-2xl">
            <div className="rounded-[24px] bg-card/90 border border-foreground/5 p-6 shadow-2xl overflow-hidden relative">
                {/* Radial gradient glow - visible mostly in dark mode due to addictive blending or similar, but simplified here */}
                {/* We use a semantic primary color for the glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/10 blur-[100px] pointer-events-none rounded-full opacity-50"></div>

                <div className="flex relative z-10 gap-6">
                    {/* Mini Sidebar */}
                    <div className="w-16 border-r border-foreground/5 py-2 hidden md:flex flex-col items-center gap-6">
                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
                            <ChartBar weight="duotone" className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="p-3 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all duration-300">
                                <ArrowsLeftRight weight="duotone" className="w-6 h-6" />
                            </div>
                            <div className="p-3 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all duration-300">
                                <ShieldCheck weight="duotone" className="w-6 h-6" />
                            </div>
                            <div className="p-3 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all duration-300">
                                <Wallet weight="duotone" className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 space-y-6">
                        {/* Stats Row - Perfect Right Alignment */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                label="Total Portfolio"
                                value="$24,847.20"
                                change="+12.4%"
                                positive
                                icon={<Wallet weight="duotone" className="w-6 h-6 text-primary" />}
                                subtitle="Last 24h"
                                glow
                            />
                            <StatCard
                                label="Active Strategies"
                                value="03"
                                change="+2 active"
                                positive
                                icon={<Play weight="duotone" className="w-6 h-6 text-orange-400" />}
                                subtitle="Boomerang Mode"
                            />
                            <StatCard
                                label="Protocol Volume"
                                value="$8.42M"
                                change="-3.2%"
                                positive={false}
                                icon={<ChartBar weight="duotone" className="w-6 h-6 text-blue-400" />}
                                subtitle="Global 24h"
                            />
                            <StatCard
                                label="Shielded Balance"
                                value="••••••"
                                change="Protected"
                                positive
                                icon={<ShieldCheck weight="duotone" className="w-6 h-6 text-purple-400" />}
                                subtitle="Light Protocol"
                            />
                        </div>

                        {/* Chart + Holdings Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Live Candlestick Chart - Takes 3 columns */}
                            <div className="lg:col-span-3 rounded-[20px] border border-foreground/5 bg-foreground/[0.02] p-5 overflow-hidden relative box-border">
                                <div className="absolute inset-0 bg-foreground/[0.01] pointer-events-none"></div>
                                <div className="flex items-center justify-between mb-4 relative z-10 px-1">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-2 items-center px-2 py-1">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                            <span className="text-base font-semibold text-foreground tracking-tight">SOL / USDC</span>
                                        </div>
                                        <div className="h-4 w-[1px] bg-foreground/10"></div>
                                        {/* Use semantic success/destructive colors if possible, or explicit greens that look good on both */}
                                        <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">+2.4%</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="text-xs font-medium text-muted-foreground bg-foreground/5 px-3 py-1 rounded-lg border border-foreground/5 cursor-pointer hover:bg-foreground/10 transition-colors">1H</div>
                                        <div className="text-xs font-medium text-primary-foreground bg-primary px-3 py-1 rounded-lg border border-primary/20 cursor-pointer">1D</div>
                                        <div className="text-xs font-medium text-muted-foreground bg-foreground/5 px-3 py-1 rounded-lg border border-foreground/5 cursor-pointer hover:bg-foreground/10 transition-colors">1W</div>
                                    </div>
                                </div>
                                <LiveCandlestickChart />
                            </div>

                            {/* Token Holdings - 1 column */}
                            <div className="rounded-[20px] border border-foreground/5 bg-foreground/[0.02] p-5 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-5">
                                    <span className="font-semibold text-foreground text-sm">Your Assets</span>
                                    <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground/70" />
                                </div>
                                <div className="space-y-4">
                                    <TokenRow
                                        symbol="SOL"
                                        name="Solana"
                                        value="$12,458"
                                        change="+5.2%"
                                        image="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                    />
                                    <TokenRow
                                        symbol="USDC"
                                        name="USD Coin"
                                        value="$8,209"
                                        change="0.0%"
                                        image="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
                                    />
                                    <TokenRow
                                        symbol="JUP"
                                        name="Jupiter"
                                        value="$2,153"
                                        change="+12.8%"
                                        image="https://static.jup.ag/jup/icon.png"
                                    />
                                    <TokenRow
                                        symbol="RAY"
                                        name="Raydium"
                                        value="$1,847"
                                        change="-2.1%"
                                        image="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png"
                                    />
                                </div>
                                {/* Gradient fade at bottom - Uses card background color to fade out */}
                                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Updated StatCard using semantic variables
const StatCard = ({ label, value, change, positive, icon, subtitle, glow = false }: {
    label: string; value: string; change: string; positive: boolean; icon: React.ReactNode; subtitle: string; glow?: boolean
}) => (
    <div className={cn(
        "rounded-[20px] border p-5 relative overflow-hidden group transition-all duration-300",
        glow
            ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent bg-card border-primary/20 shadow-lg"
            : "bg-card border-foreground/5 hover:bg-foreground/[0.02]"
    )}>
        {glow && <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-2xl rounded-full -translate-y-10 translate-x-10"></div>}

        <div className="flex flex-col h-full justify-between relative z-10 gap-3">
            {/* Top Row: Icon and Badge */}
            <div className="flex justify-between items-start">
                <div className={cn("p-2.5 rounded-xl border border-foreground/5", glow ? "bg-primary/10 text-primary" : "bg-foreground/5 text-muted-foreground")}>
                    {icon}
                </div>
                <div className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-full border",
                    positive
                        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                        : "text-rose-500 bg-rose-500/10 border-rose-500/20",
                    change === "Protected" && "text-purple-500 bg-purple-500/10 border-purple-500/20"
                )}>
                    {change}
                </div>
            </div>

            {/* Bottom Row: Content Right Aligned */}
            <div className="text-right mt-2">
                <div className="text-2xl font-bold font-mono text-foreground tracking-tight">{value}</div>
                <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                    <span className="text-[10px] text-muted-foreground/60">{subtitle}</span>
                </div>
            </div>
        </div>
    </div>
)

const TokenRow = ({ symbol, name, value, change, image }: { symbol: string; name: string; value: string; change: string; image: string }) => (
    <div className="flex items-center justify-between group hover:bg-foreground/[0.02] -mx-2 px-2 py-2 rounded-lg transition-colors cursor-default">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden bg-white/5 border border-white/10 shadow-sm relative">
                <img src={image} alt={name} className="w-full h-full object-cover" />
            </div>
            <div>
                <div className="text-xs font-semibold text-foreground">{symbol}</div>
                <div className="text-[10px] text-muted-foreground font-medium">{name}</div>
            </div>
        </div>
        <div className="text-right">
            <div className="text-sm font-mono font-medium text-foreground">{value}</div>
            <div className={cn("text-[10px] font-medium", change.startsWith('+') ? "text-emerald-500" : change.startsWith('-') ? "text-rose-500" : "text-muted-foreground")}>
                {change}
            </div>
        </div>
    </div>
)

// Live candlestick chart with lightweight-charts
const LiveCandlestickChart = () => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
    const candleDataRef = useRef<CandlestickData[]>([])
    const currentPriceRef = useRef(195)

    // We can use a ResizeObserver to detect theme changes if we wanted to strictly update chart colors
    // But keeping it neutral (transparent bg + neutral grid) works best for now.

    // Generate initial dummy candlestick data
    const generateInitialData = (): CandlestickData[] => {
        const data: CandlestickData[] = []
        let price = 180 + Math.random() * 20
        const now = Math.floor(Date.now() / 1000)

        for (let i = 60; i >= 0; i--) {
            const time = (now - i * 60) as Time
            const volatility = 0.5 + Math.random() * 1.5
            const change = (Math.random() - 0.48) * volatility
            const open = price
            const close = price + change
            const high = Math.max(open, close) + Math.random() * 0.5
            const low = Math.min(open, close) - Math.random() * 0.5

            data.push({ time, open, high, low, close })
            price = close
        }

        currentPriceRef.current = price
        return data
    }

    // Generate a new candle
    const generateNewCandle = (lastCandle: CandlestickData): CandlestickData => {
        const time = ((lastCandle.time as number) + 60) as Time
        const volatility = 0.3 + Math.random() * 1.2
        const change = (Math.random() - 0.48) * volatility
        const open = lastCandle.close
        const close = open + change
        const high = Math.max(open, close) + Math.random() * 0.3
        const low = Math.min(open, close) - Math.random() * 0.3

        currentPriceRef.current = close
        return { time, open, high, low, close }
    }

    // Update current candle (simulate live tick)
    const updateCurrentCandle = () => {
        if (!candleSeriesRef.current || candleDataRef.current.length === 0) return

        const lastCandle = { ...candleDataRef.current[candleDataRef.current.length - 1] }
        const tick = (Math.random() - 0.5) * 0.3
        const newClose = lastCandle.close + tick

        lastCandle.close = newClose
        lastCandle.high = Math.max(lastCandle.high, newClose)
        lastCandle.low = Math.min(lastCandle.low, newClose)

        candleDataRef.current[candleDataRef.current.length - 1] = lastCandle
        candleSeriesRef.current.update(lastCandle)
    }

    useEffect(() => {
        if (!chartContainerRef.current) return

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 250,
            layout: {
                background: { color: 'transparent' },
                textColor: '#6B7280',
            },
            grid: {
                vertLines: { color: 'rgba(128, 128, 128, 0.1)' },
                horzLines: { color: 'rgba(128, 128, 128, 0.1)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(128, 128, 128, 0.1)',
                visible: true,
            },
            timeScale: {
                borderColor: 'rgba(128, 128, 128, 0.1)',
                timeVisible: false,
                visible: false,
            },
            crosshair: {
                mode: 0, // Normal
                vertLine: { visible: false },
                horzLine: { visible: false },
            },
            handleScroll: false,
            handleScale: false,
        })

        chartRef.current = chart

        // Add candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10B981',
            downColor: '#EF4444',
            borderVisible: false,
            wickUpColor: '#10B981',
            wickDownColor: '#EF4444',
        })

        candleSeriesRef.current = candleSeries

        // Generate and set initial data
        const initialData = generateInitialData()
        candleDataRef.current = initialData
        candleSeries.setData(initialData)
        chart.timeScale().fitContent()

        // Live tick updates (every 200ms)
        const tickInterval = setInterval(() => {
            updateCurrentCandle()
        }, 200)

        // New candle every 3 seconds (simulating time passing)
        const candleInterval = setInterval(() => {
            if (candleDataRef.current.length === 0) return

            const lastCandle = candleDataRef.current[candleDataRef.current.length - 1]
            const newCandle = generateNewCandle(lastCandle)

            // Remove oldest candle if we have too many
            if (candleDataRef.current.length > 60) {
                candleDataRef.current.shift()
            }

            candleDataRef.current.push(newCandle)
            candleSeriesRef.current?.setData(candleDataRef.current)
            chartRef.current?.timeScale().scrollToRealTime()
        }, 3000)

        // Resize observer
        const resizeObserver = new ResizeObserver(() => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                })
            }
        })
        resizeObserver.observe(chartContainerRef.current)

        return () => {
            clearInterval(tickInterval)
            clearInterval(candleInterval)
            resizeObserver.disconnect()
            chart.remove()
        }
    }, [])

    return (
        <div ref={chartContainerRef} className="w-full h-[250px]" />
    )
}
