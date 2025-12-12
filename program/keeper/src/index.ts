import "dotenv/config";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import bs58 from "bs58";
// @ts-ignore - IDL and types from idls directory
import { Weswap } from "../../target/types/weswap";
import idl from "../idls/weswap.json";
import { KeeperService } from "./services/keeper";
import { PriceService } from "./services/price";
import { JupiterService } from "./services/jupiter";
import { SupabaseService } from "./services/supabase";
import { Config } from "./config";

async function main() {
  console.log("🚀 Starting WeSwap Keeper Bot...");

  // Load configuration
  const config = Config.load();
  
  // Initialize connection
  const connection = new Connection(config.rpcUrl, "confirmed");
  console.log(`📡 Connected to ${config.rpcUrl}`);

  // Load keeper keypair from private key or file
  let keeperKeypair: Keypair;
  
  if (config.keeperPrivateKey) {
    // Load from base58 private key
    try {
      const privateKeyBytes = bs58.decode(config.keeperPrivateKey);
      keeperKeypair = Keypair.fromSecretKey(privateKeyBytes);
      console.log(`🔑 Keeper (from env): ${keeperKeypair.publicKey.toString()}`);
    } catch (error) {
      console.error("❌ Invalid private key format. Expected base58 encoded string.");
      process.exit(1);
    }
  } else if (config.keeperKeypairPath) {
    // Load from keypair file
    try {
      keeperKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(config.keeperKeypairPath, "utf-8")))
      );
      console.log(`🔑 Keeper (from file): ${keeperKeypair.publicKey.toString()}`);
    } catch (error) {
      console.error(`❌ Failed to load keypair from ${config.keeperKeypairPath}:`, error);
      process.exit(1);
    }
  } else {
    console.error("❌ No keeper credentials provided. Set KEEPER_PRIVATE_KEY or KEEPER_KEYPAIR_PATH");
    process.exit(1);
  }

  // Initialize Anchor provider and program
  const wallet = new Wallet(keeperKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider) as unknown as Program<Weswap>;

  // Initialize services
  const priceService = new PriceService(config.priceApiUrl);
  const jupiterService = new JupiterService(config.jupiterApiUrl);
  const supabase = new SupabaseService(config.supabaseUrl, config.supabaseKey);
  const keeperService = new KeeperService(
    program,
    connection,
    keeperKeypair,
    priceService,
    jupiterService,
    config,
    supabase
  );

  // Start monitoring
  console.log("👀 Starting strategy monitoring...");
  await keeperService.start();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down keeper bot...");
    await keeperService.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

