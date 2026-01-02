//! CreateStrategy instruction - Creates a new automated trading strategy

use {
    crate::{
        state::{
            strategy::{Strategy, StrategyEscrow, OrderDirection, StrategyStatus},
            global::Global,
        },
        events::CreateStrategyEvent,
        error::WeswapError,
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        token_interface::{Mint, TokenAccount, TokenInterface},
        associated_token::AssociatedToken,
    },
};

#[derive(Accounts)]
#[instruction(params: CreateStrategyParams)]
pub struct CreateStrategy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = Strategy::LEN,
        seeds = [b"strategy", owner.key().as_ref(), &params.id.to_le_bytes()],
        bump,
    )]
    pub strategy: Box<Account<'info, Strategy>>,

    #[account(
        seeds = [b"global"],
        bump,
        constraint = global.initialized == true @ WeswapError::ProtocolNotInitialized,
        constraint = !global.is_paused @ WeswapError::ProtocolPaused,
        constraint = global.allow_new_strategies @ WeswapError::NewStrategiesDisabled,
    )]
    pub global: Box<Account<'info, Global>>,

    #[account(
        init,
        payer = owner,
        space = StrategyEscrow::LEN,
        seeds = [b"escrow", strategy.key().as_ref()],
        bump,
    )]
    pub escrow: Box<Account<'info, StrategyEscrow>>,


    pub sell_token_mint: InterfaceAccount<'info, Mint>,

    pub sell_token_program: Interface<'info, TokenInterface>,

    pub buy_token_mint: InterfaceAccount<'info, Mint>,

    pub buy_token_program: Interface<'info, TokenInterface>,

    #[account(
        mut,
        associated_token::mint = sell_token_mint,
        associated_token::authority = owner,
        associated_token::token_program = sell_token_program,
    )]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: Escrow token account - ATA owned by escrow PDA (per-strategy)
    /// Authority is escrow PDA - escrow PDA can sign for transfers via invoke_signed
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = sell_token_mint,
        associated_token::authority = escrow,
        associated_token::token_program = sell_token_program,
    )]
    pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,

}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct CreateStrategyParams {
    pub id: u64,
    pub direction: OrderDirection,  // NEW: BUY or SELL order
    pub trigger_price: u64,
    pub price_precision: u8,
    pub take_profit_price: Option<u64>,
    pub stop_loss_price: Option<u64>,
    pub sell_amount: u64,
    pub use_percentage: bool,
    pub boomerang_mode: bool,
    pub deposit_amount: u64,
}

pub fn create_strategy(
    ctx: Context<CreateStrategy>,
    params: CreateStrategyParams,
) -> Result<()> {
    // Validate parameters
    require!(params.trigger_price > 0, WeswapError::InvalidTriggerPrice);
    require!(params.price_precision <= 18, WeswapError::InvalidPrecision);
    require!(
        params.deposit_amount > 0,
        WeswapError::InsufficientDeposit
    );

    if let Some(tp_price) = params.take_profit_price {
        require!(
            tp_price >= params.trigger_price,
            WeswapError::InvalidTakeProfit
        );
    }

    if let Some(sl_price) = params.stop_loss_price {
        require!(
            sl_price <= params.trigger_price,
            WeswapError::InvalidStopLoss
        );
    }

    require!(
        params.sell_amount == 0 || !params.use_percentage && params.sell_amount > 0,
        WeswapError::InvalidSellAmount
    );

    require!(
        params.id < ctx.accounts.global.max_strategies_per_user,
        WeswapError::MaxStrategiesExceeded
    );

    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    let sell_decimals = ctx.accounts.sell_token_mint.decimals;
    let buy_decimals = ctx.accounts.buy_token_mint.decimals;

    let strategy = &mut ctx.accounts.strategy;
    strategy.owner = ctx.accounts.owner.key();
    strategy.id = params.id;
    strategy.sell_token_mint = ctx.accounts.sell_token_mint.key();
    strategy.buy_token_mint = ctx.accounts.buy_token_mint.key();
    strategy.sell_token_decimals = sell_decimals;
    strategy.buy_token_decimals = buy_decimals;
    strategy.trigger_price = params.trigger_price;
    strategy.price_precision = params.price_precision;
    strategy.take_profit_price = params.take_profit_price;
    strategy.stop_loss_price = params.stop_loss_price;
    strategy.sell_amount = params.sell_amount;
    strategy.use_percentage = params.use_percentage;
    strategy.status = StrategyStatus::Active;  // NEW: Use enum instead of booleans
    strategy.boomerang_mode = params.boomerang_mode;
    strategy.created_at = current_time;
    strategy.executed_at = None;
    strategy.execution_price = None;
    strategy.tokens_received = None;
    strategy.direction = params.direction;

    let escrow = &mut ctx.accounts.escrow;
    escrow.strategy = strategy.key();
    escrow.owner = ctx.accounts.owner.key();
    escrow.sell_token_mint = ctx.accounts.sell_token_mint.key();
    escrow.deposited_amount = params.deposit_amount;
    escrow.withdrawn_amount = 0;

    let cpi_ctx = CpiContext::new(
        ctx.accounts.sell_token_program.to_account_info(),
        anchor_spl::token_interface::TransferChecked {
            from: ctx.accounts.owner_token_account.to_account_info(),
            mint: ctx.accounts.sell_token_mint.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );

    anchor_spl::token_interface::transfer_checked(cpi_ctx, params.deposit_amount, sell_decimals)?;

    msg!(
        "Strategy created: {:?} for {} -> {} at price {} (precision: {})",
        strategy.key(),
        ctx.accounts.sell_token_mint.key(),
        ctx.accounts.buy_token_mint.key(),
        params.trigger_price,
        params.price_precision
    );

    emit!(CreateStrategyEvent {
        owner: ctx.accounts.owner.key(),
        strategy: strategy.key(),
        escrow: ctx.accounts.escrow_token_account.key(), // Use escrow_token_account instead of escrow
        sell_token_mint: ctx.accounts.sell_token_mint.key(),
        buy_token_mint: ctx.accounts.buy_token_mint.key(),
        sell_token_decimals: sell_decimals,
        buy_token_decimals: buy_decimals,
        trigger_price: params.trigger_price,
        price_precision: params.price_precision,
        take_profit_price: params.take_profit_price,
        stop_loss_price: params.stop_loss_price,
        sell_amount: params.sell_amount,
        use_percentage: params.use_percentage,
        boomerang_mode: params.boomerang_mode,
        deposit_amount: params.deposit_amount,
        created_at: current_time,
    });

    Ok(())
}
