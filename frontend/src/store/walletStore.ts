import { create } from 'zustand';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string;
  publicKey: string | null;
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

