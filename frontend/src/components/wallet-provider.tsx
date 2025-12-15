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

  // Set to 'mainnet-beta' for production
  // 🚀 MAINNET - PRODUCTION
  const network = WalletAdapterNetwork.Mainnet;

  // Use Helius Mainnet RPC for production
  const endpoint = useMemo(() => {
    // FORCE Helius Mainnet RPC
    // We ignore process.env.NEXT_PUBLIC_SOLANA_RPC_URL because it likely contains an Alchemy URL that is rate-limited
    const mainnetUrl = 'https://mainnet.helius-rpc.com/?api-key=6bf8928b-1c63-412a-9334-73bdfc2b18b5';

    console.log('🌐 RPC ENDPOINT CONFIG:');
    console.log('   Network:', network);
    console.log('   Using:', mainnetUrl.slice(0, 50) + '...');

    return mainnetUrl;
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

