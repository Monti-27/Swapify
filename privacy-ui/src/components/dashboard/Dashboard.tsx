"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { BalanceCard } from "./BalanceCard";
import { SendForm } from "./SendForm";
import { TransactionHistory } from "./TransactionHistory";
import { WalletList } from "./WalletList";
import { WalletPreview } from "./WalletPreview";
import { UserSidebar } from "./UserSidebar";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { privacyApiService } from "@/services/privacyApiService";
import { useWallets, useSignTransaction, type ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { usePrivacySignature } from "@/hooks/usePrivacySignature";
import { toast } from "react-toastify";

export function Dashboard() {
  const { logout, user } = usePrivy();
  const { ready, wallets: connectedWallets } = useWallets();
  const [selectedWalletIndex, setSelectedWalletIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Get all Solana wallets from user's linked accounts for display
  const allLinkedWallets = user?.linkedAccounts?.filter(
    account => account.type === 'wallet' && account.chainType === 'solana'
  ) || [];

  // For wallet operations (signing, etc.), we still need connected wallets
  const solanaWallets = connectedWallets;
  
  // For display purposes, show all linked wallets if available, otherwise connected wallets
  const walletsForDisplay = allLinkedWallets.length > 0 ? allLinkedWallets : connectedWallets;

  // Transaction signing and signature caching
  const { signTransaction } = useSignTransaction();
  const { ensureSignature, hasSignature, wasCancelled, isSigningMessage } = usePrivacySignature();

  // Get the currently selected display wallet
  const selectedDisplayWallet = walletsForDisplay[selectedWalletIndex];
  const walletAddress = (selectedDisplayWallet as any)?.address;
  
  // Find the corresponding connected wallet for operations (signing, etc.)
  const selectedWallet = solanaWallets.find(wallet => wallet.address === walletAddress);
  
  console.log('Wallet selection debug:', {
    selectedWalletIndex,
    selectedWallet: selectedWallet?.address,
    selectedDisplayWallet: (selectedDisplayWallet as any)?.address,
    finalWalletAddress: walletAddress,
    walletsForDisplayCount: walletsForDisplay.length,
    connectedWalletsCount: solanaWallets.length
  });

  // Use TanStack Query for wallet balance and transactions
  const { data: balanceData, isLoading: balanceLoading, error: balanceError, refetch: refetchWalletBalance, isFetching: walletBalanceFetching } = useWalletBalance(walletAddress);

  // Auto-ensure signature when wallet changes (background, no toast)
  useEffect(() => {
    console.log('Wallet change detected:', {
      selectedWallet: selectedWallet?.address,
      hasSignature: selectedWallet ? hasSignature(selectedWallet.address) : false,
      wasCancelled: selectedWallet ? wasCancelled(selectedWallet.address) : false,
      isSigningMessage
    });
    
    if (selectedWallet && !hasSignature(selectedWallet.address) && !wasCancelled(selectedWallet.address) && !isSigningMessage) {
      console.log(`Auto-setting up Privacy Cash signature for wallet: ${selectedWallet.address}`);
      ensureSignature(selectedWallet).catch(error => {
        console.warn('Background signature setup failed:', error);
        // Don't show error toast for background setup
      });
    }
  }, [selectedWallet, hasSignature, wasCancelled, ensureSignature, isSigningMessage]);


  const handleSend = async (recipient: string, amount: number) => {
    if (!selectedWallet || !walletAddress || !user?.id) {
      throw new Error("No wallet selected or user not authenticated");
    }
    
    try {
      // Ensure signature is available (will use cached if exists)
      const signedMessage = await ensureSignature(selectedWallet);

      // Create transaction signing function
      const signTx = async (transaction: Uint8Array): Promise<Uint8Array> => {
        const signedResult = await signTransaction({
          transaction: transaction,
          wallet: selectedWallet,
        });
        return signedResult.signedTransaction;
      };

      // Send privately using the new deposit + relay + withdraw flow
      toast.info("Creating deposit transaction...");
      const result = await privacyApiService.sendPrivately({
        recipient,
        amount,
        senderWallet: walletAddress,
        signedMessage,
        signTransaction: signTx,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Privacy send failed');
      }
      
      toast.success(`Private send successful! 🎉`);
      toast.info(`Deposit: ${result.depositSignature?.slice(0, 8)}... Withdraw: ${result.withdrawSignature?.slice(0, 8)}...`);
      
      // Refetch balances after successful send
      refetchWalletBalance();
      
      return result;
    } catch (error) {
      console.error("Private send failed:", error);
      toast.error(`Private send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };


  // Show loading state while syncing user or wallets not ready
  if (!ready) {
    return null; // Let the main page handle loading with FullScreenLoader
  }

  if (solanaWallets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">No Solana wallet found</div>
          <p className="text-gray-400 mb-4">Please connect a Solana wallet to continue</p>
          <button onClick={logout} className="text-gray-400 hover:text-white">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="rounded-lg border border-gray-700 bg-gray-800 p-2">
                <Image
                  src="/logo.svg"
                  alt="logo"
                  width={24}
                  height={24}
                  className="h-6 w-6"
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Privacy Send</h1>
                <p className="text-xs text-gray-400">
                  {user?.email?.address || user?.google?.email || user?.twitter?.username || 'Private SOL transfers'}
                </p>
              </div>
            </div>


            <WalletPreview
              activeWallet={selectedWallet || selectedDisplayWallet}
              onClick={() => setIsSidebarOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Wallet Balances & Wallet List */}
          <div className="space-y-6">
            <BalanceCard
              title="Wallet Balance"
              balance={balanceData?.wallet || null}
              loading={balanceLoading}
              onRefresh={() => refetchWalletBalance()}
              refreshing={walletBalanceFetching && !balanceLoading}
            />
            <WalletList
              wallets={walletsForDisplay.map((wallet: any, index: number) => {
                // Check if this display wallet is the currently selected one
                const isActive = index === selectedWalletIndex;
                
                return {
                  address: wallet.address,
                  isPrivy: wallet.walletClientType === 'privy' || wallet.connectorType === 'privy',
                  isActive
                };
              })}
              onSelectWallet={setSelectedWalletIndex}
              loading={balanceLoading}
            />
          </div>

          {/* Middle Column - Send Form */}
          <div>
            <SendForm
              onSend={handleSend}
              maxAmount={balanceData?.wallet?.sol || 0}
              loading={balanceLoading}
            />
          </div>

          {/* Right Column - Transaction History */}
          <div>
            
          </div>
        </div>
      </div>

      {/* User Sidebar */}
      <UserSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        activeWallet={selectedWallet}
        allWallets={walletsForDisplay}
        onLogout={logout}
        onWalletSelect={(index) => {
          setSelectedWalletIndex(index);
          setIsSidebarOpen(false);
        }}
      />
    </div>
  );
}
