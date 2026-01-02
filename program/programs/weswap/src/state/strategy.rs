use anchor_lang::prelude::*;

/// Order direction - determines trigger comparison logic
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum OrderDirection {
    /// BUY order: Trigger when price drops TO or BELOW target (currentPrice <= triggerPrice)
    #[default]
    Buy,
    /// SELL order: Trigger when price rises TO or ABOVE target (currentPrice >= triggerPrice)
    Sell,
}

/// Strategy lifecycle status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum StrategyStatus {
    /// Strategy is active and waiting for entry trigger
    #[default]
    Active,
    /// Entry executed, position is open, monitoring for TP/SL exit
    Filled,
    /// Strategy is complete (either exit executed or no TP/SL was set)
    Closed,
    /// Strategy was cancelled by user
    Cancelled,
}

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
    
    // Order direction - NEW
    pub direction: OrderDirection,
    
    // Trigger configuration
    pub trigger_price: u64,  // Price at which strategy executes (scaled by price_precision)
    pub price_precision: u8, // Decimal places for trigger_price (for comparing with oracle prices)
    
    // Take profit / Stop loss
    pub take_profit_price: Option<u64>,
    pub stop_loss_price: Option<u64>,
    
    // Amount configuration
    pub sell_amount: u64,  // Amount of sell token to swap (0 means use escrow balance)
    pub use_percentage: bool,  // If true, sell_amount is a percentage (in bps)
    
    // Strategy state - UPDATED: Replaced is_active/is_executed with status enum
    pub status: StrategyStatus,
    pub boomerang_mode: bool,  // After TP/SL, re-enter using profits
    
    // Entry execution details
    pub entry_price: Option<u64>,       // NEW: Price at which entry was executed
    pub entry_tokens_received: Option<u64>, // NEW: Tokens received on entry
    pub entry_executed_at: Option<i64>, // NEW: When entry was executed
    
    // Exit execution details (for TP/SL)
    pub exit_price: Option<u64>,        // NEW: Price at which exit was executed
    pub exit_tokens_received: Option<u64>, // NEW: Tokens received on exit
    pub exit_executed_at: Option<i64>,  // NEW: When exit was executed
    pub exit_type: Option<u8>,          // NEW: 0 = StopLoss, 1 = TakeProfit
    
    // Timestamps
    pub created_at: i64,
    
    // Legacy fields (kept for backward compatibility during migration)
    pub executed_at: Option<i64>,       // DEPRECATED: Use entry_executed_at
    pub execution_price: Option<u64>,   // DEPRECATED: Use entry_price
    pub tokens_received: Option<u64>,   // DEPRECATED: Use entry_tokens_received
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
        direction: OrderDirection, // NEW parameter
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
        self.direction = direction;
        self.trigger_price = trigger_price;
        self.price_precision = price_precision;
        self.take_profit_price = take_profit_price;
        self.stop_loss_price = stop_loss_price;
        self.sell_amount = sell_amount;
        self.use_percentage = use_percentage;
        self.status = StrategyStatus::Active;
        self.boomerang_mode = boomerang_mode;
        self.created_at = current_time;
        
        // Initialize all execution fields to None
        self.entry_price = None;
        self.entry_tokens_received = None;
        self.entry_executed_at = None;
        self.exit_price = None;
        self.exit_tokens_received = None;
        self.exit_executed_at = None;
        self.exit_type = None;
        
        // Legacy fields
        self.executed_at = None;
        self.execution_price = None;
        self.tokens_received = None;
    }

    /// Check if strategy is active (waiting for entry trigger)
    pub fn is_active(&self) -> bool {
        self.status == StrategyStatus::Active
    }

    /// Check if strategy is filled (waiting for TP/SL exit)
    pub fn is_filled(&self) -> bool {
        self.status == StrategyStatus::Filled
    }

    /// Check if strategy is closed (complete)
    pub fn is_closed(&self) -> bool {
        self.status == StrategyStatus::Closed || self.status == StrategyStatus::Cancelled
    }

    /// Check if entry trigger condition is met (BIDIRECTIONAL)
    pub fn can_execute_entry(&self, current_price: u64) -> bool {
        if self.status != StrategyStatus::Active {
            return false;
        }
        
        match self.direction {
            // BUY order: Trigger when price drops TO or BELOW target
            OrderDirection::Buy => current_price <= self.trigger_price,
            // SELL order: Trigger when price rises TO or ABOVE target
            OrderDirection::Sell => current_price >= self.trigger_price,
        }
    }

    /// DEPRECATED: Use can_execute_entry() instead
    /// Kept for backward compatibility
    pub fn can_execute(&self, current_price: u64) -> bool {
        self.can_execute_entry(current_price)
    }

    /// Check if TP/SL exit condition is met
    pub fn should_execute_exit(&self, current_price: u64) -> Option<bool> {
        if self.status != StrategyStatus::Filled {
            return None;
        }

        // Take Profit: Exit when price rises to our target
        if let Some(tp_price) = self.take_profit_price {
            if current_price >= tp_price {
                return Some(true); // Take profit triggered
            }
        }
        
        // Stop Loss: Exit when price drops to our stop
        if let Some(sl_price) = self.stop_loss_price {
            if current_price <= sl_price {
                return Some(false); // Stop loss triggered
            }
        }
        
        None // No exit triggered
    }

    /// DEPRECATED: Use should_execute_exit() instead
    pub fn should_execute_tp_sl(&self, current_price: u64) -> Option<bool> {
        self.should_execute_exit(current_price)
    }

    /// Mark entry as executed and transition to appropriate state
    pub fn mark_entry_executed(&mut self, execution_price: u64, tokens_received: u64, current_time: i64) {
        self.entry_price = Some(execution_price);
        self.entry_tokens_received = Some(tokens_received);
        self.entry_executed_at = Some(current_time);
        
        // Legacy fields for backward compatibility
        self.execution_price = Some(execution_price);
        self.tokens_received = Some(tokens_received);
        self.executed_at = Some(current_time);
        
        // Transition to next state based on whether TP/SL is set
        if self.take_profit_price.is_some() || self.stop_loss_price.is_some() {
            // Has TP/SL - need to monitor for exit
            self.status = StrategyStatus::Filled;
        } else {
            // No TP/SL - strategy is complete
            self.status = StrategyStatus::Closed;
        }
    }

    /// DEPRECATED: Use mark_entry_executed() instead
    pub fn mark_executed(&mut self, execution_price: u64, tokens_received: u64, current_time: i64) {
        self.mark_entry_executed(execution_price, tokens_received, current_time);
    }

    /// Mark exit as executed (TP or SL hit)
    pub fn mark_exit_executed(&mut self, execution_price: u64, tokens_received: u64, is_take_profit: bool, current_time: i64) {
        self.exit_price = Some(execution_price);
        self.exit_tokens_received = Some(tokens_received);
        self.exit_executed_at = Some(current_time);
        self.exit_type = Some(if is_take_profit { 1 } else { 0 });
        self.status = StrategyStatus::Closed;
    }

    pub fn deactivate(&mut self) {
        self.status = StrategyStatus::Cancelled;
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

