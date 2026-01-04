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
  status: 'active' | 'triggered' | 'completed' | 'cancelled' | 'failed' | 'filled';  // Added 'filled'
  triggeredAt?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // On-chain fields (populated by indexer)
  pdaStrategy?: string;     // On-chain address of the Strategy Account
  pdaEscrow?: string;       // On-chain address of the Escrow Account
  programId?: string;       // Which contract version
  strategyIndex?: number;   // The 0-9 index used in the contract
  boomerangMode?: boolean;  // NEW: Whether this strategy uses Boomerang (Round Trip) mode
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
  // On-chain fields (for indexer linking)
  pdaStrategy?: string;     // On-chain PDA address
  strategyIndex?: number;   // Contract index (0-9)
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

// Chart Data Types
export enum ChartTimeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
}

export interface OHLCVCandle {
  timestamp: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceHistoryData {
  tokenAddress: string;
  timeframe: ChartTimeframe;
  candles: OHLCVCandle[];
  currentPrice?: number;
  priceChange24h?: number;
  priceChange24hPercent?: number;
}

export interface PriceHistoryResponse {
  success: boolean;
  data?: PriceHistoryData;
  error?: string;
  message?: string;
}

export interface ChartUpdateEvent {
  tokenAddress: string;
  candle: OHLCVCandle;
  timeframe: ChartTimeframe;
  timestamp: number;
}

// Transparency Engine Types
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WalletRiskReport {
  address: string;
  riskScore: number;
  riskLevel: RiskLevel;
  labels: string[];
  txCount: number;
  failedTxCount: number;
  burstCount: number;
  avgTps: number;
  circularCount: number;
  lastScannedAt: string | null;
  isCached: boolean;
}
