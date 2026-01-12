'use client';

import React, { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#0ea5e9',
          showWalletLoginFirst: true,
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors({
              shouldAutoConnect: true
            })
          }
        },
        loginMethods: ['wallet'],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
