'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TokenSelectModal } from '@/components/token-select-modal';
import type { Token } from '@/lib/tokens';
import { POPULAR_TOKENS } from '@/lib/tokens';
import { ChevronDown, TrendingUp, Target, Zap, Info, CheckCircle2 } from 'lucide-react';
import type { CreateStrategyDto } from '@/types/api';
import { toast } from 'sonner';

interface StrategyBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (strategy: CreateStrategyDto) => Promise<void>;
}

export function StrategyBuilderModal({ open, onClose, onSubmit }: StrategyBuilderModalProps) {
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fromToken, setFromToken] = useState<Token>(POPULAR_TOKENS[0]); // SOL
  const [toToken, setToToken] = useState<Token>(POPULAR_TOKENS[1]); // USDC
  const [triggerType, setTriggerType] = useState<'price' | 'marketCap'>('price');
  const [triggerValue, setTriggerValue] = useState('');
  const [amountType, setAmountType] = useState<'percentage' | 'fixed'>('percentage');
  const [amount, setAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  
  const [showFromTokenModal, setShowFromTokenModal] = useState(false);
  const [showToTokenModal, setShowToTokenModal] = useState(false);

  const resetForm = () => {
    setStep('form');
    setName('');
    setDescription('');
    setFromToken(POPULAR_TOKENS[0]);
    setToToken(POPULAR_TOKENS[1]);
    setTriggerType('price');
    setTriggerValue('');
    setAmountType('percentage');
    setAmount('');
    setStopLoss('');
    setTakeProfit('');
    setIsSubmitting(false);
  };

  const handleNext = () => {
    if (!name || !triggerValue || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    setStep('summary');
  };

  const handleBack = () => {
    setStep('form');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const strategyDto: CreateStrategyDto = {
        name,
        description: description || undefined,
        fromToken: fromToken.address,
        toToken: toToken.address,
        triggerType,
        triggerValue: parseFloat(triggerValue),
        amountType,
        amount: parseFloat(amount),
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      };

      await onSubmit(strategyDto);
      resetForm();
      onClose();
    } catch (error) {
      console.log('Failed to create strategy:', error);
      toast.error('Failed to create strategy. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {step === 'form' ? 'Create Automation Strategy' : 'Review Strategy'}
            </DialogTitle>
            <DialogDescription>
              {step === 'form' 
                ? 'Set up automated trading rules based on price or market cap triggers'
                : 'Review your strategy details before creating'
              }
            </DialogDescription>
          </DialogHeader>

          {step === 'form' ? (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Strategy Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Buy BONK on dip"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Description (Optional)
                  </label>
                  <Input
                    placeholder="e.g., Buy when price drops below $0.01"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Token Selection */}
              <div className="space-y-4 p-4 rounded-xl bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Assets
                </h3>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Sell from (Long-term hold)
                  </label>
                  <button
                    onClick={() => setShowFromTokenModal(true)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {fromToken.symbol[0]}
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{fromToken.symbol}</div>
                        <div className="text-xs text-muted-foreground">{fromToken.name}</div>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Buy (Target token)
                  </label>
                  <button
                    onClick={() => setShowToTokenModal(true)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-green-500 flex items-center justify-center text-white font-bold text-sm">
                        {toToken.symbol[0]}
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{toToken.symbol}</div>
                        <div className="text-xs text-muted-foreground">{toToken.name}</div>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Trigger Conditions */}
              <div className="space-y-4 p-4 rounded-xl bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Trigger Condition
                </h3>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Trigger Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={triggerType === 'price' ? 'default' : 'outline'}
                      onClick={() => setTriggerType('price')}
                      className="rounded-xl"
                    >
                      Price
                    </Button>
                    <Button
                      variant={triggerType === 'marketCap' ? 'default' : 'outline'}
                      onClick={() => setTriggerType('marketCap')}
                      className="rounded-xl"
                    >
                      Market Cap
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Trigger Value <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    placeholder={triggerType === 'price' ? 'e.g., 150.5' : 'e.g., 1000000'}
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    className="rounded-xl"
                    step="any"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {triggerType === 'price' && `Execute when ${toToken.symbol} reaches this price in USD`}
                    {triggerType === 'marketCap' && `Execute when ${toToken.symbol} reaches this market cap in USD`}
                  </p>
                </div>
              </div>

              {/* Execution Settings */}
              <div className="space-y-4 p-4 rounded-xl bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Execution Settings
                </h3>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Amount Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={amountType === 'percentage' ? 'default' : 'outline'}
                      onClick={() => setAmountType('percentage')}
                      className="rounded-xl"
                    >
                      Percentage
                    </Button>
                    <Button
                      variant={amountType === 'fixed' ? 'default' : 'outline'}
                      onClick={() => setAmountType('fixed')}
                      className="rounded-xl"
                    >
                      Fixed Amount
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder={amountType === 'percentage' ? 'e.g., 25' : 'e.g., 1.5'}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="rounded-xl pr-16"
                      step="any"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {amountType === 'percentage' ? '%' : fromToken.symbol}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {amountType === 'percentage' 
                      ? `Sell ${amount}% of your ${fromToken.symbol} holdings`
                      : `Sell exactly ${amount} ${fromToken.symbol}`
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Stop Loss (Optional)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 140"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="rounded-xl"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Take Profit (Optional)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 180"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="rounded-xl"
                      step="any"
                    />
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">How it works:</p>
                  <p>
                    When {toToken.symbol} {triggerType === 'price' ? 'price' : 'market cap'} reaches{' '}
                    <strong className="text-foreground">{triggerValue || '_____'}</strong>, the system will automatically sell{' '}
                    <strong className="text-foreground">{amount || '_____'}</strong>
                    {amountType === 'percentage' ? '%' : ''} of your {fromToken.symbol} and buy {toToken.symbol}.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Next: Review
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Summary View */}
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                  <h3 className="text-xl font-bold mb-2">{name}</h3>
                  {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>

                <div className="grid gap-4">
                  <div className="p-4 rounded-xl border bg-card">
                    <div className="text-sm text-muted-foreground mb-1">Trading Pair</div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {fromToken.symbol}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {toToken.symbol}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-card">
                    <div className="text-sm text-muted-foreground mb-1">Trigger Condition</div>
                    <div className="font-medium">
                      When {toToken.symbol} {triggerType} reaches <strong className="text-primary">${triggerValue}</strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-card">
                    <div className="text-sm text-muted-foreground mb-1">Execution Amount</div>
                    <div className="font-medium">
                      Sell {amount}{amountType === 'percentage' ? '%' : ''} {fromToken.symbol}
                    </div>
                  </div>

                  {(stopLoss || takeProfit) && (
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="text-sm text-muted-foreground mb-2">Risk Management</div>
                      <div className="space-y-1">
                        {stopLoss && (
                          <div className="flex justify-between text-sm">
                            <span>Stop Loss:</span>
                            <span className="font-medium">${stopLoss}</span>
                          </div>
                        )}
                        {takeProfit && (
                          <div className="flex justify-between text-sm">
                            <span>Take Profit:</span>
                            <span className="font-medium">${takeProfit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Ready to activate</p>
                    <p className="text-muted-foreground">
                      Your strategy will start monitoring the market immediately after creation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 rounded-xl"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isSubmitting ? 'Creating...' : 'Create Strategy'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Token Selection Modals */}
      <TokenSelectModal
        open={showFromTokenModal}
        onClose={() => setShowFromTokenModal(false)}
        onSelectToken={(token) => {
          setFromToken(token);
          setShowFromTokenModal(false);
        }}
        selectedToken={fromToken}
      />
      <TokenSelectModal
        open={showToTokenModal}
        onClose={() => setShowToTokenModal(false)}
        onSelectToken={(token) => {
          setToToken(token);
          setShowToTokenModal(false);
        }}
        selectedToken={toToken}
      />
    </>
  );
}

