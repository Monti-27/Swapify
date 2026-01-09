use anchor_lang::prelude::*;

#[error_code]
pub enum WeswapError {
    #[msg("Sell and buy tokens must be different")]
    InvalidMints,
    #[msg("Trigger price must be greater than 0")]
    InvalidTriggerPrice,
    #[msg("Price precision cannot exceed 18")]
    InvalidPrecision,
    #[msg("Must deposit at least some tokens to escrow")]
    InsufficientDeposit,
    #[msg("Take profit price must be >= trigger price")]
    InvalidTakeProfit,
    #[msg("Stop loss price must be <= trigger price")]
    InvalidStopLoss,
    #[msg("Invalid sell amount configuration")]
    InvalidSellAmount,
    #[msg("Strategy is not active")]
    StrategyNotActive,
    #[msg("Strategy already executed")]
    StrategyAlreadyExecuted,
    #[msg("Strategy not found or unauthorized")]
    StrategyNotFound,
    #[msg("Invalid current price for execution")]
    InvalidCurrentPrice,
    #[msg("Insufficient funds in escrow")]
    InsufficientEscrow,
    #[msg("Strategy has no escrow or tokens")]
    NoEscrowTokens,
    #[msg("Protocol is not initialized")]
    ProtocolNotInitialized,
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("New strategies are disabled")]
    NewStrategiesDisabled,
    #[msg("Keeper is not authorized")]
    UnauthorizedKeeper,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Cannot withdraw all funds - use cancel_strategy instead")]
    InvalidAmount,
    #[msg("Invalid program")]
    InvalidProgram,
    #[msg("Invalid account count")]
    InvalidAccountCount,
    #[msg("No tokens received from swap")]
    NoTokensReceived,
    #[msg("Strategy ID exceeds maximum allowed strategies")]
    MaxStrategiesExceeded,
    #[msg("Token program does not match mint's owner")]
    InvalidTokenProgram,
    #[msg("Strategy is not in Filled state - cannot execute exit")]
    StrategyNotFilled,
    #[msg("Neither Take Profit nor Stop Loss condition is met")]
    ExitConditionNotMet,
    #[msg("Token mint must be either sell_token_mint or buy_token_mint from strategy")]
    InvalidTokenMint,
}

