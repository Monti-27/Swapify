import {
  setProvider,
  Program,
  AnchorProvider,
  utils,
  BN,
  Wallet,
} from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import { Weswap } from "../../target/types/weswap";
import idl from "../../target/idl/weswap.json";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  Connection,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram
} from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  createAssociatedTokenAccountInstruction, 
  createSyncNativeInstruction, 
  NATIVE_MINT,
  getAccount,
  getMint
} from "@solana/spl-token";

import { readFileSync } from "fs";
import {
  InitializeParams,
  CreateStrategyParams,
  ExecuteStrategyParams,
  DepositEscrowParams,
  WithdrawEscrowParams,
  ManageKeepersParams,
  Global,
  Strategy,
  StrategyEscrow,
  KeeperAction,
} from "./types";

export async function checkIfAccountExists(
  account: PublicKey,
  connection: Connection
): Promise<boolean> {
  let bal = await connection.getBalance(account);
  if (bal > 0) {
    return true;
  } else {
    return false;
  }
}

export async function wrapSolIfNeeded(
  publicKey: PublicKey,
  connection: Connection,
  payAmount: number
): Promise<TransactionInstruction[] | null> {
  console.log("in wrap sol if needed");
  let preInstructions: TransactionInstruction[] = [];

  const associatedTokenAccount = await getAssociatedTokenAddress(
    NATIVE_MINT,
    publicKey
  );

  const balance =
    (await connection.getBalance(associatedTokenAccount)) / LAMPORTS_PER_SOL;

  if (balance < payAmount) {
    console.log("balance insufficient");

    preInstructions.push(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: associatedTokenAccount,
        lamports: Math.floor((payAmount - balance) * LAMPORTS_PER_SOL * 3),
      })
    );
    preInstructions.push(
      createSyncNativeInstruction(associatedTokenAccount, TOKEN_PROGRAM_ID)
    );
  }

  return preInstructions.length > 0 ? preInstructions : null;
}

export class WeswapClient {
  provider: AnchorProvider;
  program: Program<Weswap>;
  admin: Keypair;

  // PDAs
  global: { publicKey: PublicKey; bump: number };

  constructor(clusterUrl: string, adminKey: string) {
    this.admin = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(readFileSync(adminKey).toString()))
    );

    const wallet = new NodeWallet(this.admin);

    this.provider = new AnchorProvider(new Connection(clusterUrl), wallet, {});

    setProvider(this.provider);

    this.program = new Program(idl as Weswap, this.provider);

    this.global = this.findProgramAddress("global");

    BN.prototype.toJSON = function () {
      return this.toString(10);
    };
  }

  findProgramAddress = (
    label: string,
    extraSeeds: any[] | null = null
  ): {
    publicKey: PublicKey;
    bump: number;
  } => {
    const seeds = [Buffer.from(utils.bytes.utf8.encode(label))];

    if (extraSeeds) {
      for (const extraSeed of extraSeeds) {
        if (typeof extraSeed === "string") {
          seeds.push(Buffer.from(utils.bytes.utf8.encode(extraSeed)));
        } else if (Array.isArray(extraSeed)) {
          seeds.push(Buffer.from(extraSeed));
        } else if (extraSeed instanceof PublicKey) {
          seeds.push(Buffer.from(extraSeed.toBuffer()));
        } else if (Buffer.isBuffer(extraSeed)) {
          seeds.push(Buffer.from(extraSeed));
        } else {
          throw new Error(`Unsupported seed type: ${typeof extraSeed}`);
        }
      }
    }

    const [publicKey, bump] = PublicKey.findProgramAddressSync(
      seeds,
      this.program.programId
    );

    return { publicKey, bump };
  };

  // Helper methods
  getStrategyKey = (owner: PublicKey, strategyId: number): PublicKey => {
    return this.findProgramAddress("strategy", [
      owner,
      new BN(strategyId).toArrayLike(Buffer, "le", 8)
    ]).publicKey;
  };

  getEscrowKey = (strategy: PublicKey): PublicKey => {
    return this.findProgramAddress("escrow", [strategy]).publicKey;
  };

  getEscrowTokenAccountKey = async (strategy: PublicKey, sellTokenMint: PublicKey, tokenProgram: PublicKey = TOKEN_PROGRAM_ID): Promise<PublicKey> => {
    // Escrow token account is now an ATA owned by escrow PDA (per-strategy)
    // escrow is a PDA (off-curve), so we need allowOwnerOffCurve: true
    const escrowKey = this.getEscrowKey(strategy);
    return getAssociatedTokenAddress(
      sellTokenMint,
      escrowKey,
      true, // allowOwnerOffCurve: true for PDA owner
      tokenProgram
    );
  };

  // Getter methods
  getGlobal = async (): Promise<Global> => {
    return this.program.account.global.fetch(this.global.publicKey);
  };

  getStrategy = async (owner: PublicKey, strategyId: number): Promise<Strategy> => {
    return this.program.account.strategy.fetch(
      this.getStrategyKey(owner, strategyId)
    );
  };

  getStrategyEscrow = async (strategy: PublicKey): Promise<StrategyEscrow> => {
    return this.program.account.strategyEscrow.fetch(
      this.getEscrowKey(strategy)
    );
  };

  getAllStrategies = async (): Promise<Strategy[]> => {
    const strategies = await this.program.account.strategy.all();
    return strategies.map(s => s.account);
  };

  getAllActiveStrategies = async (): Promise<Strategy[]> => {
    const strategies = await this.getAllStrategies();
    return strategies.filter(s => s.isActive && !s.isExecuted);
  };

  getUserStrategies = async (owner: PublicKey): Promise<Strategy[]> => {
    const strategies = await this.program.account.strategy.all([
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: owner.toBase58(),
        },
      },
    ]);
    return strategies.map(s => s.account);
  };

  log = (...messages: string[]): void => {
    const date = new Date();
    const dateStr = date.toDateString();
    const time = date.toLocaleTimeString();

    console.log(`[${dateStr} ${time}] ${messages.join(", ")}`);
  };

  prettyPrint = (v: any): void => {
    console.log(JSON.stringify(v, null, 2));
  };

  ///////
  // Instructions

  initialize = async (params: InitializeParams, treasury: PublicKey): Promise<void> => {
    const treasuryKey = treasury; // Use provided treasury or first keeper as default
    
    console.log("Initialize params:", JSON.stringify(params, null, 2));
    
    await this.program.methods
      .initialize(params)
      .accountsStrict({
        authority: this.admin.publicKey,
        global: this.global.publicKey,
        treasury: treasuryKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.admin])
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
  };

  createStrategy = async (
    params: CreateStrategyParams,
    sellTokenMint: PublicKey,
    buyTokenMint: PublicKey
  ): Promise<void> => {
    const strategyKey = this.getStrategyKey(this.provider.wallet.publicKey, params.id);
    const escrowKey = this.getEscrowKey(strategyKey);
    
    // Determine which token program the sell_token_mint uses
    await getMint(this.provider.connection, sellTokenMint);
    const sellMintAccountInfo = await this.provider.connection.getAccountInfo(sellTokenMint);
    if (!sellMintAccountInfo) {
      throw new Error("Sell token mint not found");
    }
    const sellTokenProgram = sellMintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;
    
    const escrowTokenAccountKey = await this.getEscrowTokenAccountKey(strategyKey, sellTokenMint, sellTokenProgram);

    const ownerTokenAccount = await getAssociatedTokenAddress(
      sellTokenMint,
      this.provider.wallet.publicKey
    );

    // Verify the owner token account exists and is initialized
    try {
      await getAccount(this.provider.connection, ownerTokenAccount);
    } catch (error) {
      throw new Error(
        `Owner token account ${ownerTokenAccount.toString()} does not exist or is not initialized. ` +
        `Please create and fund the token account before creating a strategy.`
      );
    }

    // Determine which token program the buy_token_mint uses
    await getMint(this.provider.connection, buyTokenMint);
    const buyMintAccountInfo = await this.provider.connection.getAccountInfo(buyTokenMint);
    if (!buyMintAccountInfo) {
      throw new Error("Buy token mint not found");
    }
    const buyTokenProgram = buyMintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;

    await this.program.methods
      .createStrategy(params)
      .accountsStrict({
        owner: this.provider.wallet.publicKey,
        strategy: strategyKey,
        global: this.global.publicKey,
        escrow: escrowKey,
        sellTokenMint,
        sellTokenProgram,
        buyTokenMint,
        buyTokenProgram,
        ownerTokenAccount,
        escrowTokenAccount: escrowTokenAccountKey,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
  };

  executeStrategy = async (
    params: ExecuteStrategyParams,
    jupiterInstructionData: Buffer,
    strategyOwner: PublicKey
  ): Promise<void> => {
    const strategyKey = this.getStrategyKey(strategyOwner, params.strategyId);
    const strategy = await this.getStrategy(strategyOwner, params.strategyId);
    const escrowKey = this.getEscrowKey(strategyKey);
    
    // Determine which token program the sell_token_mint uses
    await getMint(this.provider.connection, strategy.sellTokenMint);
    const sellMintAccountInfo = await this.provider.connection.getAccountInfo(strategy.sellTokenMint);
    if (!sellMintAccountInfo) {
      throw new Error("Sell token mint not found");
    }
    const sellTokenProgram = sellMintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;
    
    const escrowTokenAccountKey = await this.getEscrowTokenAccountKey(strategyKey, strategy.sellTokenMint, sellTokenProgram);

    const ownerReceiveTokenAccount = await getAssociatedTokenAddress(
      strategy.buyTokenMint,
      strategyOwner
    );

    const treasuryTokenAccount = await getAssociatedTokenAddress(
      strategy.buyTokenMint,
      (await this.getGlobal()).treasury
    );

    // Determine which token program the buy_token_mint uses
    await getMint(this.provider.connection, strategy.buyTokenMint);
    const buyMintAccountInfo = await this.provider.connection.getAccountInfo(strategy.buyTokenMint);
    if (!buyMintAccountInfo) {
      throw new Error("Buy token mint not found");
    }
    const buyTokenProgram = buyMintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;

    await this.program.methods
      .executeStrategy(params, jupiterInstructionData)
      .accountsStrict({
        keeper: this.provider.wallet.publicKey,
        owner: strategyOwner,
        global: this.global.publicKey,
        strategy: strategyKey,
        escrow: escrowKey,
        sellTokenMint: strategy.sellTokenMint,
        sellTokenProgram,
        buyTokenMint: strategy.buyTokenMint,
        buyTokenProgram,
        escrowTokenAccount: escrowTokenAccountKey,
        ownerReceiveTokenAccount,
        treasury: (await this.getGlobal()).treasury,
        treasuryTokenAccount,
        jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
      } as any)
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
  };

  depositEscrow = async (
    params: DepositEscrowParams,
    sellTokenMint: PublicKey
  ): Promise<void> => {
    const strategyKey = this.getStrategyKey(this.provider.wallet.publicKey, params.id);
    const escrowKey = this.getEscrowKey(strategyKey);
    const strategy = await this.getStrategy(this.provider.wallet.publicKey, params.id);
    
    // Determine which token program the sell_token_mint uses
    await getMint(this.provider.connection, sellTokenMint);
    const sellTokenMintInfo = await this.provider.connection.getAccountInfo(sellTokenMint);
    if (!sellTokenMintInfo) {
      throw new Error("Sell token mint not found");
    }
    const sellTokenProgram = sellTokenMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;
    
    const escrowTokenAccountKey = await this.getEscrowTokenAccountKey(strategyKey, sellTokenMint, sellTokenProgram);

    const ownerTokenAccount = await getAssociatedTokenAddress(
      sellTokenMint,
      this.provider.wallet.publicKey
    );

    // Determine which token program the buy_token_mint uses
    await getMint(this.provider.connection, strategy.buyTokenMint);
    const buyTokenMintInfo = await this.provider.connection.getAccountInfo(strategy.buyTokenMint);
    if (!buyTokenMintInfo) {
      throw new Error("Buy token mint not found");
    }
    const buyTokenProgram = buyTokenMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;

    await this.program.methods
      .depositEscrow(params)
      .accountsStrict({
        owner: this.provider.wallet.publicKey,
        strategy: strategyKey,
        escrow: escrowKey,
        sellTokenMint,
        sellTokenProgram,
        buyTokenMint: strategy.buyTokenMint,
        buyTokenProgram,
        ownerTokenAccount,
        escrowTokenAccount: escrowTokenAccountKey,
        global: this.global.publicKey,
      })
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
  };

  withdrawEscrow = async (
    params: WithdrawEscrowParams,
    sellTokenMint: PublicKey
  ): Promise<void> => {
    const strategyKey = this.getStrategyKey(this.provider.wallet.publicKey, params.id);
    const escrowKey = this.getEscrowKey(strategyKey);
    const strategy = await this.getStrategy(this.provider.wallet.publicKey, params.id);
    
    // Determine which token program the sell_token_mint uses
    await getMint(this.provider.connection, sellTokenMint);
    const sellTokenMintInfo = await this.provider.connection.getAccountInfo(sellTokenMint);
    if (!sellTokenMintInfo) {
      throw new Error("Sell token mint not found");
    }
    const sellTokenProgram = sellTokenMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;
    
    const escrowTokenAccountKey = await this.getEscrowTokenAccountKey(strategyKey, sellTokenMint, sellTokenProgram);

    const ownerTokenAccount = await getAssociatedTokenAddress(
      sellTokenMint,
      this.provider.wallet.publicKey
    );

    // Determine which token program the buy_token_mint uses
    await getMint(this.provider.connection, strategy.buyTokenMint);
    const buyTokenMintInfo = await this.provider.connection.getAccountInfo(strategy.buyTokenMint);
    if (!buyTokenMintInfo) {
      throw new Error("Buy token mint not found");
    }
    const buyTokenProgram = buyTokenMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;

    await this.program.methods
      .withdrawEscrow(params)
      .accountsStrict({
        owner: this.provider.wallet.publicKey,
        strategy: strategyKey,
        escrow: escrowKey,
        sellTokenMint,
        sellTokenProgram,
        buyTokenMint: strategy.buyTokenMint,
        buyTokenProgram,
        ownerTokenAccount,
        escrowTokenAccount: escrowTokenAccountKey,
        global: this.global.publicKey,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
  };

  manageKeepers = async (params: ManageKeepersParams): Promise<void> => {
    await this.program.methods
      .manageKeepers(params)
      .accountsStrict({
        authority: this.admin.publicKey,
        global: this.global.publicKey,
      })
      .signers([this.admin])
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
  };

  // Helper method to add a keeper
  addKeeper = async (keeper: PublicKey): Promise<void> => {
    await this.manageKeepers({
      action: { add: { keeper } } as KeeperAction,
    });
  };

  // Helper method to remove a keeper
  removeKeeper = async (keeper: PublicKey): Promise<void> => {
    await this.manageKeepers({
      action: { remove: { keeper } } as KeeperAction,
    });
  };

  // Utility methods
  getStrategyStatus = async (owner: PublicKey, strategyId: number): Promise<string> => {
    try {
      const strategy = await this.getStrategy(owner, strategyId);
      if (strategy.isExecuted) return "Executed";
      if (!strategy.isActive) return "Cancelled";
      return "Active";
    } catch {
      return "Not Found";
    }
  };

  getEscrowBalance = async (strategy: PublicKey): Promise<number> => {
    const escrow = await this.getStrategyEscrow(strategy);
    return escrow.depositedAmount.sub(escrow.withdrawnAmount).toNumber();
  };

  // Price formatting helpers
  formatPrice = (price: BN, precision: number): number => {
    return price.toNumber() / Math.pow(10, precision);
  };

  formatTokenAmount = (amount: BN, decimals: number): number => {
    return amount.toNumber() / Math.pow(10, decimals);
  };
}
