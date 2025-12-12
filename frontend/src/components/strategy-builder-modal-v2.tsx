'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TokenSelectModal } from '@/components/token-select-modal';
import type { Token } from '@/lib/tokens';
import { POPULAR_TOKENS } from '@/lib/tokens';
import { toast } from 'sonner';
import { 
  ChevronDown, 
  TrendingUp, 
  Target, 
  Zap, 
  ArrowRight, 
  Check,
  AlertTriangle,
  Sparkles,
  Shield,
  Clock,
  DollarSign,
  Percent
} from 'lucide-react';
import type { CreateStrategyDto } from '@/types/api';

interface StrategyBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (strategy: CreateStrategyDto) => Promise<void>;
}

const steps = [
  { id: 1, name: 'Basic Info', icon: Sparkles },
  { id: 2, name: 'Trading Pair', icon: Zap },
  { id: 3, name: 'Trigger', icon: Target },
  { id: 4, name: 'Amount', icon: DollarSign },
  { id: 5, name: 'Review', icon: Check },
];

export function StrategyBuilderModal({ open, onClose, onSubmit }: StrategyBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fromToken, setFromToken] = useState<Token>(POPULAR_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(POPULAR_TOKENS[1]);
  const [triggerType, setTriggerType] = useState<'price' | 'marketCap'>('price');
  const [triggerValue, setTriggerValue] = useState('');
  const [amountType, setAmountType] = useState<'percentage' | 'fixed'>('percentage');
  const [amount, setAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  
  const [showFromTokenModal, setShowFromTokenModal] = useState(false);
  const [showToTokenModal, setShowToTokenModal] = useState(false);

  const resetForm = () => {
    setCurrentStep(1);
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
      toast.error('Failed to create strategy', {
        description: 'Please try again'
      });
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
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Let's create your strategy</h3>
              <p className="text-muted-foreground">Give your strategy a memorable name</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">Strategy Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Buy the Dip, Moon Mission, Safe Entry"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your strategy goals and conditions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Help yourself remember why you created this strategy
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white mb-4">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Select your trading pair</h3>
              <p className="text-muted-foreground">Choose which tokens to trade</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">From (You're selling)</Label>
                <button
                  onClick={() => setShowFromTokenModal(true)}
                  className="w-full group relative overflow-hidden rounded-xl border-2 border-border hover:border-primary transition-all duration-200 bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {fromToken.symbol.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg">{fromToken.symbol}</div>
                      <div className="text-sm text-muted-foreground">{fromToken.name}</div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">To (You're buying)</Label>
                <button
                  onClick={() => setShowToTokenModal(true)}
                  className="w-full group relative overflow-hidden rounded-xl border-2 border-border hover:border-primary transition-all duration-200 bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {toToken.symbol.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg">{toToken.symbol}</div>
                      <div className="text-sm text-muted-foreground">{toToken.name}</div>
                    </div>
                  </div>
                </button>
              </div>

              {fromToken.address === toToken.address && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please select different tokens for trading
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white mb-4">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Set your trigger condition</h3>
              <p className="text-muted-foreground">When should the strategy execute?</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base">Trigger Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTriggerType('price')}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      triggerType === 'price'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className={`w-6 h-6 ${triggerType === 'price' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-semibold">Price Target</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Execute at specific price
                      </span>
                    </div>
                    {triggerType === 'price' && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setTriggerType('marketCap')}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      triggerType === 'marketCap'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <TrendingUp className={`w-6 h-6 ${triggerType === 'marketCap' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-semibold">Market Cap</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Execute at market cap
                      </span>
                    </div>
                    {triggerType === 'marketCap' && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="triggerValue" className="text-base">
                  Target {triggerType === 'price' ? 'Price' : 'Market Cap'} *
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="triggerValue"
                    type="number"
                    placeholder={triggerType === 'price' ? '0.00' : '1,000,000'}
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    className="h-14 text-lg pl-8"
                    step="any"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Execute when {toToken.symbol} {triggerType === 'price' ? 'price reaches' : 'market cap hits'} this value
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stopLoss" className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Stop Loss (Optional)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="stopLoss"
                      type="number"
                      placeholder="0.00"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="pl-7"
                      step="any"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="takeProfit" className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Take Profit (Optional)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="takeProfit"
                      type="number"
                      placeholder="0.00"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="pl-7"
                      step="any"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-4">
                <DollarSign className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">How much to trade?</h3>
              <p className="text-muted-foreground">Define your trade amount</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base">Amount Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAmountType('percentage')}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      amountType === 'percentage'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Percent className={`w-6 h-6 ${amountType === 'percentage' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-semibold">Percentage</span>
                      <span className="text-xs text-muted-foreground">% of holdings</span>
                    </div>
                    {amountType === 'percentage' && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setAmountType('fixed')}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      amountType === 'fixed'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className={`w-6 h-6 ${amountType === 'fixed' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-semibold">Fixed Amount</span>
                      <span className="text-xs text-muted-foreground">Exact amount</span>
                    </div>
                    {amountType === 'fixed' && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-base">
                  Amount *
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder={amountType === 'percentage' ? '25' : '1.5'}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-14 text-lg pr-16"
                    step="any"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                    {amountType === 'percentage' ? '%' : fromToken.symbol}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {amountType === 'percentage' 
                    ? `Trade ${amount || '0'}% of your ${fromToken.symbol} balance`
                    : `Trade exactly ${amount || '0'} ${fromToken.symbol}`
                  }
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium mb-1">Execution Preview</p>
                    <p className="text-muted-foreground">
                      When triggered, sell {amount || '___'}{amountType === 'percentage' ? '%' : ''} {fromToken.symbol} 
                      {' '}→ buy {toToken.symbol} at market price
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Ready to launch!</h3>
              <p className="text-muted-foreground">Review your strategy before activation</p>
            </div>

            <div className="space-y-4">
              {/* Strategy Name Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/20">
                <h4 className="text-xl font-bold mb-2">{name}</h4>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>

              {/* Trading Pair */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="text-xs text-muted-foreground mb-3">TRADING PAIR</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {fromToken.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{fromToken.symbol}</div>
                      <div className="text-xs text-muted-foreground">{fromToken.name}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {toToken.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{toToken.symbol}</div>
                      <div className="text-xs text-muted-foreground">{toToken.name}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trigger Condition */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="text-xs text-muted-foreground mb-3">TRIGGER CONDITION</div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-medium">
                      When {toToken.symbol} {triggerType === 'price' ? 'price' : 'market cap'} reaches
                    </div>
                    <div className="text-2xl font-bold text-primary">${triggerValue}</div>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="p-4 rounded-xl border bg-card">
                <div className="text-xs text-muted-foreground mb-3">EXECUTION AMOUNT</div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="font-medium">Trade Amount</div>
                    <div className="text-xl font-bold">
                      {amount}{amountType === 'percentage' ? '%' : ''} {fromToken.symbol}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              {(stopLoss || takeProfit) && (
                <div className="p-4 rounded-xl border bg-card">
                  <div className="text-xs text-muted-foreground mb-3">RISK MANAGEMENT</div>
                  <div className="space-y-2">
                    {stopLoss && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-500" />
                          Stop Loss
                        </span>
                        <span className="font-semibold">${stopLoss}</span>
                      </div>
                    )}
                    {takeProfit && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          Take Profit
                        </span>
                        <span className="font-semibold">${takeProfit}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation */}
              <Alert className="border-green-500/20 bg-green-500/10">
                <Check className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Your strategy will activate immediately and start monitoring the market 24/7
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Progress Header */}
          <div className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      currentStep > step.id
                        ? 'bg-primary text-primary-foreground'
                        : currentStep === step.id
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentStep > step.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className={`text-xs mt-2 font-medium ${
                      currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.name}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 transition-all duration-200 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {renderStep()}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-muted/30">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? handleClose : handleBack}
                className="flex-1"
                disabled={isSubmitting}
              >
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </Button>
              <Button
                onClick={currentStep === steps.length ? handleSubmit : handleNext}
                disabled={!canProceed() || isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : currentStep === steps.length ? (
                  'Activate Strategy'
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
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

