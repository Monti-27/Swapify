'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import bs58 from 'bs58';
import { toast } from 'sonner';

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authenticate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);

  // Helper function to check if token is valid
  const isTokenValid = useCallback((token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Token is valid if it expires more than 5 minutes from now
      return timeUntilExpiry > 5 * 60 * 1000;
    } catch (error) {
      return false;
    }
  }, []);

  // Check for existing valid token on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingToken = localStorage.getItem('auth_token');
    const lastWallet = localStorage.getItem('last_wallet_address');
    
    if (existingToken && isTokenValid(existingToken)) {
      console.log('✅ Valid token found, restoring session');
      api.setToken(existingToken);
      setIsAuthenticated(true);
      setHasAttemptedAuth(true);
    } else if (existingToken) {
      console.log('🔄 Token expired, clearing...');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('last_wallet_address');
      api.clearToken();
    }
  }, [isTokenValid]);

  // Authenticate function
  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      console.log('❌ Cannot authenticate: wallet not ready');
      return;
    }
    
    if (isAuthenticating) {
      console.log('⏳ Authentication already in progress');
      return;
    }

    try {
      setIsAuthenticating(true);
      console.log('🔐 Starting authentication for wallet:', publicKey.toString());

      // Get message to sign from backend
      const messageRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: publicKey.toString() }),
      });
      
      if (!messageRes.ok) {
        throw new Error(`Failed to get auth message: ${messageRes.status}`);
      }
      
      const { message } = await messageRes.json();

      // Sign the message with wallet
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // Authenticate with backend
      const authRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey.toString(),
          signature,
          message,
        }),
      });

      if (!authRes.ok) {
        const errorData = await authRes.json().catch(() => ({ message: 'Authentication failed' }));
        throw new Error(`Authentication failed: ${errorData.message || authRes.status}`);
      }

      const { accessToken } = await authRes.json();

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Store token and wallet address
      const walletAddress = publicKey.toString();
      api.setToken(accessToken);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_wallet_address', walletAddress);
      }
      
      setIsAuthenticated(true);
      setHasAttemptedAuth(true);
      
      console.log('✅ Wallet authenticated successfully');
      
      toast.success('Wallet Connected', {
        description: 'Authentication successful!',
        duration: 3000
      });
    } catch (error: any) {
      console.log('Authentication failed:', error);
      
      setIsAuthenticated(false);
      setHasAttemptedAuth(true);
      api.clearToken();
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
      
      // Only show error if it's not a user rejection
      if (!error.message?.includes('User rejected') && !error.message?.includes('rejected')) {
        toast.error('Authentication Failed', {
          description: error.message || 'Please try connecting your wallet again'
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage, isAuthenticating]);

  // Handle wallet connection/disconnection
  useEffect(() => {
    if (!connected) {
      // Wallet disconnected - clear everything
      console.log('🔌 Wallet disconnected');
      setIsAuthenticated(false);
      setHasAttemptedAuth(false);
      api.clearToken();
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
      return;
    }

    if (!publicKey || !signMessage) return;

    const currentAddress = publicKey.toString();
    const existingToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const lastWallet = typeof window !== 'undefined' ? localStorage.getItem('last_wallet_address') : null;
    
    // Check if wallet changed
    const walletChanged = lastWallet && currentAddress !== lastWallet;
    
    if (walletChanged) {
      console.log('🔄 Wallet changed, re-authenticating...');
      setIsAuthenticated(false);
      setHasAttemptedAuth(false);
      api.clearToken();
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
      
      authenticate();
      return;
    }

    // Check if we need to authenticate
    if (existingToken && isTokenValid(existingToken) && currentAddress === lastWallet) {
      // Valid token exists
      if (!isAuthenticated) {
        console.log('✅ Restoring authentication from valid token');
        api.setToken(existingToken);
        setIsAuthenticated(true);
        setHasAttemptedAuth(true);
      }
    } else if (!hasAttemptedAuth && !isAuthenticating) {
      // Need to authenticate
      console.log('🔐 No valid token found, authenticating...');
      authenticate();
    }
  }, [connected, publicKey, signMessage, isAuthenticated, hasAttemptedAuth, isAuthenticating, authenticate, isTokenValid]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthenticating, authenticate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

