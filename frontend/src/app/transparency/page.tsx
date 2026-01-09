'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import type { WalletRiskReport } from '@/types/api';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

// New Revamp Components
import { TransparencyHeader } from '@/components/transparency/revamp/TransparencyHeader';
import { TransparencyTabs } from '@/components/transparency/revamp/TransparencyTabs';
import { ScannerInput } from '@/components/transparency/revamp/ScannerInput';
import { RiskReport } from '@/components/transparency/revamp/RiskReport';
import { TransparencyCabal } from '@/components/transparency/revamp/TransparencyCabal';
import { TransparencySkeleton } from '@/components/transparency/revamp/TransparencySkeleton';

export default function TransparencyPage() {
    const [report, setReport] = useState<WalletRiskReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("scanner");

    const handleSearch = useCallback(async (address: string) => {
        setIsLoading(true);
        setError(null);
        setReport(null);

        try {
            // Try to get cached data first
            let data: WalletRiskReport;
            try {
                data = await api.getWalletRisk(address);
            } catch {
                // No cached data, trigger a fresh scan
                data = await api.scanWalletRisk(address);
            }
            setReport(data);
        } catch (err: any) {
            if (err.message?.includes('429')) {
                setError('Rate limit exceeded. Please wait a moment and try again.');
            } else if (err.message?.includes('503') || err.message?.includes('unavailable')) {
                setError('Risk Scanner is unavailable. Backend API not responding.');
            } else {
                setError(err.message || 'Failed to analyze wallet');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRescan = useCallback(async () => {
        if (!report) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await api.scanWalletRisk(report.address);
            setReport(data);
        } catch (err: any) {
            setError(err.message || 'Failed to rescan wallet');
        } finally {
            setIsLoading(false);
        }
    }, [report]);

    return (
        <div className="min-h-screen relative bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white transition-colors duration-300">
            {/* Minimalist Background Gradients */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(var(--primary-rgb),0.03)_0%,_transparent_50%)] pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(var(--primary-rgb),0.02)_0%,_transparent_50%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-1 pt-32 pb-24">
                    <div className="max-w-[1200px] mx-auto px-6">
                        <TransparencyHeader />

                        <TransparencyTabs 
                            activeTab={activeTab} 
                            onTabChange={setActiveTab} 
                        />

                        <div className="max-w-5xl mx-auto">
                            <AnimatePresence mode="wait">
                                {activeTab === 'scanner' ? (
                                    <motion.div
                                        key="scanner"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-12"
                                    >
                                        <div className="max-w-2xl mx-auto">
                                            <ScannerInput 
                                                onSearch={handleSearch} 
                                                isLoading={isLoading} 
                                            />
                                        </div>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 flex items-center gap-3 max-w-2xl mx-auto shadow-sm"
                                            >
                                                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                                                <p className="text-destructive text-sm font-medium">{error}</p>
                                            </motion.div>
                                        )}

                                        <div className="pt-4">
                                            {isLoading ? (
                                                <TransparencySkeleton />
                                            ) : report ? (
                                                <RiskReport 
                                                    report={report} 
                                                    onRescan={handleRescan} 
                                                    isLoading={isLoading} 
                                                />
                                            ) : !error && (
                                                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/5">
                                                    <div className="w-20 h-20 rounded-3xl bg-background border border-border/50 flex items-center justify-center mb-6 shadow-sm">
                                                        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-foreground mb-2">Ready for Intelligence Scan</h3>
                                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto font-light">
                                                        Enter a Solana address above to initiate institutional-grade risk assessment.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="cabal"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <TransparencyCabal />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
