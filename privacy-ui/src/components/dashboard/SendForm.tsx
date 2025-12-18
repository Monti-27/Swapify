"use client";

import { useState } from "react";
import { ArrowRightIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface SendFormProps {
  onSend: (recipient: string, amount: number) => Promise<any>;
  maxAmount?: number;
  loading?: boolean;
}

export function SendForm({ onSend, maxAmount = 0, loading = false }: SendFormProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !recipient || isSubmitting) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setIsSubmitting(true);
    try {
      await onSend(recipient, amountNum);
      setRecipient("");
      setAmount("");
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [0.01, 0.1, 0.5, 1.0];

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <EyeSlashIcon className="h-5 w-5 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Private Send</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipient */}
        <div>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient address..."
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 font-mono text-sm transition-all"
            disabled={loading || isSubmitting}
          />
        </div>

        {/* Amount Input */}
        <div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.000000001"
              min="0"
              className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 font-mono text-lg transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={loading || isSubmitting}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
              SOL
            </span>
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mt-3">
            {quickAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className="flex-1 py-2 text-xs font-medium bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-all border border-gray-600/30 hover:border-gray-500/50"
                disabled={loading || isSubmitting || preset > maxAmount}
              >
                {preset}
              </button>
            ))}
            {maxAmount > 0 && (
              <button
                type="button"
                onClick={() => setAmount(maxAmount.toString())}
                className="px-3 py-2 text-xs font-medium bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-all border border-gray-600/30 hover:border-gray-500/50"
                disabled={loading || isSubmitting}
              >
                Max
              </button>
            )}
          </div>
        </div>

        {/* Balance Info */}
        <div className="flex justify-end text-xs text-gray-400 px-1">
          <span>Available: {maxAmount.toFixed(3)} SOL</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!amount || !recipient || loading || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 font-medium rounded-xl transition-all bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-gray-700 disabled:to-gray-600 text-white shadow-lg shadow-green-600/25 disabled:text-gray-400 disabled:shadow-none"
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <EyeSlashIcon className="h-4 w-4" />
              Send Privately
              <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Privacy Notice */}
      <div className="mt-4 p-3 rounded-xl border bg-green-900/20 border-green-700/30">
        <p className="text-xs text-gray-300">
          <span className="font-medium text-green-400">🔒 PRIVATE:</span>{' '}
          Deposits from wallet, then sends anonymously. Privacy signature cached for seamless experience.
        </p>
      </div>
    </div>
  );
}
