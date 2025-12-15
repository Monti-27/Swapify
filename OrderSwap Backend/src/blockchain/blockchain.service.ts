import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PrismaService } from '../prisma/prisma.service';

import {
    CreateStrategyEvent,
    ExecuteStrategyEvent,
    CancelStrategyEvent,
    DepositEscrowEvent,
    WithdrawEscrowEvent,
} from './types';

// Import IDL
import idl from './idl/weswap.json';

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000; // 1 second base delay

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BlockchainService.name);

    private connection: Connection;
    private program: Program<any>;
    private eventListeners: number[] = [];
    private isRunning = false;

    // Reconnection settings
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 10;
    private readonly baseReconnectDelay = 1000;
    private readonly maxReconnectDelay = 30000;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) { }

    async onModuleInit() {
        try {
            await this.initialize();
            await this.listenToProgramEvents();
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

        this.logger.log('🛑 Blockchain indexer stopped');
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
                await this.listenToProgramEvents();
                this.logger.log('✅ Reconnection successful');
            } catch (error) {
                this.logger.error('Reconnection failed:', error.message);
                this.scheduleReconnect();
            }
        }, delay);
    }

    // ============================================================
    // HELPER: Sleep function for retry delays
    // ============================================================
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ============================================================
    // EVENT HANDLERS - UPDATE ONLY PATTERN WITH RETRY LOGIC
    // ============================================================

    /**
     * Handle CreateStrategyEvent
     * 
     * CRITICAL: Uses UPDATE-ONLY pattern with RETRY LOOP.
     * The strategy row MUST already exist in DB (created by frontend/API).
     * If not found, we retry up to MAX_RETRIES times to wait for API to create it.
     */
    private async handleCreateStrategy(event: CreateStrategyEvent) {
        const pdaStrategy = event.strategy.toString();
        const owner = event.owner.toString();

        let attempt = 0;

        // RETRY LOOP - Wait for frontend/API to create the row first
        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                // Try to find strategy by pdaStrategy
                let existing = await this.prisma.strategy.findUnique({
                    where: { pdaStrategy },
                });

                // If not found by pdaStrategy, try to link a 'created' strategy for this owner
                if (!existing) {
                    // Find a strategy with status 'created' that belongs to this owner
                    // and has matching tokens but no pdaStrategy set yet
                    const unlinkedStrategy = await this.prisma.strategy.findFirst({
                        where: {
                            pdaStrategy: null,
                            status: 'created',
                            wallet: {
                                publicKey: owner,
                            },
                            fromToken: event.sellTokenMint.toString(),
                            toToken: event.buyTokenMint.toString(),
                        },
                        orderBy: {
                            createdAt: 'desc', // Get the most recent one
                        },
                    });

                    if (unlinkedStrategy) {
                        // Link this strategy to the on-chain PDA
                        await this.prisma.strategy.update({
                            where: { id: unlinkedStrategy.id },
                            data: {
                                pdaStrategy,
                                pdaEscrow: event.strategy.toString(), // Same as strategy PDA for now
                                status: 'active',
                                depositedAt: new Date(),
                            },
                        });
                        this.logger.log(`💾 Linked strategy ${unlinkedStrategy.id} -> ${pdaStrategy} (active)`);
                        existing = await this.prisma.strategy.findUnique({ where: { pdaStrategy } });
                    }
                }

                if (existing) {
                    // Strategy found - UPDATE status to active (not insert!)
                    await this.prisma.strategy.update({
                        where: { pdaStrategy },
                        data: {
                            status: 'active',
                            depositedAt: new Date(),
                        },
                    });
                    this.logger.log(`💾 Updated strategy ${pdaStrategy} -> active`);

                    // Create or update Escrow entry
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
                    return; // Success - exit retry loop
                }

                // Strategy not found - wait and retry
                if (attempt < MAX_RETRIES) {
                    this.logger.warn(`⏳ Strategy ${pdaStrategy} not found (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS}ms...`);
                    await this.sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
                }

            } catch (error) {
                this.logger.error(`Error handling CreateStrategyEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }

        // All retries exhausted
        this.logger.error(`❌ Strategy ${pdaStrategy} not found after ${MAX_RETRIES} retries. Frontend should create it first.`);
    }

    /**
     * Handle ExecuteStrategyEvent
     * Update the strategy status to 'completed' with RETRY LOGIC.
     */
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
                        this.logger.warn(`⏳ Strategy ${pdaStrategy} not found for execution (attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
                        await this.sleep(RETRY_DELAY_MS * attempt);
                        continue;
                    }
                    this.logger.error(`❌ Strategy ${pdaStrategy} not found for execution after ${MAX_RETRIES} retries`);
                    return;
                }

                // UPDATE strategy to completed
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

                // Update escrow withdrawn amount
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
                return; // Success

            } catch (error) {
                this.logger.error(`Error handling ExecuteStrategyEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
    }

    /**
     * Handle CancelStrategyEvent
     * Update the strategy status to 'cancelled' with RETRY LOGIC.
     */
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
                        this.logger.warn(`⏳ Strategy ${pdaStrategy} not found for cancel (attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
                        await this.sleep(RETRY_DELAY_MS * attempt);
                        continue;
                    }
                    this.logger.error(`❌ Strategy ${pdaStrategy} not found for cancel after ${MAX_RETRIES} retries`);
                    return;
                }

                // UPDATE strategy to cancelled
                await this.prisma.strategy.update({
                    where: { pdaStrategy },
                    data: {
                        status: 'cancelled',
                        completedAt: new Date(),
                    },
                });

                this.logger.log(`💾 Strategy ${pdaStrategy} marked as cancelled`);
                return; // Success

            } catch (error) {
                this.logger.error(`Error handling CancelStrategyEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
    }

    /**
     * Handle DepositEscrowEvent
     * Update the escrow deposited amount with RETRY LOGIC.
     */
    private async handleDepositEscrow(event: DepositEscrowEvent) {
        const pdaStrategy = event.strategy.toString();

        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                const escrow = await this.prisma.escrow.findUnique({ where: { pdaStrategy } });

                if (!escrow) {
                    if (attempt < MAX_RETRIES) {
                        this.logger.warn(`⏳ Escrow ${pdaStrategy} not found for deposit (attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
                        await this.sleep(RETRY_DELAY_MS * attempt);
                        continue;
                    }
                    this.logger.error(`❌ Escrow ${pdaStrategy} not found for deposit after ${MAX_RETRIES} retries`);
                    return;
                }

                await this.prisma.escrow.update({
                    where: { pdaStrategy },
                    data: {
                        deposited: event.newTotalDeposited.toString(),
                    },
                });

                this.logger.log(`💾 Escrow deposit updated for ${pdaStrategy}`);
                return; // Success

            } catch (error) {
                this.logger.error(`Error handling DepositEscrowEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
    }

    /**
     * Handle WithdrawEscrowEvent
     * Update the escrow withdrawn amount with RETRY LOGIC.
     */
    private async handleWithdrawEscrow(event: WithdrawEscrowEvent) {
        const pdaStrategy = event.strategy.toString();

        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            attempt++;

            try {
                const escrow = await this.prisma.escrow.findUnique({ where: { pdaStrategy } });

                if (!escrow) {
                    if (attempt < MAX_RETRIES) {
                        this.logger.warn(`⏳ Escrow ${pdaStrategy} not found for withdrawal (attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
                        await this.sleep(RETRY_DELAY_MS * attempt);
                        continue;
                    }
                    this.logger.error(`❌ Escrow ${pdaStrategy} not found for withdrawal after ${MAX_RETRIES} retries`);
                    return;
                }

                await this.prisma.escrow.update({
                    where: { pdaStrategy },
                    data: {
                        withdrawn: event.newTotalWithdrawn.toString(),
                    },
                });

                this.logger.log(`💾 Escrow withdrawal updated for ${pdaStrategy}`);
                return; // Success

            } catch (error) {
                this.logger.error(`Error handling WithdrawEscrowEvent (attempt ${attempt}):`, error);
                if (attempt < MAX_RETRIES) {
                    await this.sleep(RETRY_DELAY_MS * attempt);
                }
            }
        }
    }
}
