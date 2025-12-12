//! Initialize instruction - Sets up the global state for the protocol

use {
    crate::state::global::Global,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Global::LEN,
        seeds = [b"global"],
        bump,
    )]
    pub global: Box<Account<'info, Global>>,

    /// CHECK: Treasury account for collecting fees
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeParams {
    pub platform_fee_bps: u16,
    pub max_strategies_per_user: u64,
    pub keepers: Vec<Pubkey>,
}

pub fn initialize(
    ctx: Context<Initialize>,
    params: InitializeParams,
) -> Result<()> {
    require!(params.platform_fee_bps <= 10000, ErrorCode::InvalidFee);
    require!(params.max_strategies_per_user > 0, ErrorCode::InvalidMaxStrategies);
    require!(!params.keepers.is_empty(), ErrorCode::NoKeepersProvided);
    require!(params.keepers.len() <= 10, ErrorCode::TooManyKeepers);

    // Validate no duplicate keepers
    let mut unique_keepers = params.keepers.clone();
    unique_keepers.sort();
    unique_keepers.dedup();
    require!(unique_keepers.len() == params.keepers.len(), ErrorCode::DuplicateKeepers);

    ctx.accounts.global.initialize(
        ctx.accounts.authority.key(),
        ctx.accounts.treasury.key(),
        params.keepers.clone(),
        params.platform_fee_bps,
        params.max_strategies_per_user,
    );

    msg!("Protocol initialized with fee: {} bps and {} keepers", 
         params.platform_fee_bps, 
         params.keepers.len());

    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Platform fee cannot exceed 10000 bps (100%)")]
    InvalidFee,
    #[msg("Max strategies per user must be greater than 0")]
    InvalidMaxStrategies,
    #[msg("At least one keeper must be provided")]
    NoKeepersProvided,
    #[msg("Too many keepers provided (max 10 allowed)")]
    TooManyKeepers,
    #[msg("Duplicate keepers are not allowed")]
    DuplicateKeepers,
}

