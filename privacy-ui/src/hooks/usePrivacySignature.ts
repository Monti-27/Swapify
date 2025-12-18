"use client";

import { useState, useCallback, useEffect } from 'react';
import { useSignMessage, type ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana';
import { toast } from 'react-toastify';

/**
 * Hook to manage Privacy Cash signature caching
 * Signs message once per wallet and caches it for future use
 */
export function usePrivacySignature() {
  const { signMessage } = useSignMessage();
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [cancelledWallets, setCancelledWallets] = useState<Set<string>>(new Set());

  // Load cached signatures from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('privacy-signatures');
        if (cached) {
          setSignatures(JSON.parse(cached));
        }
      } catch (error) {
        console.warn('Failed to load cached signatures:', error);
      }
    }
  }, []);

  // Save signatures to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(signatures).length > 0) {
      try {
        localStorage.setItem('privacy-signatures', JSON.stringify(signatures));
      } catch (error) {
        console.warn('Failed to cache signatures:', error);
      }
    }
  }, [signatures]);

  /**
   * Get cached signature for a wallet
   */
  const getCachedSignature = useCallback((walletAddress: string): string | null => {
    return signatures[walletAddress] || null;
  }, [signatures]);

  /**
   * Check if wallet has cached signature or was cancelled
   */
  const hasSignature = useCallback((walletAddress: string): boolean => {
    const hasIt = !!signatures[walletAddress];
    console.log(`Checking signature for ${walletAddress}: ${hasIt}`);
    return hasIt;
  }, [signatures]);

  /**
   * Check if wallet signature was cancelled
   */
  const wasCancelled = useCallback((walletAddress: string): boolean => {
    return cancelledWallets.has(walletAddress);
  }, [cancelledWallets]);

  /**
   * Ensure signature exists for wallet (sign if needed)
   */
  const ensureSignature = useCallback(async (wallet: ConnectedStandardSolanaWallet): Promise<string> => {
    if (!wallet?.address) {
      throw new Error('Invalid wallet provided');
    }

    // Return cached signature if available
    const cached = signatures[wallet.address];
    if (cached) {
      console.log(`Using cached signature for wallet: ${wallet.address}`);
      return cached;
    }

    // Sign message for new wallet
    setIsSigningMessage(true);
    
    try {
      console.log(`Signing Privacy Cash message for wallet: ${wallet.address}`);
      
      const message = new TextEncoder().encode("Privacy Cash encryption key derivation");
      const messageSignature = await signMessage({
        message,
        wallet,
      });
      
      const signedMessage = Buffer.from(messageSignature.signature).toString('base64');
      
      // Cache the signature
      setSignatures(prev => ({
        ...prev,
        [wallet.address]: signedMessage,
      }));
      
      console.log('Privacy Cash signature cached successfully');
      toast.success('Privacy Cash enabled for this wallet');
      
      return signedMessage;
    } catch (error) {
      console.error('Failed to sign Privacy Cash message:', error);
      
      // Mark wallet as cancelled to prevent retry until refresh
      setCancelledWallets(prev => new Set(prev).add(wallet.address));
      
      // Only show error toast if it's not a user cancellation
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.toLowerCase().includes('cancel') && !errorMessage.toLowerCase().includes('reject')) {
        toast.error('Failed to enable Privacy Cash');
      }
      
      throw error;
    } finally {
      setIsSigningMessage(false);
    }
  }, [signMessage, signatures]);

  /**
   * Clear cached signature for a wallet
   */
  const clearSignature = useCallback((walletAddress: string) => {
    setSignatures(prev => {
      const updated = { ...prev };
      delete updated[walletAddress];
      return updated;
    });
  }, []);

  /**
   * Clear all cached signatures
   */
  const clearAllSignatures = useCallback(() => {
    setSignatures({});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('privacy-signatures');
    }
  }, []);

  return {
    ensureSignature,
    getCachedSignature,
    hasSignature,
    wasCancelled,
    clearSignature,
    clearAllSignatures,
    isSigningMessage,
  };
}
