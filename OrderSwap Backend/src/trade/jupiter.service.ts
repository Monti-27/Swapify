import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

@Injectable()
export class JupiterService {
  private connection: Connection;
  private jupiterApiUrl: string;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get('SOLANA_RPC_URL');
    this.connection = new Connection(rpcUrl, 'confirmed');
    // Updated to new Jupiter API endpoint (as of October 2025)
    this.jupiterApiUrl = this.configService.get('JUPITER_API_URL') || 'https://lite-api.jup.ag/swap/v1';
  }

  /**
   * Get quote for a swap
   */
  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps?: number;
  }) {
    try {
      const { inputMint, outputMint, amount, slippageBps = 50 } = params;

      const response = await axios.get(`${this.jupiterApiUrl}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      throw new Error('Failed to get swap quote');
    }
  }

  /**
   * Get swap transaction
   */
  async getSwapTransaction(params: {
    quoteResponse: any;
    userPublicKey: string;
    wrapUnwrapSOL?: boolean;
  }) {
    try {
      const { quoteResponse, userPublicKey, wrapUnwrapSOL = true } = params;

      const response = await axios.post(`${this.jupiterApiUrl}/swap`, {
        quoteResponse,
        userPublicKey,
        wrapUnwrapSOL,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting swap transaction:', error);
      throw new Error('Failed to create swap transaction');
    }
  }

  /**
   * Simulate swap to estimate outcome
   */
  async simulateSwap(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
  }) {
    try {
      const quote = await this.getQuote(params);
      
      return {
        inputAmount: params.amount,
        outputAmount: parseInt(quote.outAmount),
        priceImpactPct: quote.priceImpactPct,
        slippageBps: quote.slippageBps,
        routePlan: quote.routePlan,
      };
    } catch (error) {
      console.error('Error simulating swap:', error);
      throw new Error('Failed to simulate swap');
    }
  }

  /**
   * Get all possible routes for a swap
   */
  async getRoutes(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
  }) {
    try {
      const quote = await this.getQuote(params);
      return quote.routePlan || [];
    } catch (error) {
      console.error('Error getting routes:', error);
      return [];
    }
  }

  /**
   * Deserialize transaction for signing
   */
  deserializeTransaction(swapTransaction: string): VersionedTransaction {
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    return VersionedTransaction.deserialize(transactionBuf);
  }

  /**
   * Send and confirm transaction
   */
  async sendAndConfirmTransaction(signedTransaction: VersionedTransaction) {
    try {
      const rawTransaction = signedTransaction.serialize();
      const signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      return signature;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error('Failed to send transaction');
    }
  }

  /**
   * Get token price from Jupiter (Price API V3)
   */
  async getTokenPrice(tokenMint: string): Promise<number> {
    try {
      // Use the new Price API V3 endpoint
      const priceApiUrl = 'https://lite-api.jup.ag/price/v3';
      const response = await axios.get(`${priceApiUrl}/price`, {
        params: {
          ids: tokenMint,
        },
      });

      return response.data.data[tokenMint]?.price || 0;
    } catch (error) {
      console.error('Error getting token price:', error);
      return 0;
    }
  }
}

