use anchor_lang::prelude::*;

#[event]
pub struct CreateStrategyEvent {
    pub owner: Pubkey,
    pub strategy: Pubkey,
    pub escrow: Pubkey,
    pub sell_token_mint: Pubkey,
    pub buy_token_mint: Pubkey,
    pub sell_token_decimals: u8,
    pub buy_token_decimals: u8,
    pub trigger_price: u64,
    pub price_precision: u8,
    pub take_profit_price: Option<u64>,
    pub stop_loss_price: Option<u64>,
    pub sell_amount: u64,
    pub use_percentage: bool,
    pub boomerang_mode: bool,
    pub deposit_amount: u64,
    pub created_at: i64,
}

#[event]
pub struct ExecuteStrategyEvent {
    pub strategy: Pubkey,
    pub owner: Pubkey,
    pub sell_token_mint: Pubkey,
    pub buy_token_mint: Pubkey,
    pub tokens_sold: u64,
    pub tokens_received: u64,
    pub execution_price: u64,
    pub executed_at: i64,
}

#[event]
pub struct CancelStrategyEvent {
    pub strategy: Pubkey,
    pub owner: Pubkey,
    pub cancelled_at: i64,
}

#[event]
pub struct UpdateStrategyEvent {
    pub strategy: Pubkey,
    pub owner: Pubkey,
    pub updated_at: i64,
    pub field: String,
}

#[event]
pub struct DepositEscrowEvent {
    pub strategy: Pubkey,
    pub owner: Pubkey,
    pub sell_token_mint: Pubkey,
    pub amount: u64,
    pub new_total_deposited: u64,
    pub deposited_at: i64,
}

#[event]
pub struct WithdrawEscrowEvent {
    pub strategy: Pubkey,
    pub owner: Pubkey,
    pub sell_token_mint: Pubkey,
    pub amount: u64,
    pub new_total_withdrawn: u64,
    pub withdrawn_at: i64,
}

