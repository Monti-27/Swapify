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
  
  // Instance tracking to detect re-mounts
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  
  // Log provider mount
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [AUTH PROVIDER MOUNT]');
    console.log('🆔 Instance ID:', instanceId.current);
    console.log('📍 Path:', typeof window !== 'undefined' ? window.location.pathname : 'SSR');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, []);

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
    console.log('🔍 [INIT CHECK] Starting initialization...');
    
    if (typeof window === 'undefined') {
      console.log('⚠️ [INIT CHECK] Window undefined (SSR)');
      return;
    }

    const existingToken = localStorage.getItem('auth_token');
    const lastWallet = localStorage.getItem('last_wallet_address');
    const authSession = getAuthSession();
    
    console.log('📦 [STORAGE CHECK]', {
      hasToken: !!existingToken,
      tokenPreview: existingToken ? existingToken.substring(0, 20) + '...' : null,
      lastWallet,
      authSession
    });
    
    if (existingToken && isTokenValid(existingToken)) {
      const tokenExpiry = getTokenExpiry(existingToken);
      
      console.log('✅ [TOKEN VALID] Restoring authentication');
      console.log('  Token expiry:', new Date(tokenExpiry).toISOString());
      console.log('  Last wallet:', lastWallet);
      
      // Restore API token
      api.setToken(existingToken);
      setIsAuthenticated(true);
      
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
        
        console.log('✅ [AUTH RESTORED] from storage');
      }
    } else if (existingToken) {
      console.log('❌ [TOKEN INVALID] Clearing expired token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('last_wallet_address');
      api.clearToken();
      clearAuthSession();
    } else {
      console.log('ℹ️ [NO TOKEN] No existing authentication');
    }
    
    console.log('🏁 [INIT COMPLETE]', {
      isAuthenticated: existingToken && isTokenValid(existingToken),
      hasToken: !!existingToken,
      hasSession: !!authSession,
      walletMatch: authSession?.walletAddress === lastWallet
    });
    
    setIsInitialized(true);
  }, [isTokenValid, getTokenExpiry]);

  // Authenticate function with guard and cooldown
  const authenticate = useCallback(async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 [AUTH REQUEST] Signature request triggered');
    console.log('📍 Path:', typeof window !== 'undefined' ? window.location.pathname : 'unknown');
    console.log('🆔 Instance:', instanceId.current);
    console.log('📊 Call stack:', new Error().stack?.split('\n').slice(2, 6).join('\n'));
    
    if (!publicKey || !signMessage) {
      console.log('⚠️ [AUTH BLOCKED] No publicKey or signMessage');
      return;
    }
    
    if (isAuthenticating) {
      console.log('⚠️ [AUTH BLOCKED] Already authenticating');
      return;
    }
    
    const currentWallet = publicKey.toString();
    const authSession = getAuthSession();
    
    console.log('🔍 [AUTH CHECK]', {
      currentWallet: currentWallet.substring(0, 8) + '...',
      isAuthenticated,
      authSession,
      lastAuthAttempt: lastAuthAttempt.current
    });
    
    // GUARD 1: Check if already authenticated for this wallet
    if (isAuthenticated && authSession?.walletAddress === currentWallet) {
      const timeSinceAuth = Date.now() - authSession.timestamp;
      console.log('✅ [GUARD 1] Already authenticated for this wallet');
      console.log('  Time since auth:', Math.floor(timeSinceAuth / 1000), 'seconds');
      if (timeSinceAuth < 5 * 60 * 1000) { // 5 minutes
        console.log('✅ [AUTH SKIP] Still within valid period');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return;
      } else {
        console.log('⚠️ [AUTH EXPIRED] Auth period expired, re-authenticating');
      }
    }
    
    // GUARD 2: Cooldown - prevent rapid re-authentication attempts
    if (lastAuthAttempt.current?.wallet === currentWallet) {
      const timeSinceLastAttempt = Date.now() - lastAuthAttempt.current.timestamp;
      console.log('🔍 [GUARD 2] Checking cooldown');
      console.log('  Time since last attempt:', Math.floor(timeSinceLastAttempt / 1000), 'seconds');
      if (timeSinceLastAttempt < 5 * 60 * 1000) { // 5 minutes cooldown
        console.log('✅ [AUTH SKIP] Within cooldown period');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return;
      } else {
        console.log('⚠️ [COOLDOWN EXPIRED] Proceeding with auth');
      }
    }
    
    console.log('🔓 [AUTH PROCEED] All guards passed, requesting signature...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
      
      console.log('💾 [SAVING AUTH] Storing to localStorage...');
      
      api.setToken(accessToken);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_wallet_address', walletAddress);
      }
      
      // Update session storage with comprehensive auth state
      const sessionData = {
        walletAddress,
        timestamp: Date.now(),
        tokenExpiry
      };
      
      setAuthSession(sessionData);
      
      console.log('✅ [AUTH SAVED]', sessionData);
      
      // Verify it was saved
      const verify = getAuthSession();
      console.log('✅ [VERIFIED] Session data:', verify);
      
      // Update last auth attempt ref
      lastAuthAttempt.current = {
        wallet: walletAddress,
        timestamp: Date.now()
      };
      
      setIsAuthenticated(true);
      
      console.log('✅ [AUTH SUCCESS] Authentication complete!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      toast.success('Wallet Connected', {
        description: 'Authentication successful!',
        duration: 3000
      });
    } catch (error: any) {
      
      setIsAuthenticated(false);
      api.clearToken();
      clearAuthSession();
      
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

  // Handle wallet connection/disconnection with improved change detection
  useEffect(() => {
    console.log('🔄 [WALLET EFFECT] Triggered', {
      isInitialized,
      connected,
      hasPublicKey: !!publicKey,
      isAuthenticated,
      isAuthenticating
    });
    
    // Don't run until initialization is complete
    if (!isInitialized) {
      console.log('⏳ [WALLET EFFECT] Waiting for initialization...');
      return;
    }
    
    if (!connected) {
      console.log('🔌 [WALLET DISCONNECTED] Clearing auth...');
      // Wallet disconnected - clear everything
      setIsAuthenticated(false);
      api.clearToken();
      clearAuthSession();
      lastAuthAttempt.current = null;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
      return;
    }

    if (!publicKey || !signMessage) {
      console.log('⚠️ [WALLET EFFECT] No publicKey or signMessage yet');
      return;
    }

    const currentAddress = publicKey.toString();
    const authSession = getAuthSession();
    const existingToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    console.log('🔍 [WALLET EFFECT CHECK]', {
      currentAddress: currentAddress.substring(0, 8) + '...',
      authSessionWallet: authSession?.walletAddress?.substring(0, 8) + '...',
      hasToken: !!existingToken,
      isAuthenticated,
      isAuthenticating
    });
    
    // Check if wallet changed
    const walletChanged = authSession?.walletAddress && currentAddress !== authSession.walletAddress;
    
    if (walletChanged) {
      console.log('🔄 [WALLET CHANGED] New wallet detected, clearing old auth');
      setIsAuthenticated(false);
      api.clearToken();
      clearAuthSession();
      lastAuthAttempt.current = null;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('last_wallet_address');
      }
      
      // Trigger new authentication for the new wallet
      console.log('🔐 [WALLET CHANGED] Triggering new auth...');
      authenticate();
      return;
    }

    // Check if we need to authenticate (only if not already authenticated)
    if (!isAuthenticated && !isAuthenticating) {
      console.log('🔍 [AUTH NEEDED] Not authenticated, checking token...');
      // Check if we have a valid token for this wallet
      if (existingToken && isTokenValid(existingToken) && authSession?.walletAddress === currentAddress) {
        console.log('✅ [TOKEN RESTORE] Valid token found, restoring auth');
        api.setToken(existingToken);
        setIsAuthenticated(true);
      } else {
        console.log('❌ [NO VALID TOKEN] Triggering authentication...');
        // No valid auth - trigger authentication
        authenticate();
      }
    } else {
      console.log('✅ [ALREADY AUTHENTICATED] Skipping auth check');
    }
  }, [connected, publicKey, signMessage, isAuthenticated, isAuthenticating, authenticate, isTokenValid, isInitialized]);

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

