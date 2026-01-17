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
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID}
      config={{
        // EXTERNAL WALLETS ONLY - NO EMBEDDED WALLETS
        embeddedWallets: {
          solana: {
            createOnLogin: 'off'  // Explicitly disable embedded wallet creation
          }
        },

        // SOLANA EXTERNAL WALLETS with Phantom priority
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors({
              // Phantom gets priority position in wallet list
              shouldAutoConnect: true
            })
          }
        },

        // LOGIN METHODS - External wallets only
        loginMethods: ['wallet'],

        // APPEARANCE CUSTOMIZATION for Swapify design
        appearance: {
          theme: 'dark',
          accentColor: '#00FF94',  // Swapify neon green
          // logo: '/Swapify-logo.png', // Uncomment when logo is available
          showWalletLoginFirst: true,
          landingHeader: 'Connect Your Solana Wallet'
        },


        // Disable features not needed for external wallet-only setup
        mfa: {
          noPromptOnMfaRequired: true
        },

        // Legal and privacy (optional customization)
        legal: {
          termsAndConditionsUrl: 'https://swapify.fun/terms',
          privacyPolicyUrl: 'https://swapify.fun/privacy'
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
