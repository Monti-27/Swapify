#!/usr/bin/env ts-node

/**
 * Test script for execute_strategy instruction
 * Tests the full flow: Initialize -> Create Strategy -> Execute Strategy
 * Uses WSOL and USDC for easy testing
 */

import "dotenv/config";
import { BN } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Keypair, 
  Connection, 
  LAMPORTS_PER_SOL,
  Transaction,
  VersionedTransaction,
  ComputeBudgetProgram,
  AddressLookupTableAccount,
  TransactionMessage,
} from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  NATIVE_MINT,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createSyncNativeInstruction,
  getMint,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeAccountInstruction,
  getMint as getMintInfo
} from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import axios from "axios";
import { WeswapClient } from "./client";
import { readFileSync } from "fs";
import * as path from "path";

// Token mints
const WSOL_MINT = NATIVE_MINT; // So11111111111111111111111111111111111111112
// USDC on mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
// USDC on devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
const USDC_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// Jupiter API - Legacy Swap API endpoints
const JUPITER_API_URL = "https://api.jup.ag/swap/v1";
const JUPITER_PROGRAM_ID = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: any[];
  platformFee?: {
    amount: string;
    feeBps: number;
  };
}

interface JupiterSwapInstruction {
  data: string; // Base64 encoded
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  setupInstructions?: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
  cleanupInstruction?: {
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  };
  addressLookupTableAddresses?: string[]; // Address Lookup Table addresses for versioned transactions
}

async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = 50,
  platformFeeBps?: number
): Promise<JupiterQuote | null> {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    // Add API key if provided (optional but recommended)
    const apiKey = process.env.JUPITER_API_KEY;
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const params: any = {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      restrictIntermediateTokens: true, // Better route stability
    };
    
    // Add platformFeeBps if provided (for Jupiter's built-in fee handling)
    if (platformFeeBps !== undefined) {
      params.platformFeeBps = platformFeeBps;
    }
    
    const response = await axios.get(`${JUPITER_API_URL}/quote`, {
      params,
      headers,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error getting Jupiter quote:", error);
    if (axios.isAxiosError(error)) {
      console.error("Response:", error.response?.data);
      if (error.response?.status === 401) {
        console.error("💡 Tip: Jupiter API may require an API key. Set JUPITER_API_KEY environment variable.");
      }
    }
    return null;
  }
}

async function getJupiterSwapInstruction(
  userPublicKey: string,
  quote: JupiterQuote,
  destinationTokenAccount?: string,
  feeAccount?: string
): Promise<JupiterSwapInstruction | null> {
  try {
    const requestBody: any = {
      userPublicKey,
      quoteResponse: quote,
      asLegacyTransaction: false,
      wrapAndUnwrapSol: false, // Set to false for CPI - we handle WSOL separately
      dynamicComputeUnitLimit: true,
      skipUserAccountsRpcCalls: true, // Critical for CPI - skip RPC calls
      dynamicSlippage: {
        minBps: 50,
        maxBps: 1000,
      }, // Match Jupiter's example exactly
    };

    if (destinationTokenAccount) {
      requestBody.destinationTokenAccount = destinationTokenAccount;
    }
    
    // Add feeAccount if provided (required when platformFeeBps is set in quote)
    if (feeAccount) {
      requestBody.feeAccount = feeAccount;
    }

    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    // Add API key if provided (optional but recommended)
    const apiKey = process.env.JUPITER_API_KEY;
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await axios.post(
      `${JUPITER_API_URL}/swap-instructions`,
      requestBody,
      { headers }
    );

    const swapInstructions = response.data;

    return {
      data: swapInstructions.swapInstruction.data,
      accounts: swapInstructions.swapInstruction.accounts,
      setupInstructions: swapInstructions.setupInstructions,
      cleanupInstruction: swapInstructions.cleanupInstruction,
      addressLookupTableAddresses: swapInstructions.addressLookupTableAddresses || [],
    };
  } catch (error) {
    console.error("❌ Error getting Jupiter swap instruction:", error);
    if (axios.isAxiosError(error)) {
      console.error("Response:", error.response?.data);
    }
    return null;
  }
}

async function isToken2022(connection: Connection, mintAddress: PublicKey): Promise<boolean> {
  try {
    // First verify the mint exists by trying to get it
    await getMint(connection, mintAddress);
    // Then check the account owner
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
  // Determine which token program to use based on mint's owner
  console.log(`🔍 Checking mint: ${mint.toString()}`);
  
  const is2022 = await isToken2022(connection, mint);
  const tokenProgram = is2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  
  console.log(`   - Is Token 2022: ${is2022}`);
  console.log(`   - Selected Token Program: ${tokenProgram.toString()}\n`);
  
  // Get ATA address using the correct token program
  const ata = await getAssociatedTokenAddress(mint, owner, false, tokenProgram);
  console.log(`   - ATA Address: ${ata.toString()}\n`);
  
  try {
    const account = await getAccount(connection, ata);
    console.log(`✅ Token account already exists: ${ata.toString()}`);
    console.log(`   - Account Owner: ${account.mint.toString()}`);
    console.log(`   - Balance: ${account.amount.toString()}\n`);
    return ata;
  } catch (error) {
    // Account doesn't exist, create it
    console.log(`📝 Creating token account for ${mint.toString()}...`);
    console.log(`   - Using Token Program: ${tokenProgram.toString()}`);
    console.log(`   - ATA: ${ata.toString()}`);
    
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
    
    console.log(`   - Transaction has ${tx.instructions.length} instruction(s)`);
    console.log(`   - Instruction 0 Program ID: ${tx.instructions[0].programId.toString()}\n`);
    
    const signature = await connection.sendTransaction(tx, [payer]);
    console.log(`   - Transaction sent: ${signature}`);
    
    // Wait for confirmation with longer timeout
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    console.log(`   - Transaction confirmed`);
    
    // Wait longer for account to be fully synced across RPC nodes
    console.log(`   - Waiting for account sync across RPC nodes...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify the account was created correctly with more retries and longer waits
    let retries = 10;
    let createdAccount: any = null;
    let createdAccountInfo: any = null;
    while (retries > 0) {
      try {
        // Try to get account info first (faster check)
        createdAccountInfo = await connection.getAccountInfo(ata);
        if (createdAccountInfo) {
          // Account exists, now try to deserialize as token account
          createdAccount = await getAccount(connection, ata);
          break;
        }
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          // Last attempt - check if account actually exists on-chain
          const finalCheck = await connection.getAccountInfo(ata);
          if (finalCheck) {
            console.log(`   - Account exists but may not be fully initialized yet`);
            console.log(`   - Account owner: ${finalCheck.owner.toString()}`);
            console.log(`   - Account data length: ${finalCheck.data.length} bytes`);
            // Return anyway - the account exists, it might just need more time
            return ata;
          }
          throw new Error(`Failed to verify token account after creation: ${error.message || error}`);
        }
        console.log(`   - Account not ready yet, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    if (!createdAccount || !createdAccountInfo) {
      // Final fallback - check if account exists at all
      const finalCheck = await connection.getAccountInfo(ata);
      if (finalCheck) {
        console.log(`   ⚠️  Account exists but couldn't deserialize as token account`);
        console.log(`   - Account owner: ${finalCheck.owner.toString()}`);
        console.log(`   - Account data length: ${finalCheck.data.length} bytes`);
        return ata; // Return anyway - it exists
      }
      throw new Error("Failed to verify token account after creation");
    }
    
    console.log(`✅ Token account created: ${ata.toString()}`);
    console.log(`   - Account Owner (program): ${createdAccountInfo.owner.toString()}`);
    console.log(`   - Account Data Length: ${createdAccountInfo.data.length} bytes`);
    console.log(`   - Token Account Mint: ${createdAccount.mint.toString()}`);
    console.log(`   - Token Account Owner: ${createdAccount.owner.toString()}\n`);
    
    return ata;
  }
}

async function wrapSOL(
  connection: Connection,
  payer: Keypair,
  amount: number
): Promise<PublicKey> {
  // WSOL always uses the standard Token Program
  const wsolATA = await getAssociatedTokenAddress(WSOL_MINT, payer.publicKey, false, TOKEN_PROGRAM_ID);
  
  // Check if WSOL account already exists and has balance
  try {
    const existingAccount = await getAccount(connection, wsolATA);
    const existingBalance = Number(existingAccount.amount) / LAMPORTS_PER_SOL;
    const neededAmount = amount;
    
    if (existingBalance >= neededAmount) {
      console.log(`✅ Using existing WSOL balance: ${existingBalance.toFixed(6)} WSOL`);
      return wsolATA;
    } else {
      const additionalNeeded = neededAmount - existingBalance;
      console.log(`📝 Existing WSOL balance: ${existingBalance.toFixed(6)} WSOL, need ${additionalNeeded.toFixed(6)} more`);
      amount = additionalNeeded;
    }
  } catch (error) {
    // Account doesn't exist, create it
    console.log(`📝 WSOL account doesn't exist, creating...`);
    await ensureTokenAccount(connection, payer, WSOL_MINT, payer.publicKey);
  }
  
  // Transfer SOL to WSOL account (for native mint, we transfer SOL directly)
  // WSOL always uses the standard Token Program
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
  if (lamports > 0) {
    console.log(`💸 Wrapping SOL to WSOL:`);
    console.log(`   - Amount: ${lamports} lamports (${amount} SOL)`);
    console.log(`   - WSOL ATA: ${wsolATA.toString()}`);
    console.log(`   - Using Token Program: ${TOKEN_PROGRAM_ID.toString()}`);
    
    // Verify the account exists and check its owner
    try {
      const accountInfo = await connection.getAccountInfo(wsolATA);
      if (accountInfo) {
        console.log(`   - Account exists, owner: ${accountInfo.owner.toString()}`);
        console.log(`   - Account data length: ${accountInfo.data.length} bytes`);
      }
    } catch (error) {
      console.log(`   - ⚠️  Could not fetch account info: ${error}`);
    }
    
    const syncNativeIx = createSyncNativeInstruction(wsolATA, TOKEN_PROGRAM_ID);
    console.log(`   - SyncNative instruction program: ${syncNativeIx.programId.toString()}`);
    console.log(`   - SyncNative instruction accounts: ${syncNativeIx.keys.length}\n`);
    
    const tx = new Transaction()
      .add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: wsolATA,
          lamports,
        }),
        syncNativeIx
      );
    
    console.log(`   - Transaction has ${tx.instructions.length} instruction(s)`);
    for (let i = 0; i < tx.instructions.length; i++) {
      console.log(`     Instruction ${i}: ${tx.instructions[i].programId.toString()}`);
    }
    console.log();
    
    const signature = await connection.sendTransaction(tx, [payer]);
    console.log(`   - Transaction sent: ${signature}`);
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    if (confirmation.value.err) {
      throw new Error(`Wrap transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    console.log(`   - Transaction confirmed`);
    
    // Wait a bit for balance to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify balance was updated
    let retries = 5;
    while (retries > 0) {
      try {
        const account = await getAccount(connection, wsolATA);
        const balance = Number(account.amount) / LAMPORTS_PER_SOL;
        console.log(`✅ Wrapped ${amount} SOL to WSOL`);
        console.log(`   - Signature: ${signature}`);
        console.log(`   - Current WSOL balance: ${balance.toFixed(6)} WSOL\n`);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.log(`⚠️  Could not verify WSOL balance, but transaction was confirmed`);
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }
  
  return wsolATA;
}

async function main() {
  console.log("🧪 Starting execute_strategy test...\n");

  // Parse command line arguments
  const args = process.argv.slice(2);
  let keypairPath: string | undefined;
  let clusterUrl: string | undefined;
  
  // Parse arguments (support both -u flag and positional)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-u" || args[i] === "--url") {
      clusterUrl = args[i + 1];
      i++; // Skip next arg
    } else if (!keypairPath && !args[i].startsWith("-")) {
      keypairPath = args[i];
    } else if (!clusterUrl && args[i].startsWith("http")) {
      // If it looks like a URL and we don't have one yet, use it
      clusterUrl = args[i];
    }
  }

  // Load configuration
  clusterUrl = clusterUrl || process.env.CLUSTER_URL || "https://api.mainnet-beta.solana.com";
  keypairPath = keypairPath || process.env.KEYPAIR_PATH;
  
  if (!keypairPath) {
    console.error("❌ Please provide keypair path: npm run test-execute <keypair-path> [-u <rpc-url>]");
    process.exit(1);
  }

  const admin = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(keypairPath, "utf-8")))
  );

  console.log(`📡 Cluster: ${clusterUrl}`);
  console.log(`👤 Admin: ${admin.publicKey.toString()}\n`);

  // Determine USDC mint based on cluster
  const isMainnet = clusterUrl.includes("mainnet");
  const USDC_MINT = isMainnet ? USDC_MAINNET : USDC_DEVNET;
  console.log(`💰 WSOL Mint: ${WSOL_MINT.toString()}`);
  console.log(`💰 USDC Mint: ${USDC_MINT.toString()}\n`);

  // Initialize client first to use its connection
  const client = new WeswapClient(clusterUrl, keypairPath);
  const connection = client.provider.connection; // Use client's connection for consistency

  // Check if global is initialized
  let global;
  try {
    global = await client.getGlobal();
    console.log("✅ Global state found:");
    console.log(`   - Authority: ${global.authority.toString()}`);
    console.log(`   - Treasury: ${global.treasury.toString()}`);
    console.log(`   - Keepers: ${global.keepers.length}`);
    console.log(`   - Platform Fee BPS: ${global.platformFeeBps.toString()}\n`);
  } catch (error) {
    console.error("❌ Global state not initialized. Please run 'init' first.");
    process.exit(1);
  }

  // Check if admin is a keeper
  const isKeeper = global.keepers.some(
    (k: PublicKey) => k.toString() === admin.publicKey.toString()
  );
  if (!isKeeper) {
    console.error("❌ Admin is not a keeper. Please add admin as keeper first.");
    process.exit(1);
  }

  // Use strategy ID 1 (next strategy after ID 0)
  const strategyId = 1;
  let strategyExists = false;
  let existingStrategy;
  let existingEscrow;
  let existingEscrowKey;
  let existingStrategyKey;
  
  // Check if strategy ID 1 already exists
  try {
    existingStrategyKey = client.getStrategyKey(admin.publicKey, strategyId);
    existingEscrowKey = client.getEscrowKey(existingStrategyKey);
    existingStrategy = await client.getStrategy(admin.publicKey, strategyId);
    existingEscrow = await client.getStrategyEscrow(existingStrategyKey);
    
    if (existingStrategy) {
      strategyExists = true;
      console.log(`\n✅ Found existing strategy (ID: ${strategyId})`);
      console.log(`   - Strategy: ${existingStrategyKey.toString()}`);
      console.log(`   - Escrow: ${existingEscrowKey.toString()}`);
      console.log(`   - Active: ${existingStrategy.isActive}`);
      console.log(`   - Executed: ${existingStrategy.isExecuted}`);
      console.log(`   - Escrow Deposited: ${existingEscrow.depositedAmount.toString()}`);
      console.log(`   - Escrow Withdrawn: ${existingEscrow.withdrawnAmount.toString()}`);
      console.log(`   - Escrow Available: ${existingEscrow.depositedAmount.sub(existingEscrow.withdrawnAmount).toString()}\n`);
    }
  } catch (error) {
    // Strategy doesn't exist, will create new one
    console.log(`\n📋 Strategy ID ${strategyId} does not exist, will create new one\n`);
  }

  // Only wrap SOL if we need to create a new strategy or if escrow is empty
  const depositAmount = 0.05; // 0.05 SOL
  const depositAmountLamports = Math.floor(depositAmount * LAMPORTS_PER_SOL * 0.9); // Use 90% for deposit
  
  // Get the expected WSOL ATA address (WSOL always uses standard Token Program)
  const expectedWSOLATA = await getAssociatedTokenAddress(WSOL_MINT, admin.publicKey, false, TOKEN_PROGRAM_ID);
  console.log(`💧 Checking/Preparing WSOL...`);
  console.log(`   WSOL ATA: ${expectedWSOLATA.toString()}`);
  
  // Only wrap SOL if strategy doesn't exist or escrow needs funds
  let wsolATA;
  if (!strategyExists || !existingEscrow) {
    // Wrap SOL to WSOL for new strategy
    wsolATA = await wrapSOL(connection, admin, depositAmount);
  } else {
    // Check escrow balance - only wrap if needed
    const escrowAvailable = existingEscrow.depositedAmount.sub(existingEscrow.withdrawnAmount);
    if (escrowAvailable.lte(new BN(0))) {
      console.log(`⚠️  Escrow is empty, wrapping SOL to fund it...`);
      wsolATA = await wrapSOL(connection, admin, depositAmount);
    } else {
      console.log(`✅ Escrow already has funds (${escrowAvailable.toString()} lamports), skipping WSOL wrapping`);
      wsolATA = expectedWSOLATA; // Use existing WSOL ATA
    }
  }
  
  if (!wsolATA.equals(expectedWSOLATA)) {
    console.error(`❌ WSOL ATA mismatch! Expected: ${expectedWSOLATA.toString()}, Got: ${wsolATA.toString()}`);
    process.exit(1);
  }
  
  // Only verify WSOL account if we just wrapped SOL (not if we skipped wrapping)
  if (!strategyExists || !existingEscrow || existingEscrow.depositedAmount.sub(existingEscrow.withdrawnAmount).lte(new BN(0))) {
    // Wait and verify account with retries - ensure it's fully synced
    let retries = 10;
    let wsolAccount;
    while (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        wsolAccount = await getAccount(connection, wsolATA);
        const wsolBalance = Number(wsolAccount.amount) / LAMPORTS_PER_SOL;
        console.log(`✅ WSOL account verified: ${wsolBalance.toFixed(6)} WSOL`);
        
        if (wsolAccount.amount === BigInt(0)) {
          console.error("❌ WSOL account has no balance!");
          process.exit(1);
        }
        
        // Double-check the account is properly initialized by checking its state
        const accountInfo = await connection.getAccountInfo(wsolATA);
        if (!accountInfo) {
          throw new Error("Account info not found");
        }
        
        console.log(`   Account owner: ${accountInfo.owner.toString()}`);
        console.log(`   Account data length: ${accountInfo.data.length} bytes\n`);
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("❌ WSOL account not found after retries:", error);
          process.exit(1);
        }
        console.log(`⚠️  WSOL account not ready, retrying... (${retries} attempts left)`);
      }
    }
    
    // Extra wait to ensure RPC has fully synced
    console.log("⏳ Waiting for account to fully sync...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Final verification that the account is accessible via the client's connection
    console.log("🔍 Verifying account via client connection...");
    try {
      const finalCheck = await getAccount(client.provider.connection, wsolATA);
      console.log(`✅ Account verified via client: ${finalCheck.amount.toString()} lamports\n`);
    } catch (error) {
      console.error("❌ Account not accessible via client connection:", error);
      console.log("⏳ Waiting additional 5 seconds for RPC sync...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } else {
    console.log(`✅ Skipping WSOL verification (using existing escrow funds)\n`);
  }

  // Create strategy: WSOL -> USDC (only if it doesn't exist)
  const triggerPrice = 1000000; // 1 USDC per WSOL (with 6 decimals precision)
  const pricePrecision = 6;
  const sellAmount = 0; // Use all available

  // Only create strategy if it doesn't exist
  if (!strategyExists) {
    // Verify WSOL balance before creating strategy
    console.log(`\n🔍 Verifying WSOL balance before creating strategy...`);
    const wsolAccount = await getAccount(connection, wsolATA);
    const wsolBalance = Number(wsolAccount.amount);
    console.log(`   - WSOL Balance: ${wsolBalance} lamports (${(wsolBalance / LAMPORTS_PER_SOL).toFixed(6)} WSOL)`);
    console.log(`   - Required: ${depositAmountLamports} lamports (${(depositAmountLamports / LAMPORTS_PER_SOL).toFixed(6)} WSOL)`);
    
    if (wsolBalance < depositAmountLamports) {
      console.error(`❌ Insufficient WSOL balance! Have ${wsolBalance}, need ${depositAmountLamports}`);
      console.error(`   Please ensure you have enough WSOL in your account before creating a strategy.`);
      process.exit(1);
    }
    console.log(`✅ Sufficient WSOL balance\n`);

    console.log(`\n📋 Creating strategy:`);
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
    } catch (error: any) {
      if (error.message?.includes("already in use") || error.message?.includes("already exists")) {
        console.log("⚠️  Strategy already exists, continuing...\n");
      } else {
        console.error("❌ Error creating strategy:", error);
        process.exit(1);
      }
    }
  }

  // Wait a bit if we just created the strategy
  if (!strategyExists) {
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Get strategy and escrow (use existing if we already fetched them)
  const strategy = existingStrategy || await client.getStrategy(admin.publicKey, strategyId);
  const strategyKey = existingStrategyKey || client.getStrategyKey(admin.publicKey, strategyId);
  const escrowKey = existingEscrowKey || client.getEscrowKey(strategyKey);
  const escrow = existingEscrow || await client.getStrategyEscrow(strategyKey);
  
  console.log("📊 Strategy Details:");
  console.log(`   - Strategy: ${strategyKey.toString()}`);
  console.log(`   - Escrow: ${escrowKey.toString()}`);
  console.log(`   - Deposited: ${escrow.depositedAmount.toString()}`);
  console.log(`   - Withdrawn: ${escrow.withdrawnAmount.toString()}`);
  console.log(`   - Available: ${escrow.depositedAmount.sub(escrow.withdrawnAmount).toString()}\n`);

  // Get escrow token account (now an ATA owned by escrow PDA, per-strategy)
  // Determine which token program WSOL uses (always TOKEN_PROGRAM_ID)
  const wsolIs2022Check = await isToken2022(connection, WSOL_MINT);
  const sellTokenProgramForEscrow = wsolIs2022Check ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const escrowTokenAccountKey = await client.getEscrowTokenAccountKey(strategyKey, WSOL_MINT, sellTokenProgramForEscrow);
  const escrowTokenAccount = await getAccount(connection, escrowTokenAccountKey);
  const availableAmount = escrowTokenAccount.amount.toString();

  console.log(`💰 Escrow Token Account Balance: ${availableAmount} lamports\n`);

  if (availableAmount === "0") {
    console.error("❌ Escrow has no funds!");
    process.exit(1);
  }

  // Get treasury token account first (needed for fee account)
  // Determine which token program USDC uses
  const usdcIs2022 = await isToken2022(connection, USDC_MINT);
  const usdcTokenProgram = usdcIs2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const treasuryATA = await getAssociatedTokenAddress(USDC_MINT, global.treasury, false, usdcTokenProgram);
  
  // Ensure treasury token account exists (needed for Jupiter fee collection)
  console.log(`🔍 Ensuring treasury token account exists...`);
  console.log(`   - Treasury: ${global.treasury.toString()}`);
  console.log(`   - Mint: ${USDC_MINT.toString()}`);
  console.log(`   - Treasury ATA: ${treasuryATA.toString()}\n`);
  
  try {
    const treasuryAccount = await getAccount(connection, treasuryATA);
    console.log(`✅ Treasury token account already exists: ${treasuryATA.toString()}`);
    console.log(`   - Balance: ${treasuryAccount.amount.toString()}\n`);
  } catch (error) {
    // Treasury token account doesn't exist, create it
    console.log(`📝 Creating treasury token account...`);
    try {
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          admin.publicKey, // Payer
          treasuryATA,
          global.treasury, // Owner (treasury)
          USDC_MINT,
          usdcTokenProgram,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      
      const signature = await connection.sendTransaction(tx, [admin]);
      console.log(`   - Transaction sent: ${signature}`);
      
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`   - Transaction confirmed`);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const treasuryAccount = await getAccount(connection, treasuryATA);
      console.log(`✅ Treasury token account created: ${treasuryATA.toString()}`);
      console.log(`   - Balance: ${treasuryAccount.amount.toString()}\n`);
    } catch (createError: any) {
      console.error(`❌ Failed to create treasury token account: ${createError.message}`);
      throw createError;
    }
  }

  // Get Jupiter quote with platformFeeBps
  const platformFeeBps = typeof global.platformFeeBps === 'number' 
    ? global.platformFeeBps 
    : (global.platformFeeBps as any).toNumber();
  console.log("🔍 Getting Jupiter quote...");
  console.log(`   - Platform Fee BPS: ${platformFeeBps}`);
  const quote = await getJupiterQuote(
    WSOL_MINT.toString(),
    USDC_MINT.toString(),
    availableAmount,
    50, // 0.5% slippage
    platformFeeBps // Pass platform fee to Jupiter
  );

  if (!quote) {
    console.error("❌ Could not get Jupiter quote");
    process.exit(1);
  }

  console.log(`✅ Quote received:`);
  console.log(`   - Input: ${quote.inAmount}`);
  console.log(`   - Output: ${quote.outAmount}`);
  console.log(`   - Price Impact: ${quote.priceImpactPct}%`);
  if (quote.platformFee) {
    console.log(`   - Platform Fee: ${quote.platformFee.amount} (${quote.platformFee.feeBps} bps)`);
  }
  console.log();

  // Get owner receive token account (USDC)
  // Ensure it exists before getting Jupiter instruction
  const ownerReceiveATA = await ensureTokenAccount(
    connection,
    admin,
    USDC_MINT,
    admin.publicKey
  );

  console.log(`✅ Owner receive ATA: ${ownerReceiveATA.toString()}\n`);

  // Get escrow PDA (now the authority of escrow token account)
  const escrowPDA = escrowKey;
  
  // Get Jupiter swap instruction
  // Pass escrow PDA as userPublicKey (like Jupiter example passes vault PDA)
  // Jupiter will find the ATA owned by escrow PDA and include escrow PDA in its accounts
  console.log("🔍 Getting Jupiter swap instruction...");
  console.log(`   - Using escrow PDA as userPublicKey: ${escrowPDA.toString()}`);
  console.log(`   - Escrow token account (ATA): ${escrowTokenAccountKey.toString()}`);
  console.log(`   - Fee account (treasury): ${treasuryATA.toString()}`);
  const swapInstruction = await getJupiterSwapInstruction(
    escrowPDA.toString(), // Pass escrow PDA (like Jupiter example passes vault PDA)
    quote,
    ownerReceiveATA.toString(),
    treasuryATA.toString() // Pass treasury token account for fee collection
  );

  if (!swapInstruction) {
    console.error("❌ Could not get Jupiter swap instruction");
    process.exit(1);
  }

  console.log(`✅ Swap instruction received (${swapInstruction.accounts.length} accounts)\n`);
  const [escrowPDACheck, escrowBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), strategyKey.toBuffer()],
    client.program.programId
  );
  
  if (!escrowPDA.equals(escrowPDACheck)) {
    console.error("❌ Escrow PDA mismatch");
    process.exit(1);
  }
  
  // Determine which token program the sell_token_mint (WSOL) uses
  const wsolIs2022 = await isToken2022(connection, WSOL_MINT);
  const sellTokenProgram = wsolIs2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  
  // Determine which token program the buy_token_mint (USDC) uses
  const buyTokenProgram = usdcTokenProgram; // Same as above
  
  console.log(`🔍 Sell token program: ${sellTokenProgram.toString()}`);
  console.log(`🔍 Buy token program: ${buyTokenProgram.toString()}\n`);
  
  // Get current price (simplified - in production use price service)
  // Price = (outAmount / 10^buyDecimals) / (inAmount / 10^sellDecimals) * 10^pricePrecision
  // This gives us: price in buy_token per sell_token, scaled by pricePrecision
  // WSOL has 9 decimals, USDC has 6 decimals
  // We need to normalize both to their full token values, then scale by pricePrecision
  const sellTokenDecimals = typeof strategy.sellTokenDecimals === 'number' 
    ? strategy.sellTokenDecimals 
    : (strategy.sellTokenDecimals as any).toNumber(); // WSOL = 9
  const buyTokenDecimals = typeof strategy.buyTokenDecimals === 'number'
    ? strategy.buyTokenDecimals
    : (strategy.buyTokenDecimals as any).toNumber(); // USDC = 6
  
  // Calculate price: (outAmount / 10^buyDecimals) / (inAmount / 10^sellDecimals) * 10^pricePrecision
  // Simplified: (outAmount * 10^pricePrecision * 10^sellDecimals) / (inAmount * 10^buyDecimals)
  const currentPriceBN = new BN(quote.outAmount)
    .mul(new BN(10).pow(new BN(pricePrecision + sellTokenDecimals)))
    .div(new BN(quote.inAmount))
    .div(new BN(10).pow(new BN(buyTokenDecimals)));

  console.log(`💱 Calculated current price: ${currentPriceBN.toString()} (${pricePrecision} decimals)`);
  console.log(`   - Input: ${quote.inAmount.toString()} (${sellTokenDecimals} decimals)`);
  console.log(`   - Output: ${quote.outAmount.toString()} (${buyTokenDecimals} decimals)`);
  console.log(`   - Trigger Price: ${strategy.triggerPrice.toString()} (${pricePrecision} decimals)`);
  console.log(`   - Price: ${currentPriceBN.toString()} (${pricePrecision} decimals precision)\n`);

  // Prepare execute strategy params
  // Jupiter accounts are passed via remainingAccounts, not in params
  const jupiterInstructionData = Buffer.from(swapInstruction.data, "base64");

  console.log(`📦 Jupiter instruction data length: ${jupiterInstructionData.length} bytes`);
  console.log(`📦 Jupiter accounts count: ${swapInstruction.accounts.length}\n`);

  // Execute params - accounts are passed via remainingAccounts
  // Jupiter instruction data is passed as a separate parameter (following Jupiter CPI example pattern)
  const executeParams = {
    strategyId: new BN(strategyId),
    currentPrice: currentPriceBN, // Option<u64> - pass as BN (Anchor handles Option wrapping)
  };

  // Build transaction
  const tx = new Transaction();

  // Skip ALL setup instructions for CPI
  // We already ensured the output ATA exists above, so setup instructions are not needed
  // Setup instructions cause "signer privilege escalated" errors because they expect specific signers
  // that we can't provide when we modify the signer flags
  // The Associated Token Program validates signers based on instruction data, not just account meta
  if (swapInstruction.setupInstructions && swapInstruction.setupInstructions.length > 0) {
    console.log(`📝 Jupiter provided ${swapInstruction.setupInstructions.length} setup instruction(s)`);
    console.log(`   ⏭️  Skipping all setup instructions (output ATA already exists)`);
    console.log(`   ℹ️  Setup instructions cause signer privilege escalation errors in CPI context`);
    console.log();
  }

  // Add compute budget
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 })
  );

  // Add execute strategy instruction
  // Note: For CPI, we should NOT mark Jupiter's accounts as signers in remainingAccounts
  // Jupiter will handle signing for its own PDAs internally via invoke_signed
  // The escrow token account is owned by our program's PDA and will be signed during CPI
  // The isSigner flag in Jupiter's instruction is for direct calls, not CPI
  const escrowTokenAccountPubkey = escrowTokenAccountKey;
  
  // Log Jupiter accounts for debugging
  console.log(`📋 Jupiter swap instruction accounts (${swapInstruction.accounts.length}):`);
  
  // Track escrow token account occurrences
  const escrowOccurrences: number[] = [];
  const escrowPDAOccurrences: number[] = [];
  
  swapInstruction.accounts.forEach((acc, i) => {
    const pubkey = new PublicKey(acc.pubkey);
    const isEscrow = pubkey.equals(escrowTokenAccountPubkey);
    const isOwnerReceive = pubkey.equals(ownerReceiveATA);
    const isEscrowPDA = pubkey.equals(escrowPDA);
    
    if (isEscrow) {
      escrowOccurrences.push(i + 1);
    }
    if (isEscrowPDA) {
      escrowPDAOccurrences.push(i + 1);
    }
    
    console.log(`   ${i + 1}. ${pubkey.toString()}${isEscrow ? ' (ESCROW)' : ''}${isOwnerReceive ? ' (OWNER_RECEIVE)' : ''}${isEscrowPDA ? ' (ESCROW_PDA)' : ''} - signer: ${acc.isSigner}, writable: ${acc.isWritable}`);
  });
  console.log();
  
  // Detailed logging for escrow token account
  console.log(`🔍 Escrow Token Account Analysis:`);
  console.log(`   - Address: ${escrowTokenAccountPubkey.toString()}`);
  console.log(`   - Appears ${escrowOccurrences.length} time(s) at positions: ${escrowOccurrences.join(', ')}`);
  
  // Check each occurrence
  escrowOccurrences.forEach((pos, idx) => {
    const acc = swapInstruction.accounts[pos - 1];
    console.log(`   - Position ${pos}: signer=${acc.isSigner}, writable=${acc.isWritable}`);
  });
  
  // Verify escrow token account details
  try {
    const escrowAccount = await getAccount(connection, escrowTokenAccountPubkey);
    console.log(`   - Mint: ${escrowAccount.mint.toString()}`);
    console.log(`   - Owner (authority): ${escrowAccount.owner.toString()}`);
    console.log(`   - Expected owner (escrow PDA): ${escrowPDA.toString()}`);
    console.log(`   - Owner matches: ${escrowAccount.owner.equals(escrowPDA)}`);
    console.log(`   - Balance: ${escrowAccount.amount.toString()}`);
    console.log(`   - Is initialized: ${escrowAccount.amount !== BigInt(0) || escrowAccount.mint.toString() !== '11111111111111111111111111111111'}`);
  } catch (error) {
    console.error(`   ❌ Error fetching escrow token account: ${error}`);
  }
  console.log();
  
  // Detailed logging for escrow PDA
  console.log(`🔍 Escrow PDA Analysis:`);
  console.log(`   - Address: ${escrowPDA.toString()}`);
  console.log(`   - Appears ${escrowPDAOccurrences.length} time(s) at positions: ${escrowPDAOccurrences.join(', ')}`);
  
  // Check each occurrence
  escrowPDAOccurrences.forEach((pos, idx) => {
    const acc = swapInstruction.accounts[pos - 1];
    console.log(`   - Position ${pos}: signer=${acc.isSigner}, writable=${acc.isWritable}`);
  });
  console.log();
  
  // Following Jupiter CPI example pattern:
  // Set escrow PDA to isSigner=false in remainingAccounts (PDAs can't sign at transaction level)
  // Preserve Jupiter's original isSigner flags for other accounts
  // The program will mark escrow PDA as signer when invoking Jupiter via invoke_signed
  const remainingAccounts = swapInstruction.accounts.map((acc) => {
    const pubkey = new PublicKey(acc.pubkey);
    const isEscrowPDA = pubkey.equals(escrowPDA);
    
    return {
      pubkey,
      // Escrow PDA must be false (PDAs can't sign at transaction level)
      // Other accounts preserve Jupiter's original flags
      isSigner: isEscrowPDA ? false : acc.isSigner,
      isWritable: acc.isWritable,
    };
  });
  
  // Verify escrow PDA is in remainingAccounts (like Jupiter example checks for vault PDA)
  const escrowPDAIndexes = remainingAccounts
    .map((ra, idx) => ({ idx, pubkey: ra.pubkey }))
    .filter(ra => ra.pubkey.equals(escrowPDA))
    .map(ra => ra.idx);
  
  const escrowIndexes = remainingAccounts
    .map((ra, idx) => ({ idx, pubkey: ra.pubkey }))
    .filter(ra => ra.pubkey.equals(escrowTokenAccountPubkey))
    .map(ra => ra.idx);
  
  console.log(`🔍 RemainingAccounts Analysis:`);
  console.log(`   - Total accounts: ${remainingAccounts.length}`);
  console.log(`   - Escrow PDA found at positions: ${escrowPDAIndexes.map((i: number) => i + 1).join(', ') || 'NONE'}`);
  console.log(`   - Escrow token account found at positions: ${escrowIndexes.map(i => i + 1).join(', ') || 'NONE'}`);
  
  // Compare Jupiter's original vs our remainingAccounts
  console.log(`\n🔍 Comparing Jupiter's original accounts vs remainingAccounts:`);
  escrowOccurrences.forEach((jupiterPos, idx) => {
    const jupiterAcc = swapInstruction.accounts[jupiterPos - 1];
    const remainingAccIdx = escrowIndexes[idx];
    if (remainingAccIdx !== undefined) {
      const remainingAcc = remainingAccounts[remainingAccIdx];
      console.log(`   Escrow at Jupiter position ${jupiterPos} (remainingAccounts position ${remainingAccIdx + 1}):`);
      console.log(`     - Jupiter: signer=${jupiterAcc.isSigner}, writable=${jupiterAcc.isWritable}`);
      console.log(`     - RemainingAccounts: signer=${remainingAcc.isSigner}, writable=${remainingAcc.isWritable}`);
      console.log(`     - Match: ${jupiterAcc.isSigner === remainingAcc.isSigner && jupiterAcc.isWritable === remainingAcc.isWritable ? '✅' : '❌'}`);
    }
  });
  
  escrowPDAOccurrences.forEach((jupiterPos: number, idx: number) => {
    const jupiterAcc = swapInstruction.accounts[jupiterPos - 1];
    const remainingAccIdx = escrowPDAIndexes[idx];
    if (remainingAccIdx !== undefined) {
      const remainingAcc = remainingAccounts[remainingAccIdx];
      console.log(`   Escrow PDA at Jupiter position ${jupiterPos} (remainingAccounts position ${remainingAccIdx + 1}):`);
      console.log(`     - Jupiter: signer=${jupiterAcc.isSigner}, writable=${jupiterAcc.isWritable}`);
      console.log(`     - RemainingAccounts: signer=${remainingAcc.isSigner}, writable=${remainingAcc.isWritable}`);
      console.log(`     - Match: ${jupiterAcc.isSigner === remainingAcc.isSigner && jupiterAcc.isWritable === remainingAcc.isWritable ? '✅' : '❌'}`);
    }
  });
  console.log();
  
  if (escrowPDAIndexes.length > 0) {
    console.log(`✅ Escrow PDA found in remainingAccounts`);
    escrowPDAIndexes.forEach((idx: number) => {
      console.log(`   - Position ${idx + 1}: signer=${remainingAccounts[idx].isSigner} (set to false for CPI), writable=${remainingAccounts[idx].isWritable}`);
    });
    console.log(`   ℹ️  Program will mark escrow PDA as signer if it appears in remaining_accounts`);
    console.log();
  } else if (escrowIndexes.length > 0) {
    console.log(`✅ Escrow token account found in remainingAccounts`);
    escrowIndexes.forEach(idx => {
      console.log(`   - Position ${idx + 1}: signer=${remainingAccounts[idx].isSigner} (set to false for CPI), writable=${remainingAccounts[idx].isWritable}`);
    });
    console.log(`   ℹ️  Program will mark escrow PDA as signer if it appears in remaining_accounts`);
    console.log();
  } else {
    console.error(`❌ Neither escrow PDA nor escrow token account found in remainingAccounts!`);
    console.error(`   - Escrow PDA: ${escrowPDA.toString()}`);
    console.error(`   - Escrow Token Account: ${escrowTokenAccountPubkey.toString()}`);
    console.error(`   - First few accounts in remainingAccounts:`);
    remainingAccounts.slice(0, 5).forEach((acc, i) => {
      console.error(`     ${i + 1}. ${acc.pubkey.toString()} - signer: ${acc.isSigner}, writable: ${acc.isWritable}`);
    });
    process.exit(1);
  }
  
  // Also verify escrow PDA is accessible (it's in the main accounts, not remainingAccounts)
  // The escrow PDA is the authority of the escrow token account and will sign during invoke_signed
  console.log(`✅ Escrow PDA: ${escrowPDA.toString()}`);
  console.log(`   ℹ️  This PDA is the authority of the escrow token account and will sign via invoke_signed`);
  console.log();
  
  console.log(`✅ Using Jupiter CPI example pattern: preserve Jupiter's original isSigner flags`);
  console.log(`   ℹ️  Program only marks escrow PDA as signer if it appears in remaining_accounts`);
  console.log(`   ℹ️  Program does NOT modify AccountInfo - clones as-is`);
  console.log(`   ℹ️  Escrow PDA signs via invoke_signed, Solana recognizes token account's authority has signed`);
  console.log();

  // Log original signers for debugging
  const originalSigners = swapInstruction.accounts.filter(acc => acc.isSigner);
  if (originalSigners.length > 0) {
    console.log(`🔐 Jupiter signer accounts (${originalSigners.length}, will be handled by program/Jupiter via CPI):`);
    originalSigners.forEach((acc, i) => {
      const isEscrow = new PublicKey(acc.pubkey).equals(escrowTokenAccountPubkey);
      console.log(`   ${i + 1}. ${acc.pubkey.toString()}${isEscrow ? ' (ESCROW - will be signed by escrow PDA)' : ''}`);
    });
    console.log();
  }

  const executeIx = await client.program.methods
    .executeStrategy(executeParams, jupiterInstructionData)
    .accountsPartial({
      keeper: admin.publicKey,
      owner: admin.publicKey,
      global: client.global.publicKey,
      strategy: strategyKey,
      escrow: escrowKey,
      sellTokenMint: WSOL_MINT,
      sellTokenProgram,
      buyTokenMint: USDC_MINT,
      buyTokenProgram,
      escrowTokenAccount: escrowTokenAccountKey,
      ownerReceiveTokenAccount: ownerReceiveATA,
      treasury: global.treasury,
      treasuryTokenAccount: treasuryATA,
      jupiterProgram: JUPITER_PROGRAM_ID,
    } as any)
    .remainingAccounts(remainingAccounts)
    .instruction();

  // Verify escrow PDA is accessible (it's in the main accounts, not remainingAccounts)
  // The escrow PDA is the authority of the escrow token account and will sign during invoke_signed
  console.log(`✅ Escrow PDA: ${escrowPDA.toString()}`);
  console.log(`   ℹ️  This PDA is the authority of the escrow token account and will sign via invoke_signed`);
  console.log(`   ℹ️  Program does NOT mark any account as signer - relies on invoke_signed with escrow PDA seeds`);
  console.log(`   ℹ️  Solana recognizes that the token account's authority has signed via invoke_signed`);
  console.log();

  tx.add(executeIx);

  // Final check: Remove signer flags from main instruction accounts only
  // Do NOT modify remainingAccounts - they are all set to isSigner=false for CPI pattern
  // The program will mark the escrow account as signer in the Jupiter instruction
  // Keep only keeper as signer in main instruction accounts
  const keeperPubkey = admin.publicKey;
  let totalFixed = 0;
  tx.instructions.forEach((ix, ixIndex) => {
    // Only process main instruction accounts, not remainingAccounts
    // remainingAccounts are handled separately and must preserve Jupiter's flags
    ix.keys.forEach(key => {
      const isInRemainingAccounts = remainingAccounts.some(ra => ra.pubkey.equals(key.pubkey));
      // Keep only keeper as signer in main instruction accounts
      // Escrow account is handled via remainingAccounts (marked as signer there)
      if (key.isSigner && !key.pubkey.equals(keeperPubkey) && !isInRemainingAccounts) {
        key.isSigner = false;
        totalFixed++;
      }
    });
  });
  
  if (totalFixed > 0) {
    console.log(`🔧 Final cleanup: Removed signer flag from ${totalFixed} account(s) in main instruction accounts (preserved remainingAccounts flags)`);
    console.log();
  }

  // Add cleanup instruction if any
  // Note: For CPI, cleanup instructions are typically NOT needed
  // Cleanup instructions are for direct swaps (e.g., unwrapping SOL)
  // We skip them for CPI to avoid signer privilege escalation errors
  if (swapInstruction.cleanupInstruction) {
    console.log(`⚠️  Jupiter provided cleanup instruction`);
    console.log(`   Skipping cleanup instruction for CPI`);
    // For CPI, we don't include cleanup instructions as they're for post-swap cleanup
    // which isn't needed when doing CPI from a program-owned account
  }

  // Send transaction
  console.log("📤 Sending execute_strategy transaction...");
  
  // Get latest blockhash
  const latestBlockhash = await connection.getLatestBlockhash();
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.feePayer = admin.publicKey;
  
  // CRITICAL: Escrow account is marked as signer in remainingAccounts (to avoid privilege escalation)
  // Following Jupiter CPI example: accounts in remainingAccounts are NOT signers
  // The program marks them as signers in the instruction, and PDAs sign via invoke_signed
  // We can use regular transactions since no accounts in remainingAccounts are marked as signers
  let useVersioned = false; // No signers in remainingAccounts, so regular transaction should work
  
  let serializedSize = 0;
  
  if (!useVersioned) {
    // Only try legacy transaction if escrow is not a signer
    try {
      // Create a temporary signed transaction to check size
      const tempTx = new Transaction();
      tempTx.recentBlockhash = latestBlockhash.blockhash;
      tempTx.feePayer = admin.publicKey;
      tempTx.add(...tx.instructions);
      tempTx.sign(admin);
      serializedSize = tempTx.serialize().length;
      
      if (serializedSize > 1232) {
        useVersioned = true;
      }
    } catch (error: any) {
      // If serialization fails due to size or signature, use versioned transaction
      if (error.message?.includes("too large") || error.message?.includes("> 1232") || 
          error.message?.includes("1469") || error.message?.includes("Missing signature")) {
        console.log(`   Legacy transaction issue (${error.message}), using versioned transaction (V0)`);
        useVersioned = true;
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }
  } else {
    console.log(`   Using regular transaction - no signers in remainingAccounts`);
  }
  
  if (serializedSize > 0) {
    console.log(`   Transaction size: ${serializedSize} bytes`);
  }
  console.log(`   Instructions: ${tx.instructions.length}`);
  
  if (useVersioned) {
    console.log(`   Using versioned transaction (V0) with Address Lookup Tables...`);
    
    // Fetch Address Lookup Tables if provided by Jupiter
    let addressLookupTableAccounts: AddressLookupTableAccount[] = [];
    
    if (swapInstruction.addressLookupTableAddresses && swapInstruction.addressLookupTableAddresses.length > 0) {
      console.log(`   📋 Fetching ${swapInstruction.addressLookupTableAddresses.length} Address Lookup Table(s) from Jupiter...`);
      
      const altPromises = swapInstruction.addressLookupTableAddresses.map(async (altAddress: string) => {
        try {
          const altPubkey = new PublicKey(altAddress);
          const altAccount = await connection.getAddressLookupTable(altPubkey);
          if (altAccount.value) {
            console.log(`   ✅ Fetched ALT: ${altAddress}`);
            return altAccount.value;
          } else {
            console.log(`   ⚠️  ALT not found: ${altAddress}`);
            return null;
          }
        } catch (error: any) {
          console.log(`   ❌ Error fetching ALT ${altAddress}: ${error.message}`);
          return null;
        }
      });
      
      const altResults = await Promise.all(altPromises);
      addressLookupTableAccounts = altResults.filter((alt): alt is AddressLookupTableAccount => alt !== null);
      
      console.log(`   ✅ Loaded ${addressLookupTableAccounts.length} Address Lookup Table(s)`);
    }
    
    // Build versioned transaction with ALTs
    const messageV0 = new TransactionMessage({
      payerKey: admin.publicKey,
      instructions: tx.instructions,
      recentBlockhash: latestBlockhash.blockhash,
    }).compileToV0Message(addressLookupTableAccounts);
    
    const versionedTx = new VersionedTransaction(messageV0);
    versionedTx.sign([admin]);
    
    // Check size of versioned transaction
    const versionedSize = versionedTx.serialize().length;
    console.log(`   Versioned transaction size: ${versionedSize} bytes`);
    
    if (versionedSize > 1280) {
      throw new Error(`Versioned transaction still too large: ${versionedSize} bytes (max: 1280 bytes)`);
    }
    
    // Following Jupiter CPI example: accounts in remainingAccounts are NOT signers
    // The program marks the escrow token account as signer in the Jupiter instruction
    // The escrow PDA signs via invoke_signed, and Solana recognizes the token account's authority has signed
    // We can use skipPreflight: false since no accounts in remainingAccounts are marked as signers
    const signature = await connection.sendTransaction(versionedTx, {
      skipPreflight: false, // Can use preflight - no signers in remainingAccounts
      maxRetries: 3,
    });
    
    console.log(`✅ Transaction sent (versioned with ALTs): ${signature}`);
    console.log(`⏳ Confirming transaction (this may take up to 60 seconds)...`);
    
    // Wait for confirmation with longer timeout
    try {
      const confirmation = await Promise.race([
        connection.confirmTransaction(signature, "confirmed"),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 60000)
        )
      ]) as any;
      
      if (confirmation.value?.err) {
        console.error(`❌ Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log(`✅ Transaction confirmed successfully!`);
    } catch (error: any) {
      // If confirmation times out, try to fetch the transaction directly
      console.log(`⏳ Confirmation timed out, checking transaction status directly...`);
      
      let tx = null;
      // Try multiple times with increasing delays
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000 + i * 1000));
        try {
          tx = await connection.getTransaction(signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          });
          if (tx) {
            console.log(`✅ Transaction found after ${i + 1} attempt(s)`);
            break;
          }
        } catch (e) {
          // Continue trying
          if (i === 9) {
            console.log(`⚠️  Still not found after ${i + 1} attempts`);
          }
        }
      }
      
      // Also try with finality commitment
      if (!tx) {
        console.log(`⏳ Trying with finality commitment...`);
        try {
          tx = await connection.getTransaction(signature, {
            commitment: "finalized",
            maxSupportedTransactionVersion: 0,
          });
        } catch (e) {
          // Ignore
        }
      }
      
      if (tx) {
        if (tx.meta?.err) {
          console.error(`❌ Transaction failed: ${JSON.stringify(tx.meta.err)}`);
          if (tx.meta.logMessages) {
            console.error(`Transaction logs:`);
            tx.meta.logMessages.forEach((log: string, i: number) => {
              console.error(`  ${i + 1}. ${log}`);
            });
          }
          throw new Error(`Transaction failed: ${JSON.stringify(tx.meta.err)}`);
        } else {
          console.log(`✅ Transaction found and succeeded!`);
        }
      } else {
        console.error(`❌ Transaction not found after multiple attempts`);
        console.error(`   Signature: ${signature}`);
        console.error(`   Check on Solana Explorer: https://explorer.solana.com/tx/${signature}`);
        throw new Error(`Transaction not found - it may have been dropped or is still pending`);
      }
    }
    
    return signature;
  }
  
  // Legacy transaction path
  tx.sign(admin);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log(`⏳ Confirming transaction...`);
  await connection.confirmTransaction(signature, "confirmed");

  console.log(`\n✅ Strategy executed successfully!`);
  console.log(`🔗 Signature: ${signature}`);
  console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}\n`);

  // Check final balances
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const finalEscrow = await client.getStrategyEscrow(strategyKey);
  const finalStrategy = await client.getStrategy(admin.publicKey, strategyId);
  
  console.log("📊 Final State:");
  console.log(`   - Strategy Executed: ${finalStrategy.isExecuted}`);
  console.log(`   - Strategy Active: ${finalStrategy.isActive}`);
  console.log(`   - Tokens Received: ${finalStrategy.tokensReceived?.toString() || "N/A"}`);
  console.log(`   - Execution Price: ${finalStrategy.executionPrice?.toString() || "N/A"}`);
  console.log(`   - Escrow Withdrawn: ${finalEscrow.withdrawnAmount.toString()}\n`);

  // Check USDC balance
  try {
    const usdcAccount = await getAccount(connection, ownerReceiveATA);
    const usdcMint = await getMint(connection, USDC_MINT);
    const usdcBalance = Number(usdcAccount.amount) / Math.pow(10, usdcMint.decimals);
    console.log(`💰 USDC Balance: ${usdcBalance.toFixed(6)} USDC\n`);
  } catch (error) {
    console.log("⚠️  Could not fetch USDC balance\n");
  }

  console.log("🎉 Test completed successfully!");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

