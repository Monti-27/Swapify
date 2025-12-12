//! ManageKeepers instruction - Admin-only instruction for managing keeper addresses

use {
    crate::state::global::Global,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct ManageKeepers<'info> {
    #[account(
        mut,
        constraint = authority.key() == global.authority @ ManageKeepersError::UnauthorizedAdmin,
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global"],
        bump,
    )]
    pub global: Box<Account<'info, Global>>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum KeeperAction {
    Add { keeper: Pubkey },
    Remove { keeper: Pubkey },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ManageKeepersParams {
    pub action: KeeperAction,
}

pub fn manage_keepers(
    ctx: Context<ManageKeepers>,
    params: ManageKeepersParams,
) -> Result<()> {
    let global = &mut ctx.accounts.global;

    match params.action {
        KeeperAction::Add { keeper } => {
            global.add_keeper(keeper)?;
            msg!("Added keeper: {}", keeper);
        }
        KeeperAction::Remove { keeper } => {
            global.remove_keeper(&keeper)?;
            msg!("Removed keeper: {}", keeper);
        }
    }

    msg!("Total keepers: {}", global.get_keeper_count());

    Ok(())
}

#[error_code]
pub enum ManageKeepersError {
    #[msg("Only the protocol authority can manage keepers")]
    UnauthorizedAdmin,
}
