'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletInitContextType {
  isInitializing: boolean;
  isReady: boolean;
}

const WalletInitContext = createContext<WalletInitContextType | undefined>(undefined);

export function WalletInitProvider({ children }: { children: ReactNode }) {
  const { connected, connecting, wallet } = useWallet();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const hasInitialized = useRef(false);

  // Initial check on mount
  useEffect(() => {
    if (hasInitialized.current) return;

    const checkPreviousConnection = () => {
      if (typeof window === 'undefined') return false;
      
      // Solana wallet adapter stores the last used wallet
      const walletName = localStorage.getItem('walletName');
      return !!walletName;
    };

    const hadPreviousConnection = checkPreviousConnection();

    if (hadPreviousConnection) {
      // If there was a previous connection, give autoConnect time to work
      const timer = setTimeout(() => {
        if (!hasInitialized.current) {
          setIsInitializing(false);
          setIsReady(true);
          hasInitialized.current = true;
        }
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      // No previous connection, we're ready immediately
      setIsInitializing(false);
      setIsReady(true);
      hasInitialized.current = true;
    }
  }, []);

  // Watch for wallet state changes
  useEffect(() => {
    // Skip if already initialized
    if (hasInitialized.current) return;

    // If connected successfully, we're ready
    if (connected) {
      setIsInitializing(false);
      setIsReady(true);
      hasInitialized.current = true;
      return;
    }

    // If not connecting and no wallet selected, we're ready (user hasn't connected)
    if (!connecting && wallet === null) {
      setIsInitializing(false);
      setIsReady(true);
      hasInitialized.current = true;
      return;
    }
  }, [connected, connecting, wallet]);

  // Keep initialization state across navigation (important!)
  // Once initialized, stay initialized even on route changes
  const hasInitializedRef = hasInitialized.current;

  return (
    <WalletInitContext.Provider value={{ isInitializing: !hasInitializedRef && isInitializing, isReady }}>
      {children}
    </WalletInitContext.Provider>
  );
}

export function useWalletInit() {
  const context = useContext(WalletInitContext);
  if (context === undefined) {
    throw new Error('useWalletInit must be used within a WalletInitProvider');
  }
  return context;
}

