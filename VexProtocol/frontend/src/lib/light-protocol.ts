import {
    PublicKey,
    VersionedTransaction,
    TransactionMessage,
    LAMPORTS_PER_SOL,
    Connection
} from '@solana/web3.js';
import {
    createRpc,
    Rpc,
    LightSystemProgram,
    bn,
    selectMinCompressedSolAccountsForTransfer
} from '@lightprotocol/stateless.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

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

const COMMITMENT_STORAGE_KEY = 'vex_privacy_commitments';
const ENCRYPTION_VERSION = 'v2';

function getHeliusRpcUrl(): string {
    const url = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
    if (!url) {
        throw new Error('Missing NEXT_PUBLIC_HELIUS_RPC_URL');
    }
    return url;
}

function getApiUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

function getRelayerPublicKey(): PublicKey {
    const address = process.env.NEXT_PUBLIC_RELAYER_ADDRESS;
    if (!address) {
        throw new Error('Missing NEXT_PUBLIC_RELAYER_ADDRESS');
    }
    return new PublicKey(address);
}

function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
    return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

export function createLightRpc(rpcUrl?: string): Rpc {
    const url = rpcUrl || getHeliusRpcUrl();
    return createRpc(url, url);
}

async function deriveEncryptionKey(
    wallet: WalletContextState,
    purpose: 'encrypt' | 'decrypt'
): Promise<CryptoKey> {
    if (!wallet.publicKey || !wallet.signMessage) throw new Error('Wallet not ready');

    const message = new TextEncoder().encode(`VexProtocol Privacy Key Derivation ${ENCRYPTION_VERSION}`);
    const signature = await wallet.signMessage(message);

    const ikm = await crypto.subtle.importKey(
        'raw',
        toArrayBuffer(signature),
        { name: 'HKDF' },
        false,
        ['deriveBits', 'deriveKey']
    );

    const publicKeyBytes = wallet.publicKey.toBytes();
    const saltInput = new Uint8Array([...new TextEncoder().encode('vex-salt-'), ...publicKeyBytes]);
    const saltHash = await crypto.subtle.digest('SHA-256', toArrayBuffer(saltInput));

    return await crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: saltHash,
            info: toArrayBuffer(new TextEncoder().encode(`vex-${purpose}-key`))
        },
        ikm,
        { name: 'AES-GCM', length: 256 },
        false,
        [purpose]
    );
}

export async function encryptNote(
    note: CommitmentNote,
    wallet: WalletContextState
): Promise<{ encrypted: string; hash: string }> {
    const key = await deriveEncryptionKey(wallet, 'encrypt');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const noteData = new TextEncoder().encode(JSON.stringify(note));

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(iv) },
        key,
        toArrayBuffer(noteData)
    );

    const version = new TextEncoder().encode(ENCRYPTION_VERSION);
    const combined = new Uint8Array(version.length + 1 + iv.length + encrypted.byteLength);
    combined.set(version);
    combined.set([iv.length], version.length);
    combined.set(iv, version.length + 1);
    combined.set(new Uint8Array(encrypted), version.length + 1 + iv.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(noteData));
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    return { encrypted: btoa(String.fromCharCode(...combined)), hash };
}

export async function decryptNote(
    encrypted: string,
    wallet: WalletContextState
): Promise<CommitmentNote> {
    const key = await deriveEncryptionKey(wallet, 'decrypt');
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const version = new TextDecoder().decode(combined.slice(0, 2));

    if (version !== ENCRYPTION_VERSION) throw new Error('Incompatible version');

    const ivLength = combined[2];
    const iv = combined.slice(3, 3 + ivLength);
    const data = combined.slice(3 + ivLength);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
}

export async function backupNoteToCloud(note: CommitmentNote, wallet: WalletContextState): Promise<string> {
    const { encrypted, hash } = await encryptNote(note, wallet);
    const response = await fetch(`${getApiUrl()}/privacy/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            walletAddress: wallet.publicKey!.toBase58(),
            encryptedNote: encrypted,
            noteHash: hash,
            amount: note.amount,
        }),
    });
    const result = await response.json();
    return result.id;
}

export async function recoverNotesFromCloud(wallet: WalletContextState): Promise<CommitmentNote[]> {
    const response = await fetch(`${getApiUrl()}/privacy/backup?wallet=${wallet.publicKey!.toBase58()}`);
    const { notes } = await response.json();
    const decrypted: CommitmentNote[] = [];
    for (const note of notes) {
        try {
            const decryptedNote = await decryptNote(note.encryptedNote, wallet);
            decryptedNote.backupId = note.id;
            decrypted.push(decryptedNote);
        } catch (e) { console.warn(e); }
    }
    return decrypted;
}

export async function recordTransaction(
    walletAddress: string,
    type: 'shield' | 'unshield',
    amount: number,
    txSignature?: string,
    destinationAddress?: string,
    commitmentId?: string
): Promise<string> {
    const response = await fetch(`${getApiUrl()}/privacy/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, type, amount, txSignature, destinationAddress, commitmentId }),
    });
    const result = await response.json();
    return result.id;
}

export async function scheduleChunkedTransfer(
    amount: number,
    destination: string,
    commitment: string,
    userPublicKey: string,
    commitmentId?: string
): Promise<ScheduleResult> {
    const response = await fetch(`${getApiUrl()}/privacy/transfer/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, destination, commitment, userPublicKey, commitmentId }),
    });
    return await response.json();
}

export async function getPendingJobs(walletAddress: string): Promise<any[]> {
    const response = await fetch(`${getApiUrl()}/privacy/jobs?wallet=${walletAddress}`);
    const { jobs } = await response.json();
    return jobs;
}

export async function createShieldTransaction(
    wallet: WalletContextState,
    amount: number,
    rpc?: Rpc
): Promise<ShieldResult> {
    const lightRpc = rpc || createLightRpc();
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const stateTreeInfos = await lightRpc.getStateTreeInfos();
    const rawTreeInfo = stateTreeInfos[0] as any;
    
    const hydratedTreeInfo = {
        ...rawTreeInfo,
        tree: new PublicKey(rawTreeInfo.tree || rawTreeInfo.pubkey || rawTreeInfo.id),
        queue: rawTreeInfo.queue ? new PublicKey(rawTreeInfo.queue) : undefined,
        cpiContext: rawTreeInfo.cpiContext ? new PublicKey(rawTreeInfo.cpiContext) : undefined,
    };

    const compressInstruction = await LightSystemProgram.compress({
        payer: wallet.publicKey!,
        toAddress: wallet.publicKey!,
        lamports: bn(lamports),
        outputStateTreeInfo: hydratedTreeInfo,
    });

    compressInstruction.keys = compressInstruction.keys.filter(k => k.pubkey !== undefined);
    const { blockhash } = await lightRpc.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
        payerKey: getRelayerPublicKey(),
        recentBlockhash: blockhash,
        instructions: [compressInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    const commitment = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    return { transaction, commitment, amount };
}

export async function generateUnshieldProof(
    wallet: WalletContextState,
    commitment: string,
    amount: number,
    destination: PublicKey,
    rpc?: Rpc
): Promise<UnshieldProof> {
    const lightRpc = rpc || createLightRpc();
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const compressedAccounts = await lightRpc.getCompressedAccountsByOwner(wallet.publicKey!);

    const hydratedItems = compressedAccounts.items.map((item: any) => ({
        ...item,
        owner: new PublicKey(item.owner),
        programId: new PublicKey(item.programId),
        merkleTree: new PublicKey(item.merkleTree),
        lamports: bn(item.lamports.toNumber ? item.lamports.toNumber() : item.lamports),
    }));

    const [selectedAccounts] = selectMinCompressedSolAccountsForTransfer(hydratedItems, bn(lamports));
    const proof = await lightRpc.getValidityProof(selectedAccounts.map(acc => bn(acc.hash)));

    const decompressInstruction = await LightSystemProgram.decompress({
        payer: wallet.publicKey!,
        toAddress: destination,
        lamports: bn(lamports),
        inputCompressedAccounts: selectedAccounts,
        recentValidityProof: proof.compressedProof,
        recentInputStateRootIndices: proof.rootIndices,
    });

    decompressInstruction.keys = decompressInstruction.keys.map(k => 
        k.pubkey.equals(wallet.publicKey!) ? { ...k, isSigner: true } : k
    );

    const { blockhash } = await lightRpc.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
        payerKey: getRelayerPublicKey(),
        recentBlockhash: blockhash,
        instructions: [decompressInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    const signedTx = await wallet.signTransaction!(transaction);
    const nullifier = `nullifier:${Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    return { transaction: signedTx, proof: JSON.stringify(proof.compressedProof), nullifier };
}

export async function submitToRelayer(transaction: VersionedTransaction, proof: string): Promise<string> {
    const response = await fetch(`${getApiUrl()}/privacy/relayer/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            transaction: Buffer.from(transaction.serialize()).toString('base64'),
            proof,
        }),
    });
    const result = await response.json();
    return result.signature;
}

export function saveCommitmentNote(note: CommitmentNote): void {
    const existing = getCommitmentNotes();
    existing.push(note);
    localStorage.setItem(COMMITMENT_STORAGE_KEY, btoa(JSON.stringify(existing)));
}

export function getCommitmentNotes(): CommitmentNote[] {
    const stored = localStorage.getItem(COMMITMENT_STORAGE_KEY);
    return stored ? JSON.parse(atob(stored)) : [];
}

export function updateCommitmentStatus(commitment: string, status: CommitmentNote['status']): void {
    const notes = getCommitmentNotes().map(n => n.commitment === commitment ? { ...n, status } : n);
    localStorage.setItem(COMMITMENT_STORAGE_KEY, btoa(JSON.stringify(notes)));
}

export function downloadRecoveryNote(): void {
    const blob = new Blob([JSON.stringify({ notes: getCommitmentNotes() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vex-privacy-recovery-${Date.now()}.json`;
    a.click();
}

export function importRecoveryNote(file: File): Promise<CommitmentNote[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target?.result as string);
            const existing = getCommitmentNotes();
            const merged = [...existing, ...data.notes.filter((n: any) => !existing.some(e => e.commitment === n.commitment))];
            localStorage.setItem(COMMITMENT_STORAGE_KEY, btoa(JSON.stringify(merged)));
            resolve(merged);
        };
        reader.readAsText(file);
    });
}

export async function getCompressedBalance(publicKey: PublicKey, rpc?: Rpc): Promise<number> {
    const lightRpc = rpc || createLightRpc();
    const accounts = await lightRpc.getCompressedAccountsByOwner(publicKey);
    return (accounts?.items || []).reduce((sum, acc) => sum + (acc.lamports?.toNumber() || 0), 0) / LAMPORTS_PER_SOL;
}
