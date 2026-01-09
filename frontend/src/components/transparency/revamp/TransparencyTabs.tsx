'use client';

import { motion } from 'framer-motion';
import { Activity, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransparencyTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function TransparencyTabs({ activeTab, onTabChange }: TransparencyTabsProps) {
    const tabs = [
        { id: 'scanner', label: 'Wallet Scanner', icon: Activity },
        { id: 'cluster', label: 'Cabal Detector', icon: Users },
    ];

    return (
        <div className="flex justify-center mb-12">
            <div className="relative flex p-1 bg-muted/30 backdrop-blur-md border border-border/40 rounded-2xl">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "relative flex items-center gap-2.5 px-6 py-2.5 text-sm font-medium transition-all duration-300 rounded-xl",
                                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-tab"
                                    className="absolute inset-0 bg-background shadow-lg rounded-xl border border-border/50"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <Icon className={cn("relative z-10 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
