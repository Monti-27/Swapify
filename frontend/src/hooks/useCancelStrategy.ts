'use client';

import { useCallback, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getMint,
    getAssociatedTokenAddressSync,
    getAccount,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
    getProgram,
    getGlobalPda,
    getStrategyPda,
    getEscrowPda,
} from '@/anchor/setup';
import type { Strategy } from '@/types/api';

/**
 * Native SOL address variants
 */
const NATIVE_SOL_ADDRESSES = [
    'So11111111111111111111111111111111111111112',
    'SOL',
    'sol',
];

/**
 * Mainnet Token Addresses
 */
const WRAPPED_SOL = new PublicKey('So11111111111111111111111111111111111111112');

/**
 * Resolve mint address for mainnet
 * Handles SOL → Wrapped SOL conversion
 */
function resolveMint(tokenAddress: string): PublicKey {
    // Handle SOL variants → Wrapped SOL
    if (NATIVE_SOL_ADDRESSES.includes(tokenAddress)) {
        console.log(`🔄 Resolving ${tokenAddress} → Wrapped SOL`);
        return WRAPPED_SOL;
    }

    // Return as-is for all other tokens (mainnet addresses)
    return new PublicKey(tokenAddress);
}

export interface CancelStrategyParams {
    strategy: Strategy;
    onSuccess?: () => void;
}

interface UseCancelStrategyResult {
    cancelStrategy: (params: CancelStrategyParams) => Promise<void>;
    isLoading: boolean;
    cancellingId: string | null;
    error: Error | null;
}

/**
 * Hook for cancelling strategies on-chain via the Swapify smart contract
 * 
 * CRITICAL: This hook enforces "Blockchain First, Database Second" pattern
 * to prevent Ghost Strategies. The flow is:
 * 
 * 1. Call blockchain's withdraw_escrow with cancel_strategy: true
 * 2. Await transaction confirmation
 * 3. Only after blockchain success, call backend API to sync status
 * 4. Update UI only after both succeed
 * 
 * If the user rejects the wallet signature or transaction fails,
 * the database row is NOT deleted.
 */
export function useCancelStrategy(): UseCancelStrategyResult {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const [isLoading, setIsLoading] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const cancelStrategy = useCallback(async (params: CancelStrategyParams): Promise<void> => {
        const { strategy, onSuccess } = params;

        if (!publicKey || !signTransaction || !signAllTransactions) {
            throw new Error('Wallet not connected');
        }

        setIsLoading(true);
        setCancellingId(strategy.id);
        setError(null);

        try {
            console.log('🔄 Starting strategy cancellation (Blockchain First)...');
            console.log('   Strategy ID (DB):', strategy.id);
            console.log('   Strategy Name:', strategy.name);

            // 1. Validate required fields
            // @ts-ignore - strategyIndex might not be in the frontend type yet
            const strategyIndex = strategy.metadata?.strategyIndex ?? strategy.strategyIndex;

            if (strategyIndex === undefined || strategyIndex === null) {
                // If we don't have the strategyIndex, we need to fetch the strategy account from chain
                // For now, throw an error with clear guidance
                throw new Error(
                    'Cannot cancel: Missing on-chain strategy index. ' +
                    'This strategy may have been created before the indexer tracked this field.'
                );
            }

            console.log('   On-chain Strategy Index:', strategyIndex);

            // 2. Resolve sell token mint
            const sellTokenMint = resolveMint(strategy.fromToken);
            const buyTokenMint = resolveMint(strategy.toToken);

            console.log('   Sell Token Mint:', sellTokenMint.toBase58());
            console.log('   Buy Token Mint:', buyTokenMint.toBase58());

            // 3. Get token decimals and program
            console.log('🔍 Fetching mint info...');
            const [sellMintInfo, buyMintInfo] = await Promise.all([
                getMint(connection, sellTokenMint),
                getMint(connection, buyTokenMint),
            ]);

            // Determine token programs
            const sellTokenProgram = sellMintInfo.tlvData?.length ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
            const buyTokenProgram = buyMintInfo.tlvData?.length ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            // 4. Derive all PDAs
            const strategyId = new BN(strategyIndex);
            const strategyIdBuffer = strategyId.toArrayLike(Buffer, 'le', 8);

            const [globalPda] = getGlobalPda();
            const [strategyPda] = getStrategyPda(publicKey, strategyIdBuffer);
            const [escrowPda] = getEscrowPda(strategyPda);

            console.log('📦 Derived accounts:');
            console.log('   Strategy PDA:', strategyPda.toBase58());
            console.log('   Escrow PDA:', escrowPda.toBase58());

            // ============================================================
            // SMART CANCEL: Detect which token is currently in escrow
            // This handles the "Boomerang Trap" where entry has executed
            // and escrow now holds buy_token instead of sell_token
            // ============================================================

            // Get escrow ATAs for BOTH tokens
            const escrowSellTokenAccount = getAssociatedTokenAddressSync(
                sellTokenMint,
                escrowPda,
                true,
                sellTokenProgram
            );

            const escrowBuyTokenAccount = getAssociatedTokenAddressSync(
                buyTokenMint,
                escrowPda,
                true,
                buyTokenProgram
            );

            // Check balances of BOTH escrow accounts
            let sellBalance = BigInt(0);
            let buyBalance = BigInt(0);

            try {
                const sellAccountInfo = await getAccount(connection, escrowSellTokenAccount, 'confirmed', sellTokenProgram);
                sellBalance = sellAccountInfo.amount;
                console.log('   Sell Token Escrow Balance:', sellBalance.toString());
            } catch {
                console.log('   Sell Token Escrow: Not found or empty');
            }

            try {
                const buyAccountInfo = await getAccount(connection, escrowBuyTokenAccount, 'confirmed', buyTokenProgram);
                buyBalance = buyAccountInfo.amount;
                console.log('   Buy Token Escrow Balance:', buyBalance.toString());
            } catch {
                console.log('   Buy Token Escrow: Not found or empty');
            }

            // SMART DECISION: Use whichever token has funds
            let withdrawTokenMint: PublicKey;
            let withdrawTokenProgram: PublicKey;
            let escrowTokenAccount: PublicKey;
            let ownerTokenAccount: PublicKey;
            let withdrawAmount: BN;

            if (buyBalance > sellBalance) {
                // Entry has executed - escrow holds buy_token (e.g., WSP)
                console.log('   🔄 SMART CANCEL: Entry has executed, withdrawing BUY token');
                withdrawTokenMint = buyTokenMint;
                withdrawTokenProgram = buyTokenProgram;
                escrowTokenAccount = escrowBuyTokenAccount;
                ownerTokenAccount = getAssociatedTokenAddressSync(
                    buyTokenMint,
                    publicKey,
                    false,
                    buyTokenProgram
                );
                withdrawAmount = new BN(buyBalance.toString());
            } else {
                // Entry not executed - escrow still holds sell_token (e.g., SOL)
                console.log('   ✅ NORMAL CANCEL: Entry not executed, withdrawing SELL token');
                withdrawTokenMint = sellTokenMint;
                withdrawTokenProgram = sellTokenProgram;
                escrowTokenAccount = escrowSellTokenAccount;
                ownerTokenAccount = getAssociatedTokenAddressSync(
                    sellTokenMint,
                    publicKey,
                    false,
                    sellTokenProgram
                );
                withdrawAmount = new BN(sellBalance.toString());
            }

            console.log('   Withdraw Token Mint:', withdrawTokenMint.toBase58());
            console.log('   Owner Token Account:', ownerTokenAccount.toBase58());
            console.log('   Escrow Token Account:', escrowTokenAccount.toBase58());
            console.log('   Withdraw Amount:', withdrawAmount.toString());

            // 7. Initialize program
            const program = getProgram(connection, {
                publicKey,
                signTransaction,
                signAllTransactions,
            });

            // 8. Build and send withdraw_escrow transaction with cancel_strategy: true
            console.log('🚀 Building withdraw_escrow (cancel) transaction...');

            const withdrawParams = {
                id: strategyId,
                amount: withdrawAmount,
                cancelStrategy: true, // CRITICAL: This closes the strategy account
            };

            console.log('   Params:', {
                id: strategyId.toString(),
                amount: withdrawAmount.toString(),
                cancelStrategy: true,
            });

            const tx = await program.methods
                .withdrawEscrow(withdrawParams)
                .accountsPartial({
                    owner: publicKey,
                    global: globalPda,
                    strategy: strategyPda,
                    escrow: escrowPda,
                    withdrawTokenMint: withdrawTokenMint,
                    withdrawTokenProgram: withdrawTokenProgram,
                    ownerTokenAccount: ownerTokenAccount,
                    escrowTokenAccount: escrowTokenAccount,
                    systemProgram: SystemProgram.programId,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .rpc();

            console.log('✅ Blockchain transaction sent! Signature:', tx);
            console.log('🔗 Solscan:', `https://solscan.io/tx/${tx}`);

            // 9. Confirm transaction
            console.log('⏳ Waiting for transaction confirmation...');
            const confirmation = await connection.confirmTransaction(tx, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            console.log('✅ Transaction confirmed on-chain!');

            // 10. NOW sync with backend (only after blockchain success)
            console.log('🔄 Syncing with backend database...');
            try {
                await api.cancelStrategy(strategy.id);
                console.log('✅ Backend synced successfully');
            } catch (apiError) {
                // Non-critical: blockchain is the source of truth
                // The indexer will eventually catch up
                console.warn('⚠️ Backend sync failed (non-critical):', apiError);
            }

            // 11. Show success toast
            toast.success('Strategy Cancelled', {
                description: `"${strategy.name}" has been cancelled and funds returned.`,
            });

            // 12. Call success callback (e.g., refresh strategies list)
            if (onSuccess) {
                onSuccess();
            }

        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);

            // Check for user rejection
            const isUserRejection =
                error.message?.toLowerCase().includes('user rejected') ||
                error.message?.toLowerCase().includes('user denied') ||
                error.message?.toLowerCase().includes('user cancelled');

            if (isUserRejection) {
                toast.info('Cancellation Cancelled', {
                    description: 'You cancelled the wallet signature. Strategy remains active.',
                });
            } else {
                toast.error('Cancellation Failed', {
                    description: error.message || 'Strategy remains active. Please try again.',
                });
            }

            throw error;
        } finally {
            setIsLoading(false);
            setCancellingId(null);
        }
    }, [publicKey, signTransaction, signAllTransactions, connection]);

    return {
        cancelStrategy,
        isLoading,
        cancellingId,
        error,
    };
}
