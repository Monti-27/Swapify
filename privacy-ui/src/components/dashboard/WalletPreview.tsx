"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface WalletPreviewProps {
  activeWallet?: any;
  onClick: () => void;
}

export function WalletPreview({ activeWallet, onClick }: WalletPreviewProps) {

  const getWalletDisplay = () => {
    if (!activeWallet || !('address' in activeWallet)) return 'No wallet';
    const address = activeWallet.address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getWalletType = () => {
    if (!activeWallet) return '';
    if ('walletClientType' in activeWallet && activeWallet.walletClientType === 'privy') {
      return 'Privy';
    }
    return 'External';
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all duration-200"
    >

      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs text-gray-400">
          {getWalletDisplay()}
        </span>
        {getWalletType() && (
          <span className="px-1.5 py-0.5 rounded text-xs bg-purple-900/50 text-purple-300 whitespace-nowrap">
            {getWalletType()}
          </span>
        )}
      </div>

      <ChevronDownIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
    </button>
  );
}
