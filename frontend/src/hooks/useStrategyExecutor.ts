'use client';

import { useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { wsClient, WS_EVENTS } from '@/lib/websocket';
import { jupiterService } from '@/lib/jupiter';
import { useTransactionStore } from '@/store/transactionStore';
import { VersionedTransaction } from '@solana/web3.js';
import { toast } from 'sonner';

export function useStrategyExecutor() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { addTransaction, updateTransaction } = useTransactionStore();

  const handleStrategyTriggered = useCallback(async (data: any) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 STRATEGY TRIGGERED!');
    console.log('  Strategy ID:', data.strategyId);
    console.log('  Trade ID:', data.tradeId);
    console.log('  Message:', data.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!publicKey || !sendTransaction) {
      toast.error('Wallet not connected', {
        description: 'Please connect your wallet to execute strategies'
      });
      return;
    }

    try {
      // Deserialize the transaction
      console.log('🔧 Deserializing transaction...');
      const transaction = jupiterService.deserializeTransaction(data.transaction);

      console.log('✅ Transaction deserialized');
      console.log('📝 Transaction type:', transaction.constructor.name);

      // Ask user to sign (wallet will automatically prompt)
      console.log('🖊️  Sending transaction for signing...');
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3,
      });

      console.log('✅ Transaction signed!');
      console.log('📝 Signature:', signature);
      console.log('🔗 Solscan:', `https://solscan.io/tx/${signature}`);

      // Add to transaction history
      const txId = addTransaction({
        signature,
        type: 'swap',
        status: 'pending',
        fromToken: data.fromToken || 'Unknown',
        toToken: data.toToken || 'Unknown',
        fromAmount: data.amount?.toString() || '0',
        toAmount: '0', // Will be calculated after confirmation
      });

      console.log('📝 Created transaction with ID:', txId);

      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...');

      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 15; // Reduced attempts but with longer delays

      while (!confirmed && attempts < maxAttempts) {
        attempts++;

        try {
          // Progressive delay to avoid rate limits (2s, 3s, 4s, etc.)
          const delay = 2000 + (attempts * 500);
          await new Promise(resolve => setTimeout(resolve, delay));

          console.log(`🔍 Confirmation attempt ${attempts}/${maxAttempts}`);

          const statusRes = await connection.getSignatureStatuses([signature], {
            searchTransactionHistory: true
          });

          const status = statusRes?.value?.[0];

          if (status === null) {
            console.log('  ⚠️  Status is null (not found yet)');
            continue;
          }

          if (status) {
            console.log('  ✓ Status:', status.confirmationStatus || 'processed');
            console.log('  ✓ Confirmations:', status.confirmations || 0);
            console.log('  ✓ Error:', status.err || 'none');

            if (status.err) {
              console.log('  ❌ Transaction FAILED:', status.err);
              updateTransaction(txId, { status: 'failed' });
              toast.error('Transaction Failed', {
                description: 'The transaction failed on-chain'
              });
              throw new Error('Transaction failed on-chain');
            }

            const isConfirmed = status.confirmationStatus === 'confirmed' ||
              status.confirmationStatus === 'finalized' ||
              (status.confirmations !== null && status.confirmations > 0);

            if (isConfirmed) {
              confirmed = true;
              console.log('✅ Transaction CONFIRMED!');
              updateTransaction(txId, { status: 'success' });

              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('🎉 STRATEGY SWAP COMPLETED SUCCESSFULLY!');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

              // Notify backend that trade is complete
              try {
                console.log('📡 Notifying backend of successful execution...');
                const token = localStorage.getItem('auth_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

                await fetch(`${apiUrl}/trades/${data.tradeId}/confirm`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    signature,
                    status: 'success',
                  }),
                });

                console.log('✅ Backend notified - strategy will update to completed');

                // Trigger a page reload after a short delay to show updated status
                setTimeout(() => {
                  console.log('🔄 Refreshing page to show completed status...');
                  window.location.reload();
                }, 2000);
              } catch (apiError: any) {
                console.warn('⚠️  Failed to notify backend:', apiError.message);
                // Non-critical, the swap still worked
              }

              // Show success notification
              if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification('Strategy Executed!', {
                    body: `${data.message} Transaction confirmed!`,
                    icon: '/logo.png'
                  });
                }
              }

              break;
            }
          }
        } catch (pollError: any) {
          console.warn('  ⚠️  Polling error (will retry):', pollError.message);

          // If it's a 403 (rate limit), wait longer before next attempt
          if (pollError.message?.includes('403')) {
            console.warn('  ⚠️  RPC rate limit - waiting extra time...');
            await new Promise(resolve => setTimeout(resolve, 3000)); // Extra 3s delay
          }
        }
      }

      // Fallback if not confirmed (assume success since transaction was sent)
      if (!confirmed) {
        console.warn('⚠️  Could not confirm automatically (RPC timeout)');
        console.warn('🔗  Verify on Solscan:', `https://solscan.io/tx/${signature}`);
        updateTransaction(txId, { status: 'success' });

        // IMPORTANT: Still notify backend that trade is complete
        try {
          console.log('📡 Notifying backend of execution (fallback)...');
          const token = localStorage.getItem('auth_token');
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

          await fetch(`${apiUrl}/trades/${data.tradeId}/confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              signature,
              status: 'success',
            }),
          });

          console.log('✅ Backend notified - strategy will update to completed');

          // Trigger page reload to show completed status
          setTimeout(() => {
            console.log('🔄 Refreshing page to show completed status...');
            window.location.reload();
          }, 2000);
        } catch (apiError: any) {
          console.warn('⚠️  Failed to notify backend:', apiError.message);
          // Still reload to try to fetch updated status
          setTimeout(() => window.location.reload(), 2000);
        }
      }

    } catch (error: any) {
      console.log('Strategy execution error:', error.message);

      // Check if user rejected the transaction
      const isUserRejection = error.message?.toLowerCase().includes('user rejected') ||
        error.message?.toLowerCase().includes('user denied') ||
        error.message?.toLowerCase().includes('user cancelled') ||
        error.code === 4001;

      if (isUserRejection) {
        // User intentionally cancelled - show info toast instead of error
        toast.info('Transaction Cancelled', {
          description: 'You cancelled the transaction'
        });
      } else {
        // Actual error - show error toast
        toast.error('Strategy Execution Failed', {
          description: error.message || 'Please try again or check your wallet'
        });
      }
    }
  }, [publicKey, sendTransaction, connection, addTransaction, updateTransaction]);

  useEffect(() => {
    if (!publicKey) {
      // console.log('⚠️  Strategy executor: Wallet not connected');
      return;
    }

    // console.log('✅ Strategy executor initialized');
    // console.log('👛 Wallet:', publicKey.toBase58().slice(0, 8) + '...');
    // console.log('📡 Listening for strategy triggers...');

    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Listen for strategy triggered events
    wsClient.on(WS_EVENTS.STRATEGY_TRIGGERED, handleStrategyTriggered);

    return () => {
      wsClient.off(WS_EVENTS.STRATEGY_TRIGGERED, handleStrategyTriggered);
    };
  }, [publicKey, handleStrategyTriggered]);

  return null;
}

