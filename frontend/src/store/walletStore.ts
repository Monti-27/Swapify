import { create } from 'zustand';

// DEPRECATED: This store is kept for backward compatibility only
// Use Solana wallet adapter's useWallet() for connection state
// Use BalanceContext's useBalance() for balance management
// 
// This store should be removed in a future refactor once all
// components are migrated to use the proper contexts

interface WalletState {
  // Deprecated fields - use useWallet() from @solana/wallet-adapter-react instead
  isConnected: boolean;
  address: string | null;
  balance: string;
  publicKey: string | null;
  
  // Deprecated methods
  connect: (address: string, publicKey: string) => void;
  disconnect: () => void;
  updateBalance: (balance: string) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  isConnected: false,
  address: null,
  balance: '0.00',
  publicKey: null,
  connect: (address: string, publicKey: string) => 
    set({ isConnected: true, address, publicKey }),
  disconnect: () => 
    set({ isConnected: false, address: null, publicKey: null, balance: '0.00' }),
  updateBalance: (balance: string) => 
    set({ balance }),
}));
