'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TokenSelectModal } from '@/components/token-select-modal';
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
  ArrowDownUp
} from 'lucide-react';
// Smart contract integration - no longer using API types

interface StrategyFormSidebarProps {
  onTokenChange?: (fromToken: Token | null, toToken: Token | null) => void;
  onStrategyDataChange?: (data: {
    triggerValue?: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
  onStepChange?: (step: number) => void;
  onCancel?: () => void;
  onComplete?: () => void;
}

const steps = [
  { id: 1, name: 'Details', icon: Info },
  { id: 2, name: 'Pair', icon: ArrowDownUp },
  { id: 3, name: 'Trigger', icon: Target },
  { id: 4, name: 'Amount', icon: DollarSign },
  { id: 5, name: 'Review', icon: Check },
];

export function StrategyFormSidebar({
  onTokenChange,
  onStrategyDataChange,
  onStepChange,
  onCancel,
  onComplete,
}: StrategyFormSidebarProps) {
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

  // Don't auto-initialize tokens - let user select them manually in Step 2
  // This provides better UX and prevents unnecessary API calls

  // Notify parent when tokens change
  useEffect(() => {
    if (onTokenChange) {
      onTokenChange(fromToken, toToken);
    }
  }, [fromToken, toToken, onTokenChange]);

  // Notify parent when strategy data changes (for chart lines)
  useEffect(() => {
    if (onStrategyDataChange) {
      onStrategyDataChange({
        triggerValue: triggerValue ? parseFloat(triggerValue) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      });
    }
  }, [triggerValue, stopLoss, takeProfit, onStrategyDataChange]);

  // Notify parent when step changes
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  // Fetch token balance when fromToken changes
  useEffect(() => {
    if (publicKey && fromToken) {
      fetchTokenBalance();
    }
  }, [publicKey, fromToken]);

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
        const balance = await connection.getBalance(publicKey);
        setTokenBalance(balance / LAMPORTS_PER_SOL);
        return;
      }

      // For SPL tokens
      try {
        const tokenMint = new PublicKey(tokenAddress);
        const tokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);
        const accountInfo = await getAccount(connection, tokenAccount);
        const balance = Number(accountInfo.amount) / Math.pow(10, fromToken.decimals);
        setTokenBalance(balance);
      } catch (error) {
        console.log('Token account not found:', error);
        setTokenBalance(0);
      }
    } catch (error) {
      console.log('Error fetching token balance:', error);
      setTokenBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setName('');
    setDescription('');
    setFromToken(popularTokens[0] || null);
    setToToken(popularTokens[1] || null);
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
      case 2: return fromToken && toToken && fromToken.address !== toToken.address;
      case 3: return triggerValue && parseFloat(triggerValue) > 0;
      case 4: return amount && parseFloat(amount) > 0;
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
        direction: 'sell',  // Strategy is selling fromToken to buy toToken
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        name: name,
        description: description || undefined,
        onMetadataSynced: onComplete, // Refresh list after name is synced
      });

      // Show indexing toast and wait for backend to sync
      toast.info('Strategy created! Indexing...');
      resetForm();

      // Wait 2 seconds for the indexer to save to DB, then call onComplete
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (error) {
      // Error handling is done in the hook
      console.log('Strategy creation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCalculatedAmount = () => {
    if (!fromToken || !amount || !tokenBalance) return null;

    if (amountType === 'percentage') {
      return (parseFloat(amount) / 100) * tokenBalance;
    } else {
      return parseFloat(amount);
    }
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
                className="w-full mt-1.5 flex items-center justify-between p-3 h-auto min-h-[3.5rem] rounded-lg border bg-background hover:bg-accent transition-colors"
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
                className="w-full mt-1.5 flex items-center justify-between p-3 h-auto min-h-[3.5rem] rounded-lg border bg-background hover:bg-accent transition-colors"
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
                  className="h-auto py-3 flex flex-col gap-1 min-h-[3.5rem]"
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm">Price</span>
                </Button>
                <Button
                  type="button"
                  variant={triggerType === 'marketCap' ? 'default' : 'outline'}
                  onClick={() => setTriggerType('marketCap')}
                  className="h-auto py-3 flex flex-col gap-1 min-h-[3.5rem]"
                >
                  <TrendingUp className="w-5 h-5" />
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
                  className="h-auto py-3 flex flex-col gap-1 min-h-[3.5rem]"
                >
                  <Percent className="w-5 h-5" />
                  <span className="text-sm">Percentage</span>
                </Button>
                <Button
                  type="button"
                  variant={amountType === 'fixed' ? 'default' : 'outline'}
                  onClick={() => setAmountType('fixed')}
                  className="h-auto py-3 flex flex-col gap-1 min-h-[3.5rem]"
                >
                  <DollarSign className="w-5 h-5" />
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
                        const numValue = parseFloat(value);
                        if (value === '' || (numValue >= 0 && numValue <= 100)) {
                          setAmount(value);
                        }
                      } else {
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
      <div className="bg-card/80 backdrop-blur-xl rounded-xl border shadow-xl h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold font-display mb-2">Create Strategy</h2>
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].name}
          </p>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex gap-1">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${currentStep >= step.id
                    ? 'bg-primary'
                    : 'bg-muted'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-card/50 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={
                currentStep === 1
                  ? () => {
                    resetForm();
                    onCancel?.();
                  }
                  : handleBack
              }
              disabled={isSubmitting}
              className="flex-1 h-11"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>
            <Button
              type="button"
              onClick={currentStep === steps.length ? handleSubmit : handleNext}
              disabled={!canProceed() || isSubmitting}
              className="flex-1 h-11"
            >
              {isSubmitting || isCreatingStrategy ? (
                'Signing...'
              ) : currentStep === steps.length ? (
                'Create Strategy'
              ) : (
                'Next'
              )}
            </Button>
          </div>
        </div>
      </div>

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
    </>
  );
}
