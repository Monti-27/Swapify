import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface StrategyRow {
  pubkey: string;
  owner: string;
  strategy_id: number;
  sell_token_mint: string;
  buy_token_mint: string;
  trigger_price: string;
  price_precision: number;
  is_active: boolean;
  is_executed: boolean;
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async getActiveStrategies(): Promise<StrategyRow[]> {
    const { data, error } = await this.client
      .from("active_strategies")
      .select("*");

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
}

