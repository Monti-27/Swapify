import { MethodsNamespace, IdlTypes, IdlAccounts } from "@coral-xyz/anchor";
import { Weswap } from "../../target/types/weswap";

export type Methods = MethodsNamespace<Weswap>;
export type Accounts = IdlAccounts<Weswap>;
export type Types = IdlTypes<Weswap>;

// Instruction parameter types
export type InitializeParams = Types["initializeParams"];
export type CreateStrategyParams = Types["createStrategyParams"];
export type ExecuteStrategyParams = Types["executeStrategyParams"];
export type DepositEscrowParams = Types["depositEscrowParams"];
export type WithdrawEscrowParams = Types["withdrawEscrowParams"];
export type ManageKeepersParams = Types["manageKeepersParams"];

// Account types
export type Global = Accounts["global"];
export type Strategy = Accounts["strategy"];
export type StrategyEscrow = Accounts["strategyEscrow"];

// Event types
export type CreateStrategyEvent = Types["createStrategyEvent"];
export type ExecuteStrategyEvent = Types["executeStrategyEvent"];
export type CancelStrategyEvent = Types["cancelStrategyEvent"];

// Enum types
export type KeeperAction = Types["keeperAction"];
