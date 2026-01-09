/**
* Privacy Dashboard - Production UI with Cloud Backup
*/

'use client';

import { useState, useEffect, useCallback } from 'react';
import { VaultTimeline } from './vault-timeline';
import { ShieldCheck, Copy, Eye, EyeOff, Shield, Terminal, Download, Upload, Loader2, Cloud, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
    createLightRpc,
    createShieldTransaction,
    generateUnshieldProof,
    submitToRelayer,
    getCompressedBalance,
    getCommitmentNotes,
    saveCommitmentNote,
    updateCommitmentStatus,
    downloadRecoveryNote,
    importRecoveryNote,
    backupNoteToCloud,
    recoverNotesFromCloud,
    recordTransaction,
    scheduleChunkedTransfer,
    getPendingJobs,
    CommitmentNote,
} from '@/lib/light-protocol';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type StepStatus = 'completed' | 'processing' | 'pending' | 'error';

interface TimelineStep {
    id: string;
    label: string;
    status: StepStatus;
    description: string;
}

export function PrivacyDashboard() {
    const wallet = useWallet();

    const [shieldedBalance, setShieldedBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isShielding, setIsShielding] = useState(false);
    const [isUnshielding, setIsUnshielding] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [commitmentNotes, setCommitmentNotes] = useState<CommitmentNote[]>([]);
    const [pendingJobs, setPendingJobs] = useState<any[]>([]);
    const [showNotes, setShowNotes] = useState(false);

    const [shieldAmount, setShieldAmount] = useState<string>('');
    const [unshieldAmount, setUnshieldAmount] = useState<string>('');
    const [destinationAddress, setDestinationAddress] = useState<string>('');
    const [useChunkedTransfer, setUseChunkedTransfer] = useState(false);

    // 🔑 Encryption key cache (prevents double signMessage popup)
    const [cachedEncryptionKey, setCachedEncryptionKey] = useState<CryptoKey | null>(null);

    const [steps, setSteps] = useState<TimelineStep[]>([
        { id: '1', label: 'Deposit', status: 'pending', description: 'Connect wallet & deposit SOL' },
        { id: '2', label: 'Shielding', status: 'pending', description: 'Applying ZK compression' },
        { id: '3', label: 'Obfuscation', status: 'pending', description: 'Randomizing via relayer' },
        { id: '4', label: 'Completed', status: 'pending', description: 'Funds unshielded' },
    ]);

    useEffect(() => {
        if (wallet.connected && wallet.publicKey) {
            loadData();
        }
    }, [wallet.connected, wallet.publicKey]);

    const loadData = useCallback(async () => {
        if (!wallet.publicKey) return;

        setIsLoading(true);
        try {
            const [balance, notes, jobs] = await Promise.all([
                getCompressedBalance(wallet.publicKey),
                Promise.resolve(getCommitmentNotes()),
                getPendingJobs(wallet.publicKey.toBase58()).catch(() => []),
            ]);

            setShieldedBalance(balance);
            setCommitmentNotes(notes);
            setPendingJobs(jobs);

            if (notes.some(n => n.status === 'shielded')) {
                updateStepStatus(1, 'completed');
                updateStepStatus(2, 'completed');
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [wallet.publicKey]);

    const updateStepStatus = (stepIndex: number, status: StepStatus) => {
        setSteps(prev => prev.map((step, i) =>
            i === stepIndex ? { ...step, status } : step
        ));
    };

    // ============================================================================
    // Shield Handler (FIXED: No Double Popups)
    // ============================================================================

    const handleShield = async () => {
        // 🛑 Re-entrancy Protection
        if (isShielding) {
            console.warn('Shield already in progress, ignoring duplicate call');
            return;
        }

        if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction || !wallet.signMessage) {
            toast.error('Please connect your wallet');
            return;
        }

        const amount = parseFloat(shieldAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setIsShielding(true);
        updateStepStatus(0, 'processing');

        try {
            // 🔑 Step 1: Derive encryption key FIRST (triggers wallet.signMessage ONCE)
            console.log('Step 1: Deriving encryption key...');

            let cryptoKey = cachedEncryptionKey;
            if (!cryptoKey) {
                const message = new TextEncoder().encode('WeSwap Privacy Key Derivation v1');
                const signature = await wallet.signMessage(message);

                // Convert Uint8Array to ArrayBuffer for crypto.subtle.importKey
                // Create a new Uint8Array copy to get a clean ArrayBuffer (not SharedArrayBuffer)
                const signatureBuffer = new Uint8Array(signature).buffer as ArrayBuffer;

                const keyMaterial = await crypto.subtle.importKey(
                    'raw',
                    signatureBuffer,
                    { name: 'PBKDF2' },
                    false,
                    ['deriveBits', 'deriveKey']
                );

                const saltArray = new TextEncoder().encode('weswap-privacy-salt');
                const saltBuffer = saltArray.buffer.slice(
                    saltArray.byteOffset,
                    saltArray.byteOffset + saltArray.byteLength
                ) as ArrayBuffer;

                cryptoKey = await crypto.subtle.deriveKey(
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

                setCachedEncryptionKey(cryptoKey);
                console.log('✅ Encryption key derived and cached');
            } else {
                console.log('✅ Using cached encryption key');
            }

            // Step 2: Create transaction (after key is derived)
            console.log('Step 2: Creating transaction...');
            const { transaction, commitment, amount: shieldedAmt } = await createShieldTransaction(
                wallet,
                amount
            );

            updateStepStatus(0, 'completed');
            updateStepStatus(1, 'processing');

            // Step 3: Create note with PENDING status
            const note: CommitmentNote = {
                commitment,
                amount: shieldedAmt,
                timestamp: Date.now(),
                status: 'pending',
            };

            // Step 4: PERSIST LOCALLY FIRST (Boomerang Safety)
            saveCommitmentNote(note);
            console.log('✅ Note saved to localStorage');

            // Step 5: Backup to cloud (reuse cached key - NO signMessage)
            try {
                // Encrypt note using cached key
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;

                const noteDataArray = new TextEncoder().encode(JSON.stringify(note));
                const noteDataBuffer = noteDataArray.buffer.slice(
                    noteDataArray.byteOffset,
                    noteDataArray.byteOffset + noteDataArray.byteLength
                ) as ArrayBuffer;

                const encrypted = await crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: ivBuffer },
                    cryptoKey,
                    noteDataBuffer
                );

                const combined = new Uint8Array(iv.length + encrypted.byteLength);
                combined.set(iv);
                combined.set(new Uint8Array(encrypted), iv.length);
                const encryptedB64 = btoa(String.fromCharCode(...combined));

                // Hash for deduplication
                const commitmentArray = new TextEncoder().encode(commitment);
                const commitmentBuffer = commitmentArray.buffer.slice(
                    commitmentArray.byteOffset,
                    commitmentArray.byteOffset + commitmentArray.byteLength
                ) as ArrayBuffer;

                const hashBuffer = await crypto.subtle.digest(
                    'SHA-256',
                    commitmentBuffer
                );
                const hash = Array.from(new Uint8Array(hashBuffer))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');

                const response = await fetch(`${API_URL}/privacy/backup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: wallet.publicKey.toBase58(),
                        encryptedNote: encryptedB64,
                        noteHash: hash,
                        amount: note.amount,
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    note.backupId = result.id;
                    console.log('✅ Note backed up to cloud');
                }
            } catch (backupError) {
                console.warn('Cloud backup failed, continuing with local only:', backupError);
            }

            // Step 6: Sign transaction (triggers "Sign Transaction" popup - the ONLY transaction popup)
            console.log('Step 6: Signing transaction...');
            const signedTx = await wallet.signTransaction(transaction);
            console.log('✅ Transaction signed');

            // Step 7: Submit to relayer
            console.log('Step 7: Submitting to relayer...');
            const signature = await submitToRelayer(signedTx, '{}');
            console.log('✅ Transaction submitted:', signature);

            // Step 8: Update status to 'shielded'
            updateCommitmentStatus(commitment, 'shielded');
            note.status = 'shielded';

            // Step 9: Record transaction
            await recordTransaction(
                wallet.publicKey.toBase58(),
                'shield',
                shieldedAmt,
                signature
            ).catch(console.warn);

            setCommitmentNotes(prev =>
                prev.map(n => n.commitment === commitment ? { ...n, status: 'shielded' } : n)
            );
            updateStepStatus(1, 'completed');

            toast.success('Shielding successful!', {
                description: `${amount} SOL has been compressed.`,
            });

            await loadData();
            setShieldAmount('');

        } catch (error: any) {
            console.error('Shield failed:', error);
            toast.error('Shielding failed', { description: error.message });
            updateStepStatus(0, 'error');
            updateStepStatus(1, 'pending');
        } finally {
            setIsShielding(false);
        }
    };

    // ============================================================================
    // Unshield Handler (with Chunked Transfer Option)
    // ============================================================================

    const handleUnshield = async () => {
        if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
            toast.error('Please connect your wallet');
            return;
        }

        const amount = parseFloat(unshieldAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!destinationAddress) {
            toast.error('Please enter a destination address');
            return;
        }

        let destination: PublicKey;
        try {
            destination = new PublicKey(destinationAddress);
        } catch {
            toast.error('Invalid destination address');
            return;
        }

        if (amount > shieldedBalance) {
            toast.error('Insufficient shielded balance');
            return;
        }

        setIsUnshielding(true);
        updateStepStatus(2, 'processing');

        try {
            const activeNote = commitmentNotes.find(n => n.status === 'shielded');
            if (!activeNote) {
                throw new Error('No shielded funds found');
            }

            if (useChunkedTransfer) {
                // Use chunked transfer with random delays (privacy mode)
                const result = await scheduleChunkedTransfer(
                    amount,
                    destination.toBase58(),
                    activeNote.commitment,
                    wallet.publicKey.toBase58(),
                    activeNote.backupId
                );

                updateStepStatus(2, 'completed');

                toast.success('Transfer scheduled!', {
                    description: `${result.chunks.length} chunks scheduled with random delays`,
                });

                await loadData();

            } else {
                // Direct unshield (less private but faster)
                // NOTE: Light Protocol uses ZK proof for authorization, not user signature
                // The relayer is the only required signer (fee payer)
                const { transaction, proof } = await generateUnshieldProof(
                    wallet,
                    activeNote.commitment,
                    amount,
                    destination
                );

                // Submit to relayer - relayer adds its signature
                const signature = await submitToRelayer(transaction, proof);

                await recordTransaction(
                    wallet.publicKey.toBase58(),
                    'unshield',
                    amount,
                    signature,
                    destination.toBase58()
                ).catch(console.warn);

                updateStepStatus(2, 'completed');
                updateStepStatus(3, 'completed');

                toast.success('Unshielding complete!', {
                    description: `${amount} SOL sent to destination`,
                });
            }

            await loadData();
            setUnshieldAmount('');
            setDestinationAddress('');

        } catch (error: any) {
            console.error('Unshield failed:', error);
            toast.error('Unshielding failed', { description: error.message });
            updateStepStatus(2, 'error');
        } finally {
            setIsUnshielding(false);
        }
    };

    // ============================================================================
    // Cloud Recovery
    // ============================================================================

    const handleCloudRecovery = async () => {
        if (!wallet.connected) {
            toast.error('Please connect your wallet');
            return;
        }

        setIsRecovering(true);
        try {
            const recoveredNotes = await recoverNotesFromCloud(wallet);

            if (recoveredNotes.length === 0) {
                toast.info('No backed up notes found');
                return;
            }

            // Merge with local
            const existing = getCommitmentNotes();
            const existingSet = new Set(existing.map(n => n.commitment));
            const newNotes = recoveredNotes.filter(n => !existingSet.has(n.commitment));

            if (newNotes.length > 0) {
                newNotes.forEach(saveCommitmentNote);
                setCommitmentNotes([...existing, ...newNotes]);
                toast.success(`Recovered ${newNotes.length} notes from cloud`);
            } else {
                toast.info('All notes already synced');
            }
        } catch (error: any) {
            toast.error('Recovery failed', { description: error.message });
        } finally {
            setIsRecovering(false);
        }
    };

    const handleDownloadRecovery = () => {
        try {
            downloadRecoveryNote();
            toast.success('Recovery note downloaded');
        } catch (error: any) {
            toast.error('Download failed', { description: error.message });
        }
    };

    const handleImportRecovery = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const notes = await importRecoveryNote(file);
            setCommitmentNotes(notes);
            toast.success(`Imported ${notes.length} commitment notes`);
        } catch (error: any) {
            toast.error('Import failed', { description: error.message });
        }
    };

    // ============================================================================
    // Render
    // ============================================================================

    if (!wallet.connected) {
        return (
            <Card className="text-center py-12">
                <CardContent>
                    <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
                    <p className="text-muted-foreground">
                        Connect your wallet to access the Privacy Vault
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Panel */}
            <div className="lg:col-span-8 flex flex-col gap-6">

                {/* Shielded Balance Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                Shielded Balance
                            </CardTitle>
                            <div className="flex items-baseline gap-2 mt-2">
                                {isLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-10 w-32 bg-muted" />
                                        <Skeleton className="h-4 w-16 bg-muted" />
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-4xl font-bold">{shieldedBalance.toFixed(4)}</span>
                                        <span className="text-lg text-muted-foreground">SOL</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                            {shieldedBalance > 0 && (
                                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                                    <ShieldCheck size={14} />
                                    ZK-Compressed
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Commitment Notes */}
                        {commitmentNotes.length > 0 && (
                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-mono text-muted-foreground uppercase">
                                        Commitment Notes ({commitmentNotes.length})
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowNotes(!showNotes)} className="text-muted-foreground hover:text-foreground">
                                            {showNotes ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                        <button onClick={handleCloudRecovery} disabled={isRecovering} className="text-muted-foreground hover:text-foreground" title="Recover from cloud">
                                            <Cloud size={14} />
                                        </button>
                                        <button onClick={handleDownloadRecovery} className="text-muted-foreground hover:text-foreground" title="Download backup">
                                            <Download size={14} />
                                        </button>
                                    </div>
                                </div>

                                {showNotes ? (
                                    <div className="space-y-2">
                                        {commitmentNotes.map((note, i) => (
                                            <div key={i} className="flex items-center justify-between bg-background rounded p-2 text-xs">
                                                <code className="font-mono truncate flex-1">{note.commitment}</code>
                                                <span className={`ml-2 px-2 py-0.5 rounded ${note.status === 'shielded' ? 'bg-green-500/20 text-green-500' :
                                                    note.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {note.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <code className="block font-mono text-sm text-muted-foreground">
                                        ••••••••••••••••••••••••••••
                                    </code>
                                )}
                            </div>
                        )}

                        {/* Pending Jobs */}
                        {pendingJobs.length > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <p className="text-sm font-medium text-yellow-500 mb-2">
                                    {pendingJobs.length} pending transfers
                                </p>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    {pendingJobs.slice(0, 3).map((job, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span>Chunk {job.chunkIndex + 1}/{job.totalChunks}</span>
                                            <span>{job.chunkAmount?.toFixed(4)} SOL</span>
                                        </div>
                                    ))}
                                    {pendingJobs.length > 3 && (
                                        <p className="text-yellow-500">+{pendingJobs.length - 3} more...</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Shield Form */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Deposit & Shield</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Amount in SOL"
                                    value={shieldAmount}
                                    onChange={(e) => setShieldAmount(e.target.value)}
                                    min="0.01"
                                    step="0.01"
                                    className="flex-1"
                                />
                                <Button onClick={handleShield} disabled={isShielding || !shieldAmount} className="min-w-[140px]">
                                    {isShielding ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Shielding...
                                        </span>
                                    ) : (
                                        'Shield SOL'
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Unshield Form */}
                        <div className="space-y-3 pt-4 border-t">
                            <label className="text-sm font-medium">Unshield to Address</label>
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    placeholder="Destination wallet address"
                                    value={destinationAddress}
                                    onChange={(e) => setDestinationAddress(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Amount to unshield"
                                        value={unshieldAmount}
                                        onChange={(e) => setUnshieldAmount(e.target.value)}
                                        min="0.01"
                                        step="0.01"
                                        max={shieldedBalance}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleUnshield}
                                        disabled={isUnshielding || !unshieldAmount || !destinationAddress || shieldedBalance === 0}
                                        className="min-w-[140px]"
                                    >
                                        {isUnshielding ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : (
                                            'Unshield'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-6">
                    <Card>
                        <CardContent className="pt-6">
                            <Shield className="w-8 h-8 text-primary mb-4" />
                            <h3 className="font-semibold mb-2">Stateless Privacy</h3>
                            <p className="text-sm text-muted-foreground">
                                Assets are compressed using ZK proofs. Your balance is never linked on-chain.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <Cloud className="w-8 h-8 text-primary mb-4" />
                            <h3 className="font-semibold mb-2">Cloud Backup</h3>
                            <p className="text-sm text-muted-foreground">
                                Notes encrypted client-side. Recover from any device with your wallet.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recovery Import */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <div className="flex-1">
                                <h4 className="font-medium mb-1">Import Recovery Note</h4>
                                <p className="text-xs text-muted-foreground">
                                    Restore commitment notes from a backup file
                                </p>
                            </div>
                            <label className="cursor-pointer">
                                <input type="file" accept=".json" onChange={handleImportRecovery} className="hidden" />
                                <Button variant="outline" size="sm" asChild>
                                    <span>Choose File</span>
                                </Button>
                            </label>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Panel: Timeline */}
            <div className="lg:col-span-4">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Transaction Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <VaultTimeline steps={steps} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
