"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  XMarkIcon, 
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  WalletIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  PlusIcon,
  KeyIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { useLinkAccount } from "@privy-io/react-auth";
import { useExportWallet, useCreateWallet } from "@privy-io/react-auth/solana";

interface UserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  activeWallet?: any;
  allWallets: any[];
  onLogout: () => void;
  onWalletSelect: (index: number) => void;
}

export function UserSidebar({ 
  isOpen, 
  onClose, 
  user, 
  activeWallet, 
  allWallets, 
  onLogout,
  onWalletSelect 
}: UserSidebarProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  const { linkWallet } = useLinkAccount({
    onSuccess: ({ linkedAccount }) => {
      console.log('Successfully linked wallet:', linkedAccount);
    },
    onError: (error) => {
      console.error('Failed to link wallet:', error);
    }
  });

  const { exportWallet } = useExportWallet();
  const { createWallet } = useCreateWallet();

  // Check if user has an embedded Solana wallet
  const hasEmbeddedWallet = !!user?.linkedAccounts?.find(
    (account: any) =>
      account.type === 'wallet' &&
      account.walletClientType === 'privy' &&
      account.chainType === 'solana'
  );

  const getDisplayName = () => {
    if (user?.email?.address) return user.email.address;
    if (user?.google?.email) return user.google.email;
    if (user?.twitter?.username) return `@${user.twitter.username}`;
    if (user?.telegram?.username) return `@${user.telegram.username}`;
    return 'User';
  };

  const getAccountType = () => {
    if (user?.email?.address) return 'Email';
    if (user?.google?.email) return 'Google';
    if (user?.twitter?.username) return 'Twitter';
    if (user?.telegram?.username) return 'Telegram';
    return 'Unknown';
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Account Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* User Profile Section */}
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <UserCircleIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-medium text-white">
                      {getDisplayName()}
                    </div>
                    <div className="text-sm text-gray-400">
                      {getAccountType()} Account
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckIcon className="h-4 w-4" />
                  <span>Verified via Privy</span>
                </div>
              </div>

              {/* Active Wallet Section */}
              {activeWallet && 'address' in activeWallet && (
                <div className="p-6 border-b border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                    Active Wallet
                  </h3>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <WalletIcon className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-white">
                          {'walletClientType' in activeWallet && activeWallet.walletClientType === 'privy' 
                            ? 'Privy Wallet' 
                            : 'External Wallet'}
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-900/50 text-green-300">
                        Active
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-300">
                        {activeWallet.address.slice(0, 8)}...{activeWallet.address.slice(-8)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(activeWallet.address)}
                        className="p-1 rounded hover:bg-gray-700 transition-colors"
                      >
                        {copiedAddress === activeWallet.address ? (
                          <CheckIcon className="h-4 w-4 text-green-400" />
                        ) : (
                          <DocumentDuplicateIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* All Wallets Section */}
              {allWallets.length > 1 && (
                <div className="p-6 border-b border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                    All Wallets ({allWallets.length})
                  </h3>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allWallets.map((wallet: any, index: number) => {
                      const address = 'address' in wallet ? wallet.address : '';
                      const isPrivy = 'walletClientType' in wallet && wallet.walletClientType === 'privy';
                      const isActive = activeWallet && 'address' in activeWallet && activeWallet.address === address;
                      
                      return (
                        <button
                          key={address}
                          onClick={() => onWalletSelect(index)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-green-900/30 border border-green-700/50' 
                              : 'bg-gray-800/30 hover:bg-gray-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-green-400' : 'bg-gray-500'
                            }`} />
                            <div className="text-left">
                              <div className="font-mono text-xs text-white">
                                {address.slice(0, 6)}...{address.slice(-6)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {isPrivy ? 'Privy' : 'External'}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(address);
                            }}
                            className="p-1 rounded hover:bg-gray-700 transition-colors"
                          >
                            {copiedAddress === address ? (
                              <CheckIcon className="h-3 w-3 text-green-400" />
                            ) : (
                              <DocumentDuplicateIcon className="h-3 w-3 text-gray-400" />
                            )}
                          </button>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Wallet Management Section */}
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Wallet Management
                </h3>
                
                <div className="space-y-2">
                  {!hasEmbeddedWallet && (
                    <button 
                      onClick={() => createWallet()}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left bg-green-900/20 border border-green-800/50"
                    >
                      <WalletIcon className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-white">Create Embedded Wallet</span>
                      <PlusIcon className="h-3 w-3 text-green-400 ml-auto" />
                    </button>
                  )}
                  
                  <button 
                    onClick={linkWallet}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left bg-purple-900/20 border border-purple-800/50"
                  >
                    <WalletIcon className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-white">Connect External Wallet</span>
                    <PlusIcon className="h-3 w-3 text-purple-400 ml-auto" />
                  </button>
                </div>
                
                <div className="mt-3 space-y-1">
                  {!hasEmbeddedWallet && (
                    <p className="text-xs text-gray-500">
                      Create a secure embedded wallet managed by Privy
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Connect external wallets like Phantom, Solflare, or hardware wallets
                  </p>
                </div>
              </div>

              {/* Settings Section */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Settings
                </h3>
                
                <div className="space-y-2">
                  {hasEmbeddedWallet && (
                    <button 
                      onClick={() => exportWallet()}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <KeyIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-white">Export Wallet</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => window.open('https://docs.sendzk.com', '_blank')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-white">Documentation</span>
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-500 ml-auto" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-900/20 hover:bg-red-900/30 border border-red-800/50 text-red-400 hover:text-red-300 transition-colors"
              >
                <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
