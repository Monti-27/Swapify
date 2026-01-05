'use client';

import { ExternalLink, RefreshCcw } from 'lucide-react';
import type { WalletRiskReport } from '@/types/api';
import { RoundedRiskChart } from './RoundedRiskChart';
import { RiskLabels } from '../RiskLabels';
import { MetricsGrid } from './MetricsGridPremium';
import { SolanaLogo } from './SolanaLogo';
import { cn } from '@/lib/utils';

interface RiskReportProps {
    report: WalletRiskReport;
    onRescan: () => void;
    isLoading?: boolean;
}

export function RiskReport({ report, onRescan, isLoading }: RiskReportProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Wallet Info Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-muted/10 border border-border/40 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-background border border-border/50 shadow-sm">
                        <SolanaLogo size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mb-1">Target Address</div>
                        <div className="flex items-center gap-2">
                            <code className="text-sm md:text-base text-foreground font-mono font-medium truncate max-w-[200px] md:max-w-md">
                                {report.address}
                            </code>
                            <a 
                                href={`https://solscan.io/account/${report.address}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-primary"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {report.lastScannedAt && (
                        <div className="hidden lg:flex flex-col items-end">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mb-1">Last Analysis</div>
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <span className="text-muted-foreground">
                                    {new Date(report.lastScannedAt).toLocaleString()}
                                </span>
                                {report.isCached && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">
                                        CACHED
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <button
                        onClick={onRescan}
                        disabled={isLoading}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest bg-background hover:bg-muted border border-border/60 text-foreground rounded-xl transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="h-3 w-3 rounded-full border border-foreground/20 border-t-foreground animate-spin" />
                        ) : (
                            <RefreshCcw className="h-3 w-3" />
                        )}
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Assessment Grid */}
            <div className="grid lg:grid-cols-12 gap-8">
                {/* Score Column */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-10 rounded-3xl bg-gradient-to-br from-background to-muted/10 border border-border/40 shadow-sm relative overflow-hidden group">
                    <RoundedRiskChart
                        score={report.riskScore}
                        riskLevel={report.riskLevel}
                        metrics={{
                            avgTps: report.avgTps,
                            burstCount: report.burstCount,
                            failedTxCount: report.failedTxCount,
                            txCount: report.txCount,
                            circularCount: report.circularCount,
                        }}
                    />
                    <div className="mt-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {report.txCount.toLocaleString()} Transactions Analyzed
                    </div>
                </div>

                {/* Analysis Column */}
                <div className="lg:col-span-7 p-8 rounded-3xl bg-muted/5 border border-border/40 flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-1 w-8 bg-primary rounded-full" />
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">Behavioral Assessment</h3>
                    </div>

                    <div className="mb-10">
                        <RiskLabels labels={report.labels} />
                    </div>

                    <div className="mt-auto p-6 rounded-2xl bg-background/50 border border-border/40 backdrop-blur-sm">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Professional Summary</h4>
                        <p className="text-sm text-foreground/70 leading-relaxed font-light">
                            {report.riskLevel === 'LOW' && 'The wallet exhibits consistent manual interaction patterns. High correlation with retail user behavior and standard transaction frequencies.'}
                            {report.riskLevel === 'MEDIUM' && 'Detected irregular activity bursts. Patterns suggest potential semi-automated interactions or high-frequency power usage.'}
                            {report.riskLevel === 'HIGH' && 'Significant evidence of programmatic execution. Transaction timing and interaction vectors strongly indicate the use of automated trading infrastructure.'}
                            {report.riskLevel === 'CRITICAL' && 'Systemic automated behavior confirmed. Identification of high-frequency sniping patterns and sybil-related circular transaction flows.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-1 w-6 bg-muted-foreground/30 rounded-full" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Deep Scan Metrics</h3>
                </div>
                <MetricsGrid
                    avgTps={report.avgTps}
                    burstCount={report.burstCount}
                    failedTxCount={report.failedTxCount}
                    txCount={report.txCount}
                    circularCount={report.circularCount}
                />
            </div>
        </div>
    );
}
