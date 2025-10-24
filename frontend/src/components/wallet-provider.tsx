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
  // ⚠️ MAINNET-BETA - USING REAL SOL!
  const network = WalletAdapterNetwork.Mainnet;

  // Use Alchemy RPC endpoint for better reliability and higher rate limits
  const endpoint = useMemo(() => {
    // Priority 1: Use Alchemy RPC from environment variable
    const alchemyRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    
    if (alchemyRpc && alchemyKey) {
      return alchemyRpc;
    }
    
    // Fallback: Try alternative Alchemy URL formats
    if (alchemyKey) {
      return `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`;
    }
    
    // Last resort: Solana Foundation public RPC (if Alchemy not configured)
    return 'https://api.mainnet-beta.solana.com';
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

