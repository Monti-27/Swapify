import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';
import bs58 from 'bs58';
import { toast } from 'sonner';

export function useAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('auth_token');
      if (existingToken) {
        setIsAuthenticated(true);
      }
    }
  }, []);

  useEffect(() => {
    if (connected && publicKey && signMessage) {
      // Check if already has token
      const existingToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (existingToken) {
        setIsAuthenticated(true);
      } else {
        authenticate();
      }
    } else {
      setIsAuthenticated(false);
      api.clearToken();
    }
  }, [connected, publicKey]);

  const authenticate = async () => {
    if (!publicKey || !signMessage || isAuthenticating) return;

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

      // Store token in API client
      api.setToken(accessToken);
      setIsAuthenticated(true);
      
      console.log('✅ Wallet authenticated successfully');
    } catch (error: any) {
      console.log('Authentication failed:', error);
      setIsAuthenticated(false);
      api.clearToken();
      toast.error('Authentication Failed', {
        description: error.message || 'Please try connecting your wallet again'
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isAuthenticated,
    isAuthenticating,
    authenticate,
  };
}

