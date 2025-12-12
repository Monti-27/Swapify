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

interface StrategyData {
  pubkey: PublicKey;
  owner: PublicKey;
  id: BN;
  sellTokenMint: PublicKey;
  buyTokenMint: PublicKey;
  triggerPrice: BN;
  pricePrecision: number;
  isActive: boolean;
  isExecuted: boolean;
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

      // Get global state to find all strategies
      // Note: In production, you'd want to index strategies or use a more efficient method
      const strategies = await this.findExecutableStrategies();

      console.log(`📋 Found ${strategies.length} strategies to check`);

      for (const strategy of strategies) {
        if (!this.isRunning) break;

        try {
          await this.checkAndExecuteStrategy(strategy);
        } catch (error) {
          console.error(`❌ Error processing strategy ${strategy.pubkey.toString()}:`, error);
        }
      }
    } catch (error) {
      console.error("❌ Error polling strategies:", error);
    }
  }

  private async findExecutableStrategies(): Promise<StrategyData[]> {
    // Use strategy discovery service
    const strategyInfos = await this.strategyDiscovery.findAllActiveStrategies();
    
    // Convert to StrategyData format
    const strategies: StrategyData[] = [];
    
    for (const info of strategyInfos) {
      try {
        const strategy = await this.program.account.strategy.fetch(info.pubkey);
        
        strategies.push({
          pubkey: info.pubkey,
          owner: strategy.owner,
          id: strategy.id,
          sellTokenMint: strategy.sellTokenMint,
          buyTokenMint: strategy.buyTokenMint,
          triggerPrice: strategy.triggerPrice,
          pricePrecision: strategy.pricePrecision,
          isActive: strategy.isActive,
          isExecuted: strategy.isExecuted,
        });
      } catch (error) {
        console.error(`Error fetching strategy ${info.pubkey.toString()}:`, error);
      }
    }
    
    return strategies;
  }

  private async checkAndExecuteStrategy(strategy: StrategyData) {
    // Check if strategy is active and not executed
    if (!strategy.isActive || strategy.isExecuted) {
      return;
    }

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

    // Check if trigger price is met
    // Convert BN to BigInt safely (Anchor BN uses toString() for conversion)
    const triggerPrice = BigInt(strategy.triggerPrice.toString());
    if (scaledPrice < triggerPrice) {
      console.log(
        `⏳ Strategy ${strategy.pubkey.toString()}: Price ${scaledPrice} < Trigger ${triggerPrice}`
      );
      return;
    }

    console.log(
      `✅ Strategy ${strategy.pubkey.toString()} ready to execute! Price: ${scaledPrice} >= Trigger: ${triggerPrice}`
    );

    // Execute the strategy
    await this.executeStrategy(strategy, scaledPrice);
  }

  private async executeStrategy(strategy: StrategyData, currentPrice: bigint) {
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
}

