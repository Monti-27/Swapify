'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, Copy, Check, ExternalLink, Users, Camera, History, Radio, Wifi, X } from 'lucide-react';
import type { ClusterMode, ClusterWallet } from '@/types/api';
import { cn } from '@/lib/utils';
import { CabalSkeleton } from './TransparencySkeleton';

// Validate Solana address
function isValidSolanaAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Parse comma or newline separated addresses
function parseAddresses(input: string): string[] {
    return input
        .split(/[,\n]/)
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0 && isValidSolanaAddress(addr));
}

// Risk score color helpers
function getRiskColor(score: number): string {
    if (score < 0) return 'text-muted-foreground';
    if (score <= 25) return 'text-emerald-400';
    if (score <= 50) return 'text-yellow-400';
    if (score <= 75) return 'text-orange-400';
    return 'text-red-400';
}

function getRiskBgColor(score: number): string {
    if (score < 0) return 'bg-muted/50';
    if (score <= 25) return 'bg-emerald-500/5';
    if (score <= 50) return 'bg-yellow-500/5';
    if (score <= 75) return 'bg-orange-500/5';
    return 'bg-red-500/5';
}

export function TransparencyCabal() {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<ClusterMode>('SNAPSHOT');
    const [wallets, setWallets] = useState<ClusterWallet[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [tokenProgress, setTokenProgress] = useState<any[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>('');

    const eventSourceRef = useRef<EventSource | null>(null);

    // Real-time parsing for UI feedback
    const parsedAddresses = parseAddresses(input);
    const isValidCount = parsedAddresses.length >= 2 && parsedAddresses.length <= 5;

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const handleAnalyze = useCallback(() => {
        setError(null);
        setWallets([]);
        setIsComplete(false);
        setStats(null);
        setTokenProgress([]);
        setStatusMessage('');

        const mints = parseAddresses(input);

        if (mints.length < 2) {
            setError('Please enter at least 2 valid token addresses');
            return;
        }

        if (mints.length > 5) {
            setError('Maximum 5 tokens allowed per analysis');
            return;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setIsStreaming(true);
        setStatusMessage('Connecting to data stream...');

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const url = `${baseUrl}/transparency/cluster/stream?mints=${mints.join(',')}&mode=${mode}`;

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'INIT':
                        setStatusMessage(`Analyzing ${data.data.tokenCount} tokens...`);
                        break;
                    case 'TOKEN_FETCHED':
                        setTokenProgress(prev => [...prev, data.data]);
                        break;
                    case 'WALLET':
                        setWallets(prev => [...prev, data.data]);
                        break;
                    case 'DONE':
                        setIsComplete(true);
                        setIsStreaming(false);
                        setStats(data.data);
                        setStatusMessage('');
                        eventSource.close();
                        break;
                    case 'ERROR':
                        setError(data.data.message || 'Stream error');
                        setIsStreaming(false);
                        eventSource.close();
                        break;
                }
            } catch (e) {
                console.error('SSE Error:', e);
            }
        };

        eventSource.onerror = () => {
            if (eventSource.readyState !== EventSource.CLOSED) {
                setError('Connection interrupted');
                setIsStreaming(false);
                eventSource.close();
            }
        };
    }, [input, mode]);

    const handleStop = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            setIsStreaming(false);
            setStatusMessage('Analysis stopped');
        }
    }, []);

    const copyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Control Panel */}
            <div className="p-8 rounded-3xl bg-muted/10 border border-border/40 backdrop-blur-sm">
                <div className="flex flex-col gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-foreground/80 uppercase tracking-[0.2em] flex items-center gap-2">
                                    Target Token Mints
                                    {parsedAddresses.length > 0 && (
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all duration-300",
                                            isValidCount ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                                        )}>
                                            {parsedAddresses.length} detected
                                        </span>
                                    )}
                                </label>
                                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                                    Paste 2-5 Solana addresses. Supported formats: <span className="text-foreground/40 font-mono">comma</span>, <span className="text-foreground/40 font-mono">space</span>, or <span className="text-foreground/40 font-mono">new line</span>.
                                </p>
                            </div>
                            {input && !isStreaming && (
                                <button 
                                    onClick={() => setInput('')}
                                    className="text-[10px] font-bold text-muted-foreground/60 hover:text-destructive transition-colors uppercase tracking-widest flex items-center gap-1.5"
                                >
                                    <X className="h-3 w-3" />
                                    Clear
                                </button>
                            )}
                        </div>
                        
                        <div className="relative group">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Example: 7xKXv..., DeZzW..., EPjFW..."
                                rows={3}
                                disabled={isStreaming}
                                className="w-full px-6 py-5 bg-background/50 border border-border/60 rounded-[1.5rem] text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none font-mono text-xs leading-relaxed transition-all shadow-sm group-hover:border-border/80"
                            />
                            
                            {/* Visual validation checkmark */}
                            <div className="absolute top-4 right-4">
                                {isValidCount ? (
                                    <div className="p-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-500">
                                        <Check className="h-3.5 w-3.5" />
                                    </div>
                                ) : input.length > 10 ? (
                                    <div className="p-1.5 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-500">
                                        <Loader2 className="h-3.5 w-3.5 animate-pulse" />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 p-1.5 bg-background border border-border/60 rounded-xl w-full md:w-auto">
                            <button
                                onClick={() => setMode('SNAPSHOT')}
                                disabled={isStreaming}
                                className={cn(
                                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all",
                                    mode === 'SNAPSHOT' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Camera className="h-3.5 w-3.5" />
                                SNAPSHOT
                            </button>
                            <button
                                onClick={() => setMode('HISTORY')}
                                disabled={isStreaming}
                                className={cn(
                                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all",
                                    mode === 'HISTORY' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <History className="h-3.5 w-3.5" />
                                HISTORY
                            </button>
                        </div>

                        {isStreaming ? (
                            <button
                                onClick={handleStop}
                                className="w-full md:w-auto px-10 py-3.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <X className="h-4 w-4" />
                                Stop Analysis
                            </button>
                        ) : (
                            <button
                                onClick={handleAnalyze}
                                className="w-full md:w-auto px-10 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <Search className="h-4 w-4" />
                                Detect Mutual Wallets
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-xs font-medium text-center">
                    {error}
                </div>
            )}

            {/* Live Progress */}
            {isStreaming && (
                <div className="flex flex-col items-center gap-4 py-6 border-y border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
                            <div className="absolute inset-0 h-2 w-2 bg-primary rounded-full" />
                        </div>
                        <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">{statusMessage}</span>
                    </div>
                    {tokenProgress.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-3">
                            {tokenProgress.map((tp, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/20 border border-border/40">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-mono text-muted-foreground">{tp.mint.slice(0, 8)}...</span>
                                    <span className="text-[10px] font-bold text-foreground">{tp.count.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Results Section */}
            {(wallets.length > 0 || isStreaming) && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    {isComplete && stats && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Tokens', val: stats.tokenCount, color: 'text-foreground' },
                                { label: 'Overlap', val: stats.mutualWalletCount, color: 'text-primary' },
                                { label: 'Scanned', val: stats.stats?.scannedCount, color: 'text-emerald-400' },
                                { label: 'Cached', val: stats.stats?.cachedCount, color: 'text-muted-foreground' }
                            ].map((s, i) => (
                                <div key={i} className="p-5 rounded-2xl bg-muted/5 border border-border/40 text-center">
                                    <div className={cn("text-2xl font-black mb-1", s.color)}>{s.val ?? 0}</div>
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="rounded-3xl border border-border/40 bg-muted/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/40 bg-muted/20">
                                        <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Wallet</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Risk</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Behavioral Indicators</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Utility</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {wallets.map((wallet, idx) => (
                                        <tr key={wallet.address} className={cn(getRiskBgColor(wallet.riskScore), "hover:bg-muted/30 transition-colors group")}>
                                            <td className="px-6 py-5 text-xs font-mono text-muted-foreground">#{(idx + 1).toString().padStart(2, '0')}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <code className="text-sm font-mono text-foreground">{wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}</code>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {wallet.scanSkipped ? (
                                                    <span className="text-[10px] text-muted-foreground font-bold">—</span>
                                                ) : (
                                                    <span className={cn("text-sm font-black", getRiskColor(wallet.riskScore))}>{wallet.riskScore}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {wallet.labels.length > 0 ? (
                                                        wallet.labels.slice(0, 3).map(l => (
                                                            <span key={l} className="px-2 py-0.5 text-[9px] font-black rounded uppercase bg-destructive/10 text-destructive border border-destructive/20">
                                                                {l.replace('_', ' ')}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[9px] font-black rounded uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Neutral</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => copyAddress(wallet.address)}
                                                        className="p-1.5 rounded-lg hover:bg-background border border-transparent hover:border-border/60 text-muted-foreground hover:text-foreground transition-all"
                                                    >
                                                        {copiedAddress === wallet.address ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                                    </button>
                                                    <a
                                                        href={`https://solscan.io/account/${wallet.address}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 rounded-lg hover:bg-background border border-transparent hover:border-border/60 text-muted-foreground hover:text-foreground transition-all"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {isStreaming && (
                                        <tr className="animate-pulse bg-muted/5">
                                            <td colSpan={5} className="px-6 py-5">
                                                <div className="h-4 w-full bg-muted/20 rounded" />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {isComplete && wallets.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-3xl">
                            <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground/20" />
                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-1">No Cabal Detected</h3>
                            <p className="text-xs text-muted-foreground">No overlapping wallets found across the selected token pool.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
