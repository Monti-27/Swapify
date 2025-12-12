import { create } from 'zustand';

export interface Order {
  id: string;
  type: 'buy' | 'sell';
  tokenFrom: string;
  tokenTo: string;
  amountFrom: string;
  amountTo: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  price: string;
}

export interface Trade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  total: string;
  status: 'active' | 'completed' | 'cancelled';
  timestamp: string;
}

interface OrderState {
  orders: Order[];
  trades: Trade[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  addTrade: (trade: Trade) => void;
  updateTradeStatus: (id: string, status: Trade['status']) => void;
  clearOrders: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  trades: [],
  addOrder: (order) =>
    set((state) => ({ orders: [order, ...state.orders] })),
  updateOrderStatus: (id, status) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === id ? { ...order, status } : order
      ),
    })),
  addTrade: (trade) =>
    set((state) => ({ trades: [trade, ...state.trades] })),
  updateTradeStatus: (id, status) =>
    set((state) => ({
      trades: state.trades.map((trade) =>
        trade.id === id ? { ...trade, status } : trade
      ),
    })),
  clearOrders: () => set({ orders: [], trades: [] }),
}));

