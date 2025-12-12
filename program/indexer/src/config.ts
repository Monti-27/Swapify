import * as fs from "fs";
import * as path from "path";

export interface Config {
  rpcUrl: string;
  programId: string;
  supabaseUrl: string;
  supabaseKey: string;
  startSlot?: number;
  pollIntervalMs: number;
}

export class Config {
  static load(): Config {
    const configPath = process.env.CONFIG_PATH || path.join(__dirname, "../config.json");

    let config: Partial<Config> = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }

    return {
      rpcUrl: process.env.RPC_URL || config.rpcUrl || "https://api.mainnet-beta.solana.com",
      programId: process.env.PROGRAM_ID || config.programId || "AFhpyoVmDCEVofP3sqj8wCPSFYYGpL83sbXKuwMZtcoQ",
      supabaseUrl: process.env.SUPABASE_URL || config.supabaseUrl || "",
      supabaseKey: process.env.SUPABASE_KEY || config.supabaseKey || "",
      startSlot: config.startSlot,
      pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || config.pollIntervalMs?.toString() || "2000"),
    };
  }
}

