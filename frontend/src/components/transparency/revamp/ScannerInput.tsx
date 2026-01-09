'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScannerInputProps {
    onSearch: (address: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

function isValidSolanaAddress(address: string): boolean {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
}

export function ScannerInput({ onSearch, isLoading, disabled }: ScannerInputProps) {
    const [address, setAddress] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            setError(null);

            const trimmed = address.trim();
            if (!trimmed) {
                setError('Please enter a wallet address');
                return;
            }

            if (!isValidSolanaAddress(trimmed)) {
                setError('Invalid Solana address format');
                return;
            }

            onSearch(trimmed);
        },
        [address, onSearch]
    );

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className={cn(
                        "h-5 w-5 transition-colors duration-300",
                        isLoading ? "text-primary animate-pulse" : "text-muted-foreground group-focus-within:text-primary"
                    )} />
                </div>

                <input
                    type="text"
                    value={address}
                    onChange={(e) => {
                        setAddress(e.target.value);
                        setError(null);
                    }}
                    placeholder="Enter Solana wallet address..."
                    disabled={disabled || isLoading}
                    className="w-full pl-14 pr-36 py-5 bg-muted/20 border border-border/40 rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-300 disabled:opacity-50 font-mono text-sm tracking-tight"
                />

                <button
                    type="submit"
                    disabled={disabled || isLoading}
                    className="absolute inset-y-2 right-2 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98]"
                >
                    {isLoading ? (
                        <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground animate-spin" />
                    ) : (
                        'Analyze'
                    )}
                </button>
            </div>

            {error && (
                <p className="mt-3 text-sm text-destructive font-medium px-2">{error}</p>
            )}
        </form>
    );
}
