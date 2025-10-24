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
  
  // Log provider mounting for debugging
  useEffect(() => {
    console.log('🏗️ Providers component mounted', {
      timestamp: new Date().toISOString(),
      mountTime: mountTimeRef.current,
      isInitialMount: isInitialMountRef.current
    });
    
    // Log environment info
    console.log('🌍 Environment:', {
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
      hasWindow: typeof window !== 'undefined',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR'
    });
    
    // Mark as no longer initial mount after a short delay
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
      console.log('🏗️ Providers initialization period ended');
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      console.log('🏗️ Providers component unmounting', {
        timestamp: new Date().toISOString(),
        wasInitialMount: isInitialMountRef.current
      });
    };
  }, []);

  return (
    <ThemeProvider>
      <SolanaWalletProvider>
        <WalletInitProvider>
          <AuthProvider mountTime={mountTimeRef.current} isInitialMount={isInitialMountRef}>
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
