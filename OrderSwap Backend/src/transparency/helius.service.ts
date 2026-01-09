import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import bs58 from 'bs58';

// ============================================================
// 📦 Helius Enhanced Transaction Types (Paid API Response)
// ============================================================

export interface NativeTransfer {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number; // in lamports
}

export interface TokenTransfer {
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
}

export interface AccountData {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
        userAccount: string;
        tokenAccount: string;
        mint: string;
        rawTokenAmount: {
            tokenAmount: string;
            decimals: number;
        };
    }>;
}

export interface EnhancedTransaction {
    signature: string;
    timestamp: number; // Unix timestamp in seconds
    slot: number;
    fee: number;
    feePayer: string;
    type: string; // "TRANSFER", "SWAP", "NFT_SALE", etc.
    source: string; // "SYSTEM_PROGRAM", "JUPITER", etc.
    description: string;

    // Transfer data
    nativeTransfers: NativeTransfer[];
    tokenTransfers: TokenTransfer[];

    // Account changes
    accountData: AccountData[];

    // Error info
    transactionError: any | null;
}

export interface FetchResult {
    transactions: EnhancedTransaction[];
    oldestSignature: string | null;
    reachedCheckpoint: boolean;
}

@Injectable()
export class HeliusService {
    private readonly logger = new Logger(HeliusService.name);
    private readonly client: AxiosInstance;
    private readonly apiKey: string;
    private readonly isAvailable: boolean;

    // ============================================================
    // 🔧 Configuration Constants
    // ============================================================
    private readonly BASE_URL = 'https://api.helius.xyz/v0';
    private readonly TRANSACTIONS_PER_PAGE = 100; // Helius max per request
    private readonly MAX_PAGES = 5; // Safety valve to prevent runaway loops

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('HELIUS_API_KEY') || '';
        this.isAvailable = !!this.apiKey;

        if (!this.isAvailable) {
            this.logger.warn('⚠️ HELIUS_API_KEY not configured - Transparency Engine will be disabled');
        } else {
            this.logger.log('✅ Helius Paid API configured for Transparency Engine');
        }

        this.client = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Check if Helius API is available
     */
    checkAvailability(): boolean {
        return this.isAvailable;
    }

    /**
     * Fetch new transactions for an address using the Paid API endpoint.
     * Uses incremental scanning with stopAtSignature checkpoint.
     * 
     * @param address - Solana wallet address to scan
     * @param stopAtSignature - Stop fetching when this signature is encountered (checkpoint)
     * @param limit - Optional: Stop after fetching this many transactions (for quick scans)
     * @returns FetchResult with new transactions and metadata
     */
    async fetchNewTransactions(
        address: string,
        stopAtSignature?: string | null,
        limit?: number,
    ): Promise<FetchResult> {
        if (!this.isAvailable) {
            throw new HttpException(
                'Helius API not configured. Please set HELIUS_API_KEY environment variable.',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        const allTransactions: EnhancedTransaction[] = [];
        let beforeSignature: string | undefined = undefined;
        let reachedCheckpoint = false;
        let pagesProcessed = 0;

        // Calculate max pages based on limit if provided
        const effectiveMaxPages = limit
            ? Math.ceil(limit / this.TRANSACTIONS_PER_PAGE)
            : this.MAX_PAGES;

        this.logger.log(
            `🔍 Fetching transactions for ${address.slice(0, 8)}...` +
            (limit ? ` (quick scan: limit ${limit})` : '') +
            (stopAtSignature ? ` (until: ${stopAtSignature.slice(0, 8)}...)` : '')
        );

        while (pagesProcessed < effectiveMaxPages) {
            try {
                // Build request URL with query params
                const url = this.buildTransactionsUrl(address, beforeSignature);

                this.logger.debug(`Page ${pagesProcessed + 1}: Fetching from ${url.slice(0, 80)}...`);

                const response = await this.client.get<EnhancedTransaction[]>(url);
                const transactions: EnhancedTransaction[] = response.data || [];

                if (transactions.length === 0) {
                    this.logger.debug('No more transactions available');
                    break;
                }

                // Check if checkpoint signature exists in this batch
                if (stopAtSignature) {
                    const checkpointIndex = transactions.findIndex(
                        tx => tx.signature === stopAtSignature
                    );

                    if (checkpointIndex !== -1) {
                        // Found checkpoint! Take only transactions BEFORE it (newer ones)
                        const newTransactions = transactions.slice(0, checkpointIndex);
                        allTransactions.push(...newTransactions);
                        reachedCheckpoint = true;

                        this.logger.log(
                            `✅ Reached checkpoint after ${pagesProcessed + 1} page(s). ` +
                            `Found ${newTransactions.length} new transactions in final batch.`
                        );
                        break;
                    }
                }

                // No checkpoint found in this batch, add all and continue
                allTransactions.push(...transactions);
                pagesProcessed++;

                // Update pagination cursor to oldest transaction in batch
                beforeSignature = transactions[transactions.length - 1].signature;

                this.logger.debug(
                    `Page ${pagesProcessed}: Fetched ${transactions.length} transactions ` +
                    `(total: ${allTransactions.length})`
                );

                // 🚀 QUICK SCAN: Stop if we've reached the limit
                if (limit && allTransactions.length >= limit) {
                    this.logger.log(`Quick scan complete: reached ${limit} transaction limit`);
                    break;
                }

                // If we got fewer than requested, we've reached the end
                if (transactions.length < this.TRANSACTIONS_PER_PAGE) {
                    this.logger.debug('Reached end of transaction history');
                    break;
                }

            } catch (error: any) {
                if (error.response?.status === 429) {
                    throw new HttpException(
                        'Helius API rate limit exceeded. Please try again later.',
                        HttpStatus.TOO_MANY_REQUESTS,
                    );
                }

                this.logger.error(`Helius API error: ${error.message}`);
                throw new HttpException(
                    `Failed to fetch transactions from Helius: ${error.message}`,
                    HttpStatus.BAD_GATEWAY,
                );
            }
        }

        // Safety valve triggered
        if (pagesProcessed >= this.MAX_PAGES && !reachedCheckpoint && stopAtSignature) {
            this.logger.warn(
                `⚠️ Safety valve triggered after ${this.MAX_PAGES} pages. ` +
                `Checkpoint not found - it may be very old. Returning ${allTransactions.length} transactions.`
            );
        }

        const oldestSignature = allTransactions.length > 0
            ? allTransactions[allTransactions.length - 1].signature
            : null;

        const newestSignature = allTransactions.length > 0
            ? allTransactions[0].signature
            : null;

        this.logger.log(
            `✅ Fetch complete: ${allTransactions.length} transactions ` +
            `(${pagesProcessed} page(s), checkpoint ${reachedCheckpoint ? 'reached' : 'not reached'})` +
            (newestSignature ? ` | Newest: ${newestSignature.slice(0, 8)}...` : '')
        );

        return {
            transactions: allTransactions,
            oldestSignature,
            reachedCheckpoint,
        };
    }

    /**
     * Build the Helius Enhanced Transactions API URL
     */
    private buildTransactionsUrl(address: string, before?: string): string {
        const params = new URLSearchParams({
            'api-key': this.apiKey,
            'limit': this.TRANSACTIONS_PER_PAGE.toString(),
        });

        if (before) {
            params.set('before', before);
        }

        return `${this.BASE_URL}/addresses/${address}/transactions?${params.toString()}`;
    }

    /**
     * Get the newest signature from a wallet (for checkpoint initialization)
     */
    async getNewestSignature(address: string): Promise<string | null> {
        const result = await this.fetchNewTransactions(address, null);
        return result.transactions.length > 0 ? result.transactions[0].signature : null;
    }

    /**
     * Health check - verify API connectivity
     */
    async healthCheck(): Promise<boolean> {
        if (!this.isAvailable) {
            return false;
        }

        try {
            // Use a known active address for health check (Solana Foundation)
            const testAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const url = this.buildTransactionsUrl(testAddress);
            const response = await this.client.get(url, { timeout: 5000 });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    // ============================================================
    // 🔍 CLUSTER ANALYSIS METHODS
    // ============================================================

    /**
     * Mode A: Snapshot - Get current token holders using SHARDED PREFIX SAMPLING
     * 
     * CRITICAL: For large tokens (100k+ holders), a single getProgramAccounts call
     * will crash Node.js due to V8's string size limit. Instead, we query in shards
     * by filtering on the first byte of the owner address (256 possible prefixes).
     * 
     * This approach:
     * 1. Queries small batches (each shard typically returns <1000 accounts)
     * 2. Stops as soon as we hit the limit (no wasted requests)
     * 3. Never crashes regardless of token size
     * 
     * @param mint - Token mint address
     * @param limit - Max number of holders to fetch (safety limit)
     */
    async getTokenHolders(mint: string, limit: number = 2000): Promise<string[]> {
        if (!this.isAvailable) {
            throw new HttpException(
                'Helius API not configured',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        this.logger.log(`📊 Fetching token holders for ${mint.slice(0, 8)}... (limit: ${limit}) using sharded sampling`);

        const rpcUrl = this.configService.get<string>('HELIUS_RPC_URL') ||
            `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;

        const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        const allHolders = new Set<string>();

        // Generate shuffled prefix bytes (0-255) for random sampling
        const prefixBytes = this.shuffleArray([...Array(256).keys()]);

        let shardsProcessed = 0;
        let shardsWithData = 0;
        let shardsFailed = 0;

        for (const prefixByte of prefixBytes) {
            // Stop if we have enough holders
            if (allHolders.size >= limit) {
                this.logger.debug(`🎯 Reached limit of ${limit} holders after ${shardsProcessed} shards`);
                break;
            }

            try {
                // Convert prefix byte to base58 for memcmp filter
                // CRITICAL: Must use proper bs58 encoding for Helius to accept the filter
                const prefixBuffer = Buffer.from([prefixByte]);
                const prefixBase58 = bs58.encode(prefixBuffer);

                const response = await this.client.post(rpcUrl, {
                    jsonrpc: '2.0',
                    id: `shard-${prefixByte}`,
                    method: 'getProgramAccounts',
                    params: [
                        TOKEN_PROGRAM_ID,
                        {
                            encoding: 'base64',
                            // Only fetch owner address (32 bytes at offset 32)
                            dataSlice: {
                                offset: 32,
                                length: 32,
                            },
                            filters: [
                                { dataSize: 165 }, // SPL Token Account size
                                { memcmp: { offset: 0, bytes: mint } }, // Match mint
                                { memcmp: { offset: 32, bytes: prefixBase58 } }, // Match owner prefix
                            ],
                        },
                    ],
                }, {
                    timeout: 15000, // 15s per shard (much faster than 60s for full query)
                    maxContentLength: 50 * 1024 * 1024, // 50MB max per shard
                });

                shardsProcessed++;

                // Check for RPC error
                if (response.data?.error) {
                    this.logger.debug(`Shard ${prefixByte} RPC error: ${response.data.error.message}`);
                    shardsFailed++;
                    continue;
                }

                const accounts = response.data?.result || [];

                if (accounts.length > 0) {
                    shardsWithData++;

                    for (const account of accounts) {
                        if (allHolders.size >= limit) break;

                        try {
                            const ownerData = account.account?.data;
                            if (!ownerData || !ownerData[0]) continue;

                            const ownerBytes = Buffer.from(ownerData[0], 'base64');
                            if (ownerBytes.length !== 32) continue;

                            const owner = bs58.encode(ownerBytes);
                            allHolders.add(owner);
                        } catch {
                            // Skip malformed accounts
                        }
                    }
                }

                // Progress logging every 32 shards
                if (shardsProcessed % 32 === 0) {
                    this.logger.debug(
                        `Progress: ${shardsProcessed}/256 shards | ${allHolders.size}/${limit} holders | ${shardsWithData} with data`
                    );
                }

            } catch (error: any) {
                shardsFailed++;
                shardsProcessed++;

                // Log but continue - one shard failure shouldn't stop the whole query
                if (error.code !== 'ECONNABORTED') {
                    this.logger.debug(`Shard ${prefixByte} failed: ${error.message?.slice(0, 50)}`);
                }
            }
        }

        this.logger.log(
            `✅ Sharded sampling complete: ${allHolders.size} unique holders ` +
            `(${shardsProcessed} shards, ${shardsWithData} with data, ${shardsFailed} failed)`
        );

        // If we got very few results despite processing many shards, the token might not exist
        if (allHolders.size === 0 && shardsProcessed > 50) {
            this.logger.warn(`No holders found for token ${mint.slice(0, 8)}... - token may not exist`);
        }

        return Array.from(allHolders).slice(0, limit);
    }

    /**
     * Fisher-Yates shuffle for random sampling
     */
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Mode B: Historical - Get wallets that have interacted with a token
     * Uses transaction history of the mint address
     * @param mint - Token mint address
     * @param limit - Max number of unique interactors to fetch
     */
    async getTokenInteractors(mint: string, limit: number = 2000): Promise<string[]> {
        if (!this.isAvailable) {
            throw new HttpException(
                'Helius API not configured',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        this.logger.log(`🕰️ Fetching token interactors for ${mint.slice(0, 8)}... (limit: ${limit})`);

        const interactors = new Set<string>();
        let beforeSignature: string | undefined = undefined;
        let pagesProcessed = 0;
        const maxPages = Math.ceil(limit / this.TRANSACTIONS_PER_PAGE);

        while (pagesProcessed < maxPages && interactors.size < limit) {
            try {
                const url = this.buildTransactionsUrl(mint, beforeSignature);
                const response = await this.client.get<EnhancedTransaction[]>(url);
                const transactions: EnhancedTransaction[] = response.data || [];

                if (transactions.length === 0) break;

                // Extract unique signers (fee payers are the transaction initiators)
                for (const tx of transactions) {
                    if (interactors.size >= limit) break;

                    // Add fee payer (main signer)
                    if (tx.feePayer) {
                        interactors.add(tx.feePayer);
                    }

                    // Also extract from token transfers
                    for (const transfer of tx.tokenTransfers || []) {
                        if (interactors.size >= limit) break;
                        if (transfer.fromUserAccount) interactors.add(transfer.fromUserAccount);
                        if (transfer.toUserAccount) interactors.add(transfer.toUserAccount);
                    }
                }

                pagesProcessed++;
                beforeSignature = transactions[transactions.length - 1].signature;

                if (transactions.length < this.TRANSACTIONS_PER_PAGE) break;

            } catch (error: any) {
                this.logger.error(`Error fetching interactors page ${pagesProcessed}: ${error.message}`);
                break;
            }
        }

        this.logger.log(`✅ Found ${interactors.size} unique interactors (${pagesProcessed} pages processed)`);
        return Array.from(interactors);
    }

    // ============================================================
    // 🔧 Helper Methods for Binary Parsing
    // ============================================================

    private readonly BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    private encodeBase58(bytes: Buffer): string {
        if (bytes.length === 0) return '';

        // Count leading zeros
        let zeros = 0;
        for (const byte of bytes) {
            if (byte === 0) zeros++;
            else break;
        }

        // Convert to base58
        const digits = [0];
        for (const byte of bytes) {
            let carry = byte;
            for (let i = 0; i < digits.length; i++) {
                carry += digits[i] << 8;
                digits[i] = carry % 58;
                carry = Math.floor(carry / 58);
            }
            while (carry > 0) {
                digits.push(carry % 58);
                carry = Math.floor(carry / 58);
            }
        }

        // Build result string
        let result = '';
        for (let i = 0; i < zeros; i++) {
            result += this.BASE58_ALPHABET[0];
        }
        for (let i = digits.length - 1; i >= 0; i--) {
            result += this.BASE58_ALPHABET[digits[i]];
        }

        return result;
    }

    private readUint64LE(buffer: Buffer): bigint {
        let result = 0n;
        for (let i = 0; i < 8; i++) {
            result += BigInt(buffer[i]) << BigInt(i * 8);
        }
        return result;
    }
}

