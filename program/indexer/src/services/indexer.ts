import { Connection, PublicKey } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
// @ts-ignore - Types from idls directory
import { Weswap } from "../../idls/weswap";
import { SupabaseService, StrategyRow, EscrowRow } from "./supabase";
import { Config } from "../config";

export class IndexerService {
  private isRunning = false;
  private eventListeners: number[] = [];

  constructor(
    private program: Program<Weswap>,
    private connection: Connection,
    private supabase: SupabaseService,
    private config: Config
  ) {}

  async start() {
    this.isRunning = true;
    console.log("✅ Indexer service started");

    // Listen to all program events
    await this.setupEventListeners();

    // Also do a historical sync if needed
    if (this.config.startSlot) {
      console.log(`📜 Syncing from slot ${this.config.startSlot}...`);
      // TODO: Implement historical sync
    }
  }

  async stop() {
    this.isRunning = false;
    // Remove event listeners
    for (const listenerId of this.eventListeners) {
      await this.program.removeEventListener(listenerId);
    }
    console.log("🛑 Indexer service stopped");
  }

  private async setupEventListeners() {
    // Listen to CreateStrategyEvent
    const createListener = this.program.addEventListener(
      "createStrategyEvent",
      async (event: any) => {
        console.log("📝 CreateStrategyEvent:", event.strategy.toString());
        await this.handleCreateStrategy(event);
      }
    );
    this.eventListeners.push(createListener);

    // Listen to ExecuteStrategyEvent
    const executeListener = this.program.addEventListener(
      "executeStrategyEvent",
      async (event: any) => {
        console.log("✅ ExecuteStrategyEvent:", event.strategy.toString());
        await this.handleExecuteStrategy(event);
      }
    );
    this.eventListeners.push(executeListener);

    // Listen to CancelStrategyEvent (emitted from withdraw_escrow when cancel_strategy=true)
    const cancelListener = this.program.addEventListener(
      "cancelStrategyEvent",
      async (event: any) => {
        console.log("❌ CancelStrategyEvent:", event.strategy.toString());
        await this.handleCancelStrategy(event);
      }
    );
    this.eventListeners.push(cancelListener);

    // Listen to DepositEscrowEvent
    const depositListener = this.program.addEventListener(
      "depositEscrowEvent",
      async (event: any) => {
        console.log("💰 DepositEscrowEvent:", event.strategy.toString());
        await this.handleDepositEscrow(event);
      }
    );
    this.eventListeners.push(depositListener);

    // Listen to WithdrawEscrowEvent
    const withdrawListener = this.program.addEventListener(
      "withdrawEscrowEvent",
      async (event: any) => {
        console.log("💸 WithdrawEscrowEvent:", event.strategy.toString());
        await this.handleWithdrawEscrow(event);
      }
    );
    this.eventListeners.push(withdrawListener);

    console.log("👂 Listening to program events...");
  }

  private async handleCreateStrategy(event: any) {
    try {
      const strategy: StrategyRow = {
        pubkey: event.strategy.toString(),
        owner: event.owner.toString(),
        strategy_id: event.id?.toNumber() || 0,
        sell_token_mint: event.sellTokenMint.toString(),
        buy_token_mint: event.buyTokenMint.toString(),
        sell_token_decimals: event.sellTokenDecimals,
        buy_token_decimals: event.buyTokenDecimals,
        trigger_price: event.triggerPrice.toString(),
        price_precision: event.pricePrecision,
        take_profit_price: event.takeProfitPrice?.toString() || null,
        stop_loss_price: event.stopLossPrice?.toString() || null,
        sell_amount: event.sellAmount.toString(),
        use_percentage: event.usePercentage,
        is_active: true,
        is_executed: false,
        boomerang_mode: event.boomerangMode,
        created_at: event.createdAt.toNumber(),
        executed_at: null,
        execution_price: null,
        tokens_received: null,
        last_updated: Date.now(),
      };

      await this.supabase.upsertStrategy(strategy);

      // Also create escrow entry
      const escrow: EscrowRow = {
        strategy_pubkey: event.strategy.toString(),
        owner: event.owner.toString(),
        sell_token_mint: event.sellTokenMint.toString(),
        deposited_amount: event.depositAmount.toString(),
        withdrawn_amount: "0",
        last_updated: Date.now(),
      };

      await this.supabase.upsertEscrow(escrow);

      console.log(`💾 Indexed strategy ${event.strategy.toString()}`);
    } catch (error) {
      console.error("Error handling CreateStrategyEvent:", error);
    }
  }

  private async handleExecuteStrategy(event: any) {
    try {
      await this.supabase.markStrategyExecuted(
        event.strategy.toString(),
        event.executionPrice?.toString() || event.execution_price?.toString() || "0",
        event.tokensReceived?.toString() || event.tokens_received?.toString() || "0",
        event.executedAt?.toNumber() || event.executed_at?.toNumber() || Date.now()
      );

      // Update escrow withdrawn amount with tokens_sold from the execution
      // Get current escrow to calculate new withdrawn amount
      const currentEscrow = await this.supabase.getEscrowByStrategyPubkey(event.strategy.toString());
      if (currentEscrow) {
        const currentWithdrawn = BigInt(currentEscrow.withdrawn_amount);
        // Handle both camelCase and snake_case event field names
        const tokensSold = BigInt((event.tokensSold || event.tokens_sold || 0).toString());
        const newWithdrawn = (currentWithdrawn + tokensSold).toString();
        
        await this.supabase.updateEscrowWithdrawn(
          event.strategy.toString(),
          newWithdrawn
        );
      }

      console.log(`💾 Updated executed strategy ${event.strategy.toString()}`);
    } catch (error) {
      console.error("Error handling ExecuteStrategyEvent:", error);
    }
  }

  private async handleCancelStrategy(event: any) {
    try {
      await this.supabase.markStrategyCancelled(event.strategy.toString());
      console.log(`💾 Updated cancelled strategy ${event.strategy.toString()}`);
    } catch (error) {
      console.error("Error handling CancelStrategyEvent:", error);
    }
  }

  private async handleDepositEscrow(event: any) {
    try {
      await this.supabase.updateEscrowDeposited(
        event.strategy.toString(),
        event.newTotalDeposited.toString()
      );
      console.log(`💾 Updated escrow deposit for strategy ${event.strategy.toString()}`);
    } catch (error) {
      console.error("Error handling DepositEscrowEvent:", error);
    }
  }

  private async handleWithdrawEscrow(event: any) {
    try {
      await this.supabase.updateEscrowWithdrawn(
        event.strategy.toString(),
        event.newTotalWithdrawn.toString()
      );
      console.log(`💾 Updated escrow withdrawal for strategy ${event.strategy.toString()}`);
    } catch (error) {
      console.error("Error handling WithdrawEscrowEvent:", error);
    }
  }
}

