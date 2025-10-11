'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTransactionStore } from '@/store/transactionStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Clock, ExternalLink, Filter, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecentTransactionsProps {
  limit?: number;
  showFilters?: boolean;
}

export function RecentTransactions({ limit = 10, showFilters = true }: RecentTransactionsProps) {
  const { transactions } = useTransactionStore();
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [tokenFilter, setTokenFilter] = useState<string>('all');
  
  // Debug: Log transactions whenever they change
  useEffect(() => {
    console.log('🔄 Transactions in RecentTransactions component:', transactions.map(tx => ({
      id: tx.id,
      status: tx.status,
      signature: tx.signature.slice(0, 8) + '...'
    })));
  }, [transactions]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Get unique tokens for filter
  const uniqueTokens = useMemo(() => {
    const tokens = new Set<string>();
    transactions.forEach(tx => {
      tokens.add(tx.fromToken);
      tokens.add(tx.toToken);
    });
    return Array.from(tokens).sort();
  }, [transactions]);

  // Filter and sort transactions
  const filteredTxs = useMemo(() => {
    let filtered = [...transactions];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Apply token filter
    if (tokenFilter !== 'all') {
      filtered = filtered.filter(tx => 
        tx.fromToken === tokenFilter || tx.toToken === tokenFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      return sortBy === 'newest' 
        ? b.timestamp - a.timestamp 
        : a.timestamp - b.timestamp;
    });

    // Apply limit
    return filtered.slice(0, limit);
  }, [transactions, statusFilter, tokenFilter, sortBy, limit]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatSignature = (sig: string) => {
    return `${sig.slice(0, 4)}...${sig.slice(-4)}`;
  };

  // Format token amounts with appropriate decimal places
  const formatAmount = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(num)) return '0.000000';
    
    // For very small amounts, show more decimals
    if (num < 0.00001) {
      return num.toFixed(9);
    } else if (num < 0.01) {
      return num.toFixed(8);
    } else if (num < 1) {
      return num.toFixed(6);
    } else if (num < 100) {
      return num.toFixed(4);
    } else {
      return num.toFixed(2);
    }
  };

  // Get token logo with multiple fallback options
  const getTokenLogo = (tokenAddress?: string, tokenSymbol?: string, providedLogo?: string): string | undefined => {
    // Token logo fallback map with CDN and multiple sources
    const TOKEN_LOGO_MAP: Record<string, string> = {
      // SOL
      'So11111111111111111111111111111111111111112': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      'SOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      // USDC
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      'USDC': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      // USDT
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
      'USDT': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
      // BONK
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
      'BONK': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
      // mSOL
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
      'mSOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
      // JitoSOL
      'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn/logo.png',
      'jitoSOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn/logo.png',
      // JupSOL
      'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v/logo.png',
      'jupSOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v/logo.png',
    };

    // Priority: provided logo > address lookup > symbol lookup
    if (providedLogo) return providedLogo;
    if (tokenAddress && TOKEN_LOGO_MAP[tokenAddress]) return TOKEN_LOGO_MAP[tokenAddress];
    if (tokenSymbol && TOKEN_LOGO_MAP[tokenSymbol]) return TOKEN_LOGO_MAP[tokenSymbol];
    
    return providedLogo;
  };

  // Convert token address to symbol if it's an address
  const getTokenDisplay = (token: string): string => {
    // Common Solana token addresses
    const tokenMap: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn': 'pumpCm',
      'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v': 'JupSOL',
      'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'JITOSOL',
      'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': 'bSOL',
      'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 'PYTH',
      'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux': 'HNT',
    };

    // If it's a long address-like string, try to map it or shorten it
    if (token.length > 20) {
      return tokenMap[token] || `${token.slice(0, 6)}...${token.slice(-4)}`;
    }

    return token;
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your transaction history will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground">Start swapping to see your history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              {filteredTxs.length} transaction{filteredTxs.length !== 1 ? 's' : ''}
              {(statusFilter !== 'all' || tokenFilter !== 'all') && ' (filtered)'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1 text-sm rounded-lg border bg-background hover:bg-accent transition-colors cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            {/* Token Filter */}
            <select
              value={tokenFilter}
              onChange={(e) => setTokenFilter(e.target.value)}
              className="px-3 py-1 text-sm rounded-lg border bg-background hover:bg-accent transition-colors cursor-pointer"
            >
              <option value="all">All Tokens</option>
              {uniqueTokens.map(token => (
                <option key={token} value={token}>{getTokenDisplay(token)}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 text-sm rounded-lg border bg-background hover:bg-accent transition-colors cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {/* Clear Filters */}
            {(statusFilter !== 'all' || tokenFilter !== 'all' || sortBy !== 'newest') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setTokenFilter('all');
                  setSortBy('newest');
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Transactions List */}
        {filteredTxs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No transactions match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTxs.map((tx) => {
              const fromTokenSymbol = getTokenDisplay(tx.fromToken);
              const toTokenSymbol = getTokenDisplay(tx.toToken);
              const fromTokenLogo = getTokenLogo(tx.fromTokenAddress, tx.fromToken, tx.fromTokenLogo);
              const toTokenLogo = getTokenLogo(tx.toTokenAddress, tx.toToken, tx.toTokenLogo);
              
              return (
              <div
                key={tx.id}
                className="rounded-xl border p-4 hover:bg-muted/50 transition-colors"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-full p-1.5 ${
                      tx.type === 'swap' 
                        ? 'bg-cyan-500/10 text-cyan-500' 
                        : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-sm">
                      Swapped
                    </span>
                    {getStatusIcon(tx.status)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(tx.timestamp)}
                    </span>
                    {tx.explorerUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        asChild
                      >
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on Solscan"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="flex items-center justify-between pl-8">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    {/* From Token */}
                    <div className="flex items-center gap-1.5">
                      {fromTokenLogo ? (
                        <img 
                          src={fromTokenLogo} 
                          alt={fromTokenSymbol}
                          className="h-5 w-5 rounded-full"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">
                            {fromTokenSymbol.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-red-400 font-medium">
                        -{formatAmount(tx.fromAmount || '0')} {fromTokenSymbol}
                      </span>
                    </div>
                    
                    <span className="text-muted-foreground">→</span>
                    
                    {/* To Token */}
                    <div className="flex items-center gap-1.5">
                      {toTokenLogo ? (
                        <img 
                          src={toTokenLogo} 
                          alt={toTokenSymbol}
                          className="h-5 w-5 rounded-full"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">
                            {toTokenSymbol.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-green-400 font-medium">
                        +{formatAmount(tx.toAmount || '0')} {toTokenSymbol}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="flex items-center gap-1 mt-2 pl-8 text-xs text-muted-foreground">
                  <span>TX:</span>
                  <span className="font-mono">{formatSignature(tx.signature)}</span>
                </div>
              </div>
            )}
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

