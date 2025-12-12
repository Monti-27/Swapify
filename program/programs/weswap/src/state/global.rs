use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug, InitSpace)]
pub struct Global {
    pub initialized: bool,
    
    // Protocol authority
    pub authority: Pubkey,
    
    // Treasury for collecting fees
    pub treasury: Pubkey,
    
    // Keeper addresses (dynamic list of authorized keepers)
    #[max_len(10)]
    pub keepers: Vec<Pubkey>,
    
    // Platform fee in basis points (e.g., 50 = 0.5%)
    pub platform_fee_bps: u16,
    
    // Max allowed strategies per user
    pub max_strategies_per_user: u64,
    
    // Strategy counter (global counter for assigning IDs)
    pub strategy_counter: u64,
    
    // Protocol status flags
    pub is_paused: bool,
    pub allow_new_strategies: bool,
}

impl Global {
    pub const LEN: usize = 8 + Global::INIT_SPACE;

    pub fn initialize(
        &mut self,
        authority: Pubkey,
        treasury: Pubkey,
        keepers: Vec<Pubkey>,
        platform_fee_bps: u16,
        max_strategies_per_user: u64,
    ) {
        self.initialized = true;
        self.authority = authority;
        self.treasury = treasury;
        self.keepers = keepers;
        self.platform_fee_bps = platform_fee_bps;
        self.max_strategies_per_user = max_strategies_per_user;
        self.strategy_counter = 0;
        self.is_paused = false;
        self.allow_new_strategies = true;
    }

    pub fn is_valid_keeper(&self, keeper: &Pubkey) -> bool {
        self.keepers.contains(keeper)
    }

    pub fn increment_strategy_counter(&mut self) -> u64 {
        self.strategy_counter = self.strategy_counter
            .checked_add(1)
            .unwrap_or(self.strategy_counter);
        self.strategy_counter
    }

    pub fn pause(&mut self) {
        self.is_paused = true;
    }

    pub fn unpause(&mut self) {
        self.is_paused = false;
    }

    pub fn set_allow_new_strategies(&mut self, allow: bool) {
        self.allow_new_strategies = allow;
    }

    pub fn add_keeper(&mut self, keeper: Pubkey) -> Result<()> {
        require!(!self.keepers.contains(&keeper), GlobalError::KeeperAlreadyExists);
        require!(self.keepers.len() < 10, GlobalError::TooManyKeepers); // Reasonable limit
        self.keepers.push(keeper);
        Ok(())
    }

    pub fn remove_keeper(&mut self, keeper: &Pubkey) -> Result<()> {
        let position = self.keepers.iter().position(|k| k == keeper)
            .ok_or(GlobalError::KeeperNotFound)?;
        require!(self.keepers.len() > 1, GlobalError::CannotRemoveLastKeeper);
        self.keepers.remove(position);
        Ok(())
    }

    pub fn get_keeper_count(&self) -> usize {
        self.keepers.len()
    }
}

#[error_code]
pub enum GlobalError {
    #[msg("Keeper already exists in the list")]
    KeeperAlreadyExists,
    #[msg("Keeper not found in the list")]
    KeeperNotFound,
    #[msg("Cannot remove the last keeper")]
    CannotRemoveLastKeeper,
    #[msg("Too many keepers (max 10 allowed)")]
    TooManyKeepers,
}

