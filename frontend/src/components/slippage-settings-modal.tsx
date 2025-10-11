'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface SlippageSettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentSlippage: number;
  onSave: (slippage: number) => void;
}

const PRESET_SLIPPAGES = [0.1, 0.5, 1.0, 3.0];

export function SlippageSettingsModal({
  open,
  onClose,
  currentSlippage,
  onSave,
}: SlippageSettingsModalProps) {
  const [slippage, setSlippage] = useState(currentSlippage);
  const [customSlippage, setCustomSlippage] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (open) {
      setSlippage(currentSlippage);
      const isPreset = PRESET_SLIPPAGES.includes(currentSlippage);
      setIsCustom(!isPreset);
      if (!isPreset) {
        setCustomSlippage(currentSlippage.toString());
      }
    }
  }, [open, currentSlippage]);

  const handlePresetClick = (value: number) => {
    setSlippage(value);
    setIsCustom(false);
    setCustomSlippage('');
  };

  const handleCustomChange = (value: string) => {
    setCustomSlippage(value);
    setIsCustom(true);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 50) {
      setSlippage(numValue);
    }
  };

  const handleSave = () => {
    if (slippage > 0 && slippage <= 50) {
      onSave(slippage);
      onClose();
    }
  };

  const isHighSlippage = slippage > 5;
  const isLowSlippage = slippage < 0.1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Slippage Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Slippage tolerance is the maximum price change you're willing to accept
            </p>

            {/* Preset Slippages */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_SLIPPAGES.map((value) => (
                <Button
                  key={value}
                  variant={!isCustom && slippage === value ? 'default' : 'outline'}
                  onClick={() => handlePresetClick(value)}
                  className="rounded-xl"
                >
                  {value}%
                </Button>
              ))}
            </div>

            {/* Custom Slippage */}
            <div className="relative">
              <Input
                type="number"
                placeholder="Custom"
                value={customSlippage}
                onChange={(e) => handleCustomChange(e.target.value)}
                className={`rounded-xl ${isCustom ? 'ring-2 ring-primary' : ''}`}
                min="0"
                max="50"
                step="0.1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>

          {/* Warnings */}
          {isHighSlippage && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 border border-yellow-500/20">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-500">High Slippage</p>
                <p className="text-muted-foreground">
                  Your transaction may be frontrun due to high slippage tolerance
                </p>
              </div>
            </div>
          )}

          {isLowSlippage && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 p-3 border border-blue-500/20">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-500">Low Slippage</p>
                <p className="text-muted-foreground">
                  Your transaction may fail due to low slippage tolerance
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 rounded-xl"
              disabled={slippage <= 0 || slippage > 50}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

