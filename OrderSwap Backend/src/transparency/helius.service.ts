import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

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
     * @returns FetchResult with new transactions and metadata
     */
    async fetchNewTransactions(
        address: string,
        stopAtSignature?: string | null,
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

        this.logger.log(
            `🔍 Fetching transactions for ${address.slice(0, 8)}...` +
            (stopAtSignature ? ` (until: ${stopAtSignature.slice(0, 8)}...)` : ' (full scan)')
        );

        while (pagesProcessed < this.MAX_PAGES) {
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
}
