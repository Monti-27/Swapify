'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const JUPITER_QUOTE_API = 'https://lite-api.jup.ag/swap/v1/quote';
const REFRESH_INTERVAL = 4000;
const DEBOUNCE_DELAY = 300;

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null | {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface UseJupiterQuoteOptions {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  enabled?: boolean;
}

async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number
): Promise<JupiterQuoteResponse | null> {
  if (!inputMint || !outputMint || !amount || amount === '0') {
    return null;
  }

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: slippageBps.toString(),
    swapMode: 'ExactIn',
    restrictIntermediateTokens: 'true',
  });

  const response = await fetch(`${JUPITER_QUOTE_API}?${params.toString()}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch quote: ${response.status}`);
  }

  return response.json();
}

export function useJupiterQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps = 50,
  enabled = true,
}: UseJupiterQuoteOptions) {
  const [debouncedAmount, setDebouncedAmount] = useState(amount);
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL / 1000);
  const queryClient = useQueryClient();
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmount(amount);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [amount]);

  const isValidQuery = useMemo(() => {
    return (
      enabled &&
      inputMint &&
      outputMint &&
      debouncedAmount &&
      debouncedAmount !== '0' &&
      inputMint !== outputMint
    );
  }, [enabled, inputMint, outputMint, debouncedAmount]);

  const queryKey = useMemo(() => 
    ['jupiter-quote', inputMint, outputMint, debouncedAmount, slippageBps],
    [inputMint, outputMint, debouncedAmount, slippageBps]
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      lastFetchTime.current = Date.now();
      return fetchJupiterQuote(inputMint, outputMint, debouncedAmount, slippageBps);
    },
    enabled: isValidQuery,
    refetchInterval: REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
    staleTime: REFRESH_INTERVAL - 500,
    gcTime: 60000,
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isValidQuery || !query.data) {
      setRefreshCountdown(REFRESH_INTERVAL / 1000);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastFetchTime.current;
      const remaining = Math.max(0, Math.ceil((REFRESH_INTERVAL - elapsed) / 1000));
      setRefreshCountdown(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [isValidQuery, query.data, query.dataUpdatedAt]);

  useEffect(() => {
    if (query.error && isValidQuery) {
      toast.error('Failed to get quote', {
        description: (query.error as Error)?.message || 'Please try again',
      });
    }
  }, [query.error, isValidQuery]);

  const manualRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const priceImpact = useMemo(() => {
    if (!query.data?.priceImpactPct) return 0;
    return parseFloat(query.data.priceImpactPct) * 100;
  }, [query.data]);

  const isHighPriceImpact = priceImpact > 1;
  const isVeryHighPriceImpact = priceImpact > 5;

  const isDebouncing = amount !== debouncedAmount;

  return {
    quote: query.data,
    isLoading: query.isLoading || (isDebouncing && isValidQuery),
    isFetching: query.isFetching,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error,
    refetch: manualRefetch,
    priceImpact,
    isHighPriceImpact,
    isVeryHighPriceImpact,
    refreshCountdown,
    lastUpdated: query.dataUpdatedAt,
  };
}
