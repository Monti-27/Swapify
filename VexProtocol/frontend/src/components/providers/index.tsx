'use client';

import React, { ReactNode } from 'react';
import { PrivyProviderWrapper } from './privy-provider';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <PrivyProviderWrapper>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </PrivyProviderWrapper>
    </ThemeProvider>
  );
}
