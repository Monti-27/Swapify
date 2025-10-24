'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import bs58 from 'bs58';
import { toast } from 'sonner';

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authenticate: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Enhanced session-level auth tracking
interface AuthSession {
  walletAddress: string;
  timestamp: number;
  tokenExpiry: number;
}

const getAuthSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const sessionData = localStorage.getItem('auth_session');
    return sessionData ? JSON.parse(sessionData) : null;
  } catch {
    return null;
  }
};

const setAuthSession = (session: AuthSession | null) => {
  if (typeof window === 'undefined') return;
  if (session) {
    localStorage.setItem('auth_session', JSON.stringify(session));
  } else {
    localStorage.removeItem('auth_session');
  }
};

const clearAuthSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_session');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use ref to track last authentication to prevent rapid re-auth
  const lastAuthAttempt = useRef<{ wallet: string; timestamp: number } | null>(null);
  
  // Track if we've authenticated this session to prevent re-auth on navigation
  const hasAuthenticatedThisSession = useRef<boolean>(false);
  const currentWalletRef = useRef<string | null>(null);

  // Helper function to check if token is valid
  const isTokenValid = useCallback((token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Token is valid if it expires more than 5 minutes from now
      // Backend JWT expires in 7 days, so this gives us a good buffer
      return timeUntilExpiry > 5 * 60 * 1000;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  }, []);
  
  // Helper to get token expiry timestamp
  const getTokenExpiry = useCallback((token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000;
    } catch {
      return 0;
    }
  }, []);

  // Consolidated token restoration on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingToken = localStorage.getItem('auth_token');
    const lastWallet = localStorage.getItem('last_wallet_address');
    const authSession = getAuthSession();
    
    if (existingToken && isTokenValid(existingToken)) {
      const tokenExpiry = getTokenExpiry(existingToken);
      
      // Restore API token
      api.setToken(existingToken);
      setIsAuthenticated(true);
      
      // Mark as authenticated this session to prevent re-auth
      hasAuthenticatedThisSession.current = true;
      currentWalletRef.current = lastWallet;
      
      // Update session if wallet address is available
      if (lastWallet) {
        setAuthSession({
          walletAddress: lastWallet,
          timestamp: Date.now(),
          tokenExpiry
        });
        
        lastAuthAttempt.current = {
          wallet: lastWallet,
          timestamp: Date.now()
        };
      }
      
      console.log('✅ Restored authentication session for wallet:', lastWallet?.slice(0, 8) + '...');
    } else if (existingToken) {
      console.log('❌ Token expired, clearing auth state');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('last_wallet_address');
      api.clearToken();
      clearAuthSession();
    }
    
    setIsInitialized(true);
  }, [isTokenValid, getTokenExpiry]);

  // Authenticate function with enhanced guards
  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) return;
    if (isAuthenticating) return;
    
    const currentWallet = publicKey.toString();
    const authSession = getAuthSession();
    
    // GUARD 1: Check if already authenticated for this wallet in this session
    if (isAuthenticated && hasAuthenticatedThisSession.current && currentWalletRef.current === currentWallet) {
      console.log('🔒 Already authenticated this session, skipping');
      return;
    }
    
    // GUARD 2: Check if already authenticated for this wallet with valid session
    if (isAuthenticated && authSession?.walletAddress === currentWallet) {
      const timeSinceAuth = Date.now() - authSession.timestamp;
      if (timeSinceAuth < 5 * 60 * 1000) {
        console.log('🔒 Recently authenticated, skipping');
        return;
      }
    }
    
    // GUARD 3: Cooldown - prevent rapid re-authentication attempts
    if (lastAuthAttempt.current?.wallet === currentWallet) {
      const timeSinceLastAttempt = Date.now() - lastAuthAttempt.current.timestamp;
      if (timeSinceLastAttempt < 5 * 60 * 1000) {
        console.log('🔒 Cooldown active, skipping');
        return;
      }
    }

    try {
      setIsAuthenticating(true);

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
      const tokenExpiry = getTokenExpiry(accessToken);
      
      api.setToken(accessToken);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_wallet_address', walletAddress);
      }
      
      // Update session storage with comprehensive auth state
      setAuthSession({
        walletAddress,
        timestamp: Date.now(),
        tokenExpiry
      });
      
      // Update last auth attempt ref
      lastAuthAttempt.current = {
        wallet: walletAddress,
        timestamp: Date.now()
      };
      
      // Mark as authenticated this session
      hasAuthenticatedThisSession.current = true;
      currentWalletRef.current = walletAddress;
      
      setIsAuthenticated(true);
      
      console.log('✅ Authentication successful for wallet:', walletAddress.slice(0, 8) + '...');
      
      toast.success('Wallet Connected', {
        description: 'Authentication successful!',
        duration: 3000
      });
    } catch (error: any) {
      console.error('❌ Authentication failed:', error.message);
      
      setIsAuthenticated(false);
      api.clearToken();
      clearAuthSession();
      
      // Clear session tracking
      hasAuthenticatedThisSession.current = false;
      currentWalletRef.current = null;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
      
      // Update last attempt even on failure to prevent spam
      if (publicKey) {
        lastAuthAttempt.current = {
          wallet: publicKey.toString(),
          timestamp: Date.now()
        };
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
  }, [publicKey, signMessage, isAuthenticating, isAuthenticated, getTokenExpiry]);

  // Explicit logout function
  const logout = useCallback(() => {
    console.log('🚪 Logging out user');
    
    setIsAuthenticated(false);
    api.clearToken();
    clearAuthSession();
    
    // Clear session tracking
    hasAuthenticatedThisSession.current = false;
    currentWalletRef.current = null;
    lastAuthAttempt.current = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('last_wallet_address');
    }
    
    toast.info('Logged out', {
      description: 'Authentication cleared'
    });
  }, []);

  // Handle wallet connection/disconnection with improved change detection
  useEffect(() => {
    // Don't run until initialization is complete
    if (!isInitialized) return;
    
    if (!connected) {
      // Wallet disconnected - clear everything
      console.log('🔌 Wallet disconnected, clearing auth state');
      setIsAuthenticated(false);
      api.clearToken();
      clearAuthSession();
      lastAuthAttempt.current = null;
      hasAuthenticatedThisSession.current = false;
      currentWalletRef.current = null;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
      return;
    }

    if (!publicKey || !signMessage) return;

    const currentAddress = publicKey.toString();
    const authSession = getAuthSession();
    const existingToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    // CRITICAL: If already authenticated with valid session, DO NOTHING
    if (isAuthenticated && hasAuthenticatedThisSession.current && currentWalletRef.current === currentAddress) {
      console.log('🔒 Already authenticated this session, skipping re-auth');
      return;
    }
    
    // Check if wallet changed
    const walletChanged = currentWalletRef.current && currentAddress !== currentWalletRef.current;
    
    if (walletChanged) {
      console.log('🔄 Wallet changed, clearing previous auth');
      setIsAuthenticated(false);
      api.clearToken();
      clearAuthSession();
      lastAuthAttempt.current = null;
      hasAuthenticatedThisSession.current = false;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
    }

    // Check if we need to authenticate (only if not already authenticated)
    if (!isAuthenticated && !isAuthenticating) {
      // BULLETPROOF CHECK: Verify both token AND session match current wallet
      if (existingToken && isTokenValid(existingToken) && authSession?.walletAddress === currentAddress) {
        console.log('✅ Restoring valid authentication from storage');
        api.setToken(existingToken);
        setIsAuthenticated(true);
        hasAuthenticatedThisSession.current = true;
        currentWalletRef.current = currentAddress;
        
        // Update last auth attempt to prevent immediate re-auth
        lastAuthAttempt.current = {
          wallet: currentAddress,
          timestamp: Date.now()
        };
      } else {
        // No valid auth - trigger authentication
        console.log('🔐 No valid auth found, triggering authentication');
        authenticate();
      }
    }
  }, [connected, publicKey, signMessage, isAuthenticated, isAuthenticating, isTokenValid, isInitialized]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthenticating, authenticate, logout }}>
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

