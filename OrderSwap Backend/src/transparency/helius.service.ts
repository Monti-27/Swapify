import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface HeliusSignature {
    signature: string;
    slot: number;
    blockTime: number | null;
    err: any | null;
}

export interface HeliusEnhancedTransaction {
    signature: string;
    timestamp: number;
    fee: number;
    feePayer: string;
    slot: number;
    nativeTransfers: Array<{
        fromUserAccount: string;
        toUserAccount: string;
        amount: number;
    }>;
    tokenTransfers: Array<{
        fromUserAccount: string;
        toUserAccount: string;
        fromTokenAccount: string;
        toTokenAccount: string;
        tokenAmount: number;
        mint: string;
    }>;
    transactionError: any | null;
    type: string;
    source: string;
}

@Injectable()
export class HeliusService {
    private readonly logger = new Logger(HeliusService.name);
    private readonly client: AxiosInstance;
    private readonly rpcUrl: string;
    private readonly apiKey: string;
    private readonly isAvailable: boolean;

    // Rate limiting
    private readonly MAX_SIGNATURES_PER_REQUEST = 1000;
    private readonly MAX_TRANSACTIONS_PER_BATCH = 100;

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('HELIUS_API_KEY') || '';
        this.rpcUrl = this.configService.get<string>('HELIUS_RPC_URL') ||
            `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;

        this.isAvailable = !!this.apiKey;

        if (!this.isAvailable) {
            this.logger.warn('⚠️ HELIUS_API_KEY not configured - Transparency Engine will be disabled');
        } else {
            this.logger.log('✅ Helius API configured for Transparency Engine');
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
     * Fetch transaction signatures for a wallet with incremental scanning support
     * Uses the 'until' parameter to stop at the lastSignature checkpoint
     */
    async fetchSignatures(
        address: string,
        lastSignature?: string | null,
        limit: number = this.MAX_SIGNATURES_PER_REQUEST,
    ): Promise<HeliusSignature[]> {
        if (!this.isAvailable) {
            throw new Error('Helius API not configured');
        }

        const allSignatures: HeliusSignature[] = [];
        let beforeSignature: string | undefined = undefined;
        let hasMore = true;

        this.logger.log(`Fetching signatures for ${address.slice(0, 8)}...${lastSignature ? ` (until: ${lastSignature.slice(0, 8)}...)` : ''}`);

        while (hasMore && allSignatures.length < limit) {
            try {
                const params: any = {
                    limit: Math.min(this.MAX_SIGNATURES_PER_REQUEST, limit - allSignatures.length),
                };

                // Pagination: fetch before this signature
                if (beforeSignature) {
                    params.before = beforeSignature;
                }

                // Incremental scanning: stop at this signature
                if (lastSignature) {
                    params.until = lastSignature;
                }

                const response = await this.client.post(this.rpcUrl, {
                    jsonrpc: '2.0',
                    id: 'helius-signatures',
                    method: 'getSignaturesForAddress',
                    params: [address, params],
                });

                const signatures: HeliusSignature[] = response.data?.result || [];

                if (signatures.length === 0) {
                    hasMore = false;
                    break;
                }

                allSignatures.push(...signatures);
                beforeSignature = signatures[signatures.length - 1].signature;

                // If we got fewer than requested, we've reached the end
                if (signatures.length < params.limit) {
                    hasMore = false;
                }

                this.logger.debug(`Fetched ${signatures.length} signatures (total: ${allSignatures.length})`);
            } catch (error) {
                this.logger.error(`Error fetching signatures: ${error.message}`);
                throw error;
            }
        }

        this.logger.log(`✅ Total signatures fetched: ${allSignatures.length}`);
        return allSignatures;
    }

    /**
     * Fetch enhanced transaction data using Helius Enhanced Transactions API
     */
    async getEnhancedTransactions(
        signatures: string[],
    ): Promise<HeliusEnhancedTransaction[]> {
        if (!this.isAvailable) {
            throw new Error('Helius API not configured');
        }

        if (signatures.length === 0) {
            return [];
        }

        const allTransactions: HeliusEnhancedTransaction[] = [];
        const enhancedApiUrl = `https://api.helius.xyz/v0/transactions?api-key=${this.apiKey}`;

        // Process in batches
        for (let i = 0; i < signatures.length; i += this.MAX_TRANSACTIONS_PER_BATCH) {
            const batch = signatures.slice(i, i + this.MAX_TRANSACTIONS_PER_BATCH);

            try {
                const response = await this.client.post(enhancedApiUrl, {
                    transactions: batch,
                });

                const transactions: HeliusEnhancedTransaction[] = response.data || [];
                allTransactions.push(...transactions);

                this.logger.debug(`Fetched ${transactions.length} enhanced transactions (batch ${Math.floor(i / this.MAX_TRANSACTIONS_PER_BATCH) + 1})`);
            } catch (error) {
                this.logger.error(`Error fetching enhanced transactions: ${error.message}`);
                // Continue with remaining batches instead of failing completely
            }
        }

        this.logger.log(`✅ Total enhanced transactions fetched: ${allTransactions.length}`);
        return allTransactions;
    }

    /**
     * Get account info for a wallet
     */
    async getAccountInfo(address: string): Promise<any> {
        if (!this.isAvailable) {
            throw new Error('Helius API not configured');
        }

        try {
            const response = await this.client.post(this.rpcUrl, {
                jsonrpc: '2.0',
                id: 'helius-account',
                method: 'getAccountInfo',
                params: [address, { encoding: 'jsonParsed' }],
            });

            return response.data?.result?.value || null;
        } catch (error) {
            this.logger.error(`Error fetching account info: ${error.message}`);
            throw error;
        }
    }
}
