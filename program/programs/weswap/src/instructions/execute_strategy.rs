//! ExecuteStrategy instruction - Executes a strategy when trigger conditions are met

use {
    crate::{
        state::{
            strategy::{Strategy, StrategyEscrow},
            global::Global,
        },
        events::ExecuteStrategyEvent,
        error::WeswapError,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            instruction::{AccountMeta, Instruction},
            program::invoke_signed,
        },
    },
    anchor_spl::{
        token_interface::{Mint, TokenAccount, TokenInterface},
    },
};

#[derive(Accounts)]
#[instruction(params: ExecuteStrategyParams)]
pub struct ExecuteStrategy<'info> {
    #[account(mut)]
    pub keeper: Signer<'info>,

    /// CHECK: Owner of the strategy
    #[account(constraint = owner.key() == strategy.owner)]
    pub owner: AccountInfo<'info>,

    #[account(
        seeds = [b"global"],
        bump,
        constraint = global.is_valid_keeper(&keeper.key()) @ WeswapError::UnauthorizedKeeper,
    )]
    pub global: Box<Account<'info, Global>>,

    #[account(
        mut,
        seeds = [b"strategy", strategy.owner.as_ref(), &params.strategy_id.to_le_bytes()],
        bump,
        constraint = strategy.is_active() @ WeswapError::StrategyNotActive,
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

    /// CHECK: Escrow token account - ATA owned by escrow PDA (per-strategy)
    #[account(
        mut,
        associated_token::mint = sell_token_mint,
        associated_token::authority = escrow,
        associated_token::token_program = sell_token_program,
    )]
    pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = buy_token_mint,
        associated_token::authority = owner,
        associated_token::token_program = buy_token_program,
    )]
    pub owner_receive_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: Treasury account for fee collection
    #[account(
        constraint = treasury.key() == global.treasury
    )]
    pub treasury: AccountInfo<'info>,

    /// CHECK: Treasury token account for fees
    #[account(
        mut,
        associated_token::mint = buy_token_mint,
        associated_token::authority = treasury,
        associated_token::token_program = buy_token_program,
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: Jupiter program for swap execution
    pub jupiter_program: AccountInfo<'info>,

}

pub fn execute_strategy(
    ctx: Context<ExecuteStrategy>,
    params: ExecuteStrategyParams,
    jupiter_instruction_data: Vec<u8>,
) -> Result<()> {
    let strategy_key = ctx.accounts.strategy.key();
    let strategy = &mut ctx.accounts.strategy;

    if let Some(current_price) = params.current_price {
        require!(
            strategy.can_execute(current_price),
            WeswapError::InvalidCurrentPrice
        );

        if let Some(is_take_profit) = strategy.should_execute_tp_sl(current_price) {
            if !is_take_profit {
                msg!("Stop loss triggered at price {}", current_price);
            } else {
                msg!("Take profit triggered at price {}", current_price);
            }
        }
    }

    let available_amount = {
        ctx.accounts.escrow.get_available_amount()
    };
    require!(available_amount > 0, WeswapError::InsufficientEscrow);

    let sell_amount = if strategy.sell_amount == 0 {
        available_amount
    } else if strategy.use_percentage {
        (available_amount as u128)
            .checked_mul(strategy.sell_amount as u128)
            .and_then(|n| n.checked_div(10_000))
            .map(|n| n as u64)
            .unwrap_or(available_amount)
    } else {
        strategy.sell_amount.min(available_amount)
    };

    require!(sell_amount > 0, WeswapError::InsufficientEscrow);

    let balance_before = {
        let account_info = ctx.accounts.owner_receive_token_account.to_account_info();
        let account_data = account_info.try_borrow_data()?;
        TokenAccount::try_deserialize(&mut account_data.as_ref())?.amount
    };

    let escrow_key = ctx.accounts.escrow.key();
    
    let escrow_token_account = &ctx.accounts.escrow_token_account;
    require_keys_eq!(
        escrow_token_account.owner,
        escrow_key,
        WeswapError::InvalidAuthority
    );
    require_keys_eq!(
        escrow_token_account.mint,
        ctx.accounts.sell_token_mint.key(),
        WeswapError::InvalidMints
    );
    require!(
        escrow_token_account.amount > 0, 
        WeswapError::InsufficientEscrow
    );
    
    let accounts: Vec<AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .enumerate()
        .map(|(idx, acc)| {
            let is_signer = acc.key == &escrow_key;
            let is_escrow_token = acc.key == &escrow_token_account.key();
            
            AccountMeta {
                pubkey: *acc.key,
                is_signer,
                is_writable: acc.is_writable,
            }
        })
        .collect();
    
    let accounts_infos: Vec<AccountInfo> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| {
            if acc.key == &escrow_token_account.key() {
                let account_data = acc.try_borrow_data();
                if account_data.is_err() {
                    msg!("WARNING: Escrow token account data not accessible at position");
                } else {
                    msg!("Escrow token account data accessible, length: {}", account_data.as_ref().unwrap().len());
                }
            }
            AccountInfo { ..acc.clone() }
        })
        .collect();
    
    msg!("Executing Jupiter swap via CPI from escrow");
    
    let escrow_seeds: &[&[&[u8]]] = &[&[
        b"escrow",
        strategy_key.as_ref(),
        &[ctx.bumps.escrow]
    ]];
    
    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.jupiter_program.key(),
            accounts,
            data: jupiter_instruction_data,
        },
        &accounts_infos,
        escrow_seeds,
    )?;
    
    let balance_after = {
        let account_info = ctx.accounts.owner_receive_token_account.to_account_info();
        let account_data = account_info.try_borrow_data()?;
        TokenAccount::try_deserialize(&mut account_data.as_ref())?.amount
    };
    let tokens_received_gross: u64 = balance_after
        .checked_sub(balance_before)
        .ok_or(WeswapError::NoTokensReceived)?;

    require!(tokens_received_gross > 0, WeswapError::NoTokensReceived);
    
    let tokens_received = tokens_received_gross;
    
    let platform_fee_bps = ctx.accounts.global.platform_fee_bps as u128;
    let expected_fee = (tokens_received_gross as u128)
        .checked_mul(platform_fee_bps)
        .and_then(|n| n.checked_div(10_000))
        .map(|n| n as u64)
        .unwrap_or(0);
    
    msg!(
        "Jupiter swap completed. Received {} tokens (net after {} bps fee, expected fee: {} tokens)",
        tokens_received,
        platform_fee_bps,
        expected_fee
    );
    
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    let execution_price = params.current_price.unwrap_or(strategy.trigger_price);
    
    strategy.mark_entry_executed(execution_price, tokens_received, current_time);

    msg!(
        "Strategy executed: {:?} - sold {} tokens, received {} tokens",
        strategy.key(),
        sell_amount,
        tokens_received
    );

    emit!(ExecuteStrategyEvent {
        strategy: strategy.key(),
        owner: strategy.owner,
        sell_token_mint: strategy.sell_token_mint,
        buy_token_mint: strategy.buy_token_mint,
        tokens_sold: sell_amount,
        tokens_received,
        execution_price,
        executed_at: current_time,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecuteStrategyParams {
    pub strategy_id: u64,
    pub current_price: Option<u64>,
}