"use client";

import { MarqueeAnimation } from "@/components/ui/marquee-effect";

export function MarqueeCTA() {
    return (
        <section className="py-8 md:py-12 bg-background overflow-hidden">
            <div className="flex flex-col gap-4">
                <MarqueeAnimation
                    direction="left"
                    baseVelocity={-3}
                    className="bg-primary text-primary-foreground py-3 md:py-4 text-4xl md:text-6xl lg:text-7xl font-display"
                >
                    TRADE SMARTER • NON-CUSTODIAL • LIGHTNING FAST •
                </MarqueeAnimation>
                <MarqueeAnimation
                    direction="right"
                    baseVelocity={-3}
                    className="bg-foreground text-background py-3 md:py-4 text-4xl md:text-6xl lg:text-7xl font-display"
                >
                    AUTOMATED STRATEGIES • SOLANA POWERED • SWAPIFY •
                </MarqueeAnimation>
            </div>
        </section>
    );
}
