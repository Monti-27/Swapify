/**
 * Light Protocol Client-Side SDK Wrapper
 * 
 * PRODUCTION SECURITY:
 * - Client-side ZK proof generation (private keys never touch backend)
 * - Client-side encryption of commitment notes (non-custodial backup)
 * - Secure commitment note management with cloud recovery
 */

import {
    PublicKey,
    Transaction,
    VersionedTransaction,
    TransactionMessage,
    LAMPORTS_PER_SOL,
    ComputeBudgetProgram,
} from '@solana/web3.js';
import {
    createRpc,
    Rpc,
    LightSystemProgram,
    bn,
    selectMinCompressedSolAccountsForTransfer,
    buildAndSignTx
} from '@lightprotocol/stateless.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

// ============================================================================
// Types
// ============================================================================

export interface ShieldResult {
    transaction: VersionedTransaction;
    commitment: string;
    amount: number;
}

export interface UnshieldProof {
    transaction: VersionedTransaction;
    proof: string;
    nullifier: string;
}

export interface CommitmentNote {
    commitment: string;
    amount: number;
    timestamp: number;
    status: 'shielded' | 'pending' | 'unshielded';
    backupId?: string;
}

export interface ScheduleResult {
    jobIds: string[];
    chunks: number[];
    estimatedDelays: { ms: number; human: string }[];
}

// ============================================================================
// Constants
// ============================================================================

const COMMITMENT_STORAGE_KEY = 'zk_privacy_commitments';
const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || '';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================================
// RPC Initialization
// ============================================================================

export function createLightRpc(rpcUrl?: string): Rpc {
    const url = rpcUrl || HELIUS_RPC_URL;

    if (!url) {
        throw new Error('NEXT_PUBLIC_HELIUS_RPC_URL environment variable is required');
    }

    return createRpc(url, url);
}

// ============================================================================
// Client-Side Encryption (Non-Custodial)
// ============================================================================

/**
 * Encrypts a commitment note using a key derived from wallet signature.
 * SECURITY: Backend never sees the unencrypted data.
 */
export async function encryptNote(
    note: CommitmentNote,
    wallet: WalletContextState
): Promise<{ encrypted: string; hash: string }> {
    if (!wallet.signMessage) {
        throw new Error('Wallet does not support message signing');
    }

    // Derive encryption key from wallet signature
    const message = new TextEncoder().encode('WeSwap Privacy Key Derivation v1');
    const signature = await wallet.signMessage(message);

    // Use signature as key material - cast to BufferSource for TypeScript compatibility
    const signatureBuffer = Uint8Array.from(signature) as unknown as BufferSource;
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        signatureBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    const saltBuffer = new TextEncoder().encode('weswap-privacy-salt') as unknown as BufferSource;
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    // Encrypt the note
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const noteData = new TextEncoder().encode(JSON.stringify(note));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        noteData as unknown as BufferSource
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Generate hash for deduplication
    const hashBuffer = await crypto.subtle.digest('SHA-256', noteData as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
        encrypted: btoa(String.fromCharCode(...combined)),
        hash,
    };
}

/**
 * Decrypts a commitment note using wallet signature.
 */
export async function decryptNote(
    encrypted: string,
    wallet: WalletContextState
): Promise<CommitmentNote> {
    if (!wallet.signMessage) {
        throw new Error('Wallet does not support message signing');
    }

    // Derive same key
    const message = new TextEncoder().encode('WeSwap Privacy Key Derivation v1');
    const signature = await wallet.signMessage(message);

    const signatureBuffer = Uint8Array.from(signature) as unknown as BufferSource;
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        signatureBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    const saltBuffer = new TextEncoder().encode('weswap-privacy-salt') as unknown as BufferSource;
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    // Decrypt
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        data as unknown as BufferSource
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
}

// ============================================================================
// Cloud Backup API
// ============================================================================

/**
 * Backs up an encrypted commitment note to the server.
 * SECURITY: Server stores only encrypted blob.
 */
export async function backupNoteToCloud(
    note: CommitmentNote,
    wallet: WalletContextState
): Promise<string> {
    if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
    }

    const { encrypted, hash } = await encryptNote(note, wallet);

    const response = await fetch(`${API_URL}/privacy/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            walletAddress: wallet.publicKey.toBase58(),
            encryptedNote: encrypted,
            noteHash: hash,
            amount: note.amount,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to backup note');
    }

    const result = await response.json();
    return result.id;
}

/**
 * Recovers commitment notes from cloud backup.
 */
export async function recoverNotesFromCloud(
    wallet: WalletContextState
): Promise<CommitmentNote[]> {
    if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
    }

    const response = await fetch(
        `${API_URL}/privacy/backup?wallet=${wallet.publicKey.toBase58()}`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch backed up notes');
    }

    const { notes } = await response.json();
    const decrypted: CommitmentNote[] = [];

    for (const note of notes) {
        try {
            const decryptedNote = await decryptNote(note.encryptedNote, wallet);
            decryptedNote.backupId = note.id;
            decrypted.push(decryptedNote);
        } catch {
            // Skip notes that can't be decrypted
        }
    }

    return decrypted;
}

// ============================================================================
// Transaction Recording API
// ============================================================================

export async function recordTransaction(
    walletAddress: string,
    type: 'shield' | 'unshield',
    amount: number,
    txSignature?: string,
    destinationAddress?: string,
    commitmentId?: string
): Promise<string> {
    const response = await fetch(`${API_URL}/privacy/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            walletAddress,
            type,
            amount,
            txSignature,
            destinationAddress,
            commitmentId,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to record transaction');
    }

    const result = await response.json();
    return result.id;
}

export async function getTransactionHistory(walletAddress: string): Promise<any[]> {
    const response = await fetch(
        `${API_URL}/privacy/transactions?wallet=${walletAddress}`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
    }

    const { transactions } = await response.json();
    return transactions;
}

// ============================================================================
// Schedule Transfer API
// ============================================================================

export async function scheduleChunkedTransfer(
    amount: number,
    destination: string,
    commitment: string,
    userPublicKey: string,
    commitmentId?: string
): Promise<ScheduleResult> {
    const response = await fetch(`${API_URL}/privacy/transfer/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount,
            destination,
            commitment,
            userPublicKey,
            commitmentId,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Scheduling failed' }));
        throw new Error(error.message || 'Failed to schedule transfer');
    }

    const result = await response.json();
    return {
        jobIds: result.jobIds,
        chunks: result.chunks,
        estimatedDelays: result.estimatedDelays,
    };
}

export async function getPendingJobs(walletAddress: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/privacy/jobs?wallet=${walletAddress}`);

    if (!response.ok) {
        throw new Error('Failed to fetch pending jobs');
    }

    const { jobs } = await response.json();
    return jobs;
}

// ============================================================================
// Shielding
// ============================================================================

// 🟢 Load Relayer Address from Environment (shared with unshield)
const SHIELD_RELAYER_ADDRESS = process.env.NEXT_PUBLIC_RELAYER_ADDRESS;

export async function createShieldTransaction(
    wallet: WalletContextState,
    amount: number,
    rpc?: Rpc
): Promise<ShieldResult> {
    // 1. Validation
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
    if (amount <= 0) throw new Error("Amount must be positive");

    // 🛡️ Validate Relayer Env Var
    if (!SHIELD_RELAYER_ADDRESS) {
        throw new Error('Configuration Error: NEXT_PUBLIC_RELAYER_ADDRESS is missing in .env');
    }

    const RELAYER_PUBKEY = new PublicKey(SHIELD_RELAYER_ADDRESS);
    const lightRpc = rpc || createLightRpc();
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    console.log("------------------------------------------");
    console.log("🛡️ SHIELD DEBUG: Fee Payer Setup");
    console.log("User (Funding):", wallet.publicKey.toBase58());
    console.log("Relayer (Gas):", RELAYER_PUBKEY.toBase58());

    // 2. Fetch State Trees
    console.log("Fetching state trees...");
    const stateTreeInfos = await lightRpc.getStateTreeInfos();

    if (!stateTreeInfos || stateTreeInfos.length === 0) {
        throw new Error("No Light Protocol state trees available.");
    }

    const rawTreeInfo = stateTreeInfos[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const treeObj = rawTreeInfo as any;

    // 3. Hydrate the Tree Object
    const getPublicKey = (val: any): PublicKey | undefined => {
        if (!val) return undefined;
        if (typeof val === 'string') return new PublicKey(val);
        if (typeof val.toBase58 === 'function') return new PublicKey(val.toBase58());
        if (val.toString) return new PublicKey(val.toString());
        return undefined;
    };

    const treeKey = getPublicKey(treeObj.tree || treeObj.pubkey || treeObj.id);
    if (!treeKey) {
        console.error("Failed Tree Object:", rawTreeInfo);
        throw new Error("Could not extract a valid State Tree PublicKey");
    }

    const hydratedTreeInfo = {
        ...treeObj,
        tree: treeKey,
        queue: getPublicKey(treeObj.queue),
        cpiContext: getPublicKey(treeObj.cpiContext),
    };

    console.log(`✅ Hydrated Tree: ${hydratedTreeInfo.tree.toBase58()}`);

    // 4. Build Compress Instruction
    // User provides the funds (payer for the SOL being shielded)
    const compressInstruction = await LightSystemProgram.compress({
        payer: wallet.publicKey,  // User pays the lamports being compressed
        toAddress: wallet.publicKey,
        lamports: bn(lamports),
        outputStateTreeInfo: hydratedTreeInfo,
    });

    // Safety: Filter undefined keys
    compressInstruction.keys = compressInstruction.keys.filter(k => k.pubkey !== undefined);

    const { blockhash } = await lightRpc.getLatestBlockhash();

    // 5. Build Transaction Message
    // 🟢 CRITICAL FIX: Relayer pays gas fee
    const messageV0 = new TransactionMessage({
        payerKey: RELAYER_PUBKEY,  // <--- Relayer pays gas
        recentBlockhash: blockhash,
        instructions: [compressInstruction],
    }).compileToV0Message();

    // 🔍 DEBUG: Verify compiled payer
    const feePayerAddress = messageV0.staticAccountKeys[0];
    console.log("DEBUG: Compiled Payer:", feePayerAddress.toBase58());

    if (feePayerAddress.toBase58() !== RELAYER_PUBKEY.toBase58()) {
        console.error("⚠️ CRITICAL: Compiled transaction has wrong payer!");
    }

    const transaction = new VersionedTransaction(messageV0);

    // 6. User Partial Sign (User signs to authorize their funds)
    const signedTx = await wallet.signTransaction(transaction);

    console.log("✅ User signed shield request. Ready for Relayer...");
    console.log("------------------------------------------");

    const commitment = generateCommitmentHash(
        wallet.publicKey.toBase58(),
        lamports,
        Date.now()
    );

    return { transaction: signedTx, commitment, amount };
}
// ============================================================================
// Unshielding
// ============================================================================

// 🟢 Load Env Var
const RELAYER_ADDRESS_STRING = process.env.NEXT_PUBLIC_RELAYER_ADDRESS;

export async function generateUnshieldProof(
    wallet: WalletContextState,
    commitment: string,
    amount: number,
    destination: PublicKey,
    rpc?: Rpc
): Promise<UnshieldProof> {
    // 1. Validation
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
    }

    if (!RELAYER_ADDRESS_STRING) {
        throw new Error('Configuration Error: NEXT_PUBLIC_RELAYER_ADDRESS is missing in .env');
    }

    // Create Relayer Key
    const RELAYER_PUBKEY = new PublicKey(RELAYER_ADDRESS_STRING);

    // 🔍 DEBUG: Print Keys
    console.log("------------------------------------------");
    console.log("DEBUG: Relayer PubKey:", RELAYER_PUBKEY.toBase58());
    console.log("DEBUG: User Wallet:", wallet.publicKey.toBase58());

    const lightRpc = rpc || createLightRpc();
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    console.log("Fetching compressed accounts...");
    const compressedAccounts = await lightRpc.getCompressedAccountsByOwner(wallet.publicKey);

    if (!compressedAccounts || compressedAccounts.items.length === 0) {
        throw new Error('No compressed accounts found (Balance is 0).');
    }

    // 2. Hydrate Accounts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hydratedItems = compressedAccounts.items.map((item: any) => ({
        ...item,
        owner: new PublicKey(item.owner),
        programId: new PublicKey(item.programId),
        merkleTree: new PublicKey(item.merkleTree || item.tree),
        hash: item.hash,
        lamports: item.lamports,
    }));

    const [selectedAccounts] = selectMinCompressedSolAccountsForTransfer(
        hydratedItems,
        bn(lamports)
    );

    if (!selectedAccounts) throw new Error("Insufficient funds");

    console.log("Generating Proof...");
    const proof = await lightRpc.getValidityProof(
        selectedAccounts.map(acc => bn(acc.hash))
    );

    // 3. Build Decompress Instruction
    const decompressInstruction = await LightSystemProgram.decompress({
        payer: RELAYER_PUBKEY, // Relayer pays rent
        toAddress: destination,
        lamports: bn(lamports),
        inputCompressedAccounts: selectedAccounts,
        recentValidityProof: proof.compressedProof,
        recentInputStateRootIndices: proof.rootIndices,
    });

    // Safety: Filter undefined keys
    decompressInstruction.keys = decompressInstruction.keys.filter(k => k.pubkey !== undefined);

    const { blockhash } = await lightRpc.getLatestBlockhash();

    // 4. Build Transaction Message
    const messageV0 = new TransactionMessage({
        payerKey: RELAYER_PUBKEY, // <--- Relayer is Fee Payer
        recentBlockhash: blockhash,
        instructions: [decompressInstruction],
    }).compileToV0Message();

    // 🔍 DEBUG: Inspect the Compiled Message
    const feePayerIndex = 0; // In V0 messages, the first static account is usually the payer
    const feePayerAddress = messageV0.staticAccountKeys[feePayerIndex];
    console.log("DEBUG: Compiled Payer:", feePayerAddress.toBase58());

    // Check if the compiled message thinks the Payer is a signer
    if (feePayerAddress.toBase58() !== RELAYER_PUBKEY.toBase58()) {
        console.error("⚠️ CRITICAL: Compiled transaction has wrong payer!");
    }

    const transaction = new VersionedTransaction(messageV0);

    // 5. User Partial Sign
    const signedTx = await wallet.signTransaction(transaction);

    console.log("------------------------------------------");

    const nullifier = generateNullifier(commitment, wallet.publicKey.toBase58());

    return {
        transaction: signedTx,
        proof: JSON.stringify(proof.compressedProof),
        nullifier,
    };
}

// ============================================================================
// Relayer Submission
// ============================================================================

export async function submitToRelayer(
    transaction: VersionedTransaction,
    proof: string
): Promise<string> {
    const response = await fetch(`${API_URL}/privacy/relayer/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            transaction: Buffer.from(transaction.serialize()).toString('base64'),
            proof,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Relayer submission failed' }));
        throw new Error(error.message || 'Relayer submission failed');
    }

    const result = await response.json();
    return result.signature;
}

// ============================================================================
// Chunked Unshielding (Frontend-Side Splitting & Signing)
// ============================================================================

export interface ChunkedUnshieldResult {
    signedTransactions: string[];  // Base64 encoded signed transactions
    delays: number[];              // Delay in ms for each transaction
    chunks: number[];              // Amount in SOL for each chunk
}

/**
 * Splits an amount into random chunks for privacy
 * 🛡️ SECURITY: Uses INTEGER MATH (Lamports) to prevent floating-point errors
 * 
 * @param totalAmount - Total amount in SOL
 * @param forcedNumChunks - Optional: Force specific number of chunks (for UTXO limits)
 */
function splitIntoRandomChunks(totalAmount: number, forcedNumChunks?: number): number[] {
    // If a specific number is requested (due to UTXO limits), use it.
    // Otherwise, randomize 2-5.
    const numChunks = forcedNumChunks || (2 + Math.floor(Math.random() * 4));

    // 🛡️ CRITICAL: Work in Lamports (Integers) to avoid 0.1 + 0.2 != 0.3 errors
    const totalLamports = Math.floor(totalAmount * 1_000_000_000); // 1e9

    // Handle 1 Chunk Case (Direct Pass-through)
    if (numChunks === 1) {
        return [totalAmount];
    }

    // Generate random weights
    const weights: number[] = [];
    for (let i = 0; i < numChunks; i++) {
        weights.push(Math.random() + 0.1); // +0.1 ensures no tiny chunks
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const chunkAmounts: number[] = [];
    let usedLamports = 0;

    // Calculate all chunks except the last one
    for (let i = 0; i < numChunks - 1; i++) {
        const chunkLamports = Math.floor((weights[i] / totalWeight) * totalLamports);

        // Ensure min chunk size of ~0.001 SOL to avoid dust errors
        const safeChunk = Math.max(1_000_000, chunkLamports);

        chunkAmounts.push(safeChunk / 1_000_000_000);
        usedLamports += safeChunk;
    }

    // 🛡️ CRITICAL: Last chunk gets the EXACT remainder (no rounding errors)
    const remainingLamports = totalLamports - usedLamports;
    if (remainingLamports > 0) {
        chunkAmounts.push(remainingLamports / 1_000_000_000);
    }

    return chunkAmounts;
}

/**
 * Generates random delays for each chunk (in milliseconds)
 * 🛡️ SECURITY: Caps at 45s to prevent blockhash expiry (expires ~60-90s)
 */
function generateRandomDelays(numChunks: number): number[] {
    // 🛡️ CRITICAL: Solana blockhashes expire in ~60-90s.
    // We MUST limit the last chunk to max 45s to ensure it confirms.
    const MAX_SAFE_DELAY_MS = 45000;

    const delays: number[] = [];
    let cumulativeDelay = 0;

    for (let i = 0; i < numChunks; i++) {
        if (i === 0) {
            delays.push(0); // First chunk always immediate
        } else {
            // Random delay between 2s and 10s per chunk
            const randomStep = 2000 + Math.floor(Math.random() * 8000);
            cumulativeDelay += randomStep;

            // Cap at 45s. If we hit the limit, all remaining chunks go at 45s.
            const safeDelay = Math.min(cumulativeDelay, MAX_SAFE_DELAY_MS);
            delays.push(safeDelay);
        }
    }
    return delays;
}

/**
 * Creates a single unsigned unshield transaction for a specific amount
 * Used internally by chunked unshield
 * 
 * @param preHydratedAccounts - Optional: Pre-hydrated accounts to use (for UTXO consumption)
 *                              If not provided, will fetch fresh accounts from RPC
 */
async function createSingleUnshieldTransaction(
    wallet: WalletContextState,
    amount: number,
    destination: PublicKey,
    rpc: Rpc,
    preHydratedAccounts?: any[]  // 🛡️ NEW: Accept pre-selected accounts to prevent double-spend
): Promise<Transaction | VersionedTransaction> {
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    // --- DEBUG START ---
    const RELAYER_ADDRESS = process.env.NEXT_PUBLIC_RELAYER_ADDRESS;
    console.log("🔍 DEBUG createSingleUnshieldTransaction:");
    console.log("   - Relayer Env Var:", RELAYER_ADDRESS);
    console.log("   - Destination:", destination?.toBase58?.() || destination);
    console.log("   - Wallet:", wallet.publicKey?.toBase58());
    console.log("   - Amount:", amount);

    if (!RELAYER_ADDRESS) {
        console.error("🚨 CRITICAL ERROR: NEXT_PUBLIC_RELAYER_ADDRESS is missing in .env file.");
        throw new Error("Missing NEXT_PUBLIC_RELAYER_ADDRESS in Environment Variables! Add it to .env.local");
    }
    // --- DEBUG END ---

    const RELAYER_PUBKEY = new PublicKey(RELAYER_ADDRESS);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // 🛡️ UTXO CONSUMPTION FIX: Use pre-selected accounts if provided
    let hydratedItems: any[];

    if (preHydratedAccounts && preHydratedAccounts.length > 0) {
        // Use the pre-selected accounts (prevents double-spend in chunked mode)
        console.log(`🛡️ Using ${preHydratedAccounts.length} pre-selected accounts (UTXO consumption mode)`);
        hydratedItems = preHydratedAccounts;
    } else {
        // Fetch fresh accounts (single transaction mode)
        console.log("🔍 Fetching fresh accounts from RPC...");
        const compressedAccounts = await rpc.getCompressedAccountsByOwner(wallet.publicKey);

        if (!compressedAccounts || compressedAccounts.items.length === 0) {
            throw new Error('No compressed accounts found');
        }

        console.log("🔍 DEBUG: Raw compressed accounts:", compressedAccounts.items.length);

        // Hydrate accounts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hydratedItems = compressedAccounts.items
            .filter((item: any) => {
                if (!item) return false;
                if (!item.owner) {
                    console.warn("⚠️ Skipping item with undefined owner");
                    return false;
                }
                return true;
            })
            .map((item: any) => {
                const merkleTreeAddress =
                    item.merkleTree ||
                    item.tree ||
                    item.treeInfo?.tree ||
                    item.treeInfo?.merkleTree ||
                    item.treePublicKey;

                return {
                    ...item,
                    owner: new PublicKey(item.owner),
                    programId: item.programId ? new PublicKey(item.programId) : undefined,
                    merkleTree: merkleTreeAddress ? new PublicKey(merkleTreeAddress) : null,
                    hash: item.hash,
                    lamports: item.lamports,
                };
            })
            .filter((item: any) => item.merkleTree !== null);

        if (hydratedItems.length === 0) {
            throw new Error('No valid compressed accounts after filtering');
        }

        console.log(`✅ Hydrated accounts: ${hydratedItems.length}`);
    }

    // 🛡️ UTXO HANDLING: Use pre-selected accounts directly OR run selection
    let selectedAccounts: any[];

    if (preHydratedAccounts && preHydratedAccounts.length > 0) {
        // DIRECT USE: Pre-selected accounts bypass the selection algorithm
        // This is critical for UTXO consumption - we MUST use exactly these accounts
        console.log(`🛡️ DIRECT MODE: Using ${preHydratedAccounts.length} pre-selected account(s) directly`);
        selectedAccounts = preHydratedAccounts;
    } else {
        // SELECTION MODE: Run the SDK's account selector
        console.log("🔍 SELECTION MODE: Running account selection algorithm...");
        const [selected] = selectMinCompressedSolAccountsForTransfer(
            hydratedItems,
            bn(lamports)
        );

        if (!selected) throw new Error(`Insufficient funds for ${amount} SOL chunk`);
        selectedAccounts = selected;
    }

    console.log("🔍 Final accounts for transaction:", selectedAccounts.length);

    // Get proof
    const proof = await rpc.getValidityProof(
        selectedAccounts.map(acc => bn(acc.hash))
    );

    console.log("✅ Got validity proof");

    // Build decompress instruction
    const decompressInstruction = await LightSystemProgram.decompress({
        payer: RELAYER_PUBKEY,
        toAddress: destination,
        lamports: bn(lamports),
        inputCompressedAccounts: selectedAccounts,
        recentValidityProof: proof.compressedProof,
        recentInputStateRootIndices: proof.rootIndices,
    });

    console.log("✅ Built decompress instruction. Keys count:", decompressInstruction.keys.length);

    // Filter undefined keys - critical to prevent wallet crash
    const originalKeysCount = decompressInstruction.keys.length;
    decompressInstruction.keys = decompressInstruction.keys.filter(k => {
        if (!k || !k.pubkey) {
            console.warn("⚠️ Filtering undefined key from instruction");
            return false;
        }
        return true;
    });
    console.log(`🔍 Keys after filtering: ${decompressInstruction.keys.length} / ${originalKeysCount}`);

    const { blockhash } = await rpc.getLatestBlockhash();

    if (!blockhash) {
        throw new Error("🚨 FATAL: Failed to get blockhash from RPC!");
    }

    console.log("✅ Got blockhash:", blockhash);

    // 🛡️ CRITICAL: ZK Proofs require more compute units than the default 200k
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 600_000 // Safe upper limit for ZK Unshielding
    });

    // Add priority fee to ensure transaction lands (increased from 1000)
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 5000 // Higher priority fee for reliability
    });

    console.log("✅ Added compute budget (600k units) + priority fee");

    // 🛠️ BUILD LEGACY TRANSACTION (Better wallet compatibility)
    // Legacy Transaction class handles partial signing more gracefully
    const transaction = new Transaction({
        feePayer: RELAYER_PUBKEY,  // ✅ MUST BE RELAYER FOR PRIVACY (Backend signs this)
        recentBlockhash: blockhash,
    });

    // Add instructions in correct order
    transaction.add(computeBudgetIx);
    transaction.add(priorityFeeIx);
    transaction.add(decompressInstruction);

    // 🔍 SIZE CHECK (Critical - Solana max is 1232 bytes)
    try {
        const serialized = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false
        });
        console.log(`🔍 Transaction Size: ${serialized.length} bytes (Max 1232)`);
        if (serialized.length > 1232) {
            console.error("🚨 WARNING: Transaction size exceeds Solana packet limit!");
        }
    } catch (e) {
        console.log("📊 Size check skipped (signatures pending)");
    }

    // 🛑 DEEP INSPECTION - Verify transaction integrity
    console.log("🔍 INSPECTING TRANSACTION STRUCTURE:");
    console.log("   - Type: ✅ Legacy Transaction");
    console.log("   - Fee Payer:", transaction.feePayer?.toBase58());
    console.log("   - Recent Blockhash:", transaction.recentBlockhash);
    console.log("   - Instructions Count:", transaction.instructions.length);

    if (!transaction.recentBlockhash) {
        throw new Error("🚨 FATAL: Transaction missing recentBlockhash!");
    }

    if (!transaction.feePayer) {
        throw new Error("🚨 FATAL: Transaction missing feePayer!");
    }

    console.log("✅ Transaction structure valid - ready for signing");

    return transaction;
}

/**
 * Creates chunked unshield transactions with a single signature popup
 * 
 * 🛡️ UTXO CONSUMPTION: Fetches accounts ONCE, then removes used accounts
 *    from the pool to prevent double-spend conflicts during simulation.
 * 
 * @param wallet - User's wallet
 * @param totalAmount - Total amount to unshield in SOL
 * @param destination - Destination address
 * @returns Signed transactions ready for relaying
 */
/**
 * Creates chunked unshield transactions with a single signature popup
 * 
 * 🛡️ DYNAMIC CHUNKING: Limits chunks to available UTXOs to prevent fragmentation errors.
 * 🛡️ UTXO CONSUMPTION: Removes used accounts from pool.
 * 🛡️ PRIVACY: Uses partial signing to allow Relayer to pay gas.
 * 
 * @param wallet - User's wallet
 * @param totalAmount - Total amount to unshield in SOL
 * @param destination - Destination address
 * @returns Signed transactions ready for relaying
 */
export async function createChunkedUnshieldTransactions(
    wallet: WalletContextState,
    totalAmount: number,
    destination: PublicKey
): Promise<ChunkedUnshieldResult> {
    if (!wallet.publicKey || !wallet.signAllTransactions) {
        throw new Error('Wallet not connected or does not support batch signing');
    }

    const lightRpc = createLightRpc();

    console.log("------------------------------------------");
    console.log("� SMART UNSHIELD: Analyzing privacy notes...");

    // 1. Fetch Accounts FIRST
    const compressedAccounts = await lightRpc.getCompressedAccountsByOwner(wallet.publicKey);

    if (!compressedAccounts || compressedAccounts.items.length === 0) {
        throw new Error('No shielded funds found.');
    }

    // 2. Hydrate & Filter Pool (Robust Hydration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let availableAccounts = compressedAccounts.items
        .filter((item: any) => item && item.owner)
        .map((item: any) => {
            // Robust merkleTree extraction
            const merkleTreeAddress =
                item.merkleTree ||
                item.tree ||
                item.treeInfo?.tree ||
                item.treeInfo?.merkleTree ||
                item.treePublicKey;

            return {
                ...item,
                owner: new PublicKey(item.owner),
                programId: item.programId ? new PublicKey(item.programId) : undefined,
                merkleTree: merkleTreeAddress ? new PublicKey(merkleTreeAddress) : null,
                hash: item.hash,
                lamports: item.lamports,
            };
        })
        .filter((item: any) => item.merkleTree !== null);

    console.log(`✅ Available Notes: ${availableAccounts.length}`);

    // 🛡️ 3. DYNAMIC CHUNKING STRATEGY
    // We cannot create more parallel chunks than we have spendable notes.

    // Default desired chunks (random 2-5)
    let desiredChunks = 2 + Math.floor(Math.random() * 4);

    // Cap chunks to the number of available accounts
    const maxPossibleChunks = availableAccounts.length;

    if (maxPossibleChunks < desiredChunks) {
        console.warn(`⚠️ Privacy Note: You have ${maxPossibleChunks} note(s), but requested ${desiredChunks} chunks.`);
        console.warn(`   Adjusting to ${maxPossibleChunks} chunk(s) to prevent fragmentation error.`);
        desiredChunks = maxPossibleChunks;
    }

    // Minimum 1 chunk
    if (desiredChunks < 1) desiredChunks = 1;

    console.log(`🔀 Strategy: Generating ${desiredChunks} chunk(s) for ${totalAmount} SOL`);

    // 4. Generate Splits using the SAFE chunk count
    const chunks = splitIntoRandomChunks(totalAmount, desiredChunks);
    const delays = generateRandomDelays(chunks.length);

    console.log("Chunks:", chunks);
    console.log("Delays (ms):", delays);

    // 5. Create Transactions
    const transactions: (Transaction | VersionedTransaction)[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunkAmount = chunks[i];
        const requiredLamports = Math.floor(chunkAmount * LAMPORTS_PER_SOL);

        console.log(`📦 Chunk ${i + 1}/${chunks.length}: ${chunkAmount} SOL`);
        console.log(`   Available accounts: ${availableAccounts.length}`);

        // Find Account
        const accountIndex = availableAccounts.findIndex(acc =>
            Number(acc.lamports) >= requiredLamports
        );

        if (accountIndex === -1) {
            throw new Error(
                `Fragmentation Error: No single note covers chunk ${i + 1} (${chunkAmount} SOL). ` +
                `You have ${availableAccounts.length} notes left.`
            );
        }

        // Consume Account
        const selectedAccount = availableAccounts[accountIndex];
        availableAccounts.splice(accountIndex, 1);

        console.log(`   ✅ Using Note with ${selectedAccount.lamports} lamports`);

        // Build Tx
        const tx = await createSingleUnshieldTransaction(
            wallet,
            chunkAmount,
            destination,
            lightRpc,
            [selectedAccount] // Pass single account
        );
        transactions.push(tx);
    }

    // 6. Sign & Serialize (Partial Sign)
    console.log(`\n📝 Requesting signature for ${transactions.length} transactions...`);
    const signedTransactions = await wallet.signAllTransactions(transactions);
    console.log("✅ All transactions signed!");

    const serializedTxs = signedTransactions.map(tx => {
        // Handle both Transaction and VersionedTransaction
        try {
            // Try Legacy Transaction with requireAllSignatures false
            return Buffer.from(
                (tx as Transaction).serialize({ requireAllSignatures: false })
            ).toString('base64');
        } catch {
            // Fall back to VersionedTransaction serialization
            return Buffer.from(
                (tx as VersionedTransaction).serialize()
            ).toString('base64');
        }
    });

    console.log("------------------------------------------");

    return {
        signedTransactions: serializedTxs,
        delays,
        chunks,
    };
}

/**
 * Submits chunked transactions to the backend for scheduled relay
 */
export async function submitChunkedTransactions(
    result: ChunkedUnshieldResult
): Promise<{ jobIds: string[] }> {
    const payload = result.signedTransactions.map((tx, i) => ({
        signedTx: tx,
        delay: result.delays[i],
        amount: result.chunks[i],
    }));

    const response = await fetch(`${API_URL}/privacy/schedule-relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: payload }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to schedule transactions' }));
        throw new Error(error.message || 'Failed to schedule transactions');
    }

    return response.json();
}

// ============================================================================
// Local Storage (still maintained for offline access)
// ============================================================================

export function saveCommitmentNote(note: CommitmentNote): void {
    const existingNotes = getCommitmentNotes();
    existingNotes.push(note);
    const encoded = btoa(JSON.stringify(existingNotes));
    localStorage.setItem(COMMITMENT_STORAGE_KEY, encoded);
}

export function getCommitmentNotes(): CommitmentNote[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(COMMITMENT_STORAGE_KEY);
    if (!stored) return [];

    try {
        return JSON.parse(atob(stored));
    } catch {
        return [];
    }
}

export function updateCommitmentStatus(
    commitment: string,
    status: CommitmentNote['status']
): void {
    const notes = getCommitmentNotes();
    const updated = notes.map(note =>
        note.commitment === commitment ? { ...note, status } : note
    );
    localStorage.setItem(COMMITMENT_STORAGE_KEY, btoa(JSON.stringify(updated)));
}

export function downloadRecoveryNote(): void {
    const notes = getCommitmentNotes();
    if (notes.length === 0) throw new Error('No commitment notes to export');

    const blob = new Blob([JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        network: 'mainnet-beta',
        notes,
    }, null, 2)], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zk-privacy-recovery-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function importRecoveryNote(file: File): Promise<CommitmentNote[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (!data.notes || !Array.isArray(data.notes)) {
                    throw new Error('Invalid recovery file format');
                }
                const existing = getCommitmentNotes();
                const existingSet = new Set(existing.map(n => n.commitment));
                const newNotes = data.notes.filter((n: CommitmentNote) => !existingSet.has(n.commitment));
                const merged = [...existing, ...newNotes];
                localStorage.setItem(COMMITMENT_STORAGE_KEY, btoa(JSON.stringify(merged)));
                resolve(merged);
            } catch {
                reject(new Error('Failed to parse recovery file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// ============================================================================
// Balance Query
// ============================================================================

export async function getCompressedBalance(publicKey: PublicKey, rpc?: Rpc): Promise<number> {
    const lightRpc = rpc || createLightRpc();
    try {
        const accounts = await lightRpc.getCompressedAccountsByOwner(publicKey);
        if (!accounts || accounts.items.length === 0) return 0;
        const total = accounts.items.reduce((sum, acc) => sum + (acc.lamports?.toNumber() || 0), 0);
        return total / LAMPORTS_PER_SOL;
    } catch {
        return 0;
    }
}

// ============================================================================
// Helpers
// ============================================================================

function generateCommitmentHash(pubkey: string, lamports: number, timestamp: number): string {
    const data = `${pubkey}:${lamports}:${timestamp}:${Math.random().toString(36)}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

function generateNullifier(commitment: string, pubkey: string): string {
    const data = `${commitment}:${pubkey}:${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash = hash & hash;
    }
    return `nullifier:${Math.abs(hash).toString(16)}`;
}
