'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, Copy, Check, ExternalLink, Users, Camera, History, Radio, Wifi } from 'lucide-react';
import type { ClusterMode, ClusterWallet } from '@/types/api';

interface ClusterAnalysisProps {
    className?: string;
}

interface StreamStats {
    tokenCount: number;
    mutualWalletCount: number;
    scannedCount: number;
    cachedCount: number;
    skippedCount: number;
}

interface TokenProgress {
    mint: string;
    count: number;
}

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
    if (score <= 25) return 'bg-emerald-500/10';
    if (score <= 50) return 'bg-yellow-500/10';
    if (score <= 75) return 'bg-orange-500/10';
    return 'bg-red-500/10';
}

export function ClusterAnalysis({ className }: ClusterAnalysisProps) {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<ClusterMode>('SNAPSHOT');
    const [wallets, setWallets] = useState<ClusterWallet[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
    const [stats, setStats] = useState<StreamStats | null>(null);
    const [tokenProgress, setTokenProgress] = useState<TokenProgress[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>('');

    const eventSourceRef = useRef<EventSource | null>(null);

    // Cleanup on unmount
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

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setIsStreaming(true);
        setStatusMessage('Connecting to stream...');

        // Build SSE URL with query params
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const url = `${baseUrl}/transparency/cluster/stream?mints=${mints.join(',')}&mode=${mode}`;

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setStatusMessage('Connected! Fetching token holders...');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'INIT':
                        setStatusMessage(`Analyzing ${data.data.tokenCount} tokens in ${data.data.mode} mode...`);
                        break;

                    case 'TOKEN_FETCHED':
                        setTokenProgress(prev => [...prev, {
                            mint: data.data.mint,
                            count: data.data.count
                        }]);
                        setStatusMessage(`Fetched ${data.data.count.toLocaleString()} addresses from token ${data.data.mint.slice(0, 8)}...`);
                        break;

                    case 'WALLET':
                        // Append wallet to list with animation
                        setWallets(prev => [...prev, data.data]);
                        setStatusMessage(`Analyzing wallet ${data.data.index}...`);
                        break;

                    case 'DONE':
                        setIsComplete(true);
                        setIsStreaming(false);
                        setStats({
                            tokenCount: data.data.tokenCount,
                            mutualWalletCount: data.data.mutualWalletCount,
                            scannedCount: data.data.stats?.scannedCount || 0,
                            cachedCount: data.data.stats?.cachedCount || 0,
                            skippedCount: data.data.stats?.skippedCount || 0,
                        });
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
                console.error('Failed to parse SSE event:', e);
            }
        };

        eventSource.onerror = () => {
            if (eventSource.readyState === EventSource.CLOSED) {
                // Normal close, ignore
                return;
            }
            setError('Connection lost. Please try again.');
            setIsStreaming(false);
            eventSource.close();
        };
    }, [input, mode]);

    const handleStop = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            setIsStreaming(false);
            setStatusMessage('Stopped');
        }
    }, []);

    const copyAddress = useCallback(async (address: string) => {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    }, []);

    return (
        <div className={className}>
            {/* Input Section */}
            <div className="space-y-4 mb-6">
                {/* Token Input */}
                <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                        Token Addresses (2-5 tokens, comma or newline separated)
                    </label>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\nJUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`}
                        rows={3}
                        disabled={isStreaming}
                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none font-mono text-sm disabled:opacity-50"
                    />
                </div>

                {/* Mode Toggle */}
                <div className="flex items-center gap-4">
                    <span className="text-sm text-foreground/80">Mode:</span>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                        <button
                            onClick={() => setMode('SNAPSHOT')}
                            disabled={isStreaming}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-all disabled:opacity-50 ${mode === 'SNAPSHOT'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-accent'
                                }`}
                        >
                            <Camera className="h-4 w-4" />
                            Current Holders
                        </button>
                        <button
                            onClick={() => setMode('HISTORY')}
                            disabled={isStreaming}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-all disabled:opacity-50 ${mode === 'HISTORY'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-accent'
                                }`}
                        >
                            <History className="h-4 w-4" />
                            Historical
                        </button>
                    </div>
                </div>

                {/* Analyze / Stop Button */}
                {isStreaming ? (
                    <button
                        onClick={handleStop}
                        className="w-full py-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Stop Streaming
                    </button>
                ) : (
                    <button
                        onClick={handleAnalyze}
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Search className="h-5 w-5" />
                        Find Mutual Wallets (Live Stream)
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Streaming Status */}
            {isStreaming && statusMessage && (
                <div className="mb-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-3">
                    <div className="relative">
                        <Radio className="h-5 w-5 text-violet-400 animate-pulse" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-violet-400">Streaming Results</p>
                        <p className="text-xs text-muted-foreground">{statusMessage}</p>
                    </div>
                    <Wifi className="h-5 w-5 text-emerald-400" />
                </div>
            )}

            {/* Token Progress */}
            {tokenProgress.length > 0 && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {tokenProgress.map((tp, i) => (
                        <div key={i} className="p-3 rounded-lg bg-card/50 border border-border/50 text-center">
                            <div className="text-lg font-bold text-foreground">{tp.count.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground truncate">{tp.mint.slice(0, 8)}...</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Results Table - Shows during and after streaming */}
            {(wallets.length > 0 || isStreaming) && (
                <div className="space-y-6">
                    {/* Stats Summary - Only shown when complete */}
                    {isComplete && stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <div className="text-2xl font-bold text-foreground">{stats.tokenCount}</div>
                                <div className="text-xs text-muted-foreground">Tokens Analyzed</div>
                            </div>
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <div className="text-2xl font-bold text-violet-400">{stats.mutualWalletCount}</div>
                                <div className="text-xs text-muted-foreground">Overlapping Wallets</div>
                            </div>
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <div className="text-2xl font-bold text-emerald-400">{stats.scannedCount}</div>
                                <div className="text-xs text-muted-foreground">Risk Scans</div>
                            </div>
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <div className="text-2xl font-bold text-muted-foreground">{stats.cachedCount}</div>
                                <div className="text-xs text-muted-foreground">From Cache</div>
                            </div>
                        </div>
                    )}

                    {/* Results Table */}
                    <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-card/50">
                                <tr className="text-left text-sm text-muted-foreground">
                                    <th className="px-4 py-3 font-medium">#</th>
                                    <th className="px-4 py-3 font-medium">Wallet</th>
                                    <th className="px-4 py-3 font-medium text-center">Risk Score</th>
                                    <th className="px-4 py-3 font-medium">Labels</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {wallets.map((wallet, index) => (
                                    <WalletRow
                                        key={wallet.address}
                                        wallet={wallet}
                                        index={index + 1}
                                        copiedAddress={copiedAddress}
                                        onCopy={copyAddress}
                                        isNew={index === wallets.length - 1 && isStreaming}
                                    />
                                ))}
                                {/* Skeleton row while streaming */}
                                {isStreaming && (
                                    <tr className="bg-muted/20 animate-pulse">
                                        <td className="px-4 py-3">
                                            <div className="h-4 w-4 bg-muted/40 rounded" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="h-4 w-32 bg-muted/40 rounded" />
                                        </td>
                                        <td className="px-4 py-3 flex justify-center">
                                            <div className="h-8 w-8 bg-muted/40 rounded-full" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <div className="h-5 w-16 bg-muted/40 rounded-full" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <div className="h-6 w-6 bg-muted/40 rounded" />
                                                <div className="h-6 w-6 bg-muted/40 rounded" />
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty state after complete */}
                    {isComplete && wallets.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No Overlapping Wallets Found</p>
                            <p className="text-sm mt-1">No wallets appear in 2 or more of the selected tokens</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface WalletRowProps {
    wallet: ClusterWallet;
    index: number;
    copiedAddress: string | null;
    onCopy: (address: string) => void;
    isNew?: boolean;
}

function WalletRow({ wallet, index, copiedAddress, onCopy, isNew }: WalletRowProps) {
    const truncatedAddress = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-6)}`;
    const isCopied = copiedAddress === wallet.address;

    return (
        <tr className={`${getRiskBgColor(wallet.riskScore)} transition-colors hover:bg-accent/50 ${isNew ? 'animate-in fade-in slide-in-from-left-2 duration-300' : ''}`}>
            <td className="px-4 py-3 text-sm text-muted-foreground">{index}</td>
            <td className="px-4 py-3">
                <code className="text-sm font-mono text-foreground">{truncatedAddress}</code>
            </td>
            <td className="px-4 py-3 text-center">
                {wallet.scanSkipped ? (
                    <span className="text-sm text-muted-foreground">—</span>
                ) : (
                    <span className={`text-lg font-bold ${getRiskColor(wallet.riskScore)}`}>
                        {wallet.riskScore}
                    </span>
                )}
            </td>
            <td className="px-4 py-3">
                {wallet.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {wallet.labels.slice(0, 3).map((label) => (
                            <span
                                key={label}
                                className="px-2 py-0.5 text-xs rounded-full bg-red-500/15 text-red-400 border border-red-500/20"
                            >
                                {label.replace('_', ' ')}
                            </span>
                        ))}
                        {wallet.labels.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-muted-foreground">
                                +{wallet.labels.length - 3}
                            </span>
                        )}
                    </div>
                ) : wallet.riskScore >= 0 ? (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        CLEAN
                    </span>
                ) : null}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onCopy(wallet.address)}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy address"
                    >
                        {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                        href={`https://solscan.io/account/${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="View on Solscan"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </td>
        </tr>
    );
}

export default ClusterAnalysis;
