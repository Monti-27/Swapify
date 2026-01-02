'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Strategy } from '@/types/api';

export function useStrategies() {
    const { publicKey } = useWallet();
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchStrategies = useCallback(async () => {
        if (!publicKey) {
            setStrategies([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await api.getStrategies();
            setStrategies(data);
        } catch (err) {
            console.error('Failed to fetch strategies:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch strategies'));
            setStrategies([]);
        } finally {
            setIsLoading(false);
        }
    }, [publicKey]);

    useEffect(() => {
        fetchStrategies();
    }, [fetchStrategies]);

    return {
        strategies,
        isLoading,
        error,
        refetch: fetchStrategies,
    };
}
