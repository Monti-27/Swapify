import * as fs from "fs";
import * as path from "path";

export interface Config {
  rpcUrl: string;
  keeperPrivateKey?: string;
  keeperKeypairPath?: string;
  programId: string;
  globalStatePDA: string;
  transferAuthorityPDA: string;
  jupiterProgramId: string;
  priceApiUrl: string;
  jupiterApiUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
  pollIntervalMs: number;
  maxStrategiesPerPoll: number;
  minExecutionAmount: number;
  slippageBps: number;
}

export class Config {
  static load(): Config {
    // Load from environment or config file
    const configPath = process.env.CONFIG_PATH || path.join(__dirname, "../config.json");
    
    let config: Partial<Config> = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }

    return {
      rpcUrl: process.env.RPC_URL || config.rpcUrl || "https://api.mainnet-beta.solana.com",
      keeperPrivateKey: process.env.KEEPER_PRIVATE_KEY || config.keeperPrivateKey,
      keeperKeypairPath: process.env.KEEPER_KEYPAIR_PATH || config.keeperKeypairPath || "./keeper-keypair.json",
      programId: process.env.PROGRAM_ID || config.programId || "AFhpyoVmDCEVofP3sqj8wCPSFYYGpL83sbXKuwMZtcoQ",
      globalStatePDA: config.globalStatePDA || "", // Will be derived
      transferAuthorityPDA: config.transferAuthorityPDA || "", // Will be derived
      jupiterProgramId: process.env.JUPITER_PROGRAM_ID || config.jupiterProgramId || "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
      priceApiUrl: process.env.PRICE_API_URL || config.priceApiUrl || "https://api.jup.ag",
      jupiterApiUrl: process.env.JUPITER_API_URL || config.jupiterApiUrl || "https://quote-api.jup.ag/v6",
      supabaseUrl: process.env.SUPABASE_URL || config.supabaseUrl || "",
      supabaseKey: process.env.SUPABASE_KEY || config.supabaseKey || "",
      pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || config.pollIntervalMs?.toString() || "10000"),
      maxStrategiesPerPoll: parseInt(process.env.MAX_STRATEGIES_PER_POLL || config.maxStrategiesPerPoll?.toString() || "50"),
      minExecutionAmount: parseInt(process.env.MIN_EXECUTION_AMOUNT || config.minExecutionAmount?.toString() || "1000"),
      slippageBps: parseInt(process.env.SLIPPAGE_BPS || config.slippageBps?.toString() || "50"),
    };
  }

  static createDefault(): Config {
    return {
      rpcUrl: "https://api.mainnet-beta.solana.com",
      keeperKeypairPath: "./keeper-keypair.json",
      programId: "AFhpyoVmDCEVofP3sqj8wCPSFYYGpL83sbXKuwMZtcoQ",
      globalStatePDA: "",
      transferAuthorityPDA: "",
      jupiterProgramId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
      priceApiUrl: "https://api.jup.ag",
      jupiterApiUrl: "https://quote-api.jup.ag/v6",
      supabaseUrl: "",
      supabaseKey: "",
      pollIntervalMs: 10000,
      maxStrategiesPerPoll: 50,
      minExecutionAmount: 1000,
      slippageBps: 50,
    };
  }
}

