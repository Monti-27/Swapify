import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';;
import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    ComputeBudgetProgram,
    TransactionInstruction,
    SystemProgram,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PrismaService } from '../prisma/prisma.service';
import { PriceService } from '../price/price.service';

import {
    CreateStrategyEvent,
    ExecuteStrategyEvent,
    CancelStrategyEvent,
    DepositEscrowEvent,
    WithdrawEscrowEvent,
} from './types';

// Import IDL
import idl from './idl/weswap.json';
import * as bs58 from 'bs58';

// ============================================================
// STATUS ENUMS - MUST MATCH RUST CONTRACT
// ============================================================
enum OrderDirection {
    Buy = 0,
    Sell = 1,
}

enum StrategyStatus {
    Active = 0,
    Filled = 1,
    Closed = 2,
    Cancelled = 3,
}

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

// Keeper configuration
const KEEPER_POLL_INTERVAL_MS = 10_000; // 10 seconds
const KEEPER_SLIPPAGE_BPS = 100; // 1%
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const JUPITER_PROGRAM_ID = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

interface StrategyData {
    pubkey: PublicKey;
    id: BN;
    owner: PublicKey;
    sellTokenMint: PublicKey;
    buyTokenMint: PublicKey;
    triggerPrice: BN;
    pricePrecision: number;
    direction: OrderDirection;
    status: StrategyStatus;
    takeProfitPrice?: BN | null;
    stopLossPrice?: BN | null;
    entryPrice?: BN | null;
    entryTokensReceived?: BN | null;
    boomerangMode: boolean;  // NEW: Track if strategy is in boomerang mode
}

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BlockchainService.name);

    private connection: Connection;
    private program: Program<any>;
    private eventListeners: number[] = [];
    private isRunning = false;

    // ============================================================
    // KEEPER BOT STATE
    // ============================================================
    private keeperKeypair: Keypair | null = null;
    private keeperEnabled = false;
    private keeperInterval: NodeJS.Timeout | null = null;

    // Reconnection settings
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 10;
    private readonly baseReconnectDelay = 1000;
    private readonly maxReconnectDelay = 30000;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
        private priceService: PriceService,
    ) { }

    async onModuleInit() {
        this.logger.log('═══════════════════════════════════════');
        this.logger.log('  🤖 WESWAP KEEPER SERVICE STARTING');
        this.logger.log('═══════════════════════════════════════');

        try {
            await this.initialize();
            await this.initializeKeeper();
            await this.listenToProgramEvents();
            this.startKeeperLoop();

            // Heartbeat logs
            this.logger.log('─────────────────────────────────────');
            this.logger.log(`[Keeper] 🤖 Execution Loop: ${this.keeperEnabled ? 'ACTIVE' : 'DISABLED'}`);
            if (this.keeperKeypair) {
                this.logger.log(`[Keeper] 🔑 Operator: ${this.keeperKeypair.publicKey.toString()}`);
            }
            this.logger.log(`[Keeper] 📡 Program ID: ${this.program.programId.toString()}`);
            this.logger.log(`[Keeper] ⏱️  Poll Interval: ${KEEPER_POLL_INTERVAL_MS / 1000}s`);
            this.logger.log('─────────────────────────────────────');

        } catch (error) {
            this.logger.error('Failed to initialize blockchain service:', error.message);
            this.scheduleReconnect();
        }
    }

    async onModuleDestroy() {
        await this.stop();
    }

    private async initialize() {
        const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL');
        const wsUrl = this.configService.get<string>('SOLANA_WS_URL');
        const programId = this.configService.get<string>('PROGRAM_ID');

        if (!rpcUrl) {
            throw new Error('SOLANA_RPC_URL environment variable is required');
        }

        if (!programId) {
            throw new Error('PROGRAM_ID environment variable is required');
        }

        // Determine WebSocket URL
        let finalWsUrl = wsUrl;
        if (!finalWsUrl) {
            finalWsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
        }

        this.logger.log(`📡 RPC URL: ${rpcUrl}`);
        this.logger.log(`🔌 WebSocket URL: ${finalWsUrl}`);

        this.connection = new Connection(rpcUrl, {
            commitment: 'confirmed',
            wsEndpoint: finalWsUrl,
        });

        this.logger.log(`✅ Connected to Solana RPC`);

        // Initialize Anchor provider and program
        const dummyKeypair = Keypair.generate();
        const wallet = new anchor.Wallet(dummyKeypair);
        const provider = new AnchorProvider(this.connection, wallet, {
            commitment: 'confirmed',
        });
        anchor.setProvider(provider);

        this.program = new Program(idl as any, provider);
        this.logger.log(`🔗 Program ID: ${programId}`);
    }

    // ============================================================
    // KEEPER INITIALIZATION
    // ============================================================
    private async initializeKeeper() {
        const keeperPrivateKey = this.configService.get<string>('KEEPER_PRIVATE_KEY');

        if (!keeperPrivateKey) {
            this.logger.warn('⚠️  KEEPER_PRIVATE_KEY not set - Keeper bot DISABLED');
            this.keeperEnabled = false;
            return;
        }

        try {
            // Decode base58 private key
            const secretKey = bs58.decode(keeperPrivateKey);
            this.keeperKeypair = Keypair.fromSecretKey(secretKey);
            this.keeperEnabled = true;

            this.logger.log(`🤖 Keeper initialized: ${this.keeperKeypair.publicKey.toString()}`);

            // Check keeper balance
            const balance = await this.connection.getBalance(this.keeperKeypair.publicKey);
            this.logger.log(`💰 Keeper balance: ${balance / 1e9} SOL`);

            if (balance < 0.1 * 1e9) {
                this.logger.warn('⚠️  Keeper balance low! Need at least 0.1 SOL for gas');
            }
        } catch (error) {
            this.logger.error('Failed to initialize keeper:', error.message);
            this.keeperEnabled = false;
        }
    }

    // ============================================================
    // KEEPER POLLING LOOP - THE HEARTBEAT
    // ============================================================
    private startKeeperLoop() {
        if (!this.keeperEnabled) {
            this.logger.warn('🛑 Keeper loop NOT started - Keeper disabled');
            return;
        }

        this.logger.log(`🔄 Starting Keeper loop (polling every ${KEEPER_POLL_INTERVAL_MS / 1000}s)`);

        // Initial poll
        this.pollStrategies().catch(err =>
            this.logger.error('Initial poll failed:', err.message)
        );

        // Set up interval
        this.keeperInterval = setInterval(() => {
            this.pollStrategies().catch(err =>
                this.logger.error('Poll failed:', err.message)
            );
        }, KEEPER_POLL_INTERVAL_MS);
    }

    private async pollStrategies() {
        if (!this.keeperEnabled || !this.keeperKeypair) return;

        try {
            // Fetch all strategies from chain (cast to any for dynamic IDL)
            const allStrategies = await (this.program.account as any).strategy.all();

            // Parse and filter strategies
            const strategies: StrategyData[] = allStrategies.map(s => {
                const account = s.account as any;

                // Parse direction
                let direction = OrderDirection.Sell;
                if (account.direction) {
                    if ('buy' in account.direction) direction = OrderDirection.Buy;
                }

                // Parse status
                let status = StrategyStatus.Active;
                if (account.status) {
                    if ('filled' in account.status) status = StrategyStatus.Filled;
                    else if ('closed' in account.status) status = StrategyStatus.Closed;
                    else if ('cancelled' in account.status) status = StrategyStatus.Cancelled;
                }

                return {
                    pubkey: s.publicKey,
                    id: account.id,
                    owner: account.owner,
                    sellTokenMint: account.sellTokenMint,
                    buyTokenMint: account.buyTokenMint,
                    triggerPrice: account.triggerPrice,
                    pricePrecision: account.pricePrecision,
                    direction,
                    status,
                    takeProfitPrice: account.takeProfitPrice,
                    stopLossPrice: account.stopLossPrice,
                    entryPrice: account.entryPrice,
                    entryTokensReceived: account.entryTokensReceived,
                    boomerangMode: account.boomerangMode ?? false,  // NEW: Parse boomerang mode
                };
            });

            // Filter by status
            const activeStrategies = strategies.filter(s => s.status === StrategyStatus.Active);
            const filledStrategies = strategies.filter(s => s.status === StrategyStatus.Filled);

            this.logger.debug(`📊 Active: ${activeStrategies.length}, Filled: ${filledStrategies.length}`);

            // Process ACTIVE strategies (entry monitoring)
            for (const strategy of activeStrategies) {
                await this.checkAndExecuteEntry(strategy);
            }

            // Process FILLED strategies (exit monitoring)
            for (const strategy of filledStrategies) {
                await this.checkAndExecuteExit(strategy);
            }

        } catch (error) {
            this.logger.error('Error polling strategies:', error.message);
        }
    }

    // ============================================================
    // ENTRY EXECUTION (ACTIVE → FILLED)
    // ============================================================
    private async checkAndExecuteEntry(strategy: StrategyData) {
        try {
            const pdaStrategy = strategy.pubkey.toString();

            // ============================================================
            // CROSS-REFERENCE WITH PRISMA TO GET TRIGGER TYPE
            // On-chain stores price, but Prisma knows if it's MC-based
            // ============================================================
            let triggerType: 'price' | 'marketCap' = 'price';
            const dbStrategy = await this.prisma.strategy.findUnique({
                where: { pdaStrategy },
                select: { triggerType: true, triggerValue: true }
            });

            if (dbStrategy?.triggerType === 'marketCap') {
                triggerType = 'marketCap';
            }

            let shouldTrigger = false;
            let logValue: string = '';

            if (triggerType === 'marketCap') {
                // ============================================================
                // MARKET CAP TRIGGER LOGIC
                // Fetch current market cap and compare with stored triggerValue
                // ============================================================
                const currentMarketCap = await this.priceService.getTokenMarketCap(
                    strategy.sellTokenMint.toString()
                );

                if (currentMarketCap <= 0) {
                    this.logger.debug(`Could not fetch MC for ${pdaStrategy.slice(0, 8)}`);
                    return;
                }

                const targetMarketCap = dbStrategy?.triggerValue || 0;

                // For MC, trigger when current MC reaches or exceeds target
                if (strategy.direction === OrderDirection.Buy) {
                    // BUY: Trigger when MC DROPS TO or BELOW target
                    shouldTrigger = currentMarketCap <= targetMarketCap;
                } else {
                    // SELL: Trigger when MC RISES TO or ABOVE target
                    shouldTrigger = currentMarketCap >= targetMarketCap;
                }

                logValue = `MC: $${(currentMarketCap / 1e6).toFixed(2)}M (target: $${(targetMarketCap / 1e6).toFixed(2)}M)`;

            } else {
                // ============================================================
                // PRICE TRIGGER LOGIC (existing behavior)
                // ============================================================
                const price = await this.fetchPrice(
                    strategy.sellTokenMint.toString(),
                    strategy.buyTokenMint.toString()
                );

                if (!price) {
                    this.logger.debug(`Could not fetch price for ${pdaStrategy.slice(0, 8)}`);
                    return;
                }

                // Scale price to match strategy precision
                const scaledPrice = BigInt(Math.floor(price * Math.pow(10, strategy.pricePrecision)));
                const triggerPrice = BigInt(strategy.triggerPrice.toString());

                // BIDIRECTIONAL TRIGGER LOGIC
                if (strategy.direction === OrderDirection.Buy) {
                    // BUY: Trigger when price DROPS TO or BELOW target
                    shouldTrigger = scaledPrice <= triggerPrice;
                } else {
                    // SELL: Trigger when price RISES TO or ABOVE target
                    shouldTrigger = scaledPrice >= triggerPrice;
                }

                logValue = `Price: ${scaledPrice} (target: ${triggerPrice})`;
            }

            if (!shouldTrigger) return;

            const directionStr = strategy.direction === OrderDirection.Buy ? "BUY" : "SELL";
            const typeStr = triggerType === 'marketCap' ? '📊 MC' : '💰 PRICE';
            this.logger.log(`✅ ${directionStr} Strategy ${pdaStrategy.slice(0, 8)} triggered! ${typeStr} ${logValue}`);

            // Execute entry (use the on-chain trigger price for execution)
            const scaledPrice = BigInt(strategy.triggerPrice.toString());
            await this.executeEntry(strategy, scaledPrice);

        } catch (error) {
            this.logger.error(`Error checking entry for ${strategy.pubkey.toString().slice(0, 8)}:`, error.message);
        }
    }

    private async executeEntry(strategy: StrategyData, currentPrice: bigint) {
        const pdaStrategy = strategy.pubkey.toString();

        try {
            // Get global PDA
            const [globalPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("global")],
                this.program.programId
            );

            // Get escrow PDA
            const [escrowPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("escrow"), strategy.pubkey.toBuffer()],
                this.program.programId
            );

            // Fetch global config (cast to any for dynamic IDL)
            const global = await (this.program.account as any).global.fetch(globalPDA);

            // Get token accounts
            const ownerReceiveATA = await getAssociatedTokenAddress(
                strategy.buyTokenMint,
                strategy.owner
            );

            const escrowTokenAccount = await getAssociatedTokenAddress(
                strategy.sellTokenMint,
                escrowPDA,
                true
            );

            // Get escrow balance
            const escrowBalance = await this.connection.getTokenAccountBalance(escrowTokenAccount);
            const amountToSell = escrowBalance.value.amount;

            if (amountToSell === "0") {
                this.logger.warn(`No tokens in escrow for ${pdaStrategy.slice(0, 8)}`);
                return;
            }

            // Get Jupiter quote
            const quote = await this.getJupiterQuote(
                strategy.sellTokenMint.toString(),
                strategy.buyTokenMint.toString(),
                amountToSell,
                KEEPER_SLIPPAGE_BPS
            );

            if (!quote) {
                this.logger.error('Failed to get Jupiter quote');
                return;
            }

            // Get swap instruction
            const swapInstruction = await this.getJupiterSwapInstruction(
                escrowPDA.toString(),
                quote,
                ownerReceiveATA.toString()
            );

            if (!swapInstruction) {
                this.logger.error('Failed to get Jupiter swap instruction');
                return;
            }

            // Build transaction
            const tx = new Transaction();

            // Add compute budget
            tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
            tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }));

            // Prepare remaining accounts
            const remainingAccounts = swapInstruction.accounts.map(acc => ({
                pubkey: new PublicKey(acc.pubkey),
                isSigner: acc.pubkey === escrowPDA.toString() ? false : acc.isSigner,
                isWritable: acc.isWritable,
            }));

            const jupiterInstructionData = Buffer.from(swapInstruction.data, "base64");

            // Get token programs
            const sellMintInfo = await this.connection.getAccountInfo(strategy.sellTokenMint);
            const buyMintInfo = await this.connection.getAccountInfo(strategy.buyTokenMint);
            const sellTokenProgram = sellMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
            const buyTokenProgram = buyMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            // Get treasury ATA
            const treasuryATA = await getAssociatedTokenAddress(
                strategy.buyTokenMint,
                global.treasury,
                false,
                buyTokenProgram
            );

            // Build execute strategy instruction
            const params = {
                currentPrice: new BN(currentPrice.toString()),
            };

            const executeIx = await this.program.methods
                .executeStrategy(params, jupiterInstructionData)
                .accountsPartial({
                    keeper: this.keeperKeypair!.publicKey,
                    owner: strategy.owner,
                    global: globalPDA,
                    strategy: strategy.pubkey,
                    escrow: escrowPDA,
                    sellTokenMint: strategy.sellTokenMint,
                    sellTokenProgram,
                    buyTokenMint: strategy.buyTokenMint,
                    buyTokenProgram,
                    escrowTokenAccount,
                    ownerReceiveTokenAccount: ownerReceiveATA,
                    treasury: global.treasury,
                    treasuryTokenAccount: treasuryATA,
                    jupiterProgram: new PublicKey(JUPITER_PROGRAM_ID),
                } as any)
                .remainingAccounts(remainingAccounts)
                .instruction();

            tx.add(executeIx);

            // Sign and send
            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            tx.feePayer = this.keeperKeypair!.publicKey;
            tx.sign(this.keeperKeypair!);

            const signature = await this.connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: false,
                maxRetries: 3,
            });

            await this.connection.confirmTransaction(signature, "confirmed");
            this.logger.log(`✅ Entry executed! Tx: ${signature}`);

        } catch (error) {
            // ============================================================
            // DB ROLLBACK: Mark strategy as FAILED to prevent ghost state
            // ============================================================
            this.logger.error(`❌ Entry execution failed for ${pdaStrategy.slice(0, 8)}:`, error.message);
            if (error.logs) {
                this.logger.error('Transaction logs:', error.logs.slice(-10).join('\n'));
            }

            try {
                await this.prisma.strategy.update({
                    where: { pdaStrategy },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        metadata: {
                            failureReason: error.message || 'Entry execution failed',
                            failedAtTimestamp: Date.now(),
                        },
                    },
                });
                this.logger.log(`💾 Strategy ${pdaStrategy.slice(0, 8)} marked as FAILED in DB`);
            } catch (dbError) {
                this.logger.error('Failed to update strategy status in DB:', dbError.message);
            }
        }
    }

    // ============================================================
    // EXIT EXECUTION (FILLED → CLOSED)
    // ============================================================
    private async checkAndExecuteExit(strategy: StrategyData) {
        if (!strategy.takeProfitPrice && !strategy.stopLossPrice) {
            return; // No TP/SL set
        }

        try {
            // For exit, we're monitoring the price of what we bought
            const price = await this.fetchPrice(
                strategy.buyTokenMint.toString(),
                strategy.sellTokenMint.toString()
            );

            if (!price) return;

            const scaledPrice = BigInt(Math.floor(price * Math.pow(10, strategy.pricePrecision)));

            // Check TP/SL conditions
            let exitType: 'tp' | 'sl' | null = null;

            if (strategy.takeProfitPrice) {
                const tpPrice = BigInt(strategy.takeProfitPrice.toString());
                if (scaledPrice >= tpPrice) {
                    exitType = 'tp';
                    this.logger.log(`🎯 TAKE PROFIT triggered for ${strategy.pubkey.toString().slice(0, 8)}!`);
                }
            }

            if (!exitType && strategy.stopLossPrice) {
                const slPrice = BigInt(strategy.stopLossPrice.toString());
                if (scaledPrice <= slPrice) {
                    exitType = 'sl';
                    this.logger.log(`🛑 STOP LOSS triggered for ${strategy.pubkey.toString().slice(0, 8)}!`);
                }
            }

            if (exitType) {
                await this.executeExit(strategy, scaledPrice, exitType === 'tp');
            }

        } catch (error) {
            this.logger.error(`Error checking exit for ${strategy.pubkey.toString().slice(0, 8)}:`, error.message);
        }
    }

    private async executeExit(strategy: StrategyData, currentPrice: bigint, isTakeProfit: boolean) {
        const exitType = isTakeProfit ? 'TAKE PROFIT' : 'STOP LOSS';
        const modeStr = strategy.boomerangMode ? '🪃 BOOMERANG' : '🔒 NORMAL';

        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        this.logger.log(`🔄 EXECUTING EXIT: ${exitType}`);
        this.logger.log(`   Strategy: ${strategy.pubkey.toString().slice(0, 8)}...`);
        this.logger.log(`   Mode: ${modeStr}`);
        this.logger.log(`   Current Price: ${currentPrice}`);
        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        try {
            // ============================================================
            // DERIVE PDAs AND ACCOUNTS
            // ============================================================

            // Get global PDA
            const [globalPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("global")],
                this.program.programId
            );

            // Get escrow PDA
            const [escrowPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("escrow"), strategy.pubkey.toBuffer()],
                this.program.programId
            );

            // Fetch global config
            const global = await (this.program.account as any).global.fetch(globalPDA);

            // ============================================================
            // EXIT TOKENS ARE REVERSED FROM ENTRY
            // Entry: sellToken -> buyToken
            // Exit:  buyToken (now sell) -> sellToken (now buy)
            // ============================================================
            const exitSellTokenMint = strategy.buyTokenMint;   // We're selling what we bought
            const exitBuyTokenMint = strategy.sellTokenMint;   // We're buying back our original token

            // Get token programs
            const exitSellMintInfo = await this.connection.getAccountInfo(exitSellTokenMint);
            const exitBuyMintInfo = await this.connection.getAccountInfo(exitBuyTokenMint);
            const exitSellTokenProgram = exitSellMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
            const exitBuyTokenProgram = exitBuyMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            // ============================================================
            // ESCROW TOKEN ACCOUNTS
            // ============================================================

            // Escrow's ATA holding the profits from entry (source for exit swap)
            const escrowExitSellTokenAccount = await getAssociatedTokenAddress(
                exitSellTokenMint,
                escrowPDA,
                true,  // allowOwnerOffCurve for PDA
                exitSellTokenProgram
            );

            // Check escrow balance
            let escrowBalance: string;
            try {
                const balance = await this.connection.getTokenAccountBalance(escrowExitSellTokenAccount);
                escrowBalance = balance.value.amount;
            } catch {
                this.logger.warn(`Escrow token account not found for ${strategy.pubkey.toString().slice(0, 8)}`);
                return;
            }

            if (escrowBalance === "0") {
                this.logger.warn(`No tokens in escrow for exit: ${strategy.pubkey.toString().slice(0, 8)}`);
                return;
            }

            this.logger.log(`💰 Escrow balance for exit: ${escrowBalance}`);

            // ============================================================
            // DESTINATION ACCOUNTS
            // ============================================================

            // Owner's ATA to receive exit proceeds (used in normal mode)
            const ownerReceiveTokenAccount = await getAssociatedTokenAddress(
                exitBuyTokenMint,
                strategy.owner,
                false,
                exitBuyTokenProgram
            );

            // Escrow's ATA to receive exit proceeds (used in BOOMERANG mode)
            // This is the key difference - funds stay in escrow for the next leg
            const escrowReceiveTokenAccount = await getAssociatedTokenAddress(
                exitBuyTokenMint,
                escrowPDA,
                true,  // allowOwnerOffCurve for PDA
                exitBuyTokenProgram
            );

            // Treasury ATA for fees
            const treasuryATA = await getAssociatedTokenAddress(
                exitBuyTokenMint,
                global.treasury,
                false,
                exitBuyTokenProgram
            );

            // ============================================================
            // JUPITER SWAP QUOTE & INSTRUCTION
            // ============================================================

            // Determine swap destination based on boomerang mode
            const swapDestination = strategy.boomerangMode
                ? escrowReceiveTokenAccount
                : ownerReceiveTokenAccount;

            this.logger.log(`📍 Swap destination: ${strategy.boomerangMode ? 'ESCROW (Boomerang)' : 'OWNER (Normal)'}`);

            // Get Jupiter quote
            const quote = await this.getJupiterQuote(
                exitSellTokenMint.toString(),
                exitBuyTokenMint.toString(),
                escrowBalance,
                KEEPER_SLIPPAGE_BPS
            );

            if (!quote) {
                this.logger.error('Failed to get Jupiter quote for exit');
                return;
            }

            this.logger.log(`📊 Jupiter quote: ${escrowBalance} -> ${quote.outAmount}`);

            // Get swap instruction (escrow PDA is the "user" signing the swap)
            const swapInstruction = await this.getJupiterSwapInstruction(
                escrowPDA.toString(),
                quote,
                swapDestination.toString()
            );

            if (!swapInstruction) {
                this.logger.error('Failed to get Jupiter swap instruction for exit');
                return;
            }

            // ============================================================
            // BUILD TRANSACTION
            // ============================================================
            const tx = new Transaction();

            // Add compute budget
            tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
            tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }));

            // Prepare remaining accounts for Jupiter CPI
            const remainingAccounts = swapInstruction.accounts.map(acc => ({
                pubkey: new PublicKey(acc.pubkey),
                isSigner: acc.pubkey === escrowPDA.toString() ? false : acc.isSigner,  // Escrow signs via PDA
                isWritable: acc.isWritable,
            }));

            const jupiterInstructionData = Buffer.from(swapInstruction.data, "base64");

            // ============================================================
            // BUILD EXECUTE_EXIT INSTRUCTION
            // ============================================================
            const params = {
                strategyId: strategy.id,
                currentPrice: new BN(currentPrice.toString()),
            };

            this.logger.log(`[Keeper] Executing Exit (Boomerang Mode: ${strategy.boomerangMode})`);

            const executeExitIx = await this.program.methods
                .executeExit(params, jupiterInstructionData)
                .accountsPartial({
                    keeper: this.keeperKeypair!.publicKey,
                    owner: strategy.owner,
                    global: globalPDA,
                    strategy: strategy.pubkey,
                    escrow: escrowPDA,
                    exitSellTokenMint: exitSellTokenMint,
                    exitSellTokenProgram: exitSellTokenProgram,
                    exitBuyTokenMint: exitBuyTokenMint,
                    exitBuyTokenProgram: exitBuyTokenProgram,
                    escrowExitSellTokenAccount: escrowExitSellTokenAccount,
                    escrowReceiveTokenAccount: escrowReceiveTokenAccount,  // NEW: For Boomerang mode
                    ownerReceiveTokenAccount: ownerReceiveTokenAccount,
                    treasury: global.treasury,
                    treasuryTokenAccount: treasuryATA,
                    jupiterProgram: new PublicKey(JUPITER_PROGRAM_ID),
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                } as any)
                .remainingAccounts(remainingAccounts)
                .instruction();

            tx.add(executeExitIx);

            // ============================================================
            // SIGN AND SEND
            // ============================================================
            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            tx.feePayer = this.keeperKeypair!.publicKey;
            tx.sign(this.keeperKeypair!);

            const signature = await this.connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: false,
                maxRetries: 3,
            });

            await this.connection.confirmTransaction(signature, "confirmed");

            this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            this.logger.log(`✅ EXIT EXECUTED SUCCESSFULLY!`);
            this.logger.log(`   Type: ${exitType}`);
            this.logger.log(`   Mode: ${modeStr}`);
            this.logger.log(`   Tx: ${signature}`);
            if (strategy.boomerangMode) {
                this.logger.log(`   🪃 Strategy will flip and reset to ACTIVE for return leg`);
            }
            this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        } catch (error) {
            // ============================================================
            // DB ROLLBACK: Mark strategy as FAILED to prevent ghost state
            // ============================================================
            const pdaStrategy = strategy.pubkey.toString();
            this.logger.error(`❌ Exit execution failed for ${pdaStrategy.slice(0, 8)}:`, error.message);
            if (error.logs) {
                this.logger.error('Transaction logs:', error.logs.slice(-10).join('\n'));
            }

            try {
                await this.prisma.strategy.update({
                    where: { pdaStrategy },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        metadata: {
                            failureReason: error.message || 'Exit execution failed',
                            exitType: isTakeProfit ? 'takeProfit' : 'stopLoss',
                            failedAtTimestamp: Date.now(),
                        },
                    },
                });
                this.logger.log(`💾 Strategy ${pdaStrategy.slice(0, 8)} marked as FAILED in DB`);
            } catch (dbError) {
                this.logger.error('Failed to update strategy status in DB:', dbError.message);
            }
        }
    }

    // ============================================================
    // JUPITER API HELPERS
    // ============================================================
    private async fetchPrice(inputMint: string, outputMint: string): Promise<number | null> {
        try {
            const response = await fetch(
                `${JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=1000000&slippageBps=${KEEPER_SLIPPAGE_BPS}`
            );

            if (!response.ok) return null;

            const quote = await response.json();
            return parseFloat(quote.outAmount) / parseFloat(quote.inAmount);
        } catch {
            return null;
        }
    }

    private async getJupiterQuote(
        inputMint: string,
        outputMint: string,
        amount: string,
        slippageBps: number
    ): Promise<any | null> {
        try {
            const response = await fetch(
                `${JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
            );

            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    }

    private async getJupiterSwapInstruction(
        userPublicKey: string,
        quote: any,
        destinationTokenAccount: string
    ): Promise<any | null> {
        try {
            const response = await fetch(`${JUPITER_API_URL}/swap-instructions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quoteResponse: quote,
                    userPublicKey,
                    destinationTokenAccount,
                    dynamicComputeUnitLimit: true,
                    prioritizationFeeLamports: 'auto',
                }),
            });

            if (!response.ok) return null;
            const data = await response.json();
            return data.swapInstruction;
        } catch {
            return null;
        }
    }

    // ============================================================
    // EVENT LISTENER SETUP (INDEXER)
    // ============================================================
    async listenToProgramEvents() {
        if (this.isRunning) {
            this.logger.warn('Event listeners already running');
            return;
        }

        this.isRunning = true;
        this.reconnectAttempts = 0;

        try {
            // Listen to CreateStrategyEvent
            const createListener = this.program.addEventListener(
                'createStrategyEvent',
                async (event: CreateStrategyEvent) => {
                    this.logger.log(`📝 CreateStrategyEvent: ${event.strategy.toString()}`);
                    await this.handleCreateStrategy(event);
                },
            );
            this.eventListeners.push(createListener);

            // Listen to ExecuteStrategyEvent
            const executeListener = this.program.addEventListener(
                'executeStrategyEvent',
                async (event: ExecuteStrategyEvent) => {
                    this.logger.log(`✅ ExecuteStrategyEvent: ${event.strategy.toString()}`);
                    await this.handleExecuteStrategy(event);
                },
            );
            this.eventListeners.push(executeListener);

            // Listen to CancelStrategyEvent
            const cancelListener = this.program.addEventListener(
                'cancelStrategyEvent',
                async (event: CancelStrategyEvent) => {
                    this.logger.log(`❌ CancelStrategyEvent: ${event.strategy.toString()}`);
                    await this.handleCancelStrategy(event);
                },
            );
            this.eventListeners.push(cancelListener);

            // Listen to DepositEscrowEvent
            const depositListener = this.program.addEventListener(
                'depositEscrowEvent',
                async (event: DepositEscrowEvent) => {
                    this.logger.log(`💰 DepositEscrowEvent: ${event.strategy.toString()}`);
                    await this.handleDepositEscrow(event);
                },
            );
            this.eventListeners.push(depositListener);

            // Listen to WithdrawEscrowEvent
            const withdrawListener = this.program.addEventListener(
                'withdrawEscrowEvent',
                async (event: WithdrawEscrowEvent) => {
                    this.logger.log(`💸 WithdrawEscrowEvent: ${event.strategy.toString()}`);
                    await this.handleWithdrawEscrow(event);
                },
            );
            this.eventListeners.push(withdrawListener);

            this.logger.log('👂 Listening to program events...');
        } catch (error) {
            this.logger.error('Error setting up event listeners:', error.message);
            this.isRunning = false;
            throw error;
        }
    }

    private async stop() {
        this.isRunning = false;

        // Stop keeper loop
        if (this.keeperInterval) {
            clearInterval(this.keeperInterval);
            this.keeperInterval = null;
            this.logger.log('🛑 Keeper loop stopped');
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        for (const listenerId of this.eventListeners) {
            try {
                await this.program.removeEventListener(listenerId);
            } catch (error) {
                this.logger.warn(`Error removing listener ${listenerId}:`, error.message);
            }
        }
        this.eventListeners = [];

        this.logger.log('🛑 Blockchain service stopped');
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached.`);
            return;
        }

        const delay = Math.min(
            this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
            this.maxReconnectDelay,
        );

        this.reconnectAttempts++;
        this.logger.log(`🔄 Reconnection attempt ${this.reconnectAttempts} in ${Math.round(delay / 1000)}s...`);

        this.reconnectTimeout = setTimeout(async () => {
            try {
                await this.stop();
                await this.initialize();
                await this.initializeKeeper();
                await this.listenToProgramEvents();
                this.startKeeperLoop();
                this.logger.log('✅ Reconnection successful');
            } catch (error) {
                this.logger.error('Reconnection failed:', error.message);
                this.scheduleReconnect();
            }
        }, delay);
    }

    // 
    // HELPER FUNCTIONS
    // ============================================================
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ============================================================
    // EVENT HANDLERS (INDEXER - unchanged from original)
    // ============================================================
    private async handleCreateStrategy(event: CreateStrategyEvent) {
        const pdaStrategy = event.strategy.toString();
        const owner = event.owner.toString();
        const newSellToken = event.sellTokenMint.toString();
        const newBuyToken = event.buyTokenMint.toString();

        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                let existing = await this.prisma.strategy.findUnique({
                    where: { pdaStrategy },
                });

                // ============================================================
                // CASE 1: BOOMERANG FLIP DETECTED
                // Same PDA exists but tokens are DIFFERENT = Leg 2 of round trip
                // ============================================================
                if (existing && (existing.fromToken !== newSellToken || existing.toToken !== newBuyToken)) {
                    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                    this.logger.log(`🪃 BOOMERANG FLIP DETECTED!`);
                    this.logger.log(`   Strategy: ${pdaStrategy.slice(0, 8)}...`);
                    this.logger.log(`   Old Pair: ${existing.fromToken.slice(0, 8)} → ${existing.toToken.slice(0, 8)}`);
                    this.logger.log(`   New Pair: ${newSellToken.slice(0, 8)} → ${newBuyToken.slice(0, 8)}`);
                    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

                    // ============================================================
                    // ATOMIC TRANSACTION: Update Strategy + Escrow together
                    // Either both succeed or both fail - no partial state
                    // ============================================================
                    await this.prisma.$transaction([
                        // Update strategy with flipped tokens
                        this.prisma.strategy.update({
                            where: { pdaStrategy },
                            data: {
                                fromToken: newSellToken,       // NEW sell token (was buy)
                                toToken: newBuyToken,         // NEW buy token (was sell)
                                status: 'active',              // Reset to active for Leg 2
                                triggeredAt: null,             // Clear previous trigger
                                completedAt: null,             // Clear previous completion
                                depositedAt: new Date(),       // Mark re-deposit time
                                boomerangLeg: 2,               // Track that this is Leg 2
                                metadata: {
                                    ...((existing.metadata as object) || {}),
                                    previousFromToken: existing.fromToken,
                                    previousToToken: existing.toToken,
                                    flippedAt: new Date().toISOString(),
                                },
                            },
                        }),
                        // Update escrow with new token mint
                        this.prisma.escrow.upsert({
                            where: { pdaStrategy },
                            update: {
                                tokenMint: newSellToken,  // New sell token
                                deposited: event.depositAmount?.toString() || '0',
                            },
                            create: {
                                pdaStrategy,
                                owner,
                                tokenMint: newSellToken,
                                deposited: event.depositAmount?.toString() || '0',
                                withdrawn: '0',
                            },
                        }),
                    ]);

                    this.logger.log(`✅ Boomerang Flip complete! Strategy reset to ACTIVE for Leg 2 (ATOMIC)`);
                    return;
                }

                // ============================================================
                // CASE 2: STRATEGY EXISTS (same tokens) - Just update status
                // ============================================================
                if (existing) {
                    await this.prisma.strategy.update({
                        where: { pdaStrategy },
                        data: {
                            status: 'active',
                            depositedAt: new Date(),
                        },
                    });
                    this.logger.log(`💾 Updated strategy ${pdaStrategy} -> active`);

                    await this.prisma.escrow.upsert({
                        where: { pdaStrategy },
                        update: {
                            deposited: event.depositAmount?.toString() || '0',
                        },
                        create: {
                            pdaStrategy,
                            owner,
                            tokenMint: event.sellTokenMint.toString(),
                            deposited: event.depositAmount?.toString() || '0',
                            withdrawn: '0',
                        },
                    });

                    this.logger.log(`💾 Escrow created/updated for ${pdaStrategy}`);
                    return;
                }

                // ============================================================
                // CASE 3: TRY TO FIND UNLINKED STRATEGY (from frontend pre-creation)
                // ============================================================
                if (!existing) {
                    const unlinkedStrategy = await this.prisma.strategy.findFirst({
                        where: {
                            pdaStrategy: null,
                            status: 'created',
                            wallet: {
                                publicKey: owner,
                            },
                            fromToken: newSellToken,
                            toToken: newBuyToken,
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                    });

                    if (unlinkedStrategy) {
                        await this.prisma.strategy.update({
                            where: { id: unlinkedStrategy.id },
                            data: {
                                pdaStrategy,
                                pdaEscrow: event.escrow?.toString() || event.strategy.toString(),
                                status: 'active',
                                depositedAt: new Date(),
                            },
                        });
                        this.logger.log(`💾 Linked strategy ${unlinkedStrategy.id} -> ${pdaStrategy} (active)`);

                        await this.prisma.escrow.upsert({
                            where: { pdaStrategy },
                            update: {
                                deposited: event.depositAmount?.toString() || '0',
                            },
                            create: {
                                pdaStrategy,
                                owner,
                                tokenMint: newSellToken,
                                deposited: event.depositAmount?.toString() || '0',
                                withdrawn: '0',
                            },
                        });

                        this.logger.log(`💾 Escrow created/updated for ${pdaStrategy}`);
                        return;
                    }
                }

                // ============================================================
                // CASE 4: RETRY - Strategy not found yet
                // ============================================================
                if (attempt < MAX_RETRIES) {
                    this.logger.warn(`⏳ Strategy ${pdaStrategy} not found (attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }

            } catch (error) {
                this.logger.error(`Error handling CreateStrategyEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }

        this.logger.error(`❌ Strategy ${pdaStrategy} not found after ${MAX_RETRIES} retries.`);
    }

    private async handleExecuteStrategy(event: ExecuteStrategyEvent) {
        const pdaStrategy = event.strategy.toString();

        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                const existing = await this.prisma.strategy.findUnique({
                    where: { pdaStrategy },
                });

                if (!existing) {
                    if (attempt < MAX_RETRIES) {
                        await this.sleep(RETRY_DELAY_MS * attempt);
                        continue;
                    }
                    return;
                }

                await this.prisma.strategy.update({
                    where: { pdaStrategy },
                    data: {
                        status: 'completed',
                        completedAt: new Date(),
                        metadata: {
                            ...((existing.metadata as object) || {}),
                            executionPrice: event.executionPrice?.toString() || event.execution_price?.toString(),
                            tokensReceived: event.tokensReceived?.toString() || event.tokens_received?.toString(),
                        },
                    },
                });

                const tokensSold = event.tokensSold?.toString() || event.tokens_sold?.toString() || '0';
                const escrow = await this.prisma.escrow.findUnique({ where: { pdaStrategy } });

                if (escrow) {
                    const currentWithdrawn = BigInt(escrow.withdrawn);
                    const newWithdrawn = (currentWithdrawn + BigInt(tokensSold)).toString();

                    await this.prisma.escrow.update({
                        where: { pdaStrategy },
                        data: { withdrawn: newWithdrawn },
                    });
                }

                this.logger.log(`💾 Strategy ${pdaStrategy} marked as completed`);
                return;

            } catch (error) {
                this.logger.error(`Error handling ExecuteStrategyEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
    }

    private async handleCancelStrategy(event: CancelStrategyEvent) {
        const pdaStrategy = event.strategy.toString();

        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                const existing = await this.prisma.strategy.findUnique({
                    where: { pdaStrategy },
                });

                if (!existing) {
                    if (attempt < MAX_RETRIES) {
                        await this.sleep(RETRY_DELAY_MS * attempt);
                        continue;
                    }
                    return;
                }

                await this.prisma.strategy.update({
                    where: { pdaStrategy },
                    data: {
                        status: 'cancelled',
                        completedAt: new Date(),
                    },
                });

                this.logger.log(`💾 Strategy ${pdaStrategy} marked as cancelled`);
                return;

            } catch (error) {
                this.logger.error(`Error handling CancelStrategyEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
    }

    private async handleDepositEscrow(event: DepositEscrowEvent) {
        const pdaStrategy = event.strategy.toString();

        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                const escrow = await this.prisma.escrow.findUnique({ where: { pdaStrategy } });

                if (!escrow) {
                    if (attempt < MAX_RETRIES) {
                        await this.sleep(RETRY_DELAY_MS * attempt);
                        continue;
                    }
                    return;
                }

                await this.prisma.escrow.update({
                    where: { pdaStrategy },
                    data: {
                        deposited: event.newTotalDeposited.toString(),
                    },
                });

                this.logger.log(`💾 Escrow deposit updated for ${pdaStrategy}`);
                return;

            } catch (error) {
                this.logger.error(`Error handling DepositEscrowEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
    }

    private async handleWithdrawEscrow(event: WithdrawEscrowEvent) {
        const pdaStrategy = event.strategy.toString();

        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                const escrow = await this.prisma.escrow.findUnique({ where: { pdaStrategy } });

                if (!escrow) {
                    if (attempt < MAX_RETRIES) {
                        await this.sleep(RETRY_DELAY_MS * attempt);
                        continue;
                    }
                    return;
                }

                await this.prisma.escrow.update({
                    where: { pdaStrategy },
                    data: {
                        withdrawn: event.newTotalWithdrawn.toString(),
                    },
                });

                this.logger.log(`💾 Escrow withdrawal updated for ${pdaStrategy}`);
                return;

            } catch (error) {
                this.logger.error(`Error handling WithdrawEscrowEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
    }
}
