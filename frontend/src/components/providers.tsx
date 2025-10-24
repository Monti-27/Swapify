'use client';

import React, { ReactNode, useEffect } from 'react';
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
  // Log provider mounting for debugging
  useEffect(() => {
    console.log('🏗️ Providers component mounted');
    
    // Log environment info
    console.log('🌍 Environment:', {
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
      hasWindow: typeof window !== 'undefined',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR'
    });
    
    return () => {
      console.log('🏗️ Providers component unmounting');
    };
  }, []);

  return (
    <ThemeProvider>
      <SolanaWalletProvider>
        <WalletInitProvider>
          <AuthProvider>
            <BalanceProvider>
              {children}
              <Toaster richColors position="bottom-right" />
            </BalanceProvider>
          </AuthProvider>
        </WalletInitProvider>
      </SolanaWalletProvider>
    </ThemeProvider>
  );
}
