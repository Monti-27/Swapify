"use client";

import React, { useCallback, useRef, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { useJupiterTokens, JupiterToken } from '@/hooks/useJupiterTokens';

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: JupiterToken) => void;
  excludeToken?: string;
}

function TokenIcon({ logoURI, symbol, size = 32 }: { logoURI?: string; symbol: string; size?: number }) {
  if (logoURI) {
    return (
      <img 
        src={logoURI} 
        alt={symbol} 
        width={size} 
        height={size} 
        className="rounded-full"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return (
    <span 
      className="rounded-full bg-[#3F3F46] flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

export function TokenSelectModal({ isOpen, onClose, onSelect, excludeToken }: TokenSelectModalProps) {
  const { 
    popularTokens, 
    filteredTokens, 
    isLoading, 
    searchQuery, 
    setSearchQuery,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isSearching,
  } = useJupiterTokens();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, setSearchQuery]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || searchQuery.length > 0) return;

    const loadMore = loadMoreRef.current;
    if (!loadMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMore);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage, searchQuery.length]);

  const handleSelect = useCallback((token: JupiterToken) => {
    onSelect(token);
    onClose();
  }, [onSelect, onClose]);

  const displayTokens = filteredTokens.filter(t => t.address !== excludeToken);
  const displayPopular = popularTokens.filter(t => t.address !== excludeToken);

  if (!isOpen) return null;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      >
        <div 
          className="w-full max-w-md bg-[#18181B] rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Select Token</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name or paste address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#27272A] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#5850EC]/50 transition-all"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
            )}
          </div>
        </div>

        {!searchQuery && displayPopular.length > 0 && (
          <div className="px-4 pb-3">
            <div className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Popular</div>
            <div className="flex flex-wrap gap-2">
              {displayPopular.slice(0, 6).map((token) => (
                <button
                  key={token.address}
                  onClick={() => handleSelect(token)}
                  className="flex items-center gap-2 bg-[#27272A] hover:bg-[#3F3F46] px-3 py-1.5 rounded-full transition-colors"
                >
                  <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={20} />
                  <span className="text-sm font-medium text-white">{token.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        )}

          <div className="border-t border-white/5">
            <div 
              ref={listRef}
              className="max-h-[320px] overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
            {isLoading && displayTokens.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#5850EC] animate-spin" />
              </div>
            ) : displayTokens.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                {searchQuery ? 'No tokens found' : 'Loading tokens...'}
              </div>
            ) : (
              <>
                {displayTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#27272A] transition-colors"
                  >
                    <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={36} />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">{token.symbol}</div>
                      <div className="text-xs text-zinc-500 truncate max-w-[200px]">{token.name}</div>
                    </div>
                    {token.tags?.includes('verified') && (
                      <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    )}
                  </button>
                ))}
                
                {!searchQuery && hasNextPage && (
                  <div ref={loadMoreRef} className="py-4 flex justify-center">
                    {isFetchingNextPage ? (
                      <Loader2 className="w-5 h-5 text-[#5850EC] animate-spin" />
                    ) : (
                      <span className="text-xs text-zinc-500">Scroll for more</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
