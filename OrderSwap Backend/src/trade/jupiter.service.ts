import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  AddressLookupTableAccount
} from '@solana/web3.js';

@Injectable()
export class JupiterService {
  private connection: Connection;
  private jupiterApiUrl: string;
  private readonly logger = new Logger(JupiterService.name);

  // Constants for Devnet Mocking
  private readonly DEVNET_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
  private readonly WRAPPED_SOL = 'So11111111111111111111111111111111111111112';

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get('SOLANA_RPC_URL');
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.jupiterApiUrl = this.configService.get('JUPITER_API_URL') || 'https://lite-api.jup.ag/swap/v1';
  }

  /**
   * Get quote for a swap
   * INTERCEPTED FOR DEVNET
   */
  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps?: number;
  }) {
    const { inputMint, outputMint, amount, slippageBps = 50 } = params;

    // === 🕵️ MOCK QUOTE FOR DEVNET ===
    if (inputMint === this.DEVNET_USDC || outputMint === this.DEVNET_USDC) {
      this.logger.log(`🕵️ Generating MOCK QUOTE for Devnet Swap...`);

      // Mock Rate: 1 SOL = $200
      let outAmount = 0;
      if (inputMint === this.WRAPPED_SOL) {
        // SOL -> USDC
        // Input 1e9 (1 SOL) -> Output 200 * 1e6 (200 USDC)
        const solAmount = amount / 1_000_000_000;
        outAmount = Math.floor(solAmount * 200 * 1_000_000);
      } else {
        // USDC -> SOL
        // Input 200 * 1e6 -> Output 1e9
        const usdcAmount = amount / 1_000_000;
        outAmount = Math.floor((usdcAmount / 200) * 1_000_000_000);
      }

      return {
        inputMint,
        inAmount: amount.toString(),
        outputMint,
        outAmount: outAmount.toString(),
        otherAmountThreshold: Math.floor(outAmount * 0.99).toString(),
        swapMode: 'ExactIn',
        slippageBps,
        priceImpactPct: '0',
        routePlan: [],
        contextSlot: 0,
        timeTaken: 0,
        isMock: true // Internal flag
      };
    }
    // =================================

    try {
      const response = await axios.get(`${this.jupiterApiUrl}/quote`, {
        params: { inputMint, outputMint, amount, slippageBps },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      throw new Error('Failed to get swap quote');
    }
  }

  /**
   * Get swap transaction
   * INTERCEPTED FOR DEVNET
   */
  async getSwapTransaction(params: {
    quoteResponse: any;
    userPublicKey: string;
    wrapUnwrapSOL?: boolean;
  }) {
    const { quoteResponse, userPublicKey } = params;

    // === 🕵️ MOCK TRANSACTION FOR DEVNET ===
    if (quoteResponse.isMock) {
      this.logger.log(`🕵️ Generating MOCK TRANSACTION for Devnet...`);

      // Create a dummy transaction: 0 SOL transfer to Self
      // This makes the blockchain validly accept and "process" the trade event
      const user = new PublicKey(userPublicKey);

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Build a simple "Memo" or "Self-Transfer" instruction
      const instruction = SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: user,
        lamports: 0, // 0 cost
      });

      const messageV0 = new TransactionMessage({
        payerKey: user,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // Serialize to base64 (Just like Jupiter API does)
      const swapTransaction = Buffer.from(transaction.serialize()).toString('base64');

      return { swapTransaction };
    }
    // =======================================

    try {
      const response = await axios.post(`${this.jupiterApiUrl}/swap`, {
        quoteResponse,
        userPublicKey,
        wrapUnwrapSOL: params.wrapUnwrapSOL ?? true,
      });
      return response.data;
    } catch (error) {
      console.error('Error getting swap transaction:', error);
      throw new Error('Failed to create swap transaction');
    }
  }

  // ... (Keep existing methods below as they are) ...

  async simulateSwap(params: { inputMint: string; outputMint: string; amount: number }) {
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

  async getRoutes(params: { inputMint: string; outputMint: string; amount: number }) {
    try {
      const quote = await this.getQuote(params);
      return quote.routePlan || [];
    } catch (error) {
      console.error('Error getting routes:', error);
      return [];
    }
  }

  deserializeTransaction(swapTransaction: string): VersionedTransaction {
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    return VersionedTransaction.deserialize(transactionBuf);
  }

  async sendAndConfirmTransaction(signedTransaction: VersionedTransaction) {
    try {
      const rawTransaction = signedTransaction.serialize();
      const signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

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

  async getTokenPrice(tokenMint: string): Promise<number> {
    try {
      // Mock Prices for Devnet
      if (tokenMint === this.DEVNET_USDC) return 1.0;
      if (tokenMint === this.WRAPPED_SOL) return 200.0;

      const priceApiUrl = 'https://lite-api.jup.ag/price/v3';
      const response = await axios.get(`${priceApiUrl}/price`, {
        params: { ids: tokenMint },
      });

      return response.data.data[tokenMint]?.price || 0;
    } catch (error) {
      console.error('Error getting token price:', error);
      return 0;
    }
  }
}