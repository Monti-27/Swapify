'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { useEffect, useState, useCallback } from 'react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { useTokens } from './useTokens';

export interface Asset {
    mint: string;
    symbol: string;
    name: string;
    balance: number;
    logoURI?: string;
    decimals: number;
}

// Helper to fix IPFS/Arweave links
const sanitizeUri = (uri: string): string => {
    if (!uri) return '';
    if (uri.startsWith('ipfs://')) return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    if (uri.startsWith('ar://')) return uri.replace('ar://', 'https://arweave.net/');
    return uri;
};

// Hardcoded Majors for Instant Loading
const MAJORS: Record<string, { s: string; n: string; l: string }> = {
    'So11111111111111111111111111111111111111112': {
        s: 'SOL',
        n: 'Solana',
        l: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        s: 'USDC',
        n: 'USD Coin',
        l: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
        s: 'USDT',
        n: 'Tether USD',
        l: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
    },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
        s: 'BONK',
        n: 'Bonk',
        l: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
    },
};

export function useUserAssets() {
    const { connection } = useConnection();
    const { publicKey, connected } = useWallet();
    const { tokens: tokenList, popularTokens } = useTokens();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Combine token lists for cache lookup
    const allTokens = [...popularTokens, ...tokenList];

    const fetchAssets = useCallback(async () => {
        if (!publicKey || !connected) {
            setAssets([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const umi = createUmi(connection.rpcEndpoint);

            // Fetch from BOTH Programs (Standard + Token-2022)
            const [solBalance, standardAccounts, token2022Accounts] = await Promise.all([
                connection.getBalance(publicKey),
                connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
                connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID }),
            ]);

            // Merge token account lists
            const allTokenAccounts = [...standardAccounts.value, ...token2022Accounts.value];

            const parsedAssets = await Promise.all(
                allTokenAccounts.map(async (item) => {
                    const info = item.account.data.parsed.info;
                    const mint = info.mint;
                    const amount = info.tokenAmount.uiAmount;
                    const decimals = info.tokenAmount.decimals;

                    if (!amount || amount <= 0) return null;

                    // STRATEGY A: Check Hardcoded Majors (Instant)
                    if (MAJORS[mint]) {
                        return {
                            mint,
                            symbol: MAJORS[mint].s,
                            name: MAJORS[mint].n,
                            logoURI: MAJORS[mint].l,
                            balance: amount,
                            decimals,
                        };
                    }

                    // STRATEGY B: Check Jupiter/Token List Cache (Fast)
                    const listMatch = allTokens.find(t => t.address === mint || t.id === mint);
                    if (listMatch) {
                        return {
                            mint,
                            symbol: listMatch.symbol,
                            name: listMatch.name,
                            balance: amount,
                            logoURI: listMatch.logoURI || listMatch.icon,
                            decimals,
                        };
                    }

                    // STRATEGY C: Fetch On-Chain + Off-Chain JSON via Metaplex
                    try {
                        const asset = await fetchDigitalAsset(umi, umiPublicKey(mint));
                        let finalName = asset.metadata.name?.trim() || '';
                        let finalSymbol = asset.metadata.symbol?.trim() || '';
                        let finalLogo = '';

                        // Fetch the off-chain JSON to get the real image
                        if (asset.metadata.uri) {
                            try {
                                const cleanUri = sanitizeUri(asset.metadata.uri);
                                const response = await fetch(cleanUri);
                                const json = await response.json();
                                if (json.image) finalLogo = sanitizeUri(json.image);
                                if (json.name) finalName = json.name;
                                if (json.symbol) finalSymbol = json.symbol;
                            } catch {
                                // JSON fetch failed, use on-chain values
                            }
                        }

                        return {
                            mint,
                            symbol: finalSymbol || mint.slice(0, 4).toUpperCase(),
                            name: finalName || 'Unknown Token',
                            balance: amount,
                            logoURI: finalLogo || undefined,
                            decimals,
                        };
                    } catch {
                        // Metaplex fetch failed - use fallback
                        return {
                            mint,
                            symbol: mint.slice(0, 4).toUpperCase() + '...',
                            name: 'Unknown Token',
                            balance: amount,
                            logoURI: undefined,
                            decimals,
                        };
                    }
                })
            );

            const validAssets = parsedAssets.filter((a) => a !== null) as Asset[];

            // Add SOL if balance > 0
            if (solBalance > 0) {
                validAssets.unshift({
                    mint: 'So11111111111111111111111111111111111111112',
                    symbol: 'SOL',
                    name: 'Solana',
                    logoURI: MAJORS['So11111111111111111111111111111111111111112'].l,
                    balance: solBalance / 1e9,
                    decimals: 9,
                });
            }

            // Sort by balance (SOL stays first)
            const sorted = validAssets.sort((a, b) => {
                if (a.mint === 'So11111111111111111111111111111111111111112') return -1;
                if (b.mint === 'So11111111111111111111111111111111111111112') return 1;
                return b.balance - a.balance;
            });

            setAssets(sorted);
        } catch (err) {
            console.error('Error fetching user assets:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch assets'));
        } finally {
            setLoading(false);
        }
    }, [publicKey, connected, connection]);

    // Fetch only once when wallet connects, not on token list changes
    useEffect(() => {
        if (connected && publicKey) {
            fetchAssets();
        }
    }, [connected, publicKey?.toBase58()]);

    return {
        assets,
        loading,
        error,
        refetch: fetchAssets,
    };
}
