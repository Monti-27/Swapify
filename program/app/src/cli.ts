#!/usr/bin/env ts-node

/// Command-line interface for Weswap protocol admin functions

import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { WeswapClient } from "./client";
import { Command } from "commander";
import {
  InitializeParams,
  CreateStrategyParams,
  DepositEscrowParams,
  WithdrawEscrowParams,
} from "./types";

let client: WeswapClient;

function initClient(clusterUrl: string, adminKeyPath: string): void {
  process.env.ANCHOR_WALLET = adminKeyPath;
  client = new WeswapClient(clusterUrl, adminKeyPath);
  client.log("Weswap Client Initialized");
}

function init(treasury: string = "TrbimSFZWMW34uVwD9w3mEYBoqdntXedNDb5EJqBAt8"): Promise<void> {
  // Protocol configuration
  const weswapConfig: InitializeParams = {
    platformFeeBps: 100, // 1%
    maxStrategiesPerUser: new BN(10), // Max 10 strategies per user
    keepers: [
      new PublicKey("kE1JoRpyGsyU4AmNRTUjDHK54VBSpdNDgEum3eMgutc"), // Keeper 1
      new PublicKey("nAEwPc7MCK8mY714wSeghyzXqmE5ySjvTqctoxQV9nH"), // Keeper 2
    ],
  };

  const treasuryKey = new PublicKey(treasury);
  return client.initialize(weswapConfig, treasuryKey);
}

async function getGlobal(): Promise<void> {
  client.prettyPrint(await client.getGlobal());
}

async function createStrategy(
  strategyId: number,
  sellTokenMint: string,
  buyTokenMint: string,
  triggerPrice: number,
  pricePrecision: number,
  sellAmount: number,
  depositAmount: number,
  takeProfitPrice?: number,
  stopLossPrice?: number,
  usePercentage: boolean = false,
  boomerangMode: boolean = false
): Promise<void> {
  const params: CreateStrategyParams = {
    id: new BN(strategyId),
    triggerPrice: new BN(triggerPrice),
    pricePrecision,
    takeProfitPrice: takeProfitPrice ? new BN(takeProfitPrice) : null,
    stopLossPrice: stopLossPrice ? new BN(stopLossPrice) : null,
    sellAmount: new BN(sellAmount),
    usePercentage,
    boomerangMode,
    depositAmount: new BN(depositAmount),
  };

  await client.createStrategy(
    params,
    new PublicKey(sellTokenMint),
    new PublicKey(buyTokenMint)
  );
}

async function getStrategy(owner: string, strategyId: number): Promise<void> {
  client.prettyPrint(await client.getStrategy(new PublicKey(owner), strategyId));
}

async function getUserStrategies(owner: string): Promise<void> {
  client.prettyPrint(await client.getUserStrategies(new PublicKey(owner)));
}

async function getAllStrategies(): Promise<void> {
  client.prettyPrint(await client.getAllStrategies());
}

async function getAllActiveStrategies(): Promise<void> {
  client.prettyPrint(await client.getAllActiveStrategies());
}

async function getStrategyEscrow(strategyAddress: string): Promise<void> {
  client.prettyPrint(await client.getStrategyEscrow(new PublicKey(strategyAddress)));
}

async function depositEscrow(
  strategyId: number,
  amount: number,
  sellTokenMint: string
): Promise<void> {
  const params: DepositEscrowParams = {
    id: new BN(strategyId),
    amount: new BN(amount),
  };

  await client.depositEscrow(params, new PublicKey(sellTokenMint));
}

async function withdrawEscrow(
  strategyId: number,
  amount: number,
  sellTokenMint: string,
  cancelStrategy: boolean = false
): Promise<void> {
  const params: WithdrawEscrowParams = {
    id: new BN(strategyId),
    amount: new BN(amount),
    cancelStrategy,
  };

  await client.withdrawEscrow(params, new PublicKey(sellTokenMint));
}

async function addKeeper(keeper: string): Promise<void> {
  await client.addKeeper(new PublicKey(keeper));
}

async function removeKeeper(keeper: string): Promise<void> {
  await client.removeKeeper(new PublicKey(keeper));
}

async function getStrategyStatus(owner: string, strategyId: number): Promise<void> {
  const status = await client.getStrategyStatus(new PublicKey(owner), strategyId);
  console.log(`Strategy ${strategyId} status: ${status}`);
}

async function executeStrategy(
  strategyOwner: string,
  strategyId: number,
  currentPrice?: number,
  transferAuthorityBump: number = 255,
  jupiterInstructionData: string = ""
): Promise<void> {
  const params = {
    strategyId: new BN(strategyId),
    currentPrice: currentPrice ? new BN(currentPrice) : null,
  };

  const jupiterData = Buffer.from(jupiterInstructionData, "hex");
  await client.executeStrategy(params, jupiterData, new PublicKey(strategyOwner));
}

(async function main() {
  const program = new Command();
  program
    .name("weswap-cli")
    .description("CLI for Weswap Protocol")
    .version("0.1.0")
    .option(
      "-u, --url <string>",
      "URL for Solana's JSON RPC",
      "https://api.mainnet-beta.solana.com"
    )
    .requiredOption("-k, --keypair <path>", "Filepath to the admin keypair")
    .hook("preSubcommand", (thisCommand, subCommand) => {
      if (!program.opts().keypair) {
        throw Error("required option '-k, --keypair <path>' not specified");
      }
      initClient(program.opts().url, program.opts().keypair);
      client.log(`Processing command '${thisCommand.args[0]}'`);
    })
    .hook("postAction", () => {
      client.log("Done");
    });

  program
    .command("init")
    .description("Initialize the Weswap protocol")
    .option("--treasury <pubkey>", "Treasury account for collecting fees")
    .action(async (options) => {
      await init(options.treasury);
    });

  program
    .command("get-global")
    .description("Print global protocol state")
    .action(async () => {
      await getGlobal();
    });

  program
    .command("create-strategy")
    .description("Create a new trading strategy")
    .argument("<number>", "Strategy ID")
    .argument("<pubkey>", "Sell token mint")
    .argument("<pubkey>", "Buy token mint")
    .argument("<number>", "Trigger price")
    .argument("<number>", "Price precision")
    .argument("<number>", "Sell amount")
    .argument("<number>", "Initial deposit amount")
    .option("--tp <number>", "Take profit price")
    .option("--sl <number>", "Stop loss price")
    .option("--percentage", "Use percentage for sell amount")
    .option("--boomerang", "Enable boomerang mode")
    .action(async (strategyId, sellMint, buyMint, triggerPrice, precision, sellAmount, depositAmount, options) => {
      await createStrategy(
        parseInt(strategyId),
        sellMint,
        buyMint,
        parseInt(triggerPrice),
        parseInt(precision),
        parseInt(sellAmount),
        parseInt(depositAmount),
        options.tp ? parseInt(options.tp) : undefined,
        options.sl ? parseInt(options.sl) : undefined,
        options.percentage || false,
        options.boomerang || false
      );
    });

  program
    .command("get-strategy")
    .description("Get strategy details")
    .argument("<pubkey>", "Strategy owner")
    .argument("<number>", "Strategy ID")
    .action(async (owner, strategyId) => {
      await getStrategy(owner, parseInt(strategyId));
    });

  program
    .command("get-user-strategies")
    .description("Get all strategies for a user")
    .argument("<pubkey>", "User public key")
    .action(async (owner) => {
      await getUserStrategies(owner);
    });

  program
    .command("get-all-strategies")
    .description("Get all strategies")
    .action(async () => {
      await getAllStrategies();
    });

  program
    .command("get-active-strategies")
    .description("Get all active strategies")
    .action(async () => {
      await getAllActiveStrategies();
    });

  program
    .command("get-strategy-escrow")
    .description("Get strategy escrow details")
    .argument("<pubkey>", "Strategy address")
    .action(async (strategyAddress) => {
      await getStrategyEscrow(strategyAddress);
    });

  program
    .command("deposit-escrow")
    .description("Deposit funds to strategy escrow")
    .argument("<number>", "Strategy ID")
    .argument("<number>", "Amount to deposit")
    .argument("<pubkey>", "Sell token mint")
    .action(async (strategyId, amount, sellMint) => {
      await depositEscrow(parseInt(strategyId), parseInt(amount), sellMint);
    });

  program
    .command("withdraw-escrow")
    .description("Withdraw funds from strategy escrow")
    .argument("<number>", "Strategy ID")
    .argument("<number>", "Amount to withdraw (0 for all)")
    .argument("<pubkey>", "Sell token mint")
    .option("--cancel", "Cancel strategy when withdrawing")
    .action(async (strategyId, amount, sellMint, options) => {
      await withdrawEscrow(
        parseInt(strategyId),
        parseInt(amount),
        sellMint,
        options.cancel || false
      );
    });

  program
    .command("execute-strategy")
    .description("Execute a strategy (keeper only)")
    .argument("<pubkey>", "Strategy owner")
    .argument("<number>", "Strategy ID")
    .option("--price <number>", "Current price")
    .option("--bump <number>", "Transfer authority bump", "255")
    .option("--jupiter-data <string>", "Jupiter instruction data (hex)", "")
    .action(async (owner, strategyId, options) => {
      await executeStrategy(
        owner,
        parseInt(strategyId),
        options.price ? parseInt(options.price) : undefined,
        parseInt(options.bump),
        options.jupiterData
      );
    });

  program
    .command("add-keeper")
    .description("Add a new keeper (admin only)")
    .argument("<pubkey>", "Keeper public key")
    .action(async (keeper) => {
      await addKeeper(keeper);
    });

  program
    .command("remove-keeper")
    .description("Remove a keeper (admin only)")
    .argument("<pubkey>", "Keeper public key")
    .action(async (keeper) => {
      await removeKeeper(keeper);
    });

  program
    .command("get-strategy-status")
    .description("Get strategy status")
    .argument("<pubkey>", "Strategy owner")
    .argument("<number>", "Strategy ID")
    .action(async (owner, strategyId) => {
      await getStrategyStatus(owner, parseInt(strategyId));
    });

  await program.parseAsync(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
})();
