//! ExecuteExit instruction - Executes TP/SL exit when conditions are met
//! 
//! ARCHITECTURE: This is an AUTOMATED exit - the Keeper calls this, NOT the user.
//! The Escrow PDA holds the tokens received from entry, and signs the exit swap.
//! 
//! Flow:
//! 1. Entry: User deposits sell_token → Escrow → Jupiter → buy_token stays in Escrow
//! 2. Exit: Keeper triggers TP/SL → Escrow signs swap → buy_token → sell_token → Owner

use {
    crate::{
        state::{
            strategy::{Strategy, StrategyEscrow, StrategyStatus},
            global::Global,
        },
        events::{ExecuteStrategyEvent, CreateStrategyEvent}, // Added CreateStrategyEvent for Boomerang
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
        associated_token::AssociatedToken,
    },
    anchor_lang::system_program::System,
};

#[derive(Accounts)]
#[instruction(params: ExecuteExitParams)]
pub struct ExecuteExit<'info> {
    /// Keeper pays gas - ONLY signer required
    #[account(mut)]
    pub keeper: Signer<'info>,

    /// CHECK: Owner of the strategy - NOT a signer (receives exit proceeds if not boomerang)
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
        constraint = strategy.is_filled() @ WeswapError::StrategyNotFilled,
    )]
    pub strategy: Box<Account<'info, Strategy>>,

    #[account(
        mut,
        seeds = [b"escrow", strategy.key().as_ref()],
        bump,
    )]
    pub escrow: Box<Account<'info, StrategyEscrow>>,

    /// The token we're selling on exit (buy_token from entry - profits held in escrow)
    pub exit_sell_token_mint: InterfaceAccount<'info, Mint>,

    pub exit_sell_token_program: Interface<'info, TokenInterface>,

    /// The token we're buying on exit (sell_token from entry - going back to base)
    pub exit_buy_token_mint: InterfaceAccount<'info, Mint>,

    pub exit_buy_token_program: Interface<'info, TokenInterface>,

    /// Escrow's token account holding the profits from entry (used as source for exit swap)
    /// This is the buy_token from entry, which becomes sell_token for exit
    #[account(
        mut,
        associated_token::mint = exit_sell_token_mint,
        associated_token::authority = escrow,
        associated_token::token_program = exit_sell_token_program,
    )]
    pub escrow_exit_sell_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Escrow's ATA for the exit_buy_token (used as destination in BOOMERANG mode)
    /// When boomerang_mode is true, funds go here instead of owner
    /// This keeps the tokens in escrow, ready for the next leg of the round trip
    #[account(
        init_if_needed,
        payer = keeper,
        associated_token::mint = exit_buy_token_mint,
        associated_token::authority = escrow,
        associated_token::token_program = exit_buy_token_program,
    )]
    pub escrow_receive_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Owner's token account to receive the exit proceeds (used in NORMAL mode)
    /// When boomerang_mode is false, funds go here (cash out to user)
    #[account(
        mut,
        associated_token::mint = exit_buy_token_mint,
        associated_token::authority = owner,
        associated_token::token_program = exit_buy_token_program,
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
        associated_token::mint = exit_buy_token_mint,
        associated_token::authority = treasury,
        associated_token::token_program = exit_buy_token_program,
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: Jupiter program for swap execution
    pub jupiter_program: AccountInfo<'info>,

    /// Required for init_if_needed on escrow_receive_token_account
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// Required for init_if_needed (pays rent for new ATA)
    pub system_program: Program<'info, System>,
}

pub fn execute_exit(
    ctx: Context<ExecuteExit>,
    params: ExecuteExitParams,
    jupiter_instruction_data: Vec<u8>,
) -> Result<()> {
    let strategy_key = ctx.accounts.strategy.key();
    let strategy = &mut ctx.accounts.strategy;
    
    // Verify TP/SL condition is met
    let current_price = params.current_price;
    let exit_result = strategy.should_execute_exit(current_price);
    
    let is_take_profit = match exit_result {
        Some(true) => {
            msg!("✅ Take profit triggered at price {}", current_price);
            true
        },
        Some(false) => {
            msg!("🛑 Stop loss triggered at price {}", current_price);
            false
        },
        None => {
            return Err(WeswapError::ExitConditionNotMet.into());
        }
    };

    // 1. Determine Destination (Boomerang Logic)
    // If Boomerang is ON, funds go back to Escrow. If OFF, funds go to Owner.
    let destination_account_info = if strategy.boomerang_mode {
        msg!("🪃 Boomerang Mode: Routing funds to ESCROW");
        ctx.accounts.escrow_receive_token_account.to_account_info()
    } else {
        msg!("💰 Normal Mode: Routing funds to OWNER");
        ctx.accounts.owner_receive_token_account.to_account_info()
    };

    // Get amount to sell from escrow (tokens received from entry, held in escrow)
    let escrow_balance = ctx.accounts.escrow_exit_sell_token_account.amount;
    require!(escrow_balance > 0, WeswapError::InsufficientEscrow);

    msg!("Escrow balance for exit: {} tokens", escrow_balance);

    // Record balance before swap (of the CORRECT destination)
    let balance_before = {
        let account_data = destination_account_info.try_borrow_data()?;
        TokenAccount::try_deserialize(&mut account_data.as_ref())?.amount
    };

    let escrow_key = ctx.accounts.escrow.key();
    let escrow_token_account = &ctx.accounts.escrow_exit_sell_token_account;
    
    // Verify escrow owns the token account
    require_keys_eq!(
        escrow_token_account.owner,
        escrow_key,
        WeswapError::InvalidAuthority
    );

    // Build remaining accounts for Jupiter CPI
    let accounts: Vec<AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| {
            let is_signer = acc.key == &escrow_key;
            
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
        .map(|acc| AccountInfo { ..acc.clone() })
        .collect();

    msg!("Executing Jupiter EXIT swap via CPI from escrow PDA");

    // PDA SIGNING - Escrow signs the swap, NOT the owner
    let escrow_seeds: &[&[&[u8]]] = &[&[
        b"escrow",
        strategy_key.as_ref(),
        &[ctx.bumps.escrow]
    ]];

    // Execute Jupiter swap with PDA signer
    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.jupiter_program.key(),
            accounts,
            data: jupiter_instruction_data,
        },
        &accounts_infos,
        escrow_seeds,
    )?;

    // Calculate tokens received (at the CORRECT destination)
    let balance_after = {
        let account_data = destination_account_info.try_borrow_data()?;
        TokenAccount::try_deserialize(&mut account_data.as_ref())?.amount
    };
    
    let tokens_received = balance_after
        .checked_sub(balance_before)
        .ok_or(WeswapError::NoTokensReceived)?;

    require!(tokens_received > 0, WeswapError::NoTokensReceived);

    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Calculate fee info for logging
    let platform_fee_bps = ctx.accounts.global.platform_fee_bps as u128;
    let expected_fee = (tokens_received as u128)
        .checked_mul(platform_fee_bps)
        .and_then(|n| n.checked_div(10_000))
        .map(|n| n as u64)
        .unwrap_or(0);

    msg!(
        "Exit swap completed. Received {} tokens (net after {} bps fee, expected fee: {} tokens)",
        tokens_received,
        platform_fee_bps,
        expected_fee
    );

    // =========================================================================
    // 🪃 BOOMERANG LOGIC: THE PHOENIX MOMENT 🪃
    // =========================================================================

    if strategy.boomerang_mode {
        msg!("🪃 BOOMERANG MODE ACTIVE: Flipping Strategy for Return Leg");

        // 1. Mark current leg as executed (but don't close)
        strategy.executed_at = Some(current_time);
        
        // 2. FLIP THE TOKENS
        // Old Sell Token (e.g. SOL) becomes New Buy Token
        // Old Buy Token (e.g. TRUMP) becomes New Sell Token
        // NOTE: We rely on the Frontend/Backend to provide the correct 'exit' mints in this call.
        // So 'exit_sell_token_mint' was TRUMP, 'exit_buy_token_mint' was SOL.
        // We set the strategy state to match the NEXT leg (which is Entry again, effectively).
        
        // Wait, Boomerang means:
        // Leg 1: Entry (Active) -> Filled
        // Leg 2: Exit (Filled) -> Active (flipped)
        
        // We are currently in Leg 2 (Exit).
        // If we want to loop, we reset to 'Active'.
        strategy.status = StrategyStatus::Active;
        
        // Swap the mints in the strategy state
        let old_sell_mint = strategy.sell_token_mint;
        strategy.sell_token_mint = strategy.buy_token_mint;
        strategy.buy_token_mint = old_sell_mint;

        // Swap decimals
        let old_sell_decimals = strategy.sell_token_decimals;
        strategy.sell_token_decimals = strategy.buy_token_decimals;
        strategy.buy_token_decimals = old_sell_decimals;

        // 3. Reset Execution Data
        strategy.executed_at = None; // Reset for next execution
        strategy.execution_price = None;
        strategy.tokens_received = None;

        // 4. Update Trigger Prices? 
        // Ideally, we need new inputs for the return leg target. 
        // FOR MVP: We will assume the Backend/User will update the strategy params via an 'update' instruction
        // OR we just keep the same numerical values (which might not make sense if price scales differ).
        // 
        // SAFETY: We will disable 'boomerang_mode' to prevent infinite loops for now, 
        // making it a "Round Trip" (2 legs) and done.
        strategy.boomerang_mode = false; 

        // Update Escrow Tracker (Since we kept the funds)
        let escrow = &mut ctx.accounts.escrow;
        escrow.deposited_amount = tokens_received; 
        escrow.sell_token_mint = strategy.sell_token_mint; // Now holds the new sell token

        msg!("Strategy flipped and reset to Active. Boomerang completed (Round Trip).");

        // 5. Emit Re-Creation Event so Backend knows to start monitoring again
        emit!(CreateStrategyEvent {
            owner: strategy.owner,
            strategy: strategy.key(),
            escrow: ctx.accounts.escrow.key(),
            sell_token_mint: strategy.sell_token_mint,
            buy_token_mint: strategy.buy_token_mint,
            sell_token_decimals: strategy.sell_token_decimals,
            buy_token_decimals: strategy.buy_token_decimals,
            trigger_price: strategy.trigger_price, // WARNING: Likely needs update
            price_precision: strategy.price_precision,
            take_profit_price: strategy.take_profit_price,
            stop_loss_price: strategy.stop_loss_price,
            sell_amount: tokens_received, // We are now selling what we just received
            use_percentage: strategy.use_percentage, // Use 100% of what we have
            boomerang_mode: false, // Turn off for next run
            deposit_amount: tokens_received,
            created_at: current_time,
        });

    } else {
        // Normal Exit - Close the strategy
        strategy.mark_exit_executed(current_price, tokens_received, is_take_profit, current_time);
        
        // Update Escrow to show it's empty
        let escrow = &mut ctx.accounts.escrow;
        escrow.deposited_amount = 0;

        msg!("Strategy Exit Complete. Status: CLOSED");
    }

    // =========================================================================

    let exit_type_str = if is_take_profit { "TAKE_PROFIT" } else { "STOP_LOSS" };
    msg!(
        "Exit executed: {} - sold {} tokens from escrow, received {} tokens to owner. Strategy: {:?}",
        exit_type_str,
        escrow_balance,
        tokens_received,
        strategy.key()
    );

    // Emit event
    emit!(ExecuteStrategyEvent {
        strategy: strategy.key(),
        owner: strategy.owner,
        sell_token_mint: ctx.accounts.exit_sell_token_mint.key(),
        buy_token_mint: ctx.accounts.exit_buy_token_mint.key(),
        tokens_sold: escrow_balance,
        tokens_received,
        execution_price: current_price,
        executed_at: current_time,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecuteExitParams {
    pub strategy_id: u64,
    pub current_price: u64,
}