'use client';

import React, { FC, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { toast } from 'sonner';

// Import Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Log wallet provider mounting for debugging
  useEffect(() => {
    console.log('💰 SolanaWalletProvider mounted', {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      endpoint: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ? 'custom' : 'default'
    });

    return () => {
      console.log('💰 SolanaWalletProvider unmounting', {
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  // Set to 'devnet', 'testnet', or 'mainnet-beta'
  // ⚠️ DEVNET - FOR TESTING ONLY!
  const network = WalletAdapterNetwork.Devnet;

  // Use Devnet RPC endpoint for testing
  const endpoint = useMemo(() => {
    // FORCE DEVNET - ignore environment variable for testing
    const devnetUrl = clusterApiUrl('devnet');

    console.log('🌐 RPC ENDPOINT CONFIG:');
    console.log('   Network:', network);
    console.log('   ENV RPC:', process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'not set');
    console.log('   Using:', devnetUrl);

    return devnetUrl;
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network]
  );

  // Handle wallet errors (connection rejections, etc.)
  const onError = useCallback((error: WalletError) => {
    // Check if user rejected the connection
    const isUserRejection = error.message?.toLowerCase().includes('user rejected') ||
      error.message?.toLowerCase().includes('user denied') ||
      error.message?.toLowerCase().includes('user cancelled') ||
      error.name === 'WalletConnectionError';

    if (isUserRejection) {
      // User intentionally cancelled - show info toast
      toast.info('Wallet Connection Cancelled', {
        description: 'You cancelled the wallet connection'
      });
    } else {
      // Actual error - show error toast
      toast.error('Wallet Error', {
        description: error.message || 'Failed to connect wallet'
      });
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

