import { create } from 'zustand';

interface BurnStore {
  totalBurned: number;
  burnRate: number;
  lastTx: string;
  nextBurnTimestamp: number;
}

export const useBurnStore = create<BurnStore>(() => ({
  totalBurned: 12540230,
  burnRate: 1.2,
  lastTx: '9xA...Df2',
  nextBurnTimestamp: Date.now() + 3600000, // 1 hour from now
}));

