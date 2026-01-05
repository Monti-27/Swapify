'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Clock, Database, Search, Activity, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { WalletRiskReport } from '@/types/api';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
    RiskScoreGauge,
    RiskLabels,
    MetricsGrid,
    TransparencySearch,
    ClusterAnalysis,
} from '@/components/transparency';

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
                setError('Risk Scanner is unavailable. Helius API not configured on backend.');
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
        <div className="min-h-screen relative bg-background w-full overflow-x-hidden flex flex-col font-sans">
            {/* Background gradient matching other pages */}
            <div className="absolute inset-0 gradient-purple-radial pointer-events-none" style={{ willChange: 'auto' }} />

            <div className="relative z-10 flex flex-col min-h-screen" style={{ willChange: 'auto' }}>
                <Navbar />

                {/* Main Content */}
                <main className="flex-1 pt-32 pb-20">
                    <div className="max-w-7xl mx-auto px-6">
                        {/* Page Header - Animated */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="mb-12 text-center"
                        >
                            <div className="inline-flex items-center justify-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                                <Shield className="h-4 w-4" />
                                <span>Risk Analysis Engine</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
                                Transparency <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">Center</span>
                            </h1>

                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                Advanced on-chain analysis to detect bots, snipers, and sybil networks using Helius RPC data.
                                Ensure you're interacting with real humans.
                            </p>
                        </motion.section>

                        {/* Tabs Interface */}
                        <Tabs defaultValue="scanner" value={activeTab} onValueChange={setActiveTab} className="w-full max-w-5xl mx-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="flex justify-center mb-10"
                            >
                                <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-xl">
                                    <TabsTrigger value="scanner" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Activity className="h-4 w-4" />
                                            <span>Wallet Scanner</span>
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger value="cluster" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>Cabal Detector</span>
                                        </div>
                                    </TabsTrigger>
                                </TabsList>
                            </motion.div>

                            {/* Wallet Scanner Content */}
                            <TabsContent value="scanner" className="mt-0 outline-none">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Card className="border-border/50 bg-card/30 backdrop-blur-xl shadow-xl overflow-hidden p-6 md:p-8">
                                        {/* Search Input */}
                                        <div className="max-w-2xl mx-auto mb-10">
                                            <TransparencySearch onSearch={handleSearch} isLoading={isLoading} />
                                        </div>

                                        {/* Error State */}
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 max-w-2xl mx-auto"
                                            >
                                                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                                                <p className="text-destructive font-medium">{error}</p>
                                            </motion.div>
                                        )}

                                        {/* Loading State */}
                                        {isLoading && !report && (
                                            <div className="flex flex-col items-center justify-center py-24">
                                                <div className="relative">
                                                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Search className="h-8 w-8 text-primary animate-pulse" />
                                                    </div>
                                                </div>
                                                <p className="mt-8 text-lg font-medium text-foreground">Analyzing transaction history...</p>
                                                <p className="mt-2 text-sm text-muted-foreground">Scanning on-chain patterns via Helius</p>
                                            </div>
                                        )}

                                        {/* Empty State */}
                                        {!report && !isLoading && !error && (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <div className="p-6 rounded-3xl bg-muted/30 border border-border/50 mb-6 group transition-transform hover:scale-105 duration-300">
                                                    <Shield className="h-16 w-16 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                                                </div>
                                                <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Scan</h3>
                                                <p className="text-muted-foreground max-w-md mx-auto">
                                                    Enter any Solana wallet address to instantly generate a comprehensive risk report and identify potential threats.
                                                </p>
                                            </div>
                                        )}

                                        {/* Results */}
                                        {report && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-8"
                                            >
                                                {/* Wallet Info Header */}
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-background border border-border/50">
                                                            <Database className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Wallet Address</div>
                                                            <code className="text-base text-foreground font-mono font-medium">
                                                                {report.address}
                                                            </code>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {report.lastScannedAt && (
                                                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-3 py-1.5 rounded-lg bg-background/50 border border-border/50">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {new Date(report.lastScannedAt).toLocaleString()}
                                                                {report.isCached && <span className="text-amber-500 ml-1 font-bold">CACHED</span>}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={handleRescan}
                                                            disabled={isLoading}
                                                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            <Activity className="h-4 w-4" />
                                                            Rescan
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Main Score Card */}
                                                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                                                    {/* Risk Score */}
                                                    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-background to-muted/20 border border-border/50 shadow-sm relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
                                                        <RiskScoreGauge
                                                            score={report.riskScore}
                                                            riskLevel={report.riskLevel}
                                                            size="lg"
                                                            animated={true}
                                                        />
                                                        <p className="mt-8 text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                            <Activity className="h-4 w-4" />
                                                            {report.txCount.toLocaleString()} transactions analyzed
                                                        </p>
                                                    </div>

                                                    {/* Labels & Description */}
                                                    <div className="p-8 rounded-2xl bg-gradient-to-br from-background to-muted/20 border border-border/50 shadow-sm flex flex-col justify-center">
                                                        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                                                            <Shield className="h-5 w-5 text-primary" />
                                                            Risk Assessment
                                                        </h3>

                                                        <div className="mb-8">
                                                            <RiskLabels labels={report.labels} />
                                                        </div>

                                                        <div className="p-4 rounded-xl bg-background/80 border border-border/60 backdrop-blur-sm">
                                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Analysis Summary</h4>
                                                            <p className="text-sm text-foreground/80 leading-relaxed">
                                                                {report.riskLevel === 'LOW' && 'This wallet demonstrates consistent human-like behavior. Transaction frequency, timing, and interactions align with typical user patterns.'}
                                                                {report.riskLevel === 'MEDIUM' && 'This wallet shows elevated activity levels that could indicate a power user or early-stage automation. Monitor for specific bot-like bursts.'}
                                                                {report.riskLevel === 'HIGH' && 'Significant indicators of automated behavior detected. Patterns suggest the use of trading bots, sniping tools, or programmatic interactions.'}
                                                                {report.riskLevel === 'CRITICAL' && 'Extreme bot-like behavior confirmed. High-frequency bursts, systematic failures, and circular transfers indicate a sophisticated bot or sybil attacker.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Metrics Grid */}
                                                <div>
                                                    <h3 className="text-lg font-semibold text-foreground mb-6 px-1">Behavioral Metrics</h3>
                                                    <MetricsGrid
                                                        avgTps={report.avgTps}
                                                        burstCount={report.burstCount}
                                                        failedTxCount={report.failedTxCount}
                                                        txCount={report.txCount}
                                                        circularCount={report.circularCount}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </Card>
                                </motion.div>
                            </TabsContent>

                            {/* Cluster Analysis Content */}
                            <TabsContent value="cluster" className="mt-0 outline-none">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="relative">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-2xl blur-lg opacity-50" />
                                        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-xl overflow-hidden p-6 md:p-8 relative">
                                            <div className="mb-8 text-center md:text-left">
                                                <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center md:justify-start justify-center gap-3">
                                                    <Users className="h-6 w-6 text-fuchsia-500" />
                                                    Cabal Detector
                                                </h3>
                                                <p className="text-muted-foreground max-w-3xl">
                                                    Analyze multiple tokens to find "Mutual Wallets" (insiders) that hold or interact with all of them.
                                                    Useful for detecting coordinated groups or cabals across different projects.
                                                </p>
                                            </div>

                                            <ClusterAnalysis />
                                        </Card>
                                    </div>
                                </motion.div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
