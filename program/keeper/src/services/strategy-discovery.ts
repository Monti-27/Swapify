import { PublicKey } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
// @ts-ignore - Types are generated outside keeper directory
import { Weswap } from "../../../target/types/weswap";
import { SupabaseService } from "./supabase";

/**
 * Strategy Discovery Service
 * 
 * Queries Supabase database (populated by indexer) to find active strategies.
 */

export interface StrategyInfo {
  pubkey: PublicKey;
  owner: PublicKey;
  id: number;
}

export class StrategyDiscoveryService {
  constructor(
    private program: Program<Weswap>,
    private supabase: SupabaseService
  ) {}

  /**
   * Find all active strategies from Supabase
   */
  async findAllActiveStrategies(): Promise<StrategyInfo[]> {
    try {
      const strategies = await this.supabase.getActiveStrategies();
      
      return strategies.map((s) => ({
        pubkey: new PublicKey(s.pubkey),
        owner: new PublicKey(s.owner),
        id: s.strategy_id,
      }));
    } catch (error) {
      console.error("Error fetching active strategies from Supabase:", error);
      return [];
    }
  }

  /**
   * Find strategies by owner
   */
  async findStrategiesByOwner(owner: PublicKey): Promise<StrategyInfo[]> {
    // Scan for strategy PDAs for a given owner
    // This is inefficient but works for small numbers
    
    const strategies: StrategyInfo[] = [];
    const maxStrategies = 100; // Configurable limit
    
    for (let id = 0; id < maxStrategies; id++) {
      try {
        const [strategyPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("strategy"),
            owner.toBuffer(),
            Buffer.from(new Uint8Array(new BN(id).toArray("le", 8))),
          ],
          this.program.programId
        );

        // Try to fetch the strategy
        const strategy = await this.program.account.strategy.fetch(strategyPDA);
        
        if (strategy.isActive && !strategy.isExecuted) {
          strategies.push({
            pubkey: strategyPDA,
            owner,
            id,
          });
        }
      } catch (error) {
        // Strategy doesn't exist, continue
        continue;
      }
    }

    return strategies;
  }

  /**
   * Listen to CreateStrategy events
   * 
   * This is the most efficient method for real-time discovery
   */
  async listenToStrategyEvents(
    callback: (strategy: StrategyInfo) => void
  ): Promise<void> {
    // Subscribe to program events
    this.program.addEventListener("createStrategyEvent", (event: any) => {
      callback({
        pubkey: event.strategy,
        owner: event.owner,
        id: event.id?.toNumber() || 0,
      });
    });
  }
}


