"use client";

import { CheckIcon, ChevronDownIcon, WalletIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface WalletInfo {
  address: string;
  isPrivy: boolean;
  isActive: boolean;
}

interface WalletListProps {
  wallets: WalletInfo[];
  onSelectWallet: (index: number) => void;
  loading?: boolean;
}

export function WalletList({ wallets, onSelectWallet, loading = false }: WalletListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show max 3 wallets when collapsed, all when expanded
  const maxCollapsed = 3;
  const shouldShowExpander = wallets.length > maxCollapsed;
  const walletsToShow = isExpanded ? wallets : wallets.slice(0, maxCollapsed);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Your Wallets
        </h3>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
              <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-700 rounded w-20 mb-1"></div>
                <div className="h-2 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Your Wallets
        </h3>
        <div className="text-center py-6">
          <WalletIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <div className="text-gray-500 text-sm mb-1">No wallets found</div>
          <div className="text-xs text-gray-600">
            Connect a Solana wallet to get started
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Wallets ({wallets.length})
        </h3>
        {shouldShowExpander && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Show All'}
            <ChevronDownIcon className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      <div className={`space-y-2 ${isExpanded && wallets.length > 4 ? 'max-h-64 overflow-y-auto pr-2' : ''}`}>
        {walletsToShow.map((wallet, index) => (
          <div
            key={wallet.address}
            onClick={() => onSelectWallet(index)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              wallet.isActive 
                ? 'bg-green-900/30 border border-green-700/50 ring-1 ring-green-500/20' 
                : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent hover:border-gray-700/50'
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              wallet.isActive ? 'bg-green-600' : 'bg-gray-700'
            }`}>
              {wallet.isActive ? (
                <CheckIcon className="h-4 w-4 text-white" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs text-white mb-1">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  wallet.isPrivy 
                    ? 'bg-purple-900/50 text-purple-300' 
                    : 'bg-blue-900/50 text-blue-300'
                }`}>
                  {wallet.isPrivy ? 'Privy' : 'External'}
                </span>
                {wallet.isActive && (
                  <span className="text-xs text-green-400 font-medium">Active</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isExpanded && shouldShowExpander && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full text-xs text-gray-400 hover:text-white transition-colors text-center"
          >
            +{wallets.length - maxCollapsed} more wallets
          </button>
        </div>
      )}
    </div>
  );
}