"use client";

import { Wallet, Coins, Settings2, ArrowDownCircle, Zap } from "lucide-react";
import RadialOrbitalTimeline, { TimelineItem } from "@/components/ui/radial-orbital-timeline";

const timelineData: TimelineItem[] = [
    {
        id: 1,
        title: "Connect Wallet",
        date: "Step 1",
        content: "Securely connect your Solana wallet. Support for Phantom, Solflare, and more.",
        category: "Onboarding",
        icon: Wallet,
        relatedIds: [2],
        status: "completed",
        energy: 100,
    },
    {
        id: 2,
        title: "Select Tokens",
        date: "Step 2",
        content: "Choose from thousands of SPL tokens. Real-time pricing via Jupiter Aggregator.",
        category: "Selection",
        icon: Coins,
        relatedIds: [1, 3],
        status: "completed",
        energy: 100,
    },
    {
        id: 3,
        title: "Set Strategy",
        date: "Step 3",
        content: "Configure your DCA or market-cap triggers. Set entry/exit prices and intervals.",
        category: "Configuration",
        icon: Settings2,
        relatedIds: [2, 4],
        status: "in-progress",
        energy: 80,
    },
    {
        id: 4,
        title: "Deposit Funds",
        date: "Step 4",
        content: "Deposit SOL or USDC into the non-custodial smart contract escrow.",
        category: "Funding",
        icon: ArrowDownCircle,
        relatedIds: [3, 5],
        status: "pending",
        energy: 40,
    },
    {
        id: 5,
        title: "Automated Execution",
        date: "Step 5",
        content: "Sit back. WeSwap executes your strategy on-chain with zero latency.",
        category: "Execution",
        icon: Zap,
        relatedIds: [4],
        status: "pending",
        energy: 20,
    },
];

export function HowItWorksTimeline() {
    return (
        <section className="py-24 bg-background overflow-visible">
            <div className="container mx-auto px-4 mb-16 text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground">
                    How <span className="text-primary">WeSwap</span> Works
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    From connection to execution, our non-custodial protocol handles it all securely on-chain.
                </p>
            </div>
            <div className="h-[700px] w-full relative">
                <RadialOrbitalTimeline timelineData={timelineData} />
            </div>
        </section>
    );
}
