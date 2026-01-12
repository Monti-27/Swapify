'use client';

import { useState, useEffect, useCallback } from 'react';
import { VaultTimeline } from './vault-timeline';
import { ShieldCheck, Copy, Eye, EyeOff, Shield, Download, Upload, Cloud, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
    createShieldTransaction,
    generateUnshieldProof,
    submitToRelayer,
    getCompressedBalance,
    getCommitmentNotes,
    saveCommitmentNote,
    updateCommitmentStatus,
    downloadRecoveryNote,
    importRecoveryNote,
    recoverNotesFromCloud,
    recordTransaction,
    scheduleChunkedTransfer,
    getPendingJobs,
    CommitmentNote,
} from '@/lib/light-protocol';

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

    const [steps, setSteps] = useState<TimelineStep[]>([
        { id: '1', label: 'Deposit', status: 'pending', description: 'Connect wallet & deposit SOL' },
        { id: '2', label: 'Shielding', status: 'pending', description: 'Applying ZK compression' },
        { id: '3', label: 'Obfuscation', status: 'pending', description: 'Randomizing via relayer' },
        { id: '4', label: 'Completed', status: 'pending', description: 'Funds unshielded' },
    ]);

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
                updateStepStatus(0, 'completed');
                updateStepStatus(1, 'completed');
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [wallet.publicKey]);

    useEffect(() => {
        if (wallet.connected && wallet.publicKey) {
            loadData();
        }
    }, [wallet.connected, wallet.publicKey, loadData]);

    const updateStepStatus = (stepIndex: number, status: StepStatus) => {
        setSteps(prev => prev.map((step, i) =>
            i === stepIndex ? { ...step, status } : step
        ));
    };

    const handleShield = async () => {
        if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
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
            const { transaction, commitment, amount: shieldedAmt } = await createShieldTransaction(wallet, amount);

            updateStepStatus(0, 'completed');
            updateStepStatus(1, 'processing');

            const note: CommitmentNote = {
                commitment,
                amount: shieldedAmt,
                timestamp: Date.now(),
                status: 'pending',
            };

            saveCommitmentNote(note);

            const signedTx = await wallet.signTransaction(transaction);
            const signature = await submitToRelayer(signedTx, '{}');

            updateCommitmentStatus(commitment, 'shielded');
            await recordTransaction(wallet.publicKey.toBase58(), 'shield', shieldedAmt, signature);

            toast.success('Shielding successful!');
            await loadData();
            setShieldAmount('');
            updateStepStatus(1, 'completed');

        } catch (error: any) {
            console.error('Shield failed:', error);
            toast.error('Shielding failed', { description: error.message });
            updateStepStatus(0, 'error');
        } finally {
            setIsShielding(false);
        }
    };

    const handleUnshield = async () => {
        if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
            toast.error('Please connect your wallet');
            return;
        }

        const amount = parseFloat(unshieldAmount);
        if (isNaN(amount) || amount <= 0 || !destinationAddress) {
            toast.error('Invalid amount or address');
            return;
        }

        setIsUnshielding(true);
        updateStepStatus(2, 'processing');

        try {
            const activeNote = commitmentNotes.find(n => n.status === 'shielded');
            if (!activeNote) throw new Error('No shielded funds found');

            const { transaction, proof } = await generateUnshieldProof(
                wallet,
                activeNote.commitment,
                amount,
                new PublicKey(destinationAddress)
            );

            const signature = await submitToRelayer(transaction, proof);
            await recordTransaction(wallet.publicKey.toBase58(), 'unshield', amount, signature, destinationAddress);

            toast.success('Unshielding complete!');
            await loadData();
            setUnshieldAmount('');
            updateStepStatus(2, 'completed');
            updateStepStatus(3, 'completed');

        } catch (error: any) {
            console.error('Unshield failed:', error);
            toast.error('Unshielding failed', { description: error.message });
            updateStepStatus(2, 'error');
        } finally {
            setIsUnshielding(false);
        }
    };

    if (!wallet.connected) {
        return (
            <Card className="text-center py-12">
                <CardContent>
                    <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
                    <p className="text-muted-foreground">Connect your wallet to access the VexProtocol Privacy Vault</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 flex flex-col gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                Shielded Balance
                            </CardTitle>
                            <div className="flex items-baseline gap-2 mt-2">
                                {isLoading ? (
                                    <Skeleton className="h-10 w-32 bg-muted" />
                                ) : (
                                    <>
                                        <span className="text-4xl font-bold">{shieldedBalance.toFixed(4)}</span>
                                        <span className="text-lg text-muted-foreground">SOL</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Deposit & Shield</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Amount in SOL"
                                    value={shieldAmount}
                                    onChange={(e) => setShieldAmount(e.target.value)}
                                    className="flex-1"
                                />
                                <Button onClick={handleShield} disabled={isShielding || !shieldAmount} className="min-w-[140px]">
                                    {isShielding ? 'Shielding...' : 'Shield SOL'}
                                </Button>
                            </div>
                        </div>

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
                                        placeholder="Amount"
                                        value={unshieldAmount}
                                        onChange={(e) => setUnshieldAmount(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleUnshield}
                                        disabled={isUnshielding || !unshieldAmount || !destinationAddress}
                                        className="min-w-[140px]"
                                    >
                                        {isUnshielding ? 'Processing...' : 'Unshield'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-6">
                    <Card>
                        <CardContent className="pt-6">
                            <Shield className="w-8 h-8 text-primary mb-4" />
                            <h3 className="font-semibold mb-2">Stateless Privacy</h3>
                            <p className="text-sm text-muted-foreground">Assets are compressed using ZK proofs. Your balance is never linked on-chain.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <Cloud className="w-8 h-8 text-primary mb-4" />
                            <h3 className="font-semibold mb-2">Cloud Backup</h3>
                            <p className="text-sm text-muted-foreground">Notes encrypted client-side. Recover from any device with your wallet.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="lg:col-span-4">
                <Card className="h-full">
                    <CardHeader><CardTitle>Transaction Status</CardTitle></CardHeader>
                    <CardContent><VaultTimeline steps={steps} /></CardContent>
                </Card>
            </div>
        </div>
    );
}
