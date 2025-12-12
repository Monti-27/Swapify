'use client';

import React, { ReactNode, useEffect, useRef } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { SolanaWalletProvider } from '@/components/wallet-provider';
import { WalletInitProvider } from '@/contexts/WalletInitContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BalanceProvider } from '@/contexts/BalanceContext';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const mountTimeRef = useRef<number>(Date.now());
  const isInitialMountRef = useRef<boolean>(true);

  useEffect(() => {
    // Mark as no longer initial mount after a short delay
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <ThemeProvider>
      <SolanaWalletProvider>
        <WalletInitProvider>
          <AuthProvider mountTime={mountTimeRef.current} isInitialMount={isInitialMountRef}>
            <BalanceProvider>
              {children}
            </BalanceProvider>
          </AuthProvider>
        </WalletInitProvider>
      </SolanaWalletProvider>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        theme="dark"
        gap={12}
        offset={24}
      />
    </ThemeProvider>
  );
}
