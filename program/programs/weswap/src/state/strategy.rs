use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug, InitSpace)]
pub struct Strategy {
    pub owner: Pubkey,
    pub id: u64,  // Unique strategy ID for this user
    
    // Token mints
    pub sell_token_mint: Pubkey,
    pub buy_token_mint: Pubkey,
    pub sell_token_decimals: u8,  // Decimals for sell token (e.g., BONK = 5)
    pub buy_token_decimals: u8,   // Decimals for buy token (e.g., WIF = 6)
    
    // Trigger configuration
    pub trigger_price: u64,  // Price at which strategy executes (scaled by price_precision)
    pub price_precision: u8, // Decimal places for trigger_price (for comparing with oracle prices)
    
    // Take profit / Stop loss
    pub take_profit_price: Option<u64>,
    pub stop_loss_price: Option<u64>,
    
    // Amount configuration
    pub sell_amount: u64,  // Amount of sell token to swap (0 means use escrow balance)
    pub use_percentage: bool,  // If true, sell_amount is a percentage (in bps)
    
    // Strategy state
    pub is_active: bool,
    pub is_executed: bool,
    pub boomerang_mode: bool,  // After TP/SL, re-enter using profits
    
    // Timestamps
    pub created_at: i64,
    pub executed_at: Option<i64>,
    
    // Execution details
    pub execution_price: Option<u64>,
    pub tokens_received: Option<u64>,
}

#[account]
#[derive(Default, Debug, InitSpace)]
pub struct StrategyEscrow {
    pub strategy: Pubkey,
    pub owner: Pubkey,
    pub sell_token_mint: Pubkey,
    pub deposited_amount: u64,
    pub withdrawn_amount: u64,
}

impl Strategy {
    pub const LEN: usize = 8 + std::mem::size_of::<Strategy>();

    pub fn initialize(
        &mut self,
        owner: Pubkey,
        id: u64,
        sell_token_mint: Pubkey,
        buy_token_mint: Pubkey,
        sell_token_decimals: u8,
        buy_token_decimals: u8,
        trigger_price: u64,
        price_precision: u8,
        take_profit_price: Option<u64>,
        stop_loss_price: Option<u64>,
        sell_amount: u64,
        use_percentage: bool,
        boomerang_mode: bool,
        current_time: i64,
    ) {
        self.owner = owner;
        self.id = id;
        self.sell_token_mint = sell_token_mint;
        self.buy_token_mint = buy_token_mint;
        self.sell_token_decimals = sell_token_decimals;
        self.buy_token_decimals = buy_token_decimals;
        self.trigger_price = trigger_price;
        self.price_precision = price_precision;
        self.take_profit_price = take_profit_price;
        self.stop_loss_price = stop_loss_price;
        self.sell_amount = sell_amount;
        self.use_percentage = use_percentage;
        self.is_active = true;
        self.is_executed = false;
        self.boomerang_mode = boomerang_mode;
        self.created_at = current_time;
        self.executed_at = None;
        self.execution_price = None;
        self.tokens_received = None;
    }

    pub fn can_execute(&self, current_price: u64) -> bool {
        if !self.is_active || self.is_executed {
            return false;
        }
        
        // Check if current price crosses trigger price
        current_price >= self.trigger_price
    }

    pub fn should_execute_tp_sl(&self, current_price: u64) -> Option<bool> {
        if let Some(tp_price) = self.take_profit_price {
            if current_price >= tp_price {
                return Some(true); // Take profit triggered
            }
        }
        
        if let Some(sl_price) = self.stop_loss_price {
            if current_price <= sl_price {
                return Some(false); // Stop loss triggered
            }
        }
        
        None // No TP/SL triggered
    }

    pub fn mark_executed(&mut self, execution_price: u64, tokens_received: u64, current_time: i64) {
        self.is_executed = true;
        self.execution_price = Some(execution_price);
        self.tokens_received = Some(tokens_received);
        self.executed_at = Some(current_time);
    }

    pub fn deactivate(&mut self) {
        self.is_active = false;
    }
}

impl StrategyEscrow {
    pub const LEN: usize = 8 + std::mem::size_of::<StrategyEscrow>();

    pub fn is_empty(&self) -> bool {
        self.deposited_amount == 0
    }

    pub fn get_available_amount(&self) -> u64 {
        self.deposited_amount
            .checked_sub(self.withdrawn_amount)
            .unwrap_or(0)
    }
}
