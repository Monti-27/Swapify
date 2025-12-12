import { useState, useEffect, useCallback } from 'react';
import { api as apiClient } from '@/lib/api';
import { toast } from 'sonner';

export interface Token {
  id?: string; // Jupiter API V2 uses 'id'
  address: string; // Required - normalized field
  name: string;
  symbol: string;
  decimals: number;
  icon?: string; // Jupiter API V2 uses 'icon'
  logoURI?: string; // Normalized field
  tags?: string[];
  daily_volume?: number;
}

// Normalize token to ensure address field exists
function normalizeToken(token: any): Token {
  return {
    ...token,
    address: token.address || token.id || token.mint || '',
    logoURI: token.logoURI || token.icon,
  };
}

export function useTokens() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [popularTokens, setPopularTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch popular tokens for quick access
      const popular = await apiClient.getPopularTokens();
      setPopularTokens((popular || []).map(normalizeToken));

      // Optionally load all tokens (can be large)
      // For better UX, we'll fetch all tokens in background
      setTimeout(async () => {
        try {
          const all = await apiClient.getAllTokens();
          setTokens((all || []).map(normalizeToken));
        } catch (err) {
          console.log('Error loading all tokens:', err);
          toast.error('Failed to load token list', {
            description: 'Using cached tokens'
          });
        }
      }, 1000);
    } catch (err: any) {
      console.log('Error loading tokens:', err);
      setError(err.message || 'Failed to load tokens');
      toast.error('Failed to load tokens', {
        description: 'Using default token list'
      });
      
      // Fallback to hardcoded popular tokens if API fails
      setPopularTokens([
        {
          id: 'So11111111111111111111111111111111111111112',
          address: 'So11111111111111111111111111111111111111112',
          name: 'Wrapped SOL',
          symbol: 'SOL',
          decimals: 9,
          icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        },
        {
          id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        },
        {
          id: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          name: 'USDT',
          symbol: 'USDT',
          decimals: 6,
          icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchTokens = useCallback(async (query: string, limit = 50): Promise<Token[]> => {
    try {
      const results = await apiClient.searchTokens(query, limit);
      return (results || []).map(normalizeToken);
    } catch (err) {
      console.log('Error searching tokens:', err);
      
      // Fallback to local search in loaded tokens
      const lowerQuery = query.toLowerCase();
      return [...popularTokens, ...tokens].filter(token =>
        token.symbol.toLowerCase().includes(lowerQuery) ||
        token.name.toLowerCase().includes(lowerQuery) ||
        (token.address && token.address.toLowerCase().includes(lowerQuery)) ||
        (token.id && token.id.toLowerCase().includes(lowerQuery))
      ).slice(0, limit);
    }
  }, [popularTokens, tokens]);

  const getTokenByAddress = useCallback(async (address: string): Promise<Token | null> => {
    try {
      // First check loaded tokens
      const found = [...popularTokens, ...tokens].find(t => 
        t.address === address || t.id === address
      );
      if (found) return found;

      // If not found, fetch from API
      const token = await apiClient.getTokenByMint(address);
      return token ? normalizeToken(token) : null;
    } catch (err) {
      console.log('Error getting token by address:', err);
      return null;
    }
  }, [popularTokens, tokens]);

  return {
    tokens,
    popularTokens,
    isLoading,
    error,
    searchTokens,
    getTokenByAddress,
    refreshTokens: loadTokens,
  };
}

