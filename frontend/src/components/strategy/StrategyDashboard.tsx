'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, ArrowRight, ChevronUp, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUserAssets } from '@/hooks/useUserAssets';
import type { Strategy } from '@/types/api';

interface StrategyDashboardProps {
    onCreate: () => void;
    strategies?: Strategy[];
    isLoading?: boolean;
}

export function StrategyDashboard({
    onCreate,
    strategies = [],
    isLoading = false
}: StrategyDashboardProps) {
    const { connected } = useWallet();
    const { assets, loading: isLoadingAssets } = useUserAssets();
    const [assetsExpanded, setAssetsExpanded] = useState(true);
    const [strategiesExpanded, setStrategiesExpanded] = useState(true);

    const activeStrategies = strategies.filter(s => s.status === 'active' || s.status === 'triggered');

    return (
        <div className="flex flex-col h-full bg-[#0E0E10] p-4">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-white tracking-tight">MAIN MENU</h2>
            </div>

            {/* Your Assets Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl mb-4 overflow-hidden">
                <button
                    onClick={() => setAssetsExpanded(!assetsExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm font-medium text-white">Your Assets</span>
                        {assets.length > 0 && (
                            <span className="bg-purple-600/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">
                                {assets.length}
                            </span>
                        )}
                    </div>
                    {assetsExpanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                </button>

                {assetsExpanded && (
                    <div className="px-4 pb-4 space-y-3 max-h-[250px] overflow-y-auto">
                        {!connected ? (
                            <p className="text-sm text-zinc-500 text-center py-2">Connect wallet to view assets</p>
                        ) : isLoadingAssets ? (
                            <div className="space-y-3 pt-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-7 w-7 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-4 w-12" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                ))}
                            </div>
                        ) : assets.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-4">No assets found</p>
                        ) : (
                            assets.map((asset) => (
                                <div
                                    key={asset.mint}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        {asset.logoURI ? (
                                            <img
                                                src={asset.logoURI}
                                                alt={asset.symbol}
                                                className="w-7 h-7 rounded-full"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-white">
                                                    {asset.symbol.slice(0, 2)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-white">{asset.symbol}</span>
                                            {asset.name && asset.name !== asset.symbol && (
                                                <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">{asset.name}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm text-zinc-300 font-mono">
                                        {asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Active Strategies Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl mb-4 overflow-hidden flex-1 min-h-0">
                <button
                    onClick={() => setStrategiesExpanded(!strategiesExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm font-medium text-white">Active Strategies</span>
                        {activeStrategies.length > 0 && (
                            <span className="bg-purple-600/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">
                                {activeStrategies.length}
                            </span>
                        )}
                    </div>
                    {strategiesExpanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                </button>

                {strategiesExpanded && (
                    <div className="px-4 pb-4 space-y-3 overflow-y-auto max-h-[300px]">
                        {isLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-[88px] w-full rounded-lg" />
                                ))}
                            </div>
                        ) : activeStrategies.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-4">No active strategies</p>
                        ) : (
                            activeStrategies.map((strategy) => (
                                <div
                                    key={strategy.id}
                                    className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">
                                                {strategy.name || strategy.fromToken?.slice(0, 6) || 'Token'}
                                                <ArrowRight className="h-3 w-3 inline mx-1 text-zinc-500" />
                                                {strategy.toToken?.slice(0, 6) || 'Token'}
                                            </span>
                                            {/* Boomerang Mode Badge */}
                                            {strategy.boomerangMode && (
                                                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-lg shadow-purple-900/30 flex items-center gap-1">
                                                    <span>🪃</span>
                                                    <span>ROUND TRIP</span>
                                                </span>
                                            )}
                                            {/* Leg 2 indicator for filled strategies that have flipped */}
                                            {strategy.status === 'filled' && (
                                                <span className="bg-cyan-600/20 text-cyan-400 text-[10px] px-2 py-0.5 rounded-full">
                                                    Leg 2
                                                </span>
                                            )}
                                            {/* Status dot */}
                                            <div className={`w-2 h-2 rounded-full ${strategy.status === 'active' ? 'bg-emerald-400' :
                                                strategy.status === 'filled' ? 'bg-cyan-400' : 'bg-yellow-400'
                                                }`} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-zinc-400">
                                            Trigger: <span className="text-purple-400">{strategy.triggerType || 'Price'}</span>
                                        </span>
                                        <span className="text-zinc-400">
                                            Status: <span className={
                                                strategy.status === 'active' ? 'text-emerald-400' :
                                                    strategy.status === 'filled' ? 'text-cyan-400' : 'text-yellow-400'
                                            }>{strategy.status === 'active' ? 'Active' :
                                                strategy.status === 'filled' ? 'Filled' : 'Triggered'}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Create Button */}
            <Button
                onClick={onCreate}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-900/30 transition-all"
            >
                <Plus className="h-5 w-5 mr-2" />
                Create New Strategy
            </Button>
        </div>
    );
}
