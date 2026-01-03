'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useEffect } from 'react';

const JUPITER_TOKEN_API = 'https://lite-api.jup.ag/tokens/v2';

export interface JupiterToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  daily_volume?: number;
  freeze_authority?: string | null;
  mint_authority?: string | null;
}

interface JupiterTokenV2 {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
  tags?: string[];
  isVerified?: boolean;
  usdPrice?: number;
}

function mapV2Token(token: JupiterTokenV2): JupiterToken {
  return {
    address: token.id,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    logoURI: token.icon,
    tags: token.isVerified ? ['verified', ...(token.tags || [])] : token.tags,
  };
}

const POPULAR_TOKENS: JupiterToken[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    name: 'Wrapped SOL',
    symbol: 'SOL',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    tags: ['verified'],
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    tags: ['verified'],
  },
  {
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    name: 'USDT',
    symbol: 'USDT',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
    tags: ['verified'],
  },
  {
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    name: 'Jupiter',
    symbol: 'JUP',
    decimals: 6,
    logoURI: 'https://static.jup.ag/jup/icon.png',
    tags: ['verified'],
  },
  {
    address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    name: 'Marinade staked SOL',
    symbol: 'mSOL',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
    tags: ['verified'],
  },
  {
    address: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
    name: 'BlazeStake Staked SOL',
    symbol: 'bSOL',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png',
    tags: ['verified'],
  },
  {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    name: 'Bonk',
    symbol: 'BONK',
    decimals: 5,
    logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
    tags: ['verified'],
  },
  {
    address: 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk',
    name: 'Wen',
    symbol: 'WEN',
    decimals: 5,
    logoURI: 'https://shdw-drive.genesysgo.net/GwJapVHVvfM4Mw4sWszkzywncUWuxxPd6s9VuFfXRgie/wen_logo.png',
    tags: ['verified'],
  },
  {
    address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    name: 'Pyth Network',
    symbol: 'PYTH',
    decimals: 6,
    logoURI: 'https://pyth.network/token.svg',
    tags: ['verified'],
  },
  {
    address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
    name: 'Render Token',
    symbol: 'RENDER',
    decimals: 8,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png',
    tags: ['verified'],
  },
];

async function fetchVerifiedTokens(): Promise<JupiterToken[]> {
  try {
    const response = await fetch(`${JUPITER_TOKEN_API}/tag?query=verified`);
    
    if (!response.ok) {
      console.error('Failed to fetch verified tokens:', response.status);
      return POPULAR_TOKENS;
    }
    
    const data: JupiterTokenV2[] = await response.json();
    return data.map(mapV2Token);
  } catch (error) {
    console.error('Error fetching verified tokens:', error);
    return POPULAR_TOKENS;
  }
}

async function searchTokens(query: string): Promise<JupiterToken[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const response = await fetch(`${JUPITER_TOKEN_API}/search?query=${encodeURIComponent(query.trim())}`);
    
    if (!response.ok) {
      console.error('Search API error:', response.status);
      return [];
    }
    
    const data: JupiterTokenV2[] = await response.json();
    return data.map(mapV2Token);
  } catch (error) {
    console.error('Error searching tokens:', error);
    return [];
  }
}

async function fetchTokenByMint(mint: string): Promise<JupiterToken | null> {
  try {
    const response = await fetch(`${JUPITER_TOKEN_API}/search?query=${mint}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data: JupiterTokenV2[] = await response.json();
    if (data.length > 0) {
      return mapV2Token(data[0]);
    }
    return null;
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
}

interface TokenPage {
  tokens: JupiterToken[];
  nextOffset: number;
  hasMore: boolean;
}

const PAGE_SIZE = 50;

let cachedTokens: JupiterToken[] | null = null;

async function fetchTokensPage({ pageParam = 0 }): Promise<TokenPage> {
  try {
    if (!cachedTokens) {
      cachedTokens = await fetchVerifiedTokens();
    }
    
    const allTokens = cachedTokens;
    const start = pageParam;
    const end = start + PAGE_SIZE;
    const pageTokens = allTokens.slice(start, end);
    
    return {
      tokens: pageTokens,
      nextOffset: end,
      hasMore: end < allTokens.length,
    };
  } catch (error) {
    console.error('Error fetching tokens page:', error);
    return {
      tokens: POPULAR_TOKENS,
      nextOffset: POPULAR_TOKENS.length,
      hasMore: false,
    };
  }
}

export function useJupiterTokens() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: paginatedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingList,
    error: listError,
  } = useInfiniteQuery({
    queryKey: ['jupiter-tokens-paginated'],
    queryFn: fetchTokensPage,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useQuery({
    queryKey: ['jupiter-token-search', debouncedQuery],
    queryFn: () => searchTokens(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const allLoadedTokens = useMemo(() => {
    if (!paginatedData?.pages) return POPULAR_TOKENS;
    const tokens = paginatedData.pages.flatMap(page => page.tokens);
    return tokens.length > 0 ? tokens : POPULAR_TOKENS;
  }, [paginatedData]);

  const filteredTokens = useMemo(() => {
    if (debouncedQuery.length >= 1 && searchResults && searchResults.length > 0) {
      return searchResults;
    }
    return allLoadedTokens;
  }, [debouncedQuery, searchResults, allLoadedTokens]);

  const getTokenByAddress = useCallback(async (address: string): Promise<JupiterToken | undefined> => {
    const found = allLoadedTokens.find(token => token.address === address);
    if (found) return found;
    
    const popularFound = POPULAR_TOKENS.find(token => token.address === address);
    if (popularFound) return popularFound;
    
    const fetched = await fetchTokenByMint(address);
    return fetched || undefined;
  }, [allLoadedTokens]);

  const isLoading = isLoadingList || (debouncedQuery.length >= 1 && isSearching);
  const error = listError || searchError;

  return {
    tokens: allLoadedTokens,
    popularTokens: POPULAR_TOKENS,
    filteredTokens,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    getTokenByAddress,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isSearching: debouncedQuery.length >= 1 && isSearching,
  };
}
