'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TokenSelectModal } from '@/components/token-select-modal';
import { useTokens, type Token } from '@/hooks/useTokens';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useCreateStrategy } from '@/hooks/useCreateStrategy';
import { toast } from 'sonner';
import {
    ArrowLeft,
    ChevronDown,
    Zap,
    Shield,
    Target,
    Rocket,
    TrendingUp,
    TrendingDown,
    RotateCcw,
    Loader2,
    Info
} from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { parseHumanNumber, isValidHumanNumber } from '@/lib/parseHumanNumber';

interface CompactBuilderFormProps {
    onCancel: () => void;
    onComplete?: () => void;
    onTokenChange?: (fromToken: Token | null, toToken: Token | null) => void;
    onStrategyDataChange?: (data: {
        triggerValue?: number;
        stopLoss?: number;
        takeProfit?: number;
    }) => void;
}

export function CompactBuilderForm({
    onCancel,
    onComplete,
    onTokenChange,
    onStrategyDataChange,
}: CompactBuilderFormProps) {
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const { createStrategy, isLoading: isCreatingStrategy } = useCreateStrategy();

    // Form state - preserved from original
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [fromToken, setFromToken] = useState<Token | null>(null);
    const [toToken, setToToken] = useState<Token | null>(null);
    const [triggerType, setTriggerType] = useState<'price' | 'marketCap'>('price');
    const [triggerValue, setTriggerValue] = useState('');
    const [amountType] = useState<'percentage' | 'fixed'>('percentage');
    const [percentage, setPercentage] = useState(50); // Allocation percentage (0-100)
    const [amount, setAmount] = useState(''); // Calculated actual amount
    const [stopLossEnabled, setStopLossEnabled] = useState(false);
    const [stopLoss, setStopLoss] = useState('');
    const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
    const [takeProfit, setTakeProfit] = useState('');
    const [boomerangEnabled, setBoomerangEnabled] = useState(false);
    const [turboEnabled, setTurboEnabled] = useState(false);
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal states
    const [showFromTokenModal, setShowFromTokenModal] = useState(false);
    const [showToTokenModal, setShowToTokenModal] = useState(false);

    // Notify parent when tokens change
    useEffect(() => {
        if (onTokenChange) {
            onTokenChange(fromToken, toToken);
        }
    }, [fromToken, toToken, onTokenChange]);

    // Notify parent when strategy data changes
    useEffect(() => {
        if (onStrategyDataChange) {
            onStrategyDataChange({
                triggerValue: triggerValue ? parseFloat(triggerValue) : undefined,
                stopLoss: stopLossEnabled && stopLoss ? parseFloat(stopLoss) : undefined,
                takeProfit: takeProfitEnabled && takeProfit ? parseFloat(takeProfit) : undefined,
            });
        }
    }, [triggerValue, stopLoss, takeProfit, stopLossEnabled, takeProfitEnabled, onStrategyDataChange]);

    // Fetch token balance
    useEffect(() => {
        const fetchBalance = async () => {
            if (!publicKey || !fromToken) {
                setTokenBalance(null);
                return;
            }

            setIsLoadingBalance(true);
            try {
                if (fromToken.symbol === 'SOL') {
                    const balance = await connection.getBalance(publicKey);
                    setTokenBalance(balance / LAMPORTS_PER_SOL);
                } else {
                    // For SPL tokens, would need token account lookup
                    setTokenBalance(null);
                }
            } catch (error) {
                console.error('Failed to fetch balance:', error);
                setTokenBalance(null);
            } finally {
                setIsLoadingBalance(false);
            }
        };

        fetchBalance();
    }, [publicKey, fromToken, connection]);

    const handleSubmit = async () => {
        if (!fromToken || !toToken) {
            toast.error('Please select both tokens');
            return;
        }

        if (!publicKey) {
            toast.error('Please connect your wallet');
            return;
        }

        if (!triggerValue) {
            toast.error('Please enter a trigger price');
            return;
        }

        // Validate we have balance for percentage-based amounts
        if (amountType === 'percentage' && (tokenBalance === null || tokenBalance <= 0)) {
            toast.error('No balance available to create strategy');
            return;
        }

        setIsSubmitting(true);
        try {
            // ============================================
            // DIRECTION CALCULATION
            // If selling a stablecoin → We're BUYING the target token
            // If selling a volatile token → We're SELLING for stablecoin
            // ============================================
            const STABLECOINS = ['USDC', 'USDT', 'DAI', 'PYUSD', 'BUSD', 'TUSD'];
            const isSellingStablecoin = STABLECOINS.includes(fromToken.symbol.toUpperCase());
            const direction: 'buy' | 'sell' = isSellingStablecoin ? 'buy' : 'sell';

            console.log(`📊 Direction: ${direction.toUpperCase()} (From: ${fromToken.symbol} → To: ${toToken.symbol})`);

            // ============================================
            // MARKET CAP → PRICE CONVERSION
            // If user selected "marketCap" trigger type, convert to price
            // Price = MarketCap / TotalSupply
            // ============================================

            // Parse trigger value using human-readable parser (handles 1B, 100M, 50K, etc.)
            let parsedTriggerValue = parseHumanNumber(triggerValue);

            if (isNaN(parsedTriggerValue) || parsedTriggerValue <= 0) {
                toast.error('Invalid trigger value. Use formats like: 0.5, 1000, 1M, 1B, 50K');
                setIsSubmitting(false);
                return;
            }

            let finalTriggerPrice = parsedTriggerValue;
            if (triggerType === 'marketCap') {
                // For MC calculation, we need the total supply of the target token
                // If not available, show error
                const totalSupply = (toToken as any).totalSupply;
                if (!totalSupply || totalSupply <= 0) {
                    toast.error('Cannot calculate price from Market Cap - Token supply data missing');
                    setIsSubmitting(false);
                    return;
                }
                // Price = MarketCap / Supply
                finalTriggerPrice = parseFloat(triggerValue) / totalSupply;
                console.log(`📊 MarketCap Conversion: $${triggerValue} MC → $${finalTriggerPrice.toFixed(8)} Price`);
            }

            // ============================================
            // AMOUNT CALCULATION
            // The hook expects:
            // - For 'percentage': the percentage value (e.g., 50 for 50%)
            // - For 'fixed': the actual token amount (e.g., 0.5 for 0.5 SOL)
            // The hook will handle lamport conversion internally
            // ============================================
            let finalAmount: number;
            if (amountType === 'percentage') {
                // Pass the percentage directly - hook calculates from user balance
                finalAmount = percentage;
                console.log(`📊 Amount: ${percentage}% of ${tokenBalance} ${fromToken.symbol}`);
            } else {
                // Fixed amount - pass the raw token amount
                finalAmount = parseFloat(amount) || 0;
                console.log(`📊 Amount: ${finalAmount} ${fromToken.symbol} (fixed)`);
            }

            // Validate amount
            if (finalAmount <= 0) {
                toast.error('Amount must be greater than zero');
                setIsSubmitting(false);
                return;
            }

            console.log(`📊 Final Amount to Hook: ${finalAmount} (type: ${amountType})`);

            // ============================================
            // TAKE PROFIT / STOP LOSS CALCULATION
            // User enters PERCENTAGE (e.g., "10" for 10%)
            // We convert to ABSOLUTE PRICE: triggerPrice * (1 + percentage/100)
            // ============================================
            let finalTakeProfit: number | undefined = undefined;
            let finalStopLoss: number | undefined = undefined;

            if (takeProfitEnabled && takeProfit) {
                const tpPercentage = parseFloat(takeProfit);
                if (!isNaN(tpPercentage) && tpPercentage > 0) {
                    // TP is X% above trigger price
                    finalTakeProfit = finalTriggerPrice * (1 + tpPercentage / 100);
                    console.log(`📈 Take Profit: ${tpPercentage}% → $${finalTakeProfit.toFixed(6)}`);
                } else if (!isNaN(tpPercentage)) {
                    // If user entered a raw price (larger than 1), treat it as absolute
                    // Heuristic: if value > 1 and value > trigger, assume it's an absolute price
                    if (tpPercentage > finalTriggerPrice) {
                        finalTakeProfit = tpPercentage;
                        console.log(`📈 Take Profit (absolute): $${finalTakeProfit}`);
                    }
                }
            }

            if (stopLossEnabled && stopLoss) {
                const slPercentage = parseFloat(stopLoss);
                if (!isNaN(slPercentage) && slPercentage > 0) {
                    // SL is X% below trigger price
                    finalStopLoss = finalTriggerPrice * (1 - slPercentage / 100);
                    console.log(`📉 Stop Loss: ${slPercentage}% → $${finalStopLoss.toFixed(6)}`);
                } else if (!isNaN(slPercentage)) {
                    // If user entered a raw price, treat it as absolute
                    if (slPercentage < finalTriggerPrice && slPercentage > 0) {
                        finalStopLoss = slPercentage;
                        console.log(`📉 Stop Loss (absolute): $${finalStopLoss}`);
                    }
                }
            }

            // Validate TP/SL against trigger price
            if (finalTakeProfit !== undefined && finalTakeProfit <= finalTriggerPrice) {
                toast.error(`Take Profit ($${finalTakeProfit.toFixed(2)}) must be higher than Trigger Price ($${finalTriggerPrice.toFixed(2)})`);
                setIsSubmitting(false);
                return;
            }

            if (finalStopLoss !== undefined && finalStopLoss >= finalTriggerPrice) {
                toast.error(`Stop Loss ($${finalStopLoss.toFixed(2)}) must be lower than Trigger Price ($${finalTriggerPrice.toFixed(2)})`);
                setIsSubmitting(false);
                return;
            }

            console.log(`📊 Final TP: ${finalTakeProfit}, Final SL: ${finalStopLoss}`);

            await createStrategy({
                sellToken: fromToken,
                buyToken: toToken,
                direction,
                triggerPrice: finalTriggerPrice,
                amount: finalAmount,
                amountType,
                stopLoss: finalStopLoss,
                takeProfit: finalTakeProfit,
                boomerangMode: boomerangEnabled,
                name: name || `${fromToken.symbol} → ${toToken.symbol}`,
                description: description || undefined,
                onMetadataSynced: onComplete,
            });

            toast.info('Strategy created! Indexing...');

            setTimeout(() => {
                onComplete?.();
            }, 2000);
        } catch (error) {
            console.log('Strategy creation failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCalculatedAmount = () => {
        if (!fromToken || !amount || !tokenBalance) return null;
        return (parseFloat(amount) / 100) * tokenBalance;
    };

    return (
        <div className="flex flex-col h-full bg-[#0E0E10]">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                <button
                    onClick={onCancel}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-zinc-400" />
                </button>
                <h2 className="text-lg font-semibold text-white tracking-tight">STRATEGY BUILDER</h2>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Section 1: Strategy Details */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Strategy Details</span>
                    </div>

                    <div>
                        <Label className="text-xs text-zinc-400 mb-1">Strategy Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., SOL Moon Strategy"
                            className="bg-zinc-950 border-zinc-800 h-9 text-sm"
                        />
                    </div>

                    <div>
                        <Label className="text-xs text-zinc-400 mb-1">Description (Optional)</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of your strategy..."
                            className="bg-zinc-950 border-zinc-800 text-sm min-h-[60px] resize-none"
                        />
                    </div>
                </div>

                {/* Section 2: Assets */}
                <div className="bg-[#131316] border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Section 1 - Assets</span>
                    </div>

                    {/* Token Selection Row */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* FROM Token */}
                        <div>
                            <Label className="text-xs text-zinc-400 mb-1">FROM:</Label>
                            <button
                                onClick={() => setShowFromTokenModal(true)}
                                className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 hover:border-zinc-700 transition-colors"
                            >
                                {fromToken ? (
                                    <div className="flex items-center gap-2">
                                        {(fromToken.logoURI || fromToken.icon) ? (
                                            <img
                                                src={fromToken.logoURI || fromToken.icon}
                                                alt={fromToken.symbol}
                                                className="w-5 h-5 rounded-full"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-white">{fromToken.symbol[0]}</span>
                                            </div>
                                        )}
                                        <span className="text-sm text-white">{fromToken.symbol}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-zinc-500">Select</span>
                                )}
                                <ChevronDown className="h-4 w-4 text-zinc-500" />
                            </button>
                        </div>

                        {/* TO Token */}
                        <div>
                            <Label className="text-xs text-zinc-400 mb-1">TO:</Label>
                            <button
                                onClick={() => setShowToTokenModal(true)}
                                className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 hover:border-zinc-700 transition-colors"
                            >
                                {toToken ? (
                                    <div className="flex items-center gap-2">
                                        {(toToken.logoURI || toToken.icon) ? (
                                            <img
                                                src={toToken.logoURI || toToken.icon}
                                                alt={toToken.symbol}
                                                className="w-5 h-5 rounded-full"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-white">{toToken.symbol[0]}</span>
                                            </div>
                                        )}
                                        <span className="text-sm text-white">{toToken.symbol}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-zinc-500">Select</span>
                                )}
                                <ChevronDown className="h-4 w-4 text-zinc-500" />
                            </button>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <Label className="text-xs text-zinc-400 mb-1">Amount:</Label>
                            <Input
                                type="text"
                                value={tokenBalance !== null ? (tokenBalance * percentage / 100).toLocaleString(undefined, { maximumFractionDigits: 6 }) : ''}
                                readOnly
                                placeholder="0.00"
                                className="bg-zinc-950 border-zinc-800 h-9 text-sm font-mono"
                            />
                        </div>
                        {tokenBalance !== null && (
                            <div className="text-right">
                                <span className="text-xs text-zinc-400">Balance:</span>
                                <p className="text-sm text-white font-mono">{tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {fromToken?.symbol}</p>
                            </div>
                        )}
                    </div>

                    {/* Allocation Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-zinc-400">Allocation:</Label>
                            <span className="text-sm font-semibold text-cyan-400">{percentage}%</span>
                        </div>

                        {/* Custom Slider Container */}
                        <div className="relative">
                            <Slider
                                value={[percentage]}
                                onValueChange={(val: number[]) => setPercentage(val[0])}
                                min={0}
                                max={100}
                                step={1}
                                className="w-full"
                            />
                        </div>

                        {/* Quick Percentage Buttons */}
                        <div className="flex gap-2">
                            {[25, 50, 75, 100].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => setPercentage(pct)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${percentage === pct
                                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                        }`}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>

                        {/* Calculated Amount Display */}
                        {tokenBalance !== null && tokenBalance > 0 && (
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 flex items-center justify-between">
                                <span className="text-xs text-zinc-400">You will swap:</span>
                                <span className="text-sm font-mono text-white">
                                    {(tokenBalance * percentage / 100).toLocaleString(undefined, { maximumFractionDigits: 6 })} {fromToken?.symbol}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 2: Trigger & Risk Controls */}
                <div className="bg-[#131316] border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Section 2 - Trigger & Risk Controls</span>
                    </div>

                    {/* Trigger Type Toggle */}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-zinc-400">Trigger Type:</Label>
                        <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                            <button
                                onClick={() => setTriggerType('price')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${triggerType === 'price'
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                Price
                            </button>
                            <button
                                onClick={() => setTriggerType('marketCap')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${triggerType === 'marketCap'
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                Market Cap
                            </button>
                        </div>
                    </div>

                    {/* Target Value */}
                    <div>
                        <Label className="text-xs text-zinc-400 mb-1">Target Value:</Label>
                        <Input
                            type="text"
                            value={triggerValue}
                            onChange={(e) => setTriggerValue(e.target.value)}
                            placeholder={triggerType === 'price' ? '$0.00' : '$450M'}
                            className="bg-zinc-950 border-zinc-800 h-9 text-sm"
                        />
                    </div>

                    {/* Take Profit / Stop Loss Box */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-3">
                        <p className="text-xs text-zinc-400 font-medium">Take Profit / Stop Loss for {toToken?.symbol || 'Token'}</p>

                        {/* Take Profit */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                                <span className="text-sm text-white">Take Profit:</span>
                            </div>
                            <Switch
                                checked={takeProfitEnabled}
                                onCheckedChange={setTakeProfitEnabled}
                            />
                        </div>
                        {takeProfitEnabled && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400">Profit (%):</span>
                                    <Input
                                        type="text"
                                        value={takeProfit}
                                        onChange={(e) => setTakeProfit(e.target.value)}
                                        placeholder="e.g. 10"
                                        className="bg-zinc-950 border-zinc-800 h-8 text-sm flex-1"
                                    />
                                </div>
                                {/* Dynamic Price Preview */}
                                {takeProfit && triggerValue && parseFloat(takeProfit) > 0 && (
                                    <p className="text-xs text-emerald-400 font-mono pl-1">
                                        → Target: ${(parseFloat(triggerValue) * (1 + parseFloat(takeProfit) / 100)).toFixed(4)}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Stop Loss */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-400" />
                                <span className="text-sm text-white">Stop Loss:</span>
                            </div>
                            <Switch
                                checked={stopLossEnabled}
                                onCheckedChange={setStopLossEnabled}
                            />
                        </div>
                        {stopLossEnabled && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400">Loss (%):</span>
                                    <Input
                                        type="text"
                                        value={stopLoss}
                                        onChange={(e) => setStopLoss(e.target.value)}
                                        placeholder="e.g. 20"
                                        className="bg-zinc-950 border-zinc-800 h-8 text-sm flex-1"
                                    />
                                </div>
                                {/* Dynamic Price Preview */}
                                {stopLoss && triggerValue && parseFloat(stopLoss) > 0 && (
                                    <p className="text-xs text-red-400 font-mono pl-1">
                                        → Exit at: ${(parseFloat(triggerValue) * (1 - parseFloat(stopLoss) / 100)).toFixed(4)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 4: Boomerang Mode */}
                <div className={`border rounded-xl p-4 space-y-3 transition-colors ${boomerangEnabled
                    ? 'bg-cyan-950/10 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.05)]'
                    : 'bg-[#131316] border-zinc-800'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <RotateCcw className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Section 3 - Boomerang Mode</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white font-medium">BOOMERANG:</p>
                            <p className="text-xs text-zinc-400">Safety Landing</p>
                        </div>
                        <Switch
                            checked={boomerangEnabled}
                            onCheckedChange={setBoomerangEnabled}
                        />
                    </div>

                    {boomerangEnabled && (
                        <div className="mt-2 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                            <p className="text-xs text-cyan-400 font-medium">🪃 Round Trip Active</p>
                            <p className="text-[10px] text-zinc-500 mt-1">
                                After TP/SL triggers, strategy will flip tokens and reset to Active.
                            </p>
                            {/* Max Deviation - Coming Soon (Not connected to contract yet)
                            <div className="flex items-center gap-3 mt-2 opacity-50">
                                <span className="text-xs text-zinc-400">Max Deviation:</span>
                                <span className="text-xs text-zinc-500">Coming Soon</span>
                            </div>
                            */}
                        </div>
                    )}
                </div>

                {/* Section 5: Execution */}
                <div className="bg-[#131316] border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Rocket className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Section 4 - Execution</span>
                    </div>

                    <div className="flex items-center justify-between opacity-50">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-white">Priority Fee:</span>
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Coming Soon</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-500">Normal</span>
                            <Switch
                                checked={false}
                                disabled={true}
                                className="opacity-50"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500 opacity-50">
                        <Shield className="h-3 w-3" />
                        <span>PnL Simulation: <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Coming Soon</span></span>
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-400">
                        Swap: <span className="text-white">{fromToken?.symbol || '--'}</span> → <span className="text-white">{toToken?.symbol || '--'}</span> |
                        Trigger: <span className="text-cyan-400">{triggerType === 'price' ? 'Price' : 'MCap'}</span> |
                        TP: <span className="text-emerald-400">{takeProfitEnabled ? 'ON' : 'Off'}</span> |
                        SL: <span className="text-red-400">{stopLossEnabled ? 'ON' : 'Off'}</span> |
                        Mode: <span className="text-cyan-400">{boomerangEnabled ? 'Boomerang' : 'Standard'}</span>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isCreatingStrategy || !fromToken || !toToken || !triggerValue}
                    className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50"
                >
                    {isSubmitting || isCreatingStrategy ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Deploying...
                        </>
                    ) : (
                        <>
                            <Rocket className="h-5 w-5 mr-2" />
                            Deploy {boomerangEnabled ? 'Boomerang ' : ''}Strategy
                        </>
                    )}
                </Button>
            </div>

            {/* Token Modals */}
            <TokenSelectModal
                open={showFromTokenModal}
                onClose={() => setShowFromTokenModal(false)}
                onSelectToken={(token) => {
                    setFromToken(token);
                    setShowFromTokenModal(false);
                }}
                selectedToken={fromToken || undefined}
            />
            <TokenSelectModal
                open={showToTokenModal}
                onClose={() => setShowToTokenModal(false)}
                onSelectToken={(token) => {
                    setToToken(token);
                    setShowToTokenModal(false);
                }}
                selectedToken={toToken || undefined}
            />
        </div>
    );
}
