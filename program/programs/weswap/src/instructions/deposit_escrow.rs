//! DepositEscrow instruction - Allows user to add more funds to an existing strategy's escrow

use {
    crate::{
        state::{
            strategy::{Strategy, StrategyEscrow},
            global::Global,
        },
        events::DepositEscrowEvent,
        error::WeswapError,
    },
    anchor_lang::prelude::*,
    anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
#[instruction(params: DepositEscrowParams)]
pub struct DepositEscrow<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"global"],
        bump,
    )]
    pub global: Box<Account<'info, Global>>,

    #[account(
        mut,
        seeds = [b"strategy", owner.key().as_ref(), &params.id.to_le_bytes()],
        bump,
        constraint = strategy.owner == owner.key() @ WeswapError::StrategyNotFound,
        constraint = strategy.is_active @ WeswapError::StrategyNotActive,
        constraint = !strategy.is_executed @ WeswapError::StrategyAlreadyExecuted,
    )]
    pub strategy: Box<Account<'info, Strategy>>,

    #[account(
        mut,
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
    #[account(
        mut,
        associated_token::mint = sell_token_mint,
        associated_token::authority = escrow,
        associated_token::token_program = sell_token_program,
    )]
    pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct DepositEscrowParams {
    pub id: u64,
    pub amount: u64,
}

pub fn deposit_escrow(
    ctx: Context<DepositEscrow>,
    params: DepositEscrowParams,
) -> Result<()> {
    require!(params.amount > 0, WeswapError::InsufficientDeposit);

    let cpi_ctx = CpiContext::new(
        ctx.accounts.sell_token_program.to_account_info(),
        anchor_spl::token_interface::Transfer {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );

    anchor_spl::token_interface::transfer(cpi_ctx, params.amount)?;

    ctx.accounts.escrow.deposited_amount = ctx.accounts.escrow
        .deposited_amount
        .checked_add(params.amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    
    emit!(DepositEscrowEvent {
        strategy: ctx.accounts.strategy.key(),
        owner: ctx.accounts.owner.key(),
        sell_token_mint: ctx.accounts.sell_token_mint.key(),
        amount: params.amount,
        new_total_deposited: ctx.accounts.escrow.deposited_amount,
        deposited_at: current_time,
    });

    msg!(
        "Escrow deposit: Strategy {:?} - added {} tokens. New balance: {}",
        ctx.accounts.strategy.key(),
        params.amount,
        ctx.accounts.escrow.deposited_amount
    );

    Ok(())
}

