//! WithdrawEscrow instruction - Allows user to withdraw funds from escrow and optionally cancel strategy

use {
    crate::{
        state::{
            strategy::{Strategy, StrategyEscrow},
            global::Global,
        },
        events::{CancelStrategyEvent, WithdrawEscrowEvent},
        error::WeswapError,
    },
    anchor_lang::prelude::*,
    anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
#[instruction(params: WithdrawEscrowParams)]
pub struct WithdrawEscrow<'info> {
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
        init_if_needed,
        payer = owner,
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

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct WithdrawEscrowParams {
    pub id: u64,
    pub amount: u64,
    pub cancel_strategy: bool,
}

pub fn withdraw_escrow(
    ctx: Context<WithdrawEscrow>,
    params: WithdrawEscrowParams,
) -> Result<()> {
    let available_amount = ctx.accounts.escrow.get_available_amount();
    
    // If cancelling without withdrawal, allow even if escrow is empty
    // Otherwise, require escrow to have funds
    if !params.cancel_strategy {
        require!(available_amount > 0, WeswapError::InsufficientEscrow);
    }

    let withdraw_amount = if params.amount == 0 {
        available_amount
    } else {
        require!(params.amount <= available_amount, WeswapError::InsufficientEscrow);
        params.amount
    };

    let _is_full_withdrawal = withdraw_amount == available_amount;
    
    if params.cancel_strategy {
        ctx.accounts.strategy.deactivate();
        
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;
        
        emit!(CancelStrategyEvent {
            strategy: ctx.accounts.strategy.key(),
            owner: ctx.accounts.strategy.owner,
            cancelled_at: current_time,
        });
        
        if withdraw_amount > 0 {
            msg!(
                "Strategy cancelled: {:?} - refunded {} tokens to owner",
                ctx.accounts.strategy.key(),
                withdraw_amount
            );
        } else {
            msg!(
                "Strategy cancelled: {:?} - no tokens to refund",
                ctx.accounts.strategy.key()
            );
        }
    } else {
        msg!(
            "Escrow withdrawal: Strategy {:?} - withdrawn {} tokens. Remaining: {}",
            ctx.accounts.strategy.key(),
            withdraw_amount,
            available_amount - withdraw_amount
        );
    }

    // Only perform transfer if there's an amount to withdraw
    if withdraw_amount > 0 {
        let strategy_key = ctx.accounts.strategy.key();
        let escrow_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            strategy_key.as_ref(),
            &[ctx.bumps.escrow]
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.sell_token_program.to_account_info(),
            anchor_spl::token_interface::Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.owner_token_account.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            escrow_seeds,
        );

        anchor_spl::token_interface::transfer(cpi_ctx, withdraw_amount)?;

        ctx.accounts.escrow.withdrawn_amount = ctx.accounts.escrow
            .withdrawn_amount
            .checked_add(withdraw_amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        emit!(WithdrawEscrowEvent {
            strategy: ctx.accounts.strategy.key(),
            owner: ctx.accounts.owner.key(),
            sell_token_mint: ctx.accounts.sell_token_mint.key(),
            amount: withdraw_amount,
            new_total_withdrawn: ctx.accounts.escrow.withdrawn_amount,
            withdrawn_at: current_time,
        });
    }

    // If cancelling, close accounts after withdrawal
    if params.cancel_strategy {
        // Close escrow token account if empty after withdrawal
        let escrow_token_balance = ctx.accounts.escrow_token_account.amount;
        if escrow_token_balance == 0 {
            let strategy_key = ctx.accounts.strategy.key();
            let escrow_seeds: &[&[&[u8]]] = &[&[
                b"escrow",
                strategy_key.as_ref(),
                &[ctx.bumps.escrow]
            ]];

            let close_cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.sell_token_program.to_account_info(),
                anchor_spl::token_interface::CloseAccount {
                    account: ctx.accounts.escrow_token_account.to_account_info(),
                    destination: ctx.accounts.owner.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                escrow_seeds,
            );

            anchor_spl::token_interface::close_account(close_cpi_ctx)?;
            msg!("Closed empty escrow token account");
        }

        // Close StrategyEscrow account and return rent to owner
        let escrow_lamports = ctx.accounts.escrow.to_account_info().lamports();
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += escrow_lamports;
        msg!("Closed StrategyEscrow account, returned {} lamports to owner", escrow_lamports);

        // Close Strategy account and return rent to owner
        let strategy_lamports = ctx.accounts.strategy.to_account_info().lamports();
        **ctx.accounts.strategy.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += strategy_lamports;
        msg!("Closed Strategy account, returned {} lamports to owner", strategy_lamports);
    }

    Ok(())
}

