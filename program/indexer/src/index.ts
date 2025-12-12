import "dotenv/config";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
// @ts-ignore - IDL and types from idls directory
import { Weswap } from "../idls/weswap";
import idl from "../idls/weswap.json";
import { IndexerService } from "./services/indexer";
import { SupabaseService } from "./services/supabase";
import { Config } from "./config";

async function main() {
  console.log("🚀 Starting WeSwap Indexer...");

  // Load configuration
  const config = Config.load();

  // Initialize connection
  const connection = new Connection(config.rpcUrl, "confirmed");
  console.log(`📡 Connected to ${config.rpcUrl}`);

  // Initialize Supabase
  const supabase = new SupabaseService(config.supabaseUrl, config.supabaseKey);
  await supabase.initialize();
  console.log("✅ Supabase connected");

  // Initialize Anchor provider and program
  // Note: Indexer doesn't need a keypair for transactions, but Anchor requires one for initialization
  const dummyKeypair = Keypair.generate();
  const wallet = new anchor.Wallet(dummyKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  
  const program = new Program(idl as any, provider) as unknown as Program<Weswap>;

  // Initialize indexer service
  const indexerService = new IndexerService(program, connection, supabase, config);

  // Start indexing
  console.log("👀 Starting event indexing...");
  await indexerService.start();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down indexer...");
    await indexerService.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

