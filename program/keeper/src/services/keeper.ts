import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
// @ts-ignore - Types are generated outside keeper directory
import { Weswap } from "../../../target/types/weswap";
import { PriceService } from "./price";
import { JupiterService } from "./jupiter";
import { Config } from "../config";
import { StrategyDiscoveryService } from "./strategy-discovery";
import { SupabaseService } from "./supabase";

// Order direction enum (matches Rust contract)
enum OrderDirection {
  Buy = 0,
  Sell = 1,
}

// Strategy status enum (matches Rust contract)
enum StrategyStatus {
  Active = 0,
  Filled = 1,
  Closed = 2,
  Cancelled = 3,
}

interface StrategyData {
  pubkey: PublicKey;
  owner: PublicKey;
  id: BN;
  sellTokenMint: PublicKey;
  buyTokenMint: PublicKey;
  triggerPrice: BN;
  pricePrecision: number;
  direction: OrderDirection;      // NEW: Order direction
  status: StrategyStatus;         // NEW: Replaced isActive/isExecuted
  takeProfitPrice: BN | null;     // NEW: TP price
  stopLossPrice: BN | null;       // NEW: SL price
  entryPrice: BN | null;          // NEW: Entry execution price
  entryTokensReceived: BN | null; // NEW: Tokens received on entry
}

export class KeeperService {
  private isRunning = false;
  private pollInterval?: NodeJS.Timeout;
  private strategyDiscovery: StrategyDiscoveryService;

  constructor(
    private program: Program<Weswap>,
    private connection: Connection,
    private keeperKeypair: Keypair,
    private priceService: PriceService,
    private jupiterService: JupiterService,
    private config: Config,
    private supabase: SupabaseService
  ) {
    this.strategyDiscovery = new StrategyDiscoveryService(program, supabase);
  }

  async start() {
    this.isRunning = true;
    console.log("✅ Keeper service started");

    // Initial poll
    await this.pollStrategies();

    // Set up polling interval
    this.pollInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.pollStrategies();
      }
    }, this.config.pollIntervalMs);
  }

  async stop() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    console.log("🛑 Keeper service stopped");
  }

  private async pollStrategies() {
    try {
      console.log("🔍 Polling for executable strategies...");

      // Get all strategies (we'll filter by status)
      const strategies = await this.findAllStrategies();

      // Split by status
      const activeStrategies = strategies.filter(s => s.status === StrategyStatus.Active);
      const filledStrategies = strategies.filter(s => s.status === StrategyStatus.Filled);

      console.log(`📋 Found ${activeStrategies.length} ACTIVE (entry) + ${filledStrategies.length} FILLED (exit) strategies`);

      // Process ACTIVE strategies for entry triggers
      for (const strategy of activeStrategies) {
        if (!this.isRunning) break;

        try {
          await this.checkAndExecuteEntry(strategy);
        } catch (error) {
          console.error(`❌ Error processing entry for ${strategy.pubkey.toString()}:`, error);
        }
      }

      // Process FILLED strategies for TP/SL exit triggers
      for (const strategy of filledStrategies) {
        if (!this.isRunning) break;

        try {
          await this.checkAndExecuteExit(strategy);
        } catch (error) {
          console.error(`❌ Error processing exit for ${strategy.pubkey.toString()}:`, error);
        }
      }
    } catch (error) {
      console.error("❌ Error polling strategies:", error);
    }
  }

  private async findAllStrategies(): Promise<StrategyData[]> {
    // Use strategy discovery service
    const strategyInfos = await this.strategyDiscovery.findAllActiveStrategies();

    // Convert to StrategyData format
    const strategies: StrategyData[] = [];

    for (const info of strategyInfos) {
      try {
        const strategy = await this.program.account.strategy.fetch(info.pubkey);

        // Parse the status enum (Anchor encodes enums as objects)
        let status: StrategyStatus;
        if (strategy.status && typeof strategy.status === 'object') {
          if ('active' in strategy.status) status = StrategyStatus.Active;
          else if ('filled' in strategy.status) status = StrategyStatus.Filled;
          else if ('closed' in strategy.status) status = StrategyStatus.Closed;
          else if ('cancelled' in strategy.status) status = StrategyStatus.Cancelled;
          else status = StrategyStatus.Closed;
        } else {
          // Fallback for old schema
          status = (strategy as any).isActive && !(strategy as any).isExecuted
            ? StrategyStatus.Active
            : StrategyStatus.Closed;
        }

        // Parse the direction enum
        let direction: OrderDirection;
        if (strategy.direction && typeof strategy.direction === 'object') {
          if ('buy' in strategy.direction) direction = OrderDirection.Buy;
          else direction = OrderDirection.Sell;
        } else {
          // Default to Sell for backward compatibility
          direction = OrderDirection.Sell;
        }

        strategies.push({
          pubkey: info.pubkey,
          owner: strategy.owner,
          id: strategy.id,
          sellTokenMint: strategy.sellTokenMint,
          buyTokenMint: strategy.buyTokenMint,
          triggerPrice: strategy.triggerPrice,
          pricePrecision: strategy.pricePrecision,
          direction,
          status,
          takeProfitPrice: strategy.takeProfitPrice || null,
          stopLossPrice: strategy.stopLossPrice || null,
          entryPrice: strategy.entryPrice || (strategy as any).executionPrice || null,
          entryTokensReceived: strategy.entryTokensReceived || (strategy as any).tokensReceived || null,
        });
      } catch (error) {
        console.error(`Error fetching strategy ${info.pubkey.toString()}:`, error);
      }
    }

    return strategies;
  }

  /**
   * Check and execute ENTRY for ACTIVE strategies (bidirectional trigger)
   */
  private async checkAndExecuteEntry(strategy: StrategyData) {
    // Get current price
    const priceData = await this.priceService.getPrice(
      strategy.sellTokenMint.toString(),
      strategy.buyTokenMint.toString()
    );

    if (!priceData) {
      console.log(`⚠️  Could not fetch price for strategy ${strategy.pubkey.toString()}`);
      return;
    }

    // Scale price to match strategy precision
    const scaledPrice = this.priceService.scalePrice(
      priceData.price,
      strategy.pricePrecision
    );

    const triggerPrice = BigInt(strategy.triggerPrice.toString());

    // BIDIRECTIONAL TRIGGER LOGIC
    let shouldTrigger: boolean;
    if (strategy.direction === OrderDirection.Buy) {
      // BUY order: Trigger when price DROPS TO or BELOW target
      shouldTrigger = scaledPrice <= triggerPrice;
      if (!shouldTrigger) {
        console.log(
          `⏳ BUY Strategy ${strategy.pubkey.toString()}: Price ${scaledPrice} > Trigger ${triggerPrice} (waiting for price to drop)`
        );
        return;
      }
    } else {
      // SELL order: Trigger when price RISES TO or ABOVE target
      shouldTrigger = scaledPrice >= triggerPrice;
      if (!shouldTrigger) {
        console.log(
          `⏳ SELL Strategy ${strategy.pubkey.toString()}: Price ${scaledPrice} < Trigger ${triggerPrice} (waiting for price to rise)`
        );
        return;
      }
    }

    const directionStr = strategy.direction === OrderDirection.Buy ? "BUY" : "SELL";
    console.log(
      `✅ ${directionStr} Strategy ${strategy.pubkey.toString()} ready to execute! Price: ${scaledPrice} triggers at ${triggerPrice}`
    );

    // Execute the entry strategy
    await this.executeEntry(strategy, scaledPrice);
  }

  /**
   * Check and execute EXIT for FILLED strategies (TP/SL monitoring)
   */
  private async checkAndExecuteExit(strategy: StrategyData) {
    // Get current price (for the token we're now holding - the buyTokenMint from entry)
    const priceData = await this.priceService.getPrice(
      strategy.buyTokenMint.toString(), // We're now selling the tokens we bought
      strategy.sellTokenMint.toString()  // Going back to original base
    );

    if (!priceData) {
      console.log(`⚠️  Could not fetch exit price for strategy ${strategy.pubkey.toString()}`);
      return;
    }

    // Scale price to match strategy precision
    const scaledPrice = this.priceService.scalePrice(
      priceData.price,
      strategy.pricePrecision
    );

    // Check TP/SL conditions
    let exitType: 'tp' | 'sl' | null = null;

    if (strategy.takeProfitPrice) {
      const tpPrice = BigInt(strategy.takeProfitPrice.toString());
      if (scaledPrice >= tpPrice) {
        exitType = 'tp';
        console.log(`🎯 TAKE PROFIT triggered! Price ${scaledPrice} >= TP ${tpPrice}`);
      }
    }

    if (!exitType && strategy.stopLossPrice) {
      const slPrice = BigInt(strategy.stopLossPrice.toString());
      if (scaledPrice <= slPrice) {
        exitType = 'sl';
        console.log(`🛑 STOP LOSS triggered! Price ${scaledPrice} <= SL ${slPrice}`);
      }
    }

    if (!exitType) {
      const tp = strategy.takeProfitPrice ? strategy.takeProfitPrice.toString() : 'N/A';
      const sl = strategy.stopLossPrice ? strategy.stopLossPrice.toString() : 'N/A';
      console.log(
        `⏳ Monitoring ${strategy.pubkey.toString()}: Price ${scaledPrice} | TP: ${tp} | SL: ${sl}`
      );
      return;
    }

    // Execute the exit
    await this.executeExit(strategy, scaledPrice, exitType === 'tp');
  }

  /**
   * Execute ENTRY swap (original execute_strategy)
   */
  private async executeEntry(strategy: StrategyData, currentPrice: bigint) {
    try {
      console.log(`🚀 Executing strategy ${strategy.pubkey.toString()}...`);

      // Get escrow account
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), strategy.pubkey.toBuffer()],
        this.program.programId
      );

      const escrow = await this.program.account.strategyEscrow.fetch(escrowPDA);
      const availableAmount = escrow.depositedAmount.sub(escrow.withdrawnAmount);

      if (availableAmount.lt(new BN(this.config.minExecutionAmount))) {
        console.log(`⚠️  Insufficient escrow: ${availableAmount.toString()}`);
        return;
      }

      // Get escrow token account (ATA owned by escrow PDA)
      // Determine which token program the sell_token_mint uses
      const sellMintAccountInfo = await this.connection.getAccountInfo(strategy.sellTokenMint);
      if (!sellMintAccountInfo) {
        console.log(`❌ Sell token mint not found: ${strategy.sellTokenMint.toString()}`);
        return;
      }
      const sellTokenProgram = sellMintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      const escrowTokenPDA = await getAssociatedTokenAddress(
        strategy.sellTokenMint,
        escrowPDA,
        true, // allowOwnerOffCurve: true for PDA owner
        sellTokenProgram
      );

      // Get owner receive token account
      const ownerReceiveATA = await getAssociatedTokenAddress(
        strategy.buyTokenMint,
        strategy.owner
      );

      // Get transfer authority
      const [transferAuthorityPDA, transferAuthorityBump] =
        PublicKey.findProgramAddressSync(
          [Buffer.from("transfer_authority")],
          this.program.programId
        );

      // Get global state to get platformFeeBps and treasury
      const [globalPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("global")],
        this.program.programId
      );
      const global = await this.program.account.global.fetch(globalPDA);

      // Get treasury token account for fee collection
      // Determine which token program the buy_token_mint uses
      const buyMintAccountInfo = await this.connection.getAccountInfo(strategy.buyTokenMint);
      if (!buyMintAccountInfo) {
        console.log(`❌ Buy token mint not found: ${strategy.buyTokenMint.toString()}`);
        return;
      }
      const buyTokenProgram = buyMintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      const treasuryATA = await getAssociatedTokenAddress(
        strategy.buyTokenMint,
        global.treasury,
        false,
        buyTokenProgram
      );

      // Get platform fee from global state
      const platformFeeBps = typeof global.platformFeeBps === 'number'
        ? global.platformFeeBps
        : (global.platformFeeBps as any).toNumber();

      // Get Jupiter quote with platformFeeBps
      const quote = await this.jupiterService.getQuote(
        strategy.sellTokenMint.toString(),
        strategy.buyTokenMint.toString(),
        availableAmount.toString(),
        this.config.slippageBps,
        platformFeeBps // Pass platform fee from global state
      );

      if (!quote) {
        console.log(`❌ Could not get Jupiter quote`);
        return;
      }

      // Get Jupiter swap instruction from /swap-instructions API
      // This API is designed for CPI use cases (returns instructions, not transactions)
      // Note: We pass escrow PDA as userPublicKey (matches test-execute pattern)
      const swapInstruction = await this.jupiterService.getSwapInstruction(
        escrowPDA.toString(), // Pass escrow PDA (owns the escrow token account)
        quote,
        ownerReceiveATA.toString(),
        false,
        treasuryATA.toString() // Pass treasury token account for fee collection
      );

      if (!swapInstruction) {
        console.log(`❌ Could not get Jupiter swap instruction`);
        return;
      }

      // Prepare instruction parameters
      // Note: Jupiter instruction data is base64 encoded, we need to decode it
      // Jupiter accounts are passed via remainingAccounts, not in params
      const jupiterInstructionData = Buffer.from(swapInstruction.data, "base64");

      const params = {
        strategyId: strategy.id,
        currentPrice: new BN(currentPrice.toString()),
        jupiterInstructionData: jupiterInstructionData, // bytes type - pass Buffer directly
      };

      // Build transaction
      const tx = new Transaction();

      // Handle setup instructions for CPI
      // Based on Jupiter CPI example: include ATA creation instructions (keeper can sign)
      // Skip other setup instructions that might require program signatures
      if (swapInstruction.setupInstructions && swapInstruction.setupInstructions.length > 0) {
        const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

        for (const setupIx of swapInstruction.setupInstructions) {
          const setupProgramId = new PublicKey(setupIx.programId);
          // Only include ATA creation instructions - keeper can sign for these
          if (setupProgramId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
            const instruction = new TransactionInstruction({
              programId: setupProgramId,
              keys: setupIx.accounts.map((acc) => ({
                pubkey: new PublicKey(acc.pubkey),
                isSigner: acc.isSigner, // Keep original - keeper will sign
                isWritable: acc.isWritable,
              })),
              data: Buffer.from(setupIx.data, "base64"),
            });
            tx.add(instruction);
          }
          // Skip other setup instructions
        }
      }

      // Add compute budget
      // Note: Jupiter may provide computeBudgetInstructions, but we handle it ourselves
      // since we need to set it for the entire transaction including our execute_strategy instruction
      const computeBudget = ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_400_000,
      });
      const computePrice = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 200_000,
      });
      tx.add(computeBudget, computePrice);

      // Prepare remaining accounts for Jupiter swap
      // Set escrow PDA to isSigner=false (PDAs can't sign at transaction level)
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

      // Add execute strategy instruction with remaining accounts
      // Note: strategy PDA is auto-derived from owner and strategy_id in params
      const executeIx = await this.program.methods
        .executeStrategy(params)
        .accountsPartial({
          keeper: this.keeperKeypair.publicKey,
          escrow: escrowPDA,
          escrowTokenAccount: escrowTokenPDA,
          ownerReceiveTokenAccount: ownerReceiveATA,
          treasury: global.treasury,
          treasuryTokenAccount: treasuryATA,
          owner: strategy.owner,
          sellTokenMint: strategy.sellTokenMint,
          buyTokenMint: strategy.buyTokenMint,
          jupiterProgram: new PublicKey(this.config.jupiterProgramId),
          global: globalPDA,
          systemProgram: SystemProgram.programId,
          buyTokenProgram,
        } as any)
        .remainingAccounts(remainingAccounts)
        .instruction();

      tx.add(executeIx);

      // Add cleanup instruction if provided (for SOL wrapping/unwrapping)
      if (swapInstruction.cleanupInstruction) {
        const cleanupIx = new TransactionInstruction({
          programId: new PublicKey(swapInstruction.cleanupInstruction.programId),
          keys: swapInstruction.cleanupInstruction.accounts.map((acc) => ({
            pubkey: new PublicKey(acc.pubkey),
            isSigner: acc.isSigner,
            isWritable: acc.isWritable,
          })),
          data: Buffer.from(swapInstruction.cleanupInstruction.data, "base64"),
        });
        tx.add(cleanupIx);
      }

      // Sign and send transaction
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      tx.feePayer = this.keeperKeypair.publicKey;
      tx.sign(this.keeperKeypair);

      console.log(`📤 Sending transaction...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      console.log(`⏳ Confirming transaction ${signature}...`);
      await this.connection.confirmTransaction(signature, "confirmed");

      console.log(`✅ Strategy executed successfully! Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}`);
    } catch (error) {
      console.error(`❌ Error executing strategy:`, error);
      throw error;
    }
  }

  /**
   * Execute EXIT swap for FILLED strategies (TP/SL triggered)
   * Execute EXIT swap for FILLED strategies (TP/SL triggered)
   * 
   * ARCHITECTURE: Fully automated - Keeper is ONLY signer
   * The Escrow PDA signs the Jupiter swap on-chain via invoke_signed
   * Owner does NOT need to sign for exit
   */
  private async executeExit(strategy: StrategyData, currentPrice: bigint, isTakeProfit: boolean) {
    try {
      const exitType = isTakeProfit ? "TAKE PROFIT" : "STOP LOSS";
      console.log(`🔄 Executing ${exitType} for strategy ${strategy.pubkey.toString()}...`);

      // ============================================
      // TODO: Boomerang Logic Hook
      // if (strategy.boomerangMode && currentPrice < strategy.safetyMin) {
      //   return this.executeFallbackToSol(strategy);
      // }
      // ============================================

      // Get global state
      const [globalPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("global")],
        this.program.programId
      );
      const global = await this.program.account.global.fetch(globalPDA);

      // Get escrow account - holds the tokens from entry
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), strategy.pubkey.toBuffer()],
        this.program.programId
      );

      // For exit: 
      // - Selling: buyTokenMint from entry (profits in escrow)
      // - Buying: sellTokenMint from entry (back to base asset)
      const exitSellTokenMint = strategy.buyTokenMint;  // What escrow holds
      const exitBuyTokenMint = strategy.sellTokenMint;  // What owner receives

      // Determine token programs
      const exitSellMintAccountInfo = await this.connection.getAccountInfo(exitSellTokenMint);
      if (!exitSellMintAccountInfo) {
        console.log(`❌ Exit sell token mint not found: ${exitSellTokenMint.toString()}`);
        return;
      }
      const exitSellTokenProgram = exitSellMintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      const exitBuyMintAccountInfo = await this.connection.getAccountInfo(exitBuyTokenMint);
      if (!exitBuyMintAccountInfo) {
        console.log(`❌ Exit buy token mint not found: ${exitBuyTokenMint.toString()}`);
        return;
      }
      const exitBuyTokenProgram = exitBuyMintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      // Escrow's token account holding profits from entry (source for exit swap)
      const escrowExitSellTokenAccount = await getAssociatedTokenAddress(
        exitSellTokenMint,
        escrowPDA,
        true, // allowOwnerOffCurve for PDA
        exitSellTokenProgram
      );

      // Owner's token account to receive exit proceeds
      const ownerReceiveATA = await getAssociatedTokenAddress(
        exitBuyTokenMint,
        strategy.owner,
        false,
        exitBuyTokenProgram
      );

      // Treasury token account for fees
      const treasuryATA = await getAssociatedTokenAddress(
        exitBuyTokenMint,
        global.treasury,
        false,
        exitBuyTokenProgram
      );

      // Get platform fee
      const platformFeeBps = typeof global.platformFeeBps === 'number'
        ? global.platformFeeBps
        : (global.platformFeeBps as any).toNumber();

      // Get amount to sell from escrow (tokens received from entry)
      // For now, we'll check the actual escrow balance
      const escrowBalance = await this.connection.getTokenAccountBalance(escrowExitSellTokenAccount);
      const amountToSell = escrowBalance.value.amount;

      if (amountToSell === "0") {
        console.log(`⚠️  No tokens in escrow to sell for exit`);
        return;
      }

      console.log(`📊 Escrow balance: ${amountToSell} tokens to sell`);

      // Get Jupiter quote for exit swap
      const quote = await this.jupiterService.getQuote(
        exitSellTokenMint.toString(),
        exitBuyTokenMint.toString(),
        amountToSell,
        this.config.slippageBps,
        platformFeeBps
      );

      if (!quote) {
        console.log(`❌ Could not get Jupiter quote for exit`);
        return;
      }

      // Get Jupiter swap instruction
      // Pass Escrow PDA as userPublicKey - it will sign via invoke_signed
      const swapInstruction = await this.jupiterService.getSwapInstruction(
        escrowPDA.toString(), // Escrow PDA is the "user" for this swap
        quote,
        ownerReceiveATA.toString(), // Destination: owner's wallet
        false,
        treasuryATA.toString()
      );

      if (!swapInstruction) {
        console.log(`❌ Could not get Jupiter swap instruction for exit`);
        return;
      }

      const jupiterInstructionData = Buffer.from(swapInstruction.data, "base64");

      const params = {
        strategyId: strategy.id,
        currentPrice: new BN(currentPrice.toString()),
      };

      // Build transaction
      const tx = new Transaction();

      // Handle setup instructions (ATA creation)
      if (swapInstruction.setupInstructions && swapInstruction.setupInstructions.length > 0) {
        const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

        for (const setupIx of swapInstruction.setupInstructions) {
          const setupProgramId = new PublicKey(setupIx.programId);
          if (setupProgramId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
            const instruction = new TransactionInstruction({
              programId: setupProgramId,
              keys: setupIx.accounts.map((acc) => ({
                pubkey: new PublicKey(acc.pubkey),
                isSigner: acc.isSigner,
                isWritable: acc.isWritable,
              })),
              data: Buffer.from(setupIx.data, "base64"),
            });
            tx.add(instruction);
          }
        }
      }

      // Add compute budget
      const computeBudget = ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_400_000,
      });
      const computePrice = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 200_000,
      });
      tx.add(computeBudget, computePrice);

      // Prepare remaining accounts for Jupiter swap
      // Set escrow PDA to isSigner=false (PDAs can't sign at transaction level)
      const remainingAccounts = swapInstruction.accounts.map((acc) => {
        const pubkey = new PublicKey(acc.pubkey);
        const isEscrowPDA = pubkey.equals(escrowPDA);

        return {
          pubkey,
          isSigner: isEscrowPDA ? false : acc.isSigner,
          isWritable: acc.isWritable,
        };
      });

      // Add execute exit instruction
      // ONLY KEEPER SIGNS - Escrow PDA signs on-chain via invoke_signed
      const executeExitIx = await this.program.methods
        .executeExit(params, jupiterInstructionData)
        .accountsPartial({
          keeper: this.keeperKeypair.publicKey,
          owner: strategy.owner,
          global: globalPDA,
          escrow: escrowPDA,
          exitSellTokenMint: exitSellTokenMint,
          exitSellTokenProgram: exitSellTokenProgram,
          exitBuyTokenMint: exitBuyTokenMint,
          exitBuyTokenProgram: exitBuyTokenProgram,
          escrowExitSellTokenAccount: escrowExitSellTokenAccount,
          ownerReceiveTokenAccount: ownerReceiveATA,
          treasury: global.treasury,
          treasuryTokenAccount: treasuryATA,
          jupiterProgram: new PublicKey(this.config.jupiterProgramId),
        } as any)
        .remainingAccounts(remainingAccounts)
        .instruction();

      tx.add(executeExitIx);

      // Add cleanup instruction if provided
      if (swapInstruction.cleanupInstruction) {
        const cleanupIx = new TransactionInstruction({
          programId: new PublicKey(swapInstruction.cleanupInstruction.programId),
          keys: swapInstruction.cleanupInstruction.accounts.map((acc) => ({
            pubkey: new PublicKey(acc.pubkey),
            isSigner: acc.isSigner,
            isWritable: acc.isWritable,
          })),
          data: Buffer.from(swapInstruction.cleanupInstruction.data, "base64"),
        });
        tx.add(cleanupIx);
      }

      // Sign ONLY with Keeper - no owner signature required!
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      tx.feePayer = this.keeperKeypair.publicKey;
      tx.sign(this.keeperKeypair);

      console.log(`📤 Sending exit transaction (Keeper-only signature)...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      console.log(`⏳ Confirming exit transaction ${signature}...`);
      await this.connection.confirmTransaction(signature, "confirmed");

      console.log(`✅ ${exitType} executed successfully! Signature: ${signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}`);

    } catch (error) {
      console.error(`❌ Error executing exit:`, error);
      throw error;
    }
  }
}

