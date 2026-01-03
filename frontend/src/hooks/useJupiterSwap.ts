'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { toast } from 'sonner';
import { JupiterQuoteResponse } from './useJupiterQuote';

const JUPITER_SWAP_API = 'https://lite-api.jup.ag/swap/v1';

export type SwapStatus = 'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'error';

interface SwapResult {
  signature: string;
  inputAmount: string;
  outputAmount: string;
  inputMint: string;
  outputMint: string;
}

interface UseJupiterSwapReturn {
  executeSwap: (quote: JupiterQuoteResponse) => Promise<SwapResult | null>;
  status: SwapStatus;
  error: string | null;
  isSwapping: boolean;
}

async function fetchSwapTransaction(
  quote: JupiterQuoteResponse,
  userPublicKey: string
): Promise<string> {
  const response = await fetch(`${JUPITER_SWAP_API}/swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to build swap transaction: ${response.status}`);
  }

  const data = await response.json();
  return data.swapTransaction;
}

export function useJupiterSwap(): UseJupiterSwapReturn {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const executeSwap = useCallback(
    async (quote: JupiterQuoteResponse): Promise<SwapResult | null> => {
      if (!publicKey || !signTransaction) {
        toast.error('Please connect your wallet');
        return null;
      }

      if (!quote) {
        toast.error('No quote available');
        return null;
      }

      setStatus('building');
      setError(null);

      const buildingToast = toast.loading('Building transaction...', {
        description: 'Fetching optimal route',
      });

      try {
        const swapTransactionBase64 = await fetchSwapTransaction(
          quote,
          publicKey.toBase58()
        );

        toast.loading('Waiting for signature...', {
          id: buildingToast,
          description: 'Please approve in your wallet',
        });
        setStatus('signing');

        const swapTransactionBuf = Buffer.from(swapTransactionBase64, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

        const signedTransaction = await signTransaction(transaction);

        toast.loading('Confirming transaction...', {
          id: buildingToast,
          description: 'Waiting for blockchain confirmation',
        });
        setStatus('confirming');

        const rawTransaction = signedTransaction.serialize();
        const signature = await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: true,
          maxRetries: 3,
        });

        const latestBlockhash = await connection.getLatestBlockhash();
        
        await connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          },
          'confirmed'
        );

        setStatus('success');

        toast.success('Swap successful!', {
          id: buildingToast,
          description: 'Transaction confirmed',
          action: {
            label: 'View',
            onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
          },
        });

        return {
          signature,
          inputAmount: quote.inAmount,
          outputAmount: quote.outAmount,
          inputMint: quote.inputMint,
          outputMint: quote.outputMint,
        };
        } catch (err: any) {
          console.error('Swap error:', err);
          const errorMessage = err.message || 'Swap failed';
          setError(errorMessage);
          setStatus('error');

          const isUserRejection = errorMessage.toLowerCase().includes('user rejected') ||
            errorMessage.toLowerCase().includes('user denied') ||
            errorMessage.toLowerCase().includes('user cancelled') ||
            (err as any).code === 4001;

          if (isUserRejection) {
            toast.info('Transaction Cancelled', {
              id: buildingToast,
              description: 'You cancelled the swap',
            });
          } else {
            toast.error('Swap Failed', {
              id: buildingToast,
              description: errorMessage,
            });
          }

          return null;
        }
    },
    [publicKey, signTransaction, connection]
  );

  return {
    executeSwap,
    status,
    error,
    isSwapping: status !== 'idle' && status !== 'success' && status !== 'error',
  };
}
