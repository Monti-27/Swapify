import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface StrategyRow {
  pubkey: string;
  owner: string;
  strategy_id: number;
  sell_token_mint: string;
  buy_token_mint: string;
  sell_token_decimals: number;
  buy_token_decimals: number;
  trigger_price: string;
  price_precision: number;
  take_profit_price?: string | null;
  stop_loss_price?: string | null;
  sell_amount: string;
  use_percentage: boolean;
  is_active: boolean;
  is_executed: boolean;
  boomerang_mode: boolean;
  created_at: number;
  executed_at?: number | null;
  execution_price?: string | null;
  tokens_received?: string | null;
  last_updated: number;
}

export interface EscrowRow {
  strategy_pubkey: string;
  owner: string;
  sell_token_mint: string;
  deposited_amount: string;
  withdrawn_amount: string;
  last_updated: number;
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async initialize() {
    // Verify connection
    const { data, error } = await this.client.from("strategies").select("count").limit(1);
    if (error && error.code !== "PGRST116") {
      // PGRST116 = table doesn't exist (we'll create it)
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
  }

  async upsertStrategy(strategy: StrategyRow) {
    const { error } = await this.client
      .from("strategies")
      .upsert(strategy, {
        onConflict: "pubkey",
      });

    if (error) {
      console.error("Error upserting strategy:", error);
      throw error;
    }
  }

  async upsertEscrow(escrow: EscrowRow) {
    const { error } = await this.client
      .from("escrows")
      .upsert(escrow, {
        onConflict: "strategy_pubkey",
      });

    if (error) {
      console.error("Error upserting escrow:", error);
      throw error;
    }
  }

  async getActiveStrategies(): Promise<StrategyRow[]> {
    const { data, error } = await this.client
      .from("strategies")
      .select("*")
      .eq("is_active", true)
      .eq("is_executed", false);

    if (error) {
      console.error("Error fetching active strategies:", error);
      return [];
    }

    return data || [];
  }

  async getStrategyByPubkey(pubkey: string): Promise<StrategyRow | null> {
    const { data, error } = await this.client
      .from("strategies")
      .select("*")
      .eq("pubkey", pubkey)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async markStrategyExecuted(
    pubkey: string,
    executionPrice: string,
    tokensReceived: string,
    executedAt: number
  ) {
    const { error } = await this.client
      .from("strategies")
      .update({
        is_executed: true,
        is_active: false,
        execution_price: executionPrice,
        tokens_received: tokensReceived,
        executed_at: executedAt,
        last_updated: Date.now(),
      })
      .eq("pubkey", pubkey);

    if (error) {
      console.error("Error marking strategy executed:", error);
      throw error;
    }
  }

  async markStrategyCancelled(pubkey: string) {
    const { error } = await this.client
      .from("strategies")
      .update({
        is_active: false,
        last_updated: Date.now(),
      })
      .eq("pubkey", pubkey);

    if (error) {
      console.error("Error marking strategy cancelled:", error);
      throw error;
    }
  }

  async updateEscrowDeposited(strategyPubkey: string, newTotalDeposited: string) {
    const { error } = await this.client
      .from("escrows")
      .update({
        deposited_amount: newTotalDeposited,
        last_updated: Date.now(),
      })
      .eq("strategy_pubkey", strategyPubkey);

    if (error) {
      console.error("Error updating escrow deposited amount:", error);
      throw error;
    }
  }

  async updateEscrowWithdrawn(strategyPubkey: string, newTotalWithdrawn: string) {
    const { error } = await this.client
      .from("escrows")
      .update({
        withdrawn_amount: newTotalWithdrawn,
        last_updated: Date.now(),
      })
      .eq("strategy_pubkey", strategyPubkey);

    if (error) {
      console.error("Error updating escrow withdrawn amount:", error);
      throw error;
    }
  }

  async getEscrowByStrategyPubkey(strategyPubkey: string): Promise<EscrowRow | null> {
    const { data, error } = await this.client
      .from("escrows")
      .select("*")
      .eq("strategy_pubkey", strategyPubkey)
      .single();

    if (error) {
      return null;
    }

    return data;
  }
}

