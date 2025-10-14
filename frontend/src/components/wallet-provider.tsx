'use client';

import React, { FC, ReactNode, useMemo, useCallback } from 'react';
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
  // Instance tracking
  const instanceIdRef = React.useRef(Math.random().toString(36).substr(2, 9));
  
  React.useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [SOLANA WALLET PROVIDER MOUNT]');
    console.log('🆔 Instance ID:', instanceIdRef.current);
    console.log('📍 Path:', typeof window !== 'undefined' ? window.location.pathname : 'SSR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
      console.log('🔗 Using Alchemy RPC endpoint:', alchemyRpc.substring(0, 50) + '...');
      return alchemyRpc;
    }
    
    // Fallback: Try alternative Alchemy URL formats
    if (alchemyKey) {
      const alternativeUrl = `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`;
      console.log('🔗 Trying alternative Alchemy URL format');
      return alternativeUrl;
    }
    
    // Last resort: Solana Foundation public RPC (if Alchemy not configured)
    console.warn('⚠️ Alchemy RPC not configured, falling back to public RPC (may have rate limits)');
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
    console.log('Wallet error:', error.message);
    
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

