'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TokenSelectModal } from '@/components/token-select-modal';
import { ChartPlaceholder } from '@/components/chart-placeholder';
import { useTokens, type Token } from '@/hooks/useTokens';
import { useCreateStrategy } from '@/hooks/useCreateStrategy';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { toast } from 'sonner';
import {
  ChevronDown,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  Check,
  Info,
  Shield,
  DollarSign,
  Percent,
  ArrowDownUp,
  BarChart3,
  X
} from 'lucide-react';
// Smart contract integration - no longer using API types

interface StrategyBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const steps = [
  { id: 1, name: 'Details', icon: Info },
  { id: 2, name: 'Pair', icon: ArrowDownUp },
  { id: 3, name: 'Trigger', icon: Target },
  { id: 4, name: 'Amount', icon: DollarSign },
  { id: 5, name: 'Review', icon: Check },
];

export function StrategyBuilderModal({ open, onClose, onSuccess }: StrategyBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { popularTokens } = useTokens();
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { createStrategy, isLoading: isCreatingStrategy } = useCreateStrategy();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [triggerType, setTriggerType] = useState<'price' | 'marketCap'>('price');
  const [triggerValue, setTriggerValue] = useState('');
  const [amountType, setAmountType] = useState<'percentage' | 'fixed'>('percentage');
  const [amount, setAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const [showFromTokenModal, setShowFromTokenModal] = useState(false);
  const [showToTokenModal, setShowToTokenModal] = useState(false);
  const [showChartsOverlay, setShowChartsOverlay] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'sell' | 'buy'>('sell');

  // Initialize tokens when popularTokens are loaded
  useEffect(() => {
    if (popularTokens.length > 0 && !fromToken) {
      setFromToken(popularTokens[0]);
    }
    if (popularTokens.length > 1 && !toToken) {
      setToToken(popularTokens[1]);
    }
  }, [popularTokens, fromToken, toToken]);

  // Fetch token balance when fromToken changes (not just for percentage type)
  useEffect(() => {
    if (publicKey && fromToken && open) {
      fetchTokenBalance();
    }
  }, [publicKey, fromToken, open]);

  const fetchTokenBalance = async () => {
    if (!publicKey || !fromToken) return;

    setIsLoadingBalance(true);
    try {
      const tokenAddress = fromToken.address || fromToken.id;

      if (!tokenAddress) {
        setTokenBalance(null);
        return;
      }

      // Check if it's native SOL
      const solAddresses = ['So11111111111111111111111111111111111111112', 'SOL', 'sol'];

      if (solAddresses.includes(tokenAddress)) {
        // Fetch SOL balance
        const balance = await connection.getBalance(publicKey);
        setTokenBalance(balance / LAMPORTS_PER_SOL);
      } else {
        // Fetch SPL token balance
        try {
          const mintPubkey = new PublicKey(tokenAddress);
          const tokenAccount = await getAssociatedTokenAddress(mintPubkey, publicKey);
          const accountInfo = await getAccount(connection, tokenAccount);
          setTokenBalance(Number(accountInfo.amount) / Math.pow(10, fromToken.decimals || 9));
        } catch (error) {
          // Token account might not exist
          setTokenBalance(0);
        }
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setTokenBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Calculate actual amount from percentage
  const getCalculatedAmount = () => {
    if (amountType === 'percentage' && amount && tokenBalance !== null) {
      const percentage = parseFloat(amount);
      if (!isNaN(percentage)) {
        return (tokenBalance * percentage) / 100;
      }
    }
    return null;
  };

  const resetForm = () => {
    setCurrentStep(1);
    setName('');
    setDescription('');
    setFromToken(popularTokens.length > 0 ? popularTokens[0] : null);
    setToToken(popularTokens.length > 1 ? popularTokens[1] : null);
    setTriggerType('price');
    setTriggerValue('');
    setAmountType('percentage');
    setAmount('');
    setStopLoss('');
    setTakeProfit('');
    setIsSubmitting(false);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return name.trim().length > 0;
      case 2: return fromToken && toToken && (fromToken.address !== toToken.address && fromToken.id !== toToken.id);
      case 3: return triggerValue && parseFloat(triggerValue) > 0;
      case 4: {
        const amountValue = parseFloat(amount);
        if (!amount || amountValue <= 0) return false;
        // For percentage, ensure it doesn't exceed 100%
        if (amountType === 'percentage' && amountValue > 100) return false;
        return true;
      }
      default: return true;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!fromToken || !toToken) {
      toast.error('Please select both tokens');
      return;
    }

    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call smart contract directly via the hook
      await createStrategy({
        sellToken: fromToken,
        buyToken: toToken,
        triggerPrice: parseFloat(triggerValue),
        amount: parseFloat(amount),
        amountType,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        name: name,
        description: description || undefined,
        onMetadataSynced: onSuccess, // Refresh list after name is synced
      });

      // Show indexing toast and wait for backend to sync
      toast.info('Strategy created! Indexing...');
      resetForm();
      onClose();

      // Wait 2 seconds for the indexer to save to DB, then refresh the list
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (error) {
      // Error handling is done in the hook
      console.log('Strategy creation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Strategy Name *</Label>
              <Input
                id="name"
                placeholder="e.g., SOL Buy the Dip"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-11"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Choose a memorable name for your strategy
              </p>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your strategy goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 min-h-[100px] resize-none"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">From (Sell)</Label>
              <button
                onClick={() => setShowFromTokenModal(true)}
                type="button"
                className="w-full mt-1.5 flex items-center justify-between p-3 sm:p-3 h-auto min-h-[3.5rem] rounded-lg border bg-background hover:bg-accent transition-colors"
              >
                {fromToken ? (
                  <div className="flex items-center gap-3">
                    {(fromToken.logoURI || fromToken.icon) ? (
                      <img
                        src={fromToken.logoURI || fromToken.icon}
                        alt={fromToken.symbol}
                        className="w-9 h-9 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary';
                            fallback.textContent = fromToken.symbol.charAt(0);
                            parent.insertBefore(fallback, e.target as HTMLImageElement);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {fromToken.symbol.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="font-medium text-sm">{fromToken.symbol}</div>
                      <div className="text-xs text-muted-foreground">{fromToken.name}</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Select token</span>
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {fromToken && (
                <div className="mt-2 text-sm">
                  {isLoadingBalance ? (
                    <span className="text-muted-foreground">Loading balance...</span>
                  ) : tokenBalance !== null ? (
                    <span className="text-muted-foreground">
                      Available: <span className="font-medium text-foreground">{tokenBalance.toFixed(4)} {fromToken.symbol}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Balance unavailable</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-center py-2">
              <div className="w-8 h-8 rounded-full border bg-muted flex items-center justify-center">
                <ArrowDownUp className="w-4 h-4" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">To (Buy)</Label>
              <button
                onClick={() => setShowToTokenModal(true)}
                type="button"
                className="w-full mt-1.5 flex items-center justify-between p-3 sm:p-3 h-auto min-h-[3.5rem] rounded-lg border bg-background hover:bg-accent transition-colors"
              >
                {toToken ? (
                  <div className="flex items-center gap-3">
                    {(toToken.logoURI || toToken.icon) ? (
                      <img
                        src={toToken.logoURI || toToken.icon}
                        alt={toToken.symbol}
                        className="w-9 h-9 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary';
                            fallback.textContent = toToken.symbol.charAt(0);
                            parent.insertBefore(fallback, e.target as HTMLImageElement);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {toToken.symbol.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="font-medium text-sm">{toToken.symbol}</div>
                      <div className="text-xs text-muted-foreground">{toToken.name}</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Select token</span>
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {fromToken && toToken && (fromToken.address === toToken.address || fromToken.id === toToken.id) && (
              <Alert variant="destructive">
                <AlertDescription>
                  Please select different tokens
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Trigger Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <Button
                  type="button"
                  variant={triggerType === 'price' ? 'default' : 'outline'}
                  onClick={() => setTriggerType('price')}
                  className="h-auto py-3 sm:py-3 flex flex-col gap-1 min-h-[3.5rem]"
                >
                  <DollarSign className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="text-sm">Price</span>
                </Button>
                <Button
                  type="button"
                  variant={triggerType === 'marketCap' ? 'default' : 'outline'}
                  onClick={() => setTriggerType('marketCap')}
                  className="h-auto py-3 sm:py-3 flex flex-col gap-1 min-h-[3.5rem]"
                >
                  <TrendingUp className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="text-sm">Market Cap</span>
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="triggerValue" className="text-sm font-medium">
                Target {triggerType === 'price' ? 'Price' : 'Market Cap'} (USD) *
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="triggerValue"
                  type="number"
                  placeholder="0.00"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  className="pl-7 h-11"
                  step="any"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stopLoss" className="text-xs font-medium">Stop Loss (Optional)</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                  <Input
                    id="stopLoss"
                    type="number"
                    placeholder="0.00"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="pl-6 text-sm h-10"
                    step="any"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="takeProfit" className="text-xs font-medium">Take Profit (Optional)</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                  <Input
                    id="takeProfit"
                    type="number"
                    placeholder="0.00"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="pl-6 text-sm h-10"
                    step="any"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        const calculatedAmount = getCalculatedAmount();
        const hasInsufficientBalance = amountType === 'percentage'
          ? (tokenBalance !== null && calculatedAmount !== null && calculatedAmount > tokenBalance)
          : (tokenBalance !== null && parseFloat(amount || '0') > tokenBalance);

        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Amount Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <Button
                  type="button"
                  variant={amountType === 'percentage' ? 'default' : 'outline'}
                  onClick={() => setAmountType('percentage')}
                  className="h-auto py-3 sm:py-3 flex flex-col gap-1 min-h-[3.5rem]"
                >
                  <Percent className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="text-sm">Percentage</span>
                </Button>
                <Button
                  type="button"
                  variant={amountType === 'fixed' ? 'default' : 'outline'}
                  onClick={() => setAmountType('fixed')}
                  className="h-auto py-3 sm:py-3 flex flex-col gap-1 min-h-[3.5rem]"
                >
                  <DollarSign className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="text-sm">Fixed</span>
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="amount" className="text-sm font-medium">Amount *</Label>

              {amountType === 'percentage' && (
                <div className="flex gap-2 mt-1.5 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount('5')}
                    className="flex-1 h-8 text-xs"
                  >
                    5%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount('10')}
                    className="flex-1 h-8 text-xs"
                  >
                    10%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount('25')}
                    className="flex-1 h-8 text-xs"
                  >
                    25%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount('50')}
                    className="flex-1 h-8 text-xs"
                  >
                    50%
                  </Button>
                </div>
              )}

              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const currentValue = parseFloat(amount || '0');
                    const newValue = Math.max(0, currentValue - 1);
                    setAmount(newValue.toString());
                  }}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="h-10 w-10 shrink-0"
                >
                  <span className="text-lg">−</span>
                </Button>

                <div className="relative flex-1">
                  <Input
                    id="amount"
                    type="number"
                    placeholder={amountType === 'percentage' ? '25' : '1.0'}
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (amountType === 'percentage') {
                        // Limit percentage to 100
                        const numValue = parseFloat(value);
                        if (value === '' || (numValue >= 0 && numValue <= 100)) {
                          setAmount(value);
                        }
                      } else {
                        // Allow any positive number for fixed
                        if (value === '' || parseFloat(value) >= 0) {
                          setAmount(value);
                        }
                      }
                    }}
                    className="pr-14 h-10"
                    step={amountType === 'percentage' ? '1' : 'any'}
                    min="0"
                    max={amountType === 'percentage' ? '100' : undefined}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    {amountType === 'percentage' ? '%' : (fromToken?.symbol || 'tokens')}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const currentValue = parseFloat(amount || '0');
                    const newValue = amountType === 'percentage'
                      ? Math.min(100, currentValue + 1)
                      : currentValue + 1;
                    setAmount(newValue.toString());
                  }}
                  disabled={amountType === 'percentage' && parseFloat(amount || '0') >= 100}
                  className="h-10 w-10 shrink-0"
                >
                  <span className="text-lg">+</span>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-1.5">
                {amountType === 'percentage' ? (
                  <>
                    {amount || '0'}% of your {fromToken?.symbol || 'token'} balance
                    {isLoadingBalance ? (
                      <span className="ml-1">(loading...)</span>
                    ) : tokenBalance !== null && calculatedAmount !== null ? (
                      <span className="ml-1 font-medium text-foreground">
                        = {calculatedAmount.toFixed(6)} {fromToken?.symbol}
                      </span>
                    ) : tokenBalance === 0 ? (
                      <span className="ml-1 text-orange-500">(no balance)</span>
                    ) : null}
                  </>
                ) : (
                  <>
                    Exactly {amount || '0'} {fromToken?.symbol || 'tokens'}
                    {tokenBalance !== null && (
                      <span className="ml-1">
                        (Available: {tokenBalance.toFixed(6)} {fromToken?.symbol})
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            {hasInsufficientBalance && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Amount exceeds available balance. Please add more {fromToken?.symbol || 'tokens'} to your wallet or reduce the amount before the strategy triggers.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Strategy Name</div>
                <div className="text-lg font-semibold">{name}</div>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trading Pair</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{fromToken?.symbol || '?'}</Badge>
                    <ArrowRight className="w-3 h-3" />
                    <Badge variant="outline">{toToken?.symbol || '?'}</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trigger Type</span>
                  <span className="font-medium capitalize">{triggerType}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Target Value</span>
                  <span className="font-medium">${triggerValue}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trade Amount</span>
                  <span className="font-medium">
                    {amount}{amountType === 'percentage' ? '%' : ''} {fromToken?.symbol || 'tokens'}
                  </span>
                </div>

                {(stopLoss || takeProfit) && (
                  <>
                    <Separator />
                    {stopLoss && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" />
                          Stop Loss
                        </span>
                        <span className="font-medium">${stopLoss}</span>
                      </div>
                    )}
                    {takeProfit && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Take Profit
                        </span>
                        <span className="font-medium">${takeProfit}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Strategy will activate immediately and monitor 24/7
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[620px] max-h-[92vh] flex flex-col p-0 gap-0 rounded-xl border border-border/60 bg-gradient-to-br from-background/95 via-background/90 to-background/80 backdrop-blur-xl shadow-2xl shadow-black/30 dark:shadow-black/40"
        >
          {/* Header */}
          <DialogHeader className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 relative">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <DialogTitle className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary shadow-inner shadow-primary/30">
                    {currentStep}
                  </span>
                  Create Strategy
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm flex items-center gap-1">
                  <span className="text-muted-foreground">Step {currentStep} of {steps.length}</span>
                  <span className="hidden sm:inline text-muted-foreground">• {steps[currentStep - 1].name}</span>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChartsOverlay(true)}
                  className="hidden sm:inline-flex items-center gap-2 text-xs hover:bg-accent/60"
                >
                  <BarChart3 className="w-4 h-4" />
                  Charts
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="sm:hidden px-2 text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="px-5 sm:px-8 pb-3">
            <ol className="flex items-center justify-between gap-1">
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <li key={step.id} className="flex-1 group flex flex-col items-center">
                    <button
                      type="button"
                      disabled={step.id > currentStep || isSubmitting}
                      onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                      className={`relative flex items-center justify-center h-9 w-9 rounded-full border transition-all duration-300 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed ${isCompleted
                        ? 'bg-primary text-primary-foreground border-primary shadow-primary/40'
                        : isActive
                          ? 'bg-gradient-to-br from-primary/90 to-primary border-primary text-primary-foreground ring-4 ring-primary/20'
                          : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                        }`}
                      aria-label={`Step ${step.id}: ${step.name}`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                    </button>
                    <span
                      className={`mt-2 text-[10px] sm:text-xs font-medium tracking-wide ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                    >
                      {step.name}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <Separator className="opacity-60" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 sm:py-6 space-y-6 max-h-[calc(92vh-220px)] custom-scrollbar">
            {renderStep()}
          </div>

          <Separator className="opacity-60" />

          {/* Footer */}
          <DialogFooter className="px-5 sm:px-8 py-4 sm:py-5 bg-gradient-to-b from-background/40 to-background/70 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? handleClose : handleBack}
                disabled={isSubmitting}
                className="h-11 sm:h-12 flex-1 sm:flex-[0.4] border-border/70 hover:border-primary/50"
              >
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </Button>
              <Button
                type="button"
                onClick={currentStep === steps.length ? handleSubmit : handleNext}
                disabled={!canProceed() || isSubmitting}
                className="relative h-11 sm:h-12 flex-1 sm:flex-[0.6] font-semibold bg-gradient-to-r from-primary/90 via-primary to-indigo-600 hover:from-primary hover:to-indigo-500 shadow-lg shadow-primary/30 hover:shadow-primary/40 group"
              >
                <span className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/30 to-indigo-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : currentStep === steps.length ? (
                  'Launch Strategy'
                ) : (
                  'Next Step'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TokenSelectModal
        open={showFromTokenModal}
        onClose={() => setShowFromTokenModal(false)}
        onSelectToken={(token) => {
          setFromToken(token);
          setShowFromTokenModal(false);
        }}
        selectedToken={fromToken ?? undefined}
      />
      <TokenSelectModal
        open={showToTokenModal}
        onClose={() => setShowToTokenModal(false)}
        onSelectToken={(token) => {
          setToToken(token);
          setShowToTokenModal(false);
        }}
        selectedToken={toToken ?? undefined}
      />

      {/* Charts Overlay for Mobile */}
      {showChartsOverlay && (
        <div className="fixed inset-0 z-[60] bg-background">
          {/* Header */}
          <div className="sticky top-0 z-10 backdrop-blur-lg bg-background/80 border-b border-border/50">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-lg font-bold font-display">Charts</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChartsOverlay(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/50">
              <button
                onClick={() => setActiveChartTab('sell')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeChartTab === 'sell'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Sell Chart ({fromToken?.symbol || 'SOL'})
              </button>
              <button
                onClick={() => setActiveChartTab('buy')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeChartTab === 'buy'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Buy Chart ({toToken?.symbol || 'USDC'})
              </button>
            </div>
          </div>

          {/* Chart Content */}
          <div className="p-4">
            <ChartPlaceholder
              type={activeChartTab}
              token={activeChartTab === 'sell' ? fromToken : toToken}
            />
          </div>
        </div>
      )}
    </>
  );
}
