"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSwap } from './SwapContext';

interface SlippageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_SLIPPAGES = [
  { label: '0.1%', value: 10 },
  { label: '0.5%', value: 50 },
  { label: '1.0%', value: 100 },
  { label: '3.0%', value: 300 },
];

export function SlippageSettingsModal({ isOpen, onClose }: SlippageSettingsModalProps) {
  const { slippageBps, setSlippageBps } = useSwap();
  const [customValue, setCustomValue] = useState('');

  const handlePresetClick = (value: number) => {
    setSlippageBps(value);
    setCustomValue('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setCustomValue(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 50) {
      setSlippageBps(Math.round(numValue * 100));
    }
  };

  const isCustom = !PRESET_SLIPPAGES.find(p => p.value === slippageBps);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-[#18181B] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Swap Settings</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <label className="text-sm font-medium text-zinc-400 mb-2 block">
              Slippage Tolerance
            </label>
            <p className="text-xs text-zinc-500 mb-3">
              Your transaction will revert if the price changes unfavorably by more than this percentage.
            </p>
            
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_SLIPPAGES.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    slippageBps === preset.value && !isCustom
                      ? 'bg-[#5850EC] text-white'
                      : 'bg-[#27272A] text-zinc-400 hover:bg-[#3F3F46]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Custom"
                value={isCustom ? (slippageBps / 100).toString() : customValue}
                onChange={handleCustomChange}
                className={`w-full bg-[#27272A] border rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none transition-all ${
                  isCustom ? 'border-[#5850EC]' : 'border-white/5 focus:border-[#5850EC]/50'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
            </div>

            {slippageBps > 500 && (
              <p className="text-orange-400 text-xs mt-2">
                High slippage tolerance may result in unfavorable trades.
              </p>
            )}

            {slippageBps < 10 && (
              <p className="text-yellow-400 text-xs mt-2">
                Low slippage tolerance may cause transaction failures.
              </p>
            )}
          </div>

          <div className="bg-[#242427] rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">Current Slippage</span>
              <span className="text-white font-bold">{(slippageBps / 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-[#5850EC] hover:bg-[#4338CA] text-white py-3 rounded-xl font-bold text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
