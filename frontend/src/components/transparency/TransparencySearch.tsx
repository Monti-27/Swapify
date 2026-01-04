'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface TransparencySearchProps {
    onSearch: (address: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

// Validate Solana address (base58, 32-44 chars)
function isValidSolanaAddress(address: string): boolean {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
}

export function TransparencySearch({ onSearch, isLoading, disabled }: TransparencySearchProps) {
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
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
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
                    className="w-full pl-12 pr-32 py-4 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50"
                />

                <button
                    type="submit"
                    disabled={disabled || isLoading}
                    className="absolute inset-y-2 right-2 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Scanning...
                        </>
                    ) : (
                        'Scan'
                    )}
                </button>
            </div>

            {error && (
                <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
        </form>
    );
}

export default TransparencySearch;
