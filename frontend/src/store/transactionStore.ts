import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  signature: string;
  type: 'swap' | 'transfer' | 'stake';
  status: 'pending' | 'success' | 'failed';
  fromToken: string;
  toToken: string;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  fromTokenLogo?: string;
  toTokenLogo?: string;
  fromAmount: string;
  toAmount: string;
  timestamp: number;
  explorerUrl?: string;
}

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => string; // Returns the transaction ID
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  clearTransactions: () => void;
  clearPendingTransactions: () => void;
  getRecentTransactions: (limit?: number) => Transaction[];
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
          // Use Solana Explorer for devnet testing
          explorerUrl: `https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`,
        };

        set((state) => ({
          transactions: [newTransaction, ...state.transactions].slice(0, 50), // Keep only last 50
        }));

        console.log('✅ Transaction added to store:', newTransaction.id, newTransaction.status);
        console.log('📝 Full transaction:', newTransaction);

        // RETURN THE ID SO IT CAN BE USED FOR UPDATES!
        return newTransaction.id;
      },

      updateTransaction: (id, updates) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔄 UPDATE TRANSACTION CALLED');
        console.log('  ID to update:', id);
        console.log('  Updates:', updates);

        const currentState = get();
        const txToUpdate = currentState.transactions.find(tx => tx.id === id);

        if (txToUpdate) {
          console.log('  ✅ Found transaction:', {
            id: txToUpdate.id,
            status: txToUpdate.status,
            signature: txToUpdate.signature.slice(0, 8) + '...'
          });
        } else {
          console.log('  ❌ Transaction NOT FOUND! Available IDs:',
            currentState.transactions.map(tx => tx.id));
          toast.error('Transaction Not Found', {
            description: 'Could not update transaction status'
          });
        }

        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        }));

        const newState = get();
        const updatedTx = newState.transactions.find(tx => tx.id === id);
        console.log('  ✅ After update:', {
          id: updatedTx?.id,
          status: updatedTx?.status
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      },

      clearTransactions: () => {
        set({ transactions: [] });
      },

      clearPendingTransactions: () => {
        set((state) => ({
          transactions: state.transactions.filter(tx => tx.status !== 'pending'),
        }));
        console.log('🧹 Cleared all pending transactions');
      },

      getRecentTransactions: (limit = 10) => {
        return get().transactions.slice(0, limit);
      },
    }),
    {
      name: 'transaction-storage',
    }
  )
);

