"use client";

import React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Check, RotateCcw, ExternalLink, Clock, XCircle } from 'lucide-react';
import { useSwap } from './SwapContext';

interface Transaction {
  date: string;
  fromToken: {
    icon: string;
    symbol: string;
    amount: string;
  };
  toToken: {
    icon: string;
    symbol: string;
    amount: string;
  };
  gasFee: string;
  status: 'completed' | 'pending' | 'failed';
  txHash: string;
}

const transactions: Transaction[] = [
{
  date: '17 Feb, 2025',
  fromToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', symbol: 'SOL', amount: '2.5' },
  toToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', symbol: 'USDC', amount: '312.45' },
  gasFee: '0.000005 SOL',
  status: 'completed',
  txHash: '5UxV7nR9KfZh8MgCw3LB4vqMnR7xKjZ9sYtNqF2pWe8x'
},
{
  date: '16 Feb, 2025',
  fromToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', symbol: 'USDC', amount: '500' },
  toToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', symbol: 'SOL', amount: '4.02' },
  gasFee: '0.000005 SOL',
  status: 'completed',
  txHash: '3KpZx8wNmR4vTqYhL2sJfD7xMnQ6bCeV9hUyWgF1pT4m'
},
{
  date: '15 Feb, 2025',
  fromToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', symbol: 'SOL', amount: '10' },
  toToken: { icon: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I', symbol: 'BONK', amount: '45,230,000' },
  gasFee: '0.000005 SOL',
  status: 'pending',
  txHash: '7HjYx2wKnR5vTqZhM3sLfD8xPnQ7bDeW0iVyXgG2qU5n'
},
{
  date: '14 Feb, 2025',
  fromToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', symbol: 'USDC', amount: '1,000' },
  toToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg', symbol: 'USDT', amount: '999.50' },
  gasFee: '0.000005 SOL',
  status: 'completed',
  txHash: '9MnWz4xRnT6vUqAhN4sKfE9xQnR8cEfX1jWzYhH3rV6o'
},
{
  date: '13 Feb, 2025',
  fromToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', symbol: 'SOL', amount: '0.5' },
  toToken: { icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png', symbol: 'ETH', amount: '0.023' },
  gasFee: '0.000005 SOL',
  status: 'failed',
  txHash: '2LpAy3xSnU7vVqBhO5tMfF0xRoS9dGgY2kXzAiI4sW7p'
}];


export default function TransactionsTable() {
  const { setSwapData, setIsLoading } = useSwap();

  const handleRepeatSwap = (tx: Transaction) => {
    setIsLoading(true);
    setSwapData({
      fromToken: tx.fromToken,
      toToken: tx.toToken,
    });
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="bg-swap-card rounded-2xl shadow-card w-full flex flex-col border border-swap-border/30">
      <div className="p-6 border-b border-swap-border/50">
        <h2 className="text-lg font-semibold text-swap-foreground">Transactions</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-swap-muted/30">
              <th className="px-6 py-4 text-xs font-medium text-swap-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-medium text-swap-muted-foreground uppercase tracking-wider">Conversion</th>
              <th className="px-6 py-4 text-xs font-medium text-swap-muted-foreground uppercase tracking-wider">Gas Fee</th>
              <th className="px-6 py-4 text-xs font-medium text-swap-muted-foreground uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-4 text-xs font-medium text-swap-muted-foreground uppercase tracking-wider">Tx Hash</th>
              <th className="px-6 py-4 text-xs font-medium text-swap-muted-foreground uppercase tracking-wider text-right">Repeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-swap-border/50 !w-full !h-[372px]">
            {transactions.map((tx, idx) =>
            <tr key={idx} className="hover:bg-swap-muted/10 transition-colors h-[72px]">
                <td className="px-6 py-4 text-sm text-swap-foreground font-medium">
                  {tx.date}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Image src={tx.fromToken.icon} width={20} height={20} alt={tx.fromToken.symbol} className="rounded-full shadow-sm" />
                      <span className="text-sm font-semibold text-swap-foreground">{tx.fromToken.amount}</span>
                      <span className="text-xs text-swap-muted-foreground uppercase">{tx.fromToken.symbol}</span>
                    </div>
                    <span className="text-swap-muted-foreground/50 text-xs">→</span>
                    <div className="flex items-center gap-1.5">
                      <Image src={tx.toToken.icon} width={20} height={20} alt={tx.toToken.symbol} className="rounded-full shadow-sm" />
                      <span className="text-sm font-semibold text-swap-foreground">{tx.toToken.amount}</span>
                      <span className="text-xs text-swap-muted-foreground uppercase">{tx.toToken.symbol}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-swap-muted-foreground font-medium">
                  {tx.gasFee}
                </td>
                <td className="px-6 py-4 text-center">
                  {tx.status === 'completed' && (
                    <div className="inline-flex items-center justify-center size-6 bg-swap-success/10 rounded-full">
                      <Check className="size-3.5 text-swap-success" strokeWidth={3} />
                    </div>
                  )}
                  {tx.status === 'pending' && (
                    <div className="inline-flex items-center justify-center size-6 bg-yellow-500/10 rounded-full">
                      <Clock className="size-3.5 text-yellow-500" strokeWidth={2} />
                    </div>
                  )}
                  {tx.status === 'failed' && (
                    <div className="inline-flex items-center justify-center size-6 bg-swap-destructive/10 rounded-full">
                      <XCircle className="size-3.5 text-swap-destructive" strokeWidth={2} />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <a 
                    href={`https://solscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-swap-primary hover:text-swap-primary/80 transition-colors"
                  >
                    <span className="font-mono">{tx.txHash.slice(0, 4)}...{tx.txHash.slice(-4)}</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleRepeatSwap(tx)}
                    className="text-swap-muted-foreground hover:text-swap-foreground transition-colors p-2 hover:bg-swap-muted rounded-full"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-6 flex items-center justify-between border-t border-swap-border/50">
        <button className="p-2 border border-swap-border rounded-lg hover:bg-swap-muted transition-colors text-swap-muted-foreground disabled:opacity-30">
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-sm text-swap-muted-foreground">
          Page <span className="text-swap-foreground font-semibold">1</span> of <span className="text-swap-foreground font-semibold">12</span>
        </div>
        <button className="p-2 border border-swap-border rounded-lg hover:bg-swap-muted transition-colors text-swap-muted-foreground">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>);

}
