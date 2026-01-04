'use client';

import { useState, useCallback } from 'react';
import { Shield, AlertTriangle, Clock, Database, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { WalletRiskReport } from '@/types/api';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
    RiskScoreGauge,
    RiskLabels,
    MetricsGrid,
    TransparencySearch,
} from '@/components/transparency';

export default function TransparencyPage() {
    const [report, setReport] = useState<WalletRiskReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        <div className="min-h-screen relative bg-background w-full overflow-x-hidden flex flex-col">
            {/* Background gradient matching other pages */}
            <div className="absolute inset-0 gradient-purple-radial pointer-events-none" style={{ willChange: 'auto' }} />

            <div className="relative z-10 flex flex-col min-h-screen" style={{ willChange: 'auto' }}>
                <Navbar />

                {/* Main Content - with padding for fixed navbar */}
                <main className="flex-1 pt-24 md:pt-28 pb-12">
                    <div className="max-w-6xl mx-auto px-6">
                        {/* Page Header */}
                        <section className="mb-12 text-center">
                            <div className="inline-flex items-center justify-center gap-3 mb-4">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20">
                                    <Shield className="h-8 w-8 text-blue-400" />
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                                Wallet Risk Scanner
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Detect bots, snipers, and sybil actors by analyzing on-chain transaction patterns using Helius RPC
                            </p>
                        </section>

                        {/* Search Section */}
                        <section className="mb-12">
                            <div className="flex justify-center">
                                <TransparencySearch onSearch={handleSearch} isLoading={isLoading} />
                            </div>
                        </section>

                        {/* Error State */}
                        {error && (
                            <div className="mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                                <p className="text-destructive">{error}</p>
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading && !report && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                    <Search className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                                </div>
                                <p className="mt-6 text-muted-foreground">Analyzing transaction history...</p>
                                <p className="mt-1 text-xs text-muted-foreground/60">This may take a moment for active wallets</p>
                            </div>
                        )}

                        {/* Results */}
                        {report && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Wallet Info Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
                                    <div className="flex items-center gap-3">
                                        <Database className="h-5 w-5 text-muted-foreground" />
                                        <code className="text-sm text-foreground/80 font-mono">
                                            {report.address.slice(0, 12)}...{report.address.slice(-12)}
                                        </code>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {report.lastScannedAt && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                {new Date(report.lastScannedAt).toLocaleString()}
                                                {report.isCached && <span className="text-yellow-500">(cached)</span>}
                                            </div>
                                        )}
                                        <button
                                            onClick={handleRescan}
                                            disabled={isLoading}
                                            className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-foreground transition-all disabled:opacity-50"
                                        >
                                            Rescan
                                        </button>
                                    </div>
                                </div>

                                {/* Main Score Card */}
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Risk Score */}
                                    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border">
                                        <RiskScoreGauge
                                            score={report.riskScore}
                                            riskLevel={report.riskLevel}
                                            size="lg"
                                        />
                                        <p className="mt-6 text-sm text-muted-foreground">
                                            {report.txCount.toLocaleString()} transactions analyzed
                                        </p>
                                    </div>

                                    {/* Labels & Description */}
                                    <div className="p-8 rounded-2xl bg-card border border-border">
                                        <h3 className="text-lg font-semibold text-foreground mb-4">Risk Labels</h3>
                                        <RiskLabels labels={report.labels} />

                                        <div className="mt-8 pt-6 border-t border-border">
                                            <h4 className="text-sm font-medium text-foreground/80 mb-2">What This Means</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {report.riskLevel === 'LOW' && 'This wallet shows normal human-like transaction patterns. No concerning behavior detected.'}
                                                {report.riskLevel === 'MEDIUM' && 'This wallet shows some elevated activity. Could be an active trader or early-stage automated activity.'}
                                                {report.riskLevel === 'HIGH' && 'This wallet shows strong programmatic behavior patterns. Likely using automated trading or sniping tools.'}
                                                {report.riskLevel === 'CRITICAL' && 'This wallet exhibits extreme bot-like behavior with high-frequency transactions, bursts, and potential sybil patterns.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-4">Behavioral Metrics</h3>
                                    <MetricsGrid
                                        avgTps={report.avgTps}
                                        burstCount={report.burstCount}
                                        failedTxCount={report.failedTxCount}
                                        txCount={report.txCount}
                                        circularCount={report.circularCount}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!report && !isLoading && !error && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="p-4 rounded-2xl bg-card border border-border mb-6">
                                    <Shield className="h-12 w-12 text-muted-foreground/30" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground/80">Enter a wallet address</h3>
                                <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                                    Analyze any Solana wallet to detect bots, snipers, and suspicious transaction patterns
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
