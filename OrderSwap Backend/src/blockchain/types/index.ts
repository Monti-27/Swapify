/**
 * TypeScript interfaces for blockchain indexer event types
 */

/**
 * Event types emitted by the WeSwap Solana program
 */
export interface CreateStrategyEvent {
    strategy: { toString(): string };
    owner: { toString(): string };
    id?: { toNumber(): number };
    sellTokenMint: { toString(): string };
    buyTokenMint: { toString(): string };
    sellTokenDecimals: number;
    buyTokenDecimals: number;
    triggerPrice: { toString(): string };
    pricePrecision: number;
    takeProfitPrice?: { toString(): string } | null;
    stopLossPrice?: { toString(): string } | null;
    sellAmount: { toString(): string };
    usePercentage: boolean;
    boomerangMode: boolean;
    createdAt: { toNumber(): number };
    depositAmount?: { toString(): string };
}

export interface ExecuteStrategyEvent {
    strategy: { toString(): string };
    executionPrice?: { toString(): string };
    execution_price?: { toString(): string };
    tokensReceived?: { toString(): string };
    tokens_received?: { toString(): string };
    tokensSold?: { toString(): string };
    tokens_sold?: { toString(): string };
    executedAt?: { toNumber(): number };
    executed_at?: { toNumber(): number };
}

export interface CancelStrategyEvent {
    strategy: { toString(): string };
}

export interface DepositEscrowEvent {
    strategy: { toString(): string };
    newTotalDeposited: { toString(): string };
}

export interface WithdrawEscrowEvent {
    strategy: { toString(): string };
    newTotalWithdrawn: { toString(): string };
}
