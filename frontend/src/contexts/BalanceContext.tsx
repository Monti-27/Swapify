'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';

interface BalanceContextType {
  balance: string;
  isLoadingBalance: boolean;
  lastFetched: number | null;
  fetchBalance: (force?: boolean) => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

const CACHE_DURATION = 30000; // 30 seconds

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  
  // Prevent multiple simultaneous requests
  const isFetchingRef = useRef(false);
  
  // Fetch balance with cache check
  const fetchBalance = useCallback(async (force: boolean = false) => {
    // Guard: Must be connected with public key
    if (!connected || !publicKey) {
      setBalance('0.00');
      setLastFetched(null);
      return;
    }
    
    // Guard: Check cache expiry (unless forced)
    if (!force && lastFetched) {
      const timeSinceLastFetch = Date.now() - lastFetched;
      if (timeSinceLastFetch < CACHE_DURATION) {
        console.log(`⚡ Balance cache hit (${Math.round(timeSinceLastFetch / 1000)}s old)`);
        return;
      }
    }
    
    // Guard: Prevent duplicate simultaneous requests
    if (isFetchingRef.current) {
      console.log('⚠️ Balance fetch already in progress, skipping...');
      return;
    }
    
    isFetchingRef.current = true;
    setIsLoadingBalance(true);
    
    try {
      console.log('💰 Fetching balance for:', publicKey.toBase58().slice(0, 8) + '...');
      const balanceLamports = await connection.getBalance(publicKey);
      const solBalance = (balanceLamports / LAMPORTS_PER_SOL).toFixed(4);
      
      setBalance(solBalance);
      setLastFetched(Date.now());
      
      console.log('✅ Balance fetched:', solBalance, 'SOL');
    } catch (error: any) {
      console.error('❌ Failed to fetch balance:', error.message);
      
      // Show "..." instead of 0.00 on error to indicate loading/error state
      setBalance('...');
      
      // Only show error toast if it's not a rate limit issue
      if (!error.message?.includes('403') && !error.message?.includes('429')) {
        toast.error('Failed to fetch balance', {
          description: 'Please check your connection'
        });
      }
    } finally {
      setIsLoadingBalance(false);
      isFetchingRef.current = false;
    }
  }, [connected, publicKey, connection, lastFetched]);
  
  // Convenience method for manual refresh (always forces)
  const refreshBalance = useCallback(async () => {
    console.log('🔄 Manual balance refresh requested');
    await fetchBalance(true);
  }, [fetchBalance]);
  
  // Fetch balance ONLY when wallet connects (not on every render/navigation)
  useEffect(() => {
    if (connected && publicKey) {
      console.log('🔌 Wallet connected - fetching initial balance');
      fetchBalance(true); // Force fetch on connect
    } else {
      // Clear balance when disconnected
      setBalance('0.00');
      setLastFetched(null);
    }
  }, [connected, publicKey]); // Only depend on connection state, not fetchBalance
  
  return (
    <BalanceContext.Provider 
      value={{ 
        balance, 
        isLoadingBalance, 
        lastFetched, 
        fetchBalance, 
        refreshBalance 
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
}

