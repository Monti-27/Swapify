#!/usr/bin/env ts-node

/**
 * Test script for withdraw_escrow instruction
 * Creates a strategy with small SOL amount, then cancels it
 * Uses very small amounts for mainnet safety
 */

import "dotenv/config";
import { BN } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Keypair, 
  Connection, 
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  NATIVE_MINT,
  getAccount,
  getMint,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { WeswapClient } from "./client";
import { readFileSync } from "fs";

// Token mints
const WSOL_MINT = NATIVE_MINT; // So11111111111111111111111111111111111111112
// USDC on mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
// USDC on devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
const USDC_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function isToken2022(connection: Connection, mintAddress: PublicKey): Promise<boolean> {
  try {
    await getMint(connection, mintAddress);
    const mintAccountInfo = await connection.getAccountInfo(mintAddress);
    if (!mintAccountInfo) {
      return false;
    }
    return mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
  } catch (error) {
    console.error('Error fetching mint info:', error);
    return false;
  }
}

async function ensureTokenAccount(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const is2022 = await isToken2022(connection, mint);
  const tokenProgram = is2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const ata = await getAssociatedTokenAddress(mint, owner, false, tokenProgram);
  
  try {
    await getAccount(connection, ata);
    return ata;
  } catch (error) {
    // Account doesn't exist, create it
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        owner,
        mint,
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    const signature = await connection.sendTransaction(tx, [payer]);
    await connection.confirmTransaction(signature, "confirmed");
    await new Promise(resolve => setTimeout(resolve, 2000));
    return ata;
  }
}

async function wrapSOL(
  connection: Connection,
  payer: Keypair,
  amount: number
): Promise<PublicKey> {
  const wsolATA = await getAssociatedTokenAddress(WSOL_MINT, payer.publicKey, false, TOKEN_PROGRAM_ID);
  
  // Check if WSOL account already exists and has balance
  try {
    const existingAccount = await getAccount(connection, wsolATA);
    const existingBalance = Number(existingAccount.amount) / LAMPORTS_PER_SOL;
    
    if (existingBalance >= amount) {
      console.log(`✅ Using existing WSOL balance: ${existingBalance.toFixed(6)} WSOL`);
      return wsolATA;
    } else {
      const additionalNeeded = amount - existingBalance;
      console.log(`📝 Existing WSOL balance: ${existingBalance.toFixed(6)} WSOL, need ${additionalNeeded.toFixed(6)} more`);
      amount = additionalNeeded;
    }
  } catch (error) {
    // Account doesn't exist, create it
    console.log(`📝 WSOL account doesn't exist, creating...`);
    await ensureTokenAccount(connection, payer, WSOL_MINT, payer.publicKey);
  }
  
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
  if (lamports > 0) {
    console.log(`💸 Wrapping SOL to WSOL:`);
    console.log(`   - Amount: ${lamports} lamports (${amount} SOL)`);
    console.log(`   - WSOL ATA: ${wsolATA.toString()}\n`);
    
    const syncNativeIx = createSyncNativeInstruction(wsolATA, TOKEN_PROGRAM_ID);
    
    const tx = new Transaction()
      .add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: wsolATA,
          lamports,
        }),
        syncNativeIx
      );
    
    const signature = await connection.sendTransaction(tx, [payer]);
    await connection.confirmTransaction(signature, "confirmed");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify balance
    const account = await getAccount(connection, wsolATA);
    const balance = Number(account.amount) / LAMPORTS_PER_SOL;
    console.log(`✅ Wrapped ${amount} SOL to WSOL`);
    console.log(`   - Current WSOL balance: ${balance.toFixed(6)} WSOL\n`);
  }
  
  return wsolATA;
}

async function main() {
  console.log("🧪 Starting withdraw_escrow test...\n");
  console.log("📋 This test will:");
  console.log("   1. Create a strategy with a small amount of SOL (WSOL -> USDC)");
  console.log("   2. Cancel the strategy and verify accounts are closed\n");

  // Parse command line arguments
  const args = process.argv.slice(2);
  let keypairPath: string | undefined;
  let clusterUrl: string | undefined;
  let strategyId: number | undefined;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-u" || args[i] === "--url") {
      clusterUrl = args[i + 1];
      i++;
    } else if (args[i] === "-s" || args[i] === "--strategy") {
      strategyId = parseInt(args[i + 1]);
      i++;
    } else if (!keypairPath && !args[i].startsWith("-")) {
      keypairPath = args[i];
    } else if (!clusterUrl && args[i].startsWith("http")) {
      clusterUrl = args[i];
    }
  }

  // Load configuration
  clusterUrl = clusterUrl || process.env.CLUSTER_URL || "https://api.mainnet-beta.solana.com";
  keypairPath = keypairPath || process.env.KEYPAIR_PATH;
  
  if (!keypairPath) {
    console.error("❌ Please provide keypair path: npm run test-withdraw <keypair-path> [-u <rpc-url>] [-s <strategy-id>]");
    process.exit(1);
  }

  // Use strategy ID 1 for testing (or provided ID)
  if (strategyId === undefined) {
    strategyId = 2;
    console.log(`ℹ️  Using default strategy ID: ${strategyId}`);
    console.log(`   (Use -s <id> to specify a different ID)\n`);
  }

  const admin = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(keypairPath, "utf-8")))
  );

  console.log(`📡 Cluster: ${clusterUrl}`);
  console.log(`👤 Admin: ${admin.publicKey.toString()}`);
  console.log(`📋 Strategy ID: ${strategyId}\n`);

  // Determine USDC mint based on cluster
  const isMainnet = clusterUrl.includes("mainnet");
  const USDC_MINT = isMainnet ? USDC_MAINNET : USDC_DEVNET;
  console.log(`💰 WSOL Mint: ${WSOL_MINT.toString()}`);
  console.log(`💰 USDC Mint: ${USDC_MINT.toString()}\n`);

  // Initialize client
  const client = new WeswapClient(clusterUrl, keypairPath);
  const connection = client.provider.connection;

  // Check if global is initialized
  let global;
  try {
    global = await client.getGlobal();
    console.log("✅ Global state found:");
    console.log(`   - Authority: ${global.authority.toString()}`);
    console.log(`   - Treasury: ${global.treasury.toString()}`);
    console.log(`   - Keepers: ${global.keepers.length}\n`);
  } catch (error) {
    console.error("❌ Global state not initialized. Please run 'init' first.");
    process.exit(1);
  }

  const strategyKey = client.getStrategyKey(admin.publicKey, strategyId);
  const escrowKey = client.getEscrowKey(strategyKey);
  
  // Check if strategy already exists
  let strategy;
  let strategyExists = false;
  try {
    strategy = await client.getStrategy(admin.publicKey, strategyId);
    strategyExists = true;
    console.log(`⚠️  Strategy ID ${strategyId} already exists`);
    console.log(`   - Active: ${strategy.isActive}`);
    console.log(`   - Executed: ${strategy.isExecuted}`);
    
    if (strategy.isExecuted) {
      console.error("❌ Strategy is already executed. Please use a different strategy ID.");
      process.exit(1);
    }
    
    if (!strategy.isActive) {
      console.error("❌ Strategy is not active. Please use a different strategy ID.");
      process.exit(1);
    }
    
    console.log(`   - Will cancel existing strategy\n`);
  } catch (error) {
    console.log(`📋 Strategy ID ${strategyId} does not exist, will create new one\n`);
  }

  // Step 1: Wrap a small amount of SOL to WSOL
  console.log("=".repeat(60));
  console.log("STEP 1: Wrap SOL to WSOL");
  console.log("=".repeat(60));
  
  const depositAmount = 0.01; // 0.01 SOL (very small for mainnet)
  console.log(`💧 Wrapping ${depositAmount} SOL to WSOL...\n`);
  
  const wsolATA = await wrapSOL(connection, admin, depositAmount);
  
  // Verify WSOL balance
  const wsolAccount = await getAccount(connection, wsolATA);
  const wsolBalance = Number(wsolAccount.amount);
  const depositAmountLamports = Math.floor(depositAmount * LAMPORTS_PER_SOL * 0.9); // Use 90% for deposit
  
  console.log(`✅ WSOL ready: ${wsolBalance} lamports (${(wsolBalance / LAMPORTS_PER_SOL).toFixed(6)} WSOL)\n`);
  
  if (wsolBalance < depositAmountLamports) {
    console.error(`❌ Insufficient WSOL balance! Have ${wsolBalance}, need ${depositAmountLamports}`);
    process.exit(1);
  }

  // Step 2: Create strategy (if it doesn't exist)
  if (!strategyExists) {
    console.log("=".repeat(60));
    console.log("STEP 2: Create Strategy (WSOL -> USDC)");
    console.log("=".repeat(60));
    
    const triggerPrice = 1000000; // 1 USDC per WSOL (with 6 decimals precision)
    const pricePrecision = 6;
    const sellAmount = 0; // Use all available
    
    console.log(`📋 Creating strategy:`);
    console.log(`   - Strategy ID: ${strategyId}`);
    console.log(`   - Sell: WSOL`);
    console.log(`   - Buy: USDC`);
    console.log(`   - Trigger Price: ${triggerPrice} (${pricePrecision} decimals)`);
    console.log(`   - Deposit: ${depositAmountLamports} lamports\n`);
    
    try {
      await client.createStrategy(
        {
          id: new BN(strategyId),
          triggerPrice: new BN(triggerPrice),
          pricePrecision,
          takeProfitPrice: null,
          stopLossPrice: null,
          sellAmount: new BN(sellAmount),
          usePercentage: false,
          boomerangMode: false,
          depositAmount: new BN(depositAmountLamports),
        },
        WSOL_MINT,
        USDC_MINT
      );
      console.log("✅ Strategy created successfully!\n");
      
      // Wait a bit for account creation
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error: any) {
      if (error.message?.includes("already in use") || error.message?.includes("already exists")) {
        console.log("⚠️  Strategy already exists, continuing...\n");
      } else {
        console.error("❌ Error creating strategy:", error);
        process.exit(1);
      }
    }
  }

  // Refresh strategy and escrow
  strategy = await client.getStrategy(admin.publicKey, strategyId);
  const escrow = await client.getStrategyEscrow(strategyKey);
  
  console.log("📊 Strategy Details:");
  console.log(`   - Strategy: ${strategyKey.toString()}`);
  console.log(`   - Escrow: ${escrowKey.toString()}`);
  console.log(`   - Active: ${strategy.isActive}`);
  console.log(`   - Executed: ${strategy.isExecuted}`);
  console.log(`   - Deposited: ${escrow.depositedAmount.toString()}`);
  console.log(`   - Withdrawn: ${escrow.withdrawnAmount.toString()}`);
  
  const availableAmount = escrow.depositedAmount.sub(escrow.withdrawnAmount);
  console.log(`   - Available: ${availableAmount.toString()}\n`);

  // Determine token programs
  const sellTokenMint = strategy.sellTokenMint;
  const wsolIs2022 = await isToken2022(connection, WSOL_MINT);
  const sellTokenProgram = wsolIs2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

  // Get owner token account
  const ownerTokenAccount = await getAssociatedTokenAddress(
    sellTokenMint,
    admin.publicKey
  );

  let ownerTokenAccountBalance = new BN(0);
  try {
    const ownerAccount = await getAccount(connection, ownerTokenAccount);
    ownerTokenAccountBalance = new BN(ownerAccount.amount.toString());
    console.log(`👤 Owner Token Account:`);
    console.log(`   - Address: ${ownerTokenAccount.toString()}`);
    console.log(`   - Balance: ${ownerTokenAccountBalance.toString()}\n`);
  } catch (error) {
    console.log(`⚠️  Owner token account doesn't exist yet (will be created)\n`);
  }

  // Step 3: Cancel the strategy
  console.log("=".repeat(60));
  console.log("STEP 3: Cancel Strategy");
  console.log("=".repeat(60));
  
  console.log(`📤 Cancelling strategy...`);
  console.log(`   - Strategy ID: ${strategyId}`);
  console.log(`   - Available to withdraw: ${availableAmount.toString()}\n`);
  
  try {
    const balanceBefore = (await getAccount(connection, ownerTokenAccount)).amount;
    const balanceBeforeBN = new BN(balanceBefore.toString());
    
    await client.withdrawEscrow(
      {
        id: new BN(strategyId),
        amount: new BN(0), // Withdraw all remaining
        cancelStrategy: true,
      },
      sellTokenMint
    );
    
    console.log("✅ Strategy cancellation successful!\n");
    
    // Wait a bit for account updates
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to fetch strategy (should fail if account was closed)
    let strategyStillExists = false;
    try {
      const cancelledStrategy = await client.getStrategy(admin.publicKey, strategyId);
      strategyStillExists = true;
      console.log(`📊 Strategy State (still exists):`);
      console.log(`   - Active: ${cancelledStrategy.isActive}`);
      console.log(`   - Executed: ${cancelledStrategy.isExecuted}`);
    } catch (error) {
      console.log(`✅ Strategy account was closed (rent returned to owner)`);
    }
    
    // Try to fetch escrow (should fail if account was closed)
    let escrowStillExists = false;
    try {
      const cancelledEscrow = await client.getStrategyEscrow(strategyKey);
      escrowStillExists = true;
      console.log(`📊 Escrow State (still exists):`);
      console.log(`   - Deposited: ${cancelledEscrow.depositedAmount.toString()}`);
      console.log(`   - Withdrawn: ${cancelledEscrow.withdrawnAmount.toString()}`);
    } catch (error) {
      console.log(`✅ Escrow account was closed (rent returned to owner)`);
    }
    
    // Check owner balance
    if (availableAmount.gt(new BN(0))) {
      const updatedOwnerAccount = await getAccount(connection, ownerTokenAccount);
      const updatedOwnerBalance = new BN(updatedOwnerAccount.amount.toString());
      const balanceIncrease = updatedOwnerBalance.sub(balanceBeforeBN);
      
      console.log(`\n💰 Owner Balance:`);
      console.log(`   - Before: ${balanceBeforeBN.toString()}`);
      console.log(`   - After: ${updatedOwnerBalance.toString()}`);
      console.log(`   - Increase: ${balanceIncrease.toString()}`);
      console.log(`   - Expected: ${availableAmount.toString()}`);
      
      if (!balanceIncrease.eq(availableAmount)) {
        console.error("⚠️  Balance increase doesn't match available amount!");
      } else {
        console.log(`✅ Balance increase matches expected amount!`);
      }
    }
    
    if (!strategyStillExists && !escrowStillExists) {
      console.log(`\n✅ Both accounts were properly closed!`);
    } else {
      console.log(`\n⚠️  Accounts may still exist (check if they were closed)`);
    }
    
    console.log();
  } catch (error: any) {
    console.error("❌ Strategy cancellation failed:", error.message || error);
    if (error.logs) {
      console.error("Transaction logs:");
      error.logs.forEach((log: string) => console.error(`  ${log}`));
    }
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("🎉 Test completed successfully!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

