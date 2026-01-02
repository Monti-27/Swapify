import { Program, AnchorProvider, type Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import type { Weswap } from './weswap';
import idl from './weswap.json';

/**
 * WeSwap Program ID on Mainnet
 * NOTE: This must match the 'address' field in weswap.json IDL
 */
export const PROGRAM_ID = new PublicKey('7UiSkmJek7KrNyUFLBi4vphdimZuYh2iGRNpAfzwKR8r');

/**
 * Wrapped SOL Mint - used when user selects Native SOL
 */
export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

/**
 * Wallet interface for Anchor Provider
 */
interface AnchorWallet {
    publicKey: PublicKey;
    signTransaction: <T extends import('@solana/web3.js').Transaction | import('@solana/web3.js').VersionedTransaction>(tx: T) => Promise<T>;
    signAllTransactions: <T extends import('@solana/web3.js').Transaction | import('@solana/web3.js').VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

/**
 * Initialize the WeSwap Anchor Program
 * @param connection - Solana RPC connection
 * @param wallet - Wallet adapter with signing capabilities
 * @returns Initialized Anchor Program instance
 */
export function getProgram(
    connection: Connection,
    wallet: AnchorWallet
): Program<Weswap> {
    const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: 'confirmed' }
    );
    return new Program(idl as Idl, provider) as unknown as Program<Weswap>;
}

/**
 * Derive Global PDA
 */
export function getGlobalPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        PROGRAM_ID
    );
}

/**
 * Derive Strategy PDA
 * @param owner - Owner's public key
 * @param strategyId - Strategy ID as Buffer (u64 little endian)
 */
export function getStrategyPda(owner: PublicKey, strategyIdBuffer: Buffer): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('strategy'), owner.toBuffer(), strategyIdBuffer],
        PROGRAM_ID
    );
}

/**
 * Derive Escrow PDA
 * @param strategyPda - Strategy PDA public key
 */
export function getEscrowPda(strategyPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), strategyPda.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive Escrow Token Account PDA
 * NOTE: This is NOT an ATA - it's a program-derived PDA
 * @param strategyPda - Strategy PDA public key
 */
export function getEscrowTokenAccountPda(strategyPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('escrow_token'), strategyPda.toBuffer()],
        PROGRAM_ID
    );
}
