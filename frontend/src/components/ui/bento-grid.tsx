"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Zap, Lock } from 'lucide-react'

export function BentoGrid() {
    return (
        <section className="bg-background py-16 md:py-32 transition-colors duration-300">
            <div className="mx-auto max-w-3xl lg:max-w-5xl px-6">
                <div className="relative">
                    <div className="relative z-10 grid grid-cols-6 gap-3">
                        {/* Card 1: Automated Strategies */}
                        <Card className="relative col-span-full flex overflow-hidden lg:col-span-4 rounded-3xl border-border bg-card/50 dark:bg-card/40 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md">
                            <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20 translate-x-[1px] translate-y-[1px]"
                                style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                            </div>

                            <CardContent className="relative m-auto size-full p-6 z-10 text-card-foreground">
                                <div className="absolute top-6 left-6 z-20">
                                    <h2 className="text-2xl font-semibold mb-2">Automated Strategies</h2>
                                    <p className="text-muted-foreground max-w-xs text-sm">Smart Grid & DCA bots that trade 24/7.</p>
                                </div>
                                <div className="absolute right-0 bottom-0 top-0 left-0 pt-20 pl-10 pr-10">
                                    <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="step-gradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        <path d="M0 200 L 0 160 
                                                 Q 10 160 20 155 L 50 110 Q 55 105 65 105 L 100 105 
                                                 Q 110 105 120 95 L 150 55 Q 155 50 165 50 L 200 50
                                                 Q 210 50 220 40 L 250 10 Q 255 5 265 5 L 400 5
                                                 V 200 H 0 Z"
                                            fill="url(#step-gradient)" />

                                        <path d="M0 160 
                                                 Q 10 160 20 155 L 50 110 Q 55 105 65 105 L 100 105 
                                                 Q 110 105 120 95 L 150 55 Q 155 50 165 50 L 200 50
                                                 Q 210 50 220 40 L 250 10 Q 255 5 265 5 L 340 5"
                                            fill="none"
                                            stroke="#2dd4bf"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            vectorEffect="non-scaling-stroke" />

                                        <circle cx="340" cy="5" r="4" className="fill-background stroke-teal-400" strokeWidth="2.5" />
                                    </svg>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: Lightning Fast (Fixed Flickering & Added Smooth Ripples) */}
                        <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2 rounded-3xl border-border bg-card/50 dark:bg-card/40 backdrop-blur-sm group hover:bg-accent/5 transition-colors duration-500 shadow-sm hover:shadow-md">
                            <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-100/50 to-zinc-50/0 dark:from-zinc-800/20 dark:to-zinc-900/0"></div>

                            <CardContent className="p-6 flex flex-col h-full relative z-10 text-card-foreground">
                                <div className="text-center w-full mb-4">
                                    <h2 className="text-xl font-semibold mb-2">Lightning Fast</h2>
                                    <p className="text-muted-foreground text-sm">Get your strategy executed in<br />just a few milliseconds.</p>
                                </div>

                                <div className="flex-1 flex items-center justify-center w-full min-h-[160px]">
                                    <div className="relative w-48 h-48 flex items-center justify-center">

                                        <svg width="0" height="0">
                                            <defs>
                                                <path id="bolt-path" d="M55 15 L25 60 L50 60 L40 85 L85 40 L60 40 L70 15 Z" strokeLinejoin="round" />
                                            </defs>
                                        </svg>

                                        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">

                                            {/* Outer Ripple */}
                                            <use href="#bolt-path"
                                                className="stroke-zinc-200 dark:stroke-zinc-800/60 fill-transparent transition-all duration-1000 group-hover:animate-ripple-outer"
                                                strokeWidth="35"
                                                strokeOpacity="0.3"
                                            />

                                            {/* Middle Ripple */}
                                            <use href="#bolt-path"
                                                className="stroke-zinc-300 dark:stroke-zinc-700/60 fill-transparent transition-all duration-1000 group-hover:animate-ripple-middle"
                                                strokeWidth="20"
                                                strokeOpacity="0.4"
                                            />

                                            {/* Inner Ripple */}
                                            <use href="#bolt-path"
                                                className="stroke-zinc-400 dark:stroke-zinc-600/60 fill-transparent transition-all duration-1000 group-hover:animate-ripple-inner"
                                                strokeWidth="8"
                                                strokeOpacity="0.5"
                                            />

                                            {/* Main Bolt */}
                                            <use href="#bolt-path"
                                                className="fill-white dark:fill-zinc-200 stroke-none drop-shadow-md relative z-10 transition-transform duration-300 group-hover:scale-105 origin-center"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 3: Advanced Security */}
                        <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2 rounded-3xl border-border bg-card/50 dark:bg-card/40 backdrop-blur-sm group shadow-sm transition-all duration-300 hover:shadow-md">
                            <CardContent className="p-6 flex flex-col h-full relative z-10 items-center justify-center text-card-foreground">
                                <div className="w-full text-center mb-6">
                                    <h2 className="text-xl font-semibold mb-2">Advanced Security</h2>
                                    <p className="text-muted-foreground text-sm">Aggregate data from various sources, eliminating silos.</p>
                                </div>

                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    <svg className="absolute inset-0 w-full h-full text-purple-500/10 dark:text-purple-400/20" viewBox="0 0 100 100">
                                        <g stroke="currentColor" strokeWidth="0.5" fill="none">
                                            <path d="M50 20 L 50 10 M 50 90 L 50 80 M 20 50 L 10 50 M 90 50 L 80 50" />
                                            <path d="M30 30 L 25 25 M 70 70 L 75 75 M 30 70 L 25 75 M 70 30 L 75 25" />
                                            <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
                                        </g>
                                    </svg>

                                    <div className="relative z-10 transition-transform duration-500 group-hover:scale-105">
                                        <svg width="80" height="96" viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                                            <path d="M40 92C40 92 68 82 76 54C78 46 78 12 78 12L40 4L2 12C2 12 2 46 4 54C12 82 40 92 40 92Z"
                                                className="fill-white dark:fill-zinc-900 stroke-purple-500/50"
                                                strokeWidth="1.5" />
                                            <path d="M40 92C40 92 68 82 76 54C78 46 78 12 78 12L40 4L2 12C2 12 2 46 4 54C12 82 40 92 40 92Z"
                                                fill="url(#shield-gradient)"
                                                opacity="0.5" />
                                            <path d="M40 38C42.7614 38 45 40.2386 45 43C45 44.9614 43.8686 46.6661 42.2222 47.5029L43.1111 55.5H36.8889L37.7778 47.5029C36.1314 46.6661 35 44.9614 35 43C35 40.2386 37.2386 38 40 38Z"
                                                className="fill-purple-500 dark:fill-purple-400" />
                                            <defs>
                                                <linearGradient id="shield-gradient" x1="40" y1="4" x2="40" y2="92" gradientUnits="userSpaceOnUse">
                                                    <stop stopColor="#F5F3FF" stopOpacity="0.8" className="dark:stop-color-purple-900" />
                                                    <stop offset="1" stopColor="#E0D9FF" stopOpacity="0.2" className="dark:stop-color-purple-950" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 4: Profit Margin */}
                        <Card className="relative col-span-full flex overflow-hidden lg:col-span-4 rounded-3xl border-border bg-card/50 dark:bg-card/40 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md">
                            <CardContent className="relative m-auto size-full p-6 text-card-foreground">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-semibold">Your Profit Margin</h2>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-0.5 bg-purple-500 rounded-full"></div>
                                            <span className="text-xs text-muted-foreground">WeSwap</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-0.5 bg-zinc-400 dark:bg-zinc-600 rounded-full"></div>
                                            <span className="text-xs text-muted-foreground">Others</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative h-48 w-full">
                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200" preserveAspectRatio="none">
                                        <line x1="0" y1="0" x2="400" y2="0" className="stroke-zinc-200 dark:stroke-zinc-800" strokeDasharray="4 4" strokeWidth="0.5" />
                                        <line x1="0" y1="50" x2="400" y2="50" className="stroke-zinc-200 dark:stroke-zinc-800" strokeDasharray="4 4" strokeWidth="0.5" />
                                        <line x1="0" y1="100" x2="400" y2="100" className="stroke-zinc-200 dark:stroke-zinc-800" strokeDasharray="4 4" strokeWidth="0.5" />
                                        <line x1="0" y1="150" x2="400" y2="150" className="stroke-zinc-200 dark:stroke-zinc-800" strokeDasharray="4 4" strokeWidth="0.5" />

                                        <text x="-10" y="150" fontSize="10" className="fill-muted-foreground" textAnchor="end">10%</text>
                                        <text x="-10" y="100" fontSize="10" className="fill-muted-foreground" textAnchor="end">20%</text>
                                        <text x="-10" y="50" fontSize="10" className="fill-muted-foreground" textAnchor="end">40%</text>
                                        <text x="-10" y="5" fontSize="10" className="fill-muted-foreground" textAnchor="end">70%</text>

                                        <text x="10" y="215" fontSize="10" className="fill-muted-foreground">Nov 1</text>
                                        <text x="360" y="215" fontSize="10" className="fill-muted-foreground">Nov 30</text>

                                        <path d="M0 140 L 40 120 L 80 130 L 120 140 L 160 125 L 200 100 L 240 110 L 280 120 L 320 130 L 360 110 L 400 120"
                                            fill="none"
                                            className="stroke-zinc-400 dark:stroke-zinc-600"
                                            strokeWidth="1.5"
                                            strokeDasharray="6 4"
                                            vectorEffect="non-scaling-stroke" />

                                        <defs>
                                            <linearGradient id="purple-gradient-theme" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M0 200 L 0 110 L 40 125 L 80 115 L 120 130 L 160 110 L 200 115 L 240 100 L 280 60 L 320 30 L 360 15 L 400 5 V 200 H 0 Z"
                                            fill="url(#purple-gradient-theme)" />
                                        <path d="M0 110 L 40 125 L 80 115 L 120 130 L 160 110 L 200 115 L 240 100 L 280 60 L 320 30 L 360 15 L 400 5"
                                            fill="none"
                                            stroke="#a855f7"
                                            strokeWidth="2"
                                            vectorEffect="non-scaling-stroke" />
                                    </svg>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            {/* Global Styles for Custom Animations */}
            <style jsx global>{`
                @keyframes ripple {
                    0% { stroke-width: var(--initial-width); stroke-opacity: var(--initial-opacity); }
                    50% { stroke-width: calc(var(--initial-width) * 1.5); stroke-opacity: calc(var(--initial-opacity) * 0.5); }
                    100% { stroke-width: var(--initial-width); stroke-opacity: var(--initial-opacity); }
                }
                .animate-ripple-outer {
                    --initial-width: 35px;
                    --initial-opacity: 0.3;
                    animation: ripple 2s infinite ease-in-out;
                }
                .animate-ripple-middle {
                    --initial-width: 20px;
                    --initial-opacity: 0.4;
                    animation: ripple 2s infinite ease-in-out;
                    animation-delay: 0.2s;
                }
                .animate-ripple-inner {
                    --initial-width: 8px;
                    --initial-opacity: 0.5;
                    animation: ripple 2s infinite ease-in-out;
                    animation-delay: 0.4s;
                }
            `}</style>
        </section>
    )
}
