// API Response Types based on Backend

export interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  settings?: Record<string, any>;
}

export interface Wallet {
  id: string;
  publicKey: string;
  userId: string;
  name?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Strategy {
  id: string;
  userId: string;
  walletId: string;
  name: string;
  description?: string;
  fromToken: string;
  toToken: string;
  triggerType: 'price' | 'marketCap';
  triggerValue: number;
  amountType: 'percentage' | 'fixed';
  amount: number;
  stopLoss?: number;
  takeProfit?: number;
  nextStrategyId?: string;
  status: 'active' | 'triggered' | 'completed' | 'cancelled' | 'failed';
  triggeredAt?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  walletId: string;
  strategyId?: string;
  type: 'buy' | 'sell' | 'swap';
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  executionPrice: number;
  slippage?: number;
  txSignature?: string;
  status: 'pending' | 'completed' | 'failed';
  executedAt: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TokenPrice {
  token: string;
  price: number;
  marketCap?: number;
  volume24h?: number;
  source: string;
  updatedAt: string;
}

export interface TokenInfo extends TokenPrice {
  name?: string;
  symbol?: string;
  decimals?: number;
}

// API Request DTOs
export interface PrepareTradeDto {
  fromToken: string;
  toToken: string;
  amount: number;
  strategyId?: string;
}

export interface ExecuteTradeDto {
  signedTransaction: string;
}

export interface SimulateTradeDto {
  fromToken: string;
  toToken: string;
  amount: number;
}

export interface CreateStrategyDto {
  name: string;
  description?: string;
  fromToken: string;
  toToken: string;
  triggerType: 'price' | 'marketCap';
  triggerValue: number;
  amountType: 'percentage' | 'fixed';
  amount: number;
  stopLoss?: number;
  takeProfit?: number;
  nextStrategyId?: string;
}

export interface UpdateStrategyDto extends Partial<CreateStrategyDto> {
  status?: 'active' | 'cancelled';
}

export interface UpdateWalletDto {
  name?: string;
  isActive?: boolean;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TradeStats {
  totalTrades: number;
  completedTrades: number;
  failedTrades: number;
  totalVolume: number;
  profitLoss: number;
  successRate: number;
}

export interface StrategyStats {
  totalStrategies: number;
  activeStrategies: number;
  triggeredStrategies: number;
  completedStrategies: number;
  totalProfit: number;
}

