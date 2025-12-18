import { useQuery } from '@tanstack/react-query';

interface BalanceInfo {
  lamports: number;
  sol: number;
  formatted: string;
}

interface BalanceResponse {
  wallet: BalanceInfo;
}

async function fetchWalletBalance(walletAddress: string): Promise<BalanceResponse> {
  const response = await fetch(`/api/wallet/balance?address=${encodeURIComponent(walletAddress)}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch wallet balance');
  }
  
  return response.json();
}

export function useWalletBalance(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['wallet-balance', walletAddress],
    queryFn: () => fetchWalletBalance(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 10, // Consider data stale after 10 minutes (longer cache)
    gcTime: 1000 * 60 * 15, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false, // Don't auto-refetch on window focus
    refetchOnMount: false, // Don't auto-refetch on component mount if data exists
    // Remove automatic refetch interval - user will manually refresh
  });
}
