use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod events;
pub mod error;

pub use crate::instructions::*;
pub use crate::instructions::initialize::*;
pub use crate::instructions::create_strategy::*;
pub use crate::instructions::execute_strategy::*;
pub use crate::instructions::deposit_escrow::*;
pub use crate::instructions::withdraw_escrow::*;
pub use crate::instructions::manage_keepers::*;

declare_id!("AFhpyoVmDCEVofP3sqj8wCPSFYYGpL83sbXKuwMZtcoQ");

#[macro_export]
macro_rules! try_from {
    // https://github.com/coral-xyz/anchor/pull/2770
    ($ty: ty, $acc: expr) => {
        <$ty>::try_from(unsafe { core::mem::transmute::<_, &AccountInfo<'_>>($acc.as_ref()) })
    };
}

#[program]
pub mod weswap {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        params: InitializeParams,
    ) -> Result<()> {
        instructions::initialize::initialize(ctx, params)
    }

    pub fn create_strategy(
        ctx: Context<CreateStrategy>,
        params: CreateStrategyParams,
    ) -> Result<()> {
        instructions::create_strategy::create_strategy(ctx, params)
    }

    pub fn execute_strategy(
        ctx: Context<ExecuteStrategy>,
        params: instructions::execute_strategy::ExecuteStrategyParams,
        jupiter_instruction_data: Vec<u8>,
    ) -> Result<()> {
        instructions::execute_strategy::execute_strategy(ctx, params, jupiter_instruction_data)
    }


    pub fn deposit_escrow(
        ctx: Context<DepositEscrow>,
        params: DepositEscrowParams,
    ) -> Result<()> {
        instructions::deposit_escrow::deposit_escrow(ctx, params)
    }

    pub fn withdraw_escrow(
        ctx: Context<WithdrawEscrow>,
        params: WithdrawEscrowParams,
    ) -> Result<()> {
        instructions::withdraw_escrow::withdraw_escrow(ctx, params)
    }

    pub fn manage_keepers(
        ctx: Context<ManageKeepers>,
        params: ManageKeepersParams,
    ) -> Result<()> {
        instructions::manage_keepers::manage_keepers(ctx, params)
    }
}
