'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { useEffect, useState, useCallback, useRef } from 'react';

const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';
const REFRESH_INTERVAL = 10000; // 10 seconds

export interface UseTokenBalanceReturn {
    balance: string;
    balanceRaw: bigint;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Hook to fetch token balance for any Solana token (SOL or SPL)
 * 
 * @param tokenMintAddress - The mint address of the token (use WSOL mint for SOL)
 * @param decimals - Token decimals (default 9 for SOL)
 * @returns Balance information and loading state
 */
export function useTokenBalance(
    tokenMintAddress: string | undefined,
    decimals: number = 9
): UseTokenBalanceReturn {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [balance, setBalance] = useState<string>('0');
    const [balanceRaw, setBalanceRaw] = useState<bigint>(BigInt(0));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchBalance = useCallback(async () => {
        if (!publicKey || !tokenMintAddress) {
            setBalance('0');
            setBalanceRaw(BigInt(0));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Case 1: Native SOL (Wrapped SOL mint)
            if (tokenMintAddress === WRAPPED_SOL_MINT) {
                const lamports = await connection.getBalance(publicKey, 'confirmed');
                const solBalance = lamports / LAMPORTS_PER_SOL;
                setBalanceRaw(BigInt(lamports));
                setBalance(solBalance.toFixed(9).replace(/\.?0+$/, '')); // Remove trailing zeros
            }
            // Case 2: SPL Tokens (USDC, WSP, etc.)
            else {
                const mint = new PublicKey(tokenMintAddress);

                // Try standard Token Program first
                let ataAddress: PublicKey;
                let accountInfo;

                try {
                    ataAddress = await getAssociatedTokenAddress(mint, publicKey, false, TOKEN_PROGRAM_ID);
                    accountInfo = await connection.getTokenAccountBalance(ataAddress, 'confirmed');
                } catch {
                    // Try Token-2022 Program as fallback
                    try {
                        ataAddress = await getAssociatedTokenAddress(mint, publicKey, false, TOKEN_2022_PROGRAM_ID);
                        accountInfo = await connection.getTokenAccountBalance(ataAddress, 'confirmed');
                    } catch {
                        // ATA doesn't exist - user has 0 balance
                        setBalance('0');
                        setBalanceRaw(BigInt(0));
                        return;
                    }
                }

                if (accountInfo.value.uiAmountString) {
                    setBalance(accountInfo.value.uiAmountString);
                    setBalanceRaw(BigInt(accountInfo.value.amount));
                } else {
                    setBalance('0');
                    setBalanceRaw(BigInt(0));
                }
            }
        } catch (e) {
            console.error('Error fetching token balance:', e);
            setError((e as Error).message);
            setBalance('0');
            setBalanceRaw(BigInt(0));
        } finally {
            setLoading(false);
        }
    }, [connection, publicKey, tokenMintAddress]);

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchBalance();

        // Set up auto-refresh
        intervalRef.current = setInterval(fetchBalance, REFRESH_INTERVAL);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchBalance]);

    // Manual refetch function
    const refetch = useCallback(() => {
        fetchBalance();
    }, [fetchBalance]);

    return {
        balance,
        balanceRaw,
        loading,
        error,
        refetch,
    };
}

/**
 * Hook to fetch multiple token balances at once
 */
export function useMultiTokenBalance(
    tokenMints: Array<{ address: string; decimals: number }>
): Record<string, UseTokenBalanceReturn> {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [balances, setBalances] = useState<Record<string, { balance: string; balanceRaw: bigint; loading: boolean; error: string | null }>>({});

    const fetchAllBalances = useCallback(async () => {
        if (!publicKey || tokenMints.length === 0) {
            return;
        }

        const newBalances: Record<string, { balance: string; balanceRaw: bigint; loading: boolean; error: string | null }> = {};

        for (const token of tokenMints) {
            try {
                if (token.address === WRAPPED_SOL_MINT) {
                    const lamports = await connection.getBalance(publicKey, 'confirmed');
                    const solBalance = lamports / LAMPORTS_PER_SOL;
                    newBalances[token.address] = {
                        balance: solBalance.toFixed(9).replace(/\.?0+$/, ''),
                        balanceRaw: BigInt(lamports),
                        loading: false,
                        error: null,
                    };
                } else {
                    try {
                        const mint = new PublicKey(token.address);
                        const ata = await getAssociatedTokenAddress(mint, publicKey, false, TOKEN_PROGRAM_ID);
                        const accountInfo = await connection.getTokenAccountBalance(ata, 'confirmed');
                        newBalances[token.address] = {
                            balance: accountInfo.value.uiAmountString || '0',
                            balanceRaw: BigInt(accountInfo.value.amount),
                            loading: false,
                            error: null,
                        };
                    } catch {
                        newBalances[token.address] = {
                            balance: '0',
                            balanceRaw: BigInt(0),
                            loading: false,
                            error: null,
                        };
                    }
                }
            } catch (e) {
                newBalances[token.address] = {
                    balance: '0',
                    balanceRaw: BigInt(0),
                    loading: false,
                    error: (e as Error).message,
                };
            }
        }

        setBalances(newBalances);
    }, [connection, publicKey, tokenMints]);

    useEffect(() => {
        fetchAllBalances();
        const interval = setInterval(fetchAllBalances, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchAllBalances]);

    // Return with refetch functions
    const result: Record<string, UseTokenBalanceReturn> = {};
    for (const token of tokenMints) {
        const data = balances[token.address] || { balance: '0', balanceRaw: BigInt(0), loading: true, error: null };
        result[token.address] = {
            ...data,
            refetch: fetchAllBalances,
        };
    }

    return result;
}
