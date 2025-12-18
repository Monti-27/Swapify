"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
        config={{
          embeddedWallets: {
            ethereum: {
              createOnLogin: "off",
            },
            solana: {
              createOnLogin: "users-without-wallets",
            },
          },
          loginMethods: ["telegram", "sms", "email", "wallet"],
          externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
          appearance: {
            walletChainType: "solana-only",
            theme: "dark",
            accentColor: "#5B4FFF",
          },
        }}
      >
        {children}
      </PrivyProvider>
    </QueryClientProvider>
  );
}
