'use client';

import { useCallback, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getMint,
    getAssociatedTokenAddressSync,
    getAccount,
    createAssociatedTokenAccountIdempotentInstruction,
    createSyncNativeInstruction,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Token } from '@/hooks/useTokens';
import {
    getProgram,
    getGlobalPda,
    getStrategyPda,
    getEscrowPda,
    getEscrowTokenAccountPda,
    WRAPPED_SOL_MINT,
    PROGRAM_ID
} from '@/anchor/setup';

export interface CreateStrategyParams {
    sellToken: Token;
    buyToken: Token;
    triggerPrice: number;
    amount: number;
    amountType: 'percentage' | 'fixed';
    stopLoss?: number;
    takeProfit?: number;
    name?: string;
    description?: string;
    onMetadataSynced?: () => void;
}

interface UseCreateStrategyResult {
    createStrategy: (params: CreateStrategyParams) => Promise<string>;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Native SOL address variants
 */
const NATIVE_SOL_ADDRESSES = [
    'So11111111111111111111111111111111111111112',
    'SOL',
    'sol',
];

/**
 * Devnet Token Addresses
 * These are the actual mint addresses on devnet (different from mainnet!)
 */
const DEVNET_WSOL = new PublicKey('So11111111111111111111111111111111111111112'); // Same on all clusters
const DEVNET_USDC = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // Devnet USDC

/**
 * Mainnet addresses that need to be remapped on devnet
 */
const MAINNET_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MAINNET_USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

/**
 * Resolve mint address for devnet
 * Maps mainnet addresses to their devnet equivalents
 */
function resolveMintForDevnet(token: Token): PublicKey {
    const address = token.address || token.id || '';
    const symbol = token.symbol?.toUpperCase() || '';

    // Handle SOL variants
    if (NATIVE_SOL_ADDRESSES.includes(address) || symbol === 'SOL') {
        console.log(`🔄 Resolving ${symbol || address} → Devnet WSOL`);
        return DEVNET_WSOL;
    }

    // Handle USDC (mainnet address → devnet address)
    if (address === MAINNET_USDC || symbol === 'USDC') {
        console.log(`🔄 Resolving USDC → Devnet USDC: ${DEVNET_USDC.toBase58()}`);
        return DEVNET_USDC;
    }

    // Handle USDT (map to devnet USDC for testing, since USDT doesn't exist on devnet)
    if (address === MAINNET_USDT || symbol === 'USDT') {
        console.log(`🔄 Resolving USDT → Devnet USDC (substitute): ${DEVNET_USDC.toBase58()}`);
        return DEVNET_USDC;
    }

    // Return as-is for other tokens
    console.log(`ℹ️ Using address as-is: ${address}`);
    return new PublicKey(address);
}

/**
 * Get the actual mint address (converts native SOL to wrapped SOL)
 * @deprecated Use resolveMintForDevnet instead
 */
function getMintAddress(token: Token): PublicKey {
    const address = token.address || token.id || '';
    if (NATIVE_SOL_ADDRESSES.includes(address)) {
        return WRAPPED_SOL_MINT;
    }
    return new PublicKey(address);
}

/**
 * Hook for creating strategies on-chain via the WeSwap smart contract
 */
export function useCreateStrategy(): UseCreateStrategyResult {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const createStrategy = useCallback(async (params: CreateStrategyParams): Promise<string> => {
        if (!publicKey || !signTransaction || !signAllTransactions) {
            throw new Error('Wallet not connected');
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Resolve mint addresses (maps mainnet → devnet addresses)
            console.log('📍 Resolving token addresses for devnet...');
            const sellTokenMint = resolveMintForDevnet(params.sellToken);
            const buyTokenMint = resolveMintForDevnet(params.buyToken);

            console.log('   Sell token mint:', sellTokenMint.toBase58());
            console.log('   Buy token mint:', buyTokenMint.toBase58());

            // 2. Fetch token decimals dynamically
            console.log('🔍 Fetching mint info...');
            const [sellMintInfo, buyMintInfo] = await Promise.all([
                getMint(connection, sellTokenMint),
                getMint(connection, buyTokenMint),
            ]);

            const sellDecimals = sellMintInfo.decimals;
            const buyDecimals = buyMintInfo.decimals;

            // 3. Determine token programs
            const sellTokenProgram = sellMintInfo.tlvData?.length ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
            const buyTokenProgram = buyMintInfo.tlvData?.length ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            // 4. Check user balance before building transaction
            const sellAddress = params.sellToken.address || params.sellToken.id || '';
            const isNativeSOL = NATIVE_SOL_ADDRESSES.includes(sellAddress);

            let userBalance: bigint;

            if (isNativeSOL) {
                // For native SOL, check native balance (not wrapped SOL token account)
                const nativeBalance = await connection.getBalance(publicKey, 'confirmed');
                userBalance = BigInt(nativeBalance);
                console.log('Native SOL balance:', nativeBalance / 1e9, 'SOL');
            } else {
                // For SPL tokens, check token account balance
                const userTokenAccount = getAssociatedTokenAddressSync(
                    sellTokenMint,
                    publicKey,
                    false,
                    sellTokenProgram
                );

                try {
                    const accountInfo = await getAccount(connection, userTokenAccount, 'confirmed', sellTokenProgram);
                    userBalance = accountInfo.amount;
                } catch {
                    // Account doesn't exist or has no balance
                    userBalance = BigInt(0);
                }
            }

            // 5. Convert amount to lamports/smallest unit
            let sellAmountBN: BN;
            let depositAmountBN: BN;

            if (params.amountType === 'percentage') {
                // For percentage, calculate the actual amount from user's balance
                const percentageMultiplier = params.amount / 100;
                const actualAmount = Number(userBalance) * percentageMultiplier;
                sellAmountBN = new BN(Math.floor(actualAmount));
                depositAmountBN = sellAmountBN; // Deposit the same amount
            } else {
                // Fixed amount - convert to smallest unit
                const amountInSmallestUnit = params.amount * Math.pow(10, sellDecimals);
                sellAmountBN = new BN(Math.floor(amountInSmallestUnit));
                depositAmountBN = sellAmountBN;
            }

            // Validate sufficient balance
            if (sellAmountBN.gt(new BN(userBalance.toString()))) {
                throw new Error(`Insufficient balance. You have ${Number(userBalance) / Math.pow(10, sellDecimals)} ${params.sellToken.symbol}, but trying to use ${params.amount}${params.amountType === 'percentage' ? '%' : ''}`);
            }

            if (sellAmountBN.isZero()) {
                throw new Error('Amount cannot be zero');
            }

            // 6. Initialize program early (needed for fetching existing strategies)
            const program = getProgram(connection, {
                publicKey,
                signTransaction,
                signAllTransactions,
            });

            // 7. Find next available strategy ID (contracts limit strategies to 0-9)
            console.log('🔢 Finding next available strategy ID...');
            const MAX_STRATEGIES = 10;

            // Fetch all strategies owned by the user
            const existingStrategies = await program.account.strategy.all([
                {
                    memcmp: {
                        offset: 8, // After the 8-byte discriminator
                        bytes: publicKey.toBase58(),
                    }
                }
            ]);

            // Extract used IDs
            const usedIds = new Set<number>();
            for (const strategy of existingStrategies) {
                const id = (strategy.account as any).id?.toNumber?.() ?? (strategy.account as any).id;
                if (typeof id === 'number') {
                    usedIds.add(id);
                }
            }
            console.log('   Existing strategy IDs:', Array.from(usedIds));

            // Find the next available ID (starting from 0)
            let nextId = -1;
            for (let i = 0; i < MAX_STRATEGIES; i++) {
                if (!usedIds.has(i)) {
                    nextId = i;
                    break;
                }
            }

            if (nextId === -1) {
                throw new Error(`Max strategies reached (${MAX_STRATEGIES}). Please cancel an existing strategy first.`);
            }

            console.log('   Using strategy ID:', nextId);
            const strategyId = new BN(nextId);
            const strategyIdBuffer = strategyId.toArrayLike(Buffer, 'le', 8);

            // 7. Derive all PDAs
            const [globalPda] = getGlobalPda();
            const [strategyPda] = getStrategyPda(publicKey, strategyIdBuffer);
            const [escrowPda] = getEscrowPda(strategyPda);

            // 8. Get owner's token account (ATA)
            const ownerTokenAccount = getAssociatedTokenAddressSync(
                sellTokenMint,
                publicKey,
                false,              // allowOwnerOffCurve = false (owner is a regular wallet)
                sellTokenProgram
            );

            // 9. Get escrow's token account (ATA for the escrow PDA)
            // NOTE: escrow is a PDA, so allowOwnerOffCurve must be TRUE
            const escrowTokenAccount = getAssociatedTokenAddressSync(
                sellTokenMint,
                escrowPda,
                true,               // allowOwnerOffCurve = true (escrow is a PDA, not a wallet)
                sellTokenProgram
            );

            console.log('📦 Derived accounts:');
            console.log('   Owner token account:', ownerTokenAccount.toBase58());
            console.log('   Escrow token account:', escrowTokenAccount.toBase58());

            // 9. Convert prices to u64 (with 6 decimals precision)
            const PRICE_PRECISION = 6;
            const triggerPriceBN = new BN(Math.floor(params.triggerPrice * Math.pow(10, PRICE_PRECISION)));
            const takeProfitPriceBN = params.takeProfit
                ? new BN(Math.floor(params.takeProfit * Math.pow(10, PRICE_PRECISION)))
                : null;
            const stopLossPriceBN = params.stopLoss
                ? new BN(Math.floor(params.stopLoss * Math.pow(10, PRICE_PRECISION)))
                : null;

            // Program already initialized above (step 6)
            // 11. Build the createStrategy instruction params
            const createStrategyParams = {
                id: strategyId,
                triggerPrice: triggerPriceBN,
                pricePrecision: PRICE_PRECISION,
                takeProfitPrice: takeProfitPriceBN,
                stopLossPrice: stopLossPriceBN,
                sellAmount: sellAmountBN,
                usePercentage: params.amountType === 'percentage',
                boomerangMode: false,
                depositAmount: depositAmountBN,
            };

            // 12. Build pre-instructions for auto-wrapping SOL if needed
            const preInstructions: TransactionInstruction[] = [];
            const isSellingSOL = sellTokenMint.equals(DEVNET_WSOL);

            if (isSellingSOL) {
                console.log('🔄 Auto-wrapping SOL → WSOL...');

                // A. Create WSOL ATA if it doesn't exist (idempotent - safe to call even if exists)
                preInstructions.push(
                    createAssociatedTokenAccountIdempotentInstruction(
                        publicKey,                    // Payer
                        ownerTokenAccount,            // ATA address
                        publicKey,                    // Owner
                        sellTokenMint,                // Mint (WSOL)
                        sellTokenProgram,             // Token program
                        ASSOCIATED_TOKEN_PROGRAM_ID   // Associated token program
                    )
                );

                // B. Transfer Native SOL to WSOL ATA
                preInstructions.push(
                    SystemProgram.transfer({
                        fromPubkey: publicKey,
                        toPubkey: ownerTokenAccount,
                        lamports: BigInt(depositAmountBN.toString()),
                    })
                );

                // C. Sync Native - tells the token program to update the balance
                preInstructions.push(
                    createSyncNativeInstruction(ownerTokenAccount, sellTokenProgram)
                );

                console.log('   ✅ Added 3 pre-instructions for SOL wrapping');
            }

            // 13. Build and send transaction
            console.log('🚀 Building createStrategy transaction...');
            console.log('   Strategy ID:', strategyId.toString());
            console.log('   Sell Token:', sellTokenMint.toBase58());
            console.log('   Buy Token:', buyTokenMint.toBase58());
            console.log('   Amount:', sellAmountBN.toString());
            console.log('   Trigger Price:', triggerPriceBN.toString());
            console.log('   Pre-instructions:', preInstructions.length);

            const tx = await program.methods
                .createStrategy(createStrategyParams)
                .accountsPartial({
                    owner: publicKey,
                    strategy: strategyPda,
                    global: globalPda,
                    escrow: escrowPda,
                    sellTokenMint: sellTokenMint,
                    sellTokenProgram: sellTokenProgram,
                    buyTokenMint: buyTokenMint,
                    buyTokenProgram: buyTokenProgram,
                    ownerTokenAccount: ownerTokenAccount,
                    escrowTokenAccount: escrowTokenAccount,
                    systemProgram: new PublicKey('11111111111111111111111111111111'),
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .preInstructions(preInstructions)  // <-- Auto-wrap SOL if needed
                .rpc();

            console.log('✅ Strategy created! Transaction:', tx);
            console.log('🔗 Solscan:', `https://solscan.io/tx/${tx}`);

            toast.success('Strategy Created!', {
                description: `Transaction confirmed: ${tx.slice(0, 8)}...`,
            });

            // Sync strategy name with backend (after indexer catches up)
            if (params.name) {
                const syncMetadata = async (retries = 2) => {
                    try {
                        // Wait for indexer to create the row
                        await new Promise(r => setTimeout(r, 2000));

                        await api.updateStrategyMetadata(strategyPda.toBase58(), {
                            name: params.name!,
                            description: params.description,
                        });
                        console.log('✅ Strategy name synced with backend');
                        toast.success('Strategy name saved!');

                        // Trigger callback to refresh strategies list
                        if (params.onMetadataSynced) {
                            params.onMetadataSynced();
                        }
                    } catch (error: any) {
                        console.warn('Failed to sync strategy name:', error?.message || error);

                        // Retry if 404 (indexer not ready yet)
                        if (retries > 0 && error?.message?.includes('404')) {
                            console.log(`Retrying metadata sync... (${retries} retries left)`);
                            await syncMetadata(retries - 1);
                        } else {
                            // Non-critical error - strategy is still created on-chain
                            console.error('Could not save strategy name to backend:', error);
                        }
                    }
                };

                // Fire and forget - don't block the return
                syncMetadata();
            }

            return tx;

        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);

            // Check for user rejection
            const isUserRejection =
                error.message?.toLowerCase().includes('user rejected') ||
                error.message?.toLowerCase().includes('user denied') ||
                error.message?.toLowerCase().includes('user cancelled');

            if (isUserRejection) {
                toast.info('Transaction Cancelled', {
                    description: 'You cancelled the transaction',
                });
            } else {
                toast.error('Failed to Create Strategy', {
                    description: error.message || 'Please try again',
                });
            }

            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, signTransaction, signAllTransactions, connection]);

    return {
        createStrategy,
        isLoading,
        error,
    };
}
