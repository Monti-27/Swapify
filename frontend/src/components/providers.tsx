'use client';

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { SolanaWalletProvider } from '@/components/wallet-provider';
import { WalletInitProvider } from '@/contexts/WalletInitContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BalanceProvider } from '@/contexts/BalanceContext';
import { Toaster } from 'sonner';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10000,
        gcTime: 5 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const mountTimeRef = useRef<number>(Date.now());
  const isInitialMountRef = useRef<boolean>(true);
  const queryClient = getQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
