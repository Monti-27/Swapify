'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatedModal } from '@/components/ui/animated-modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Zap, Loader2 } from 'lucide-react';
import { useTokens, type Token } from '@/hooks/useTokens';

interface TokenSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelectToken: (token: Token) => void;
  selectedToken?: Token;
}

export function TokenSelectModal({
  open,
  onClose,
  onSelectToken,
  selectedToken,
}: TokenSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { popularTokens, isLoading, searchTokens } = useTokens();

  // Debounced search
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchTokens(searchQuery, 50);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchTokens]);

  const displayedTokens = useMemo(() => {
    if (searchQuery) {
      return searchResults;
    }
    return popularTokens;
  }, [searchQuery, searchResults, popularTokens]);

  const handleSelectToken = (token: Token) => {
    onSelectToken(token);
    setSearchQuery('');
    onClose();
  };

  const getTokenIcon = (token: Token) => {
    const iconUrl = token.logoURI || token.icon;
    if (iconUrl) {
      return (
        <img
          src={iconUrl}
          alt={token.symbol}
          className="h-8 w-8 rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    return (
      <div className="h-8 w-8 rounded-full gradient-purple-hero flex items-center justify-center">
        <span className="text-white text-xs font-bold">
          {token.symbol.slice(0, 2)}
        </span>
      </div>
    );
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      maxWidth="md"
      className="p-6"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            Select Token
          </h2>
        </div>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Popular Tokens */}
          {!searchQuery && popularTokens.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Popular Tokens</p>
              <div className="flex flex-wrap gap-2">
                {popularTokens.slice(0, 6).map((token) => (
                  <Button
                    key={token.address}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectToken(token)}
                    className="rounded-full"
                  >
                    {token.symbol}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Token List */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {isLoading || isSearching ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading tokens...</p>
              </div>
            ) : displayedTokens.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No tokens found</p>
              </div>
            ) : (
              displayedTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => handleSelectToken(token)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors ${
                    (selectedToken?.address === token.address || selectedToken?.id === token.id || 
                     selectedToken?.address === token.id || selectedToken?.id === token.address) ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getTokenIcon(token)}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{token.symbol}</span>
                        {token.tags?.includes('popular') && (
                          <Zap className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{token.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {token.tags?.includes('stablecoin') && (
                      <Badge variant="secondary" className="text-xs">
                        Stablecoin
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </AnimatedModal>
  );
}

