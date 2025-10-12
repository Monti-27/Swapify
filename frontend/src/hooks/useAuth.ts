import { useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import bs58 from 'bs58';
import { toast } from 'sonner';

// Global state to track authentication across all hook instances
let globalAuthState = {
  isAuthenticated: false,
  isAuthenticating: false,
  walletAddress: null as string | null,
};

export function useAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(globalAuthState.isAuthenticated);
  const [isAuthenticating, setIsAuthenticating] = useState(globalAuthState.isAuthenticating);
  const authAttemptedRef = useRef(false);
  const currentWalletRef = useRef<string | null>(null);

  // Sync with global state
  useEffect(() => {
    setIsAuthenticated(globalAuthState.isAuthenticated);
    setIsAuthenticating(globalAuthState.isAuthenticating);
  }, []);

  // Helper function to check if token is valid and not expired
  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Token is valid if it expires more than 5 minutes from now
      return timeUntilExpiry > 5 * 60 * 1000;
    } catch (error) {
      console.log('Invalid token format:', error);
      return false;
    }
  };

  // Check for existing valid token on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('auth_token');
      const lastWallet = localStorage.getItem('last_wallet_address');
      
      if (existingToken && isTokenValid(existingToken)) {
        console.log('✅ Valid token found, using existing authentication');
        api.setToken(existingToken);
        globalAuthState.isAuthenticated = true;
        globalAuthState.walletAddress = lastWallet;
        setIsAuthenticated(true);
      } else if (existingToken) {
        console.log('🔄 Token expired, clearing...');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
        api.clearToken();
        globalAuthState.isAuthenticated = false;
        globalAuthState.walletAddress = null;
      }
    }
  }, []);

  useEffect(() => {
    const currentAddress = publicKey?.toString() || null;
    currentWalletRef.current = currentAddress;

    if (connected && publicKey && signMessage) {
      const existingToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const lastWallet = typeof window !== 'undefined' ? localStorage.getItem('last_wallet_address') : null;
      
      // Check if we switched wallets
      const walletChanged = lastWallet && currentAddress && lastWallet !== currentAddress;
      
      if (walletChanged) {
        console.log('🔄 Wallet changed, re-authenticating...');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
        api.clearToken();
        globalAuthState.isAuthenticated = false;
        globalAuthState.walletAddress = null;
        authAttemptedRef.current = false;
        authenticate();
      } else if (existingToken && isTokenValid(existingToken) && currentAddress === lastWallet) {
        // Token exists, is valid, and wallet hasn't changed
        console.log('✅ Using existing valid token');
        api.setToken(existingToken);
        globalAuthState.isAuthenticated = true;
        globalAuthState.walletAddress = currentAddress;
        setIsAuthenticated(true);
      } else if (!globalAuthState.isAuthenticating && !authAttemptedRef.current) {
        // Need to authenticate
        authAttemptedRef.current = true;
        authenticate();
      }
    } else {
      // Wallet disconnected
      if (globalAuthState.isAuthenticated || authAttemptedRef.current) {
        console.log('🔌 Wallet disconnected, clearing auth');
        authAttemptedRef.current = false;
        globalAuthState.isAuthenticated = false;
        globalAuthState.walletAddress = null;
        globalAuthState.isAuthenticating = false;
        setIsAuthenticated(false);
        api.clearToken();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('last_wallet_address');
        }
      }
    }
  }, [connected, publicKey]);

  const authenticate = async () => {
    if (!publicKey || !signMessage) return;
    
    // Prevent multiple simultaneous authentication attempts
    if (globalAuthState.isAuthenticating) {
      console.log('⏳ Authentication already in progress, skipping...');
      return;
    }

    try {
      globalAuthState.isAuthenticating = true;
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
      
      // Convert signature to base58
      const signature = bs58.encode(signatureBytes);

      console.log('🔐 Authenticating with signature...');

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
      
      // Update global state
      globalAuthState.isAuthenticated = true;
      globalAuthState.walletAddress = walletAddress;
      setIsAuthenticated(true);
      
      console.log('✅ Wallet authenticated successfully and token saved');
      
      toast.success('Wallet Connected', {
        description: 'Authentication successful!'
      });
    } catch (error: any) {
      console.log('Authentication failed:', error);
      
      // Clear auth state on failure
      globalAuthState.isAuthenticated = false;
      globalAuthState.walletAddress = null;
      authAttemptedRef.current = false;
      
      setIsAuthenticated(false);
      api.clearToken();
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
      
      // Only show error if it's not a user rejection
      if (!error.message?.includes('User rejected')) {
        toast.error('Authentication Failed', {
          description: error.message || 'Please try connecting your wallet again'
        });
      }
    } finally {
      globalAuthState.isAuthenticating = false;
      setIsAuthenticating(false);
    }
  };

  return {
    isAuthenticated,
    isAuthenticating,
    authenticate,
  };
}

