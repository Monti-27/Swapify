import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';

const JUPITER_SWAP_API_URL = 'https://lite-api.jup.ag/swap/v1';
const JUPITER_PRICE_API_URL = 'https://lite-api.jup.ag/price/v3';

export interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}

export interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string | number; // Can be string or number from API
  routePlan: any[];
}

export interface SwapParams {
  quoteResponse: QuoteResponse;
  userPublicKey: string;
  wrapUnwrapSOL?: boolean;
  dynamicComputeUnitLimit?: boolean;
  prioritizationFeeLamports?: number;
}

export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
}

export class JupiterService {
  private swapApiUrl: string;
  private priceApiUrl: string;

  constructor(
    swapApiUrl: string = JUPITER_SWAP_API_URL,
    priceApiUrl: string = JUPITER_PRICE_API_URL
  ) {
    this.swapApiUrl = swapApiUrl;
    this.priceApiUrl = priceApiUrl;
  }

  /**
   * Get a quote for a swap
   */
  async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    const { inputMint, outputMint, amount, slippageBps = 50 } = params;

    const queryParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
    });

    const response = await fetch(`${this.swapApiUrl}/quote?${queryParams}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Failed to fetch quote',
      }));
      throw new Error(error.error || 'Failed to get quote from Jupiter');
    }

    return response.json();
  }

  /**
   * Get swap transaction
   */
  async getSwapTransaction(params: SwapParams): Promise<SwapResponse> {
    const {
      quoteResponse,
      userPublicKey,
      wrapUnwrapSOL = true,
      dynamicComputeUnitLimit = true,
      prioritizationFeeLamports,
    } = params;

    const body: any = {
      quoteResponse,
      userPublicKey,
      wrapUnwrapSOL,
      dynamicComputeUnitLimit,
    };

    if (prioritizationFeeLamports) {
      body.prioritizationFeeLamports = prioritizationFeeLamports;
    }

    const response = await fetch(`${this.swapApiUrl}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Failed to get swap transaction',
      }));
      throw new Error(error.error || 'Failed to create swap transaction');
    }

    return response.json();
  }

  /**
   * Deserialize a swap transaction
   */
  deserializeTransaction(swapTransaction: string): VersionedTransaction {
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    return VersionedTransaction.deserialize(transactionBuf);
  }

  /**
   * Execute a swap (get quote, create transaction, and return for signing)
   */
  async prepareSwap(
    inputMint: string,
    outputMint: string,
    amount: number,
    userPublicKey: string,
    slippageBps: number = 50
  ): Promise<{ quote: QuoteResponse; transaction: VersionedTransaction }> {
    // Get quote
    const quote = await this.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps,
    });

    // Get swap transaction
    const { swapTransaction } = await this.getSwapTransaction({
      quoteResponse: quote,
      userPublicKey,
    });

    // Deserialize transaction
    const transaction = this.deserializeTransaction(swapTransaction);

    return { quote, transaction };
  }

  /**
   * Get token price (Price API V3)
   */
  async getTokenPrice(tokenMint: string): Promise<number> {
    try {
      const response = await fetch(`${this.priceApiUrl}/price?ids=${tokenMint}`);
      if (!response.ok) {
        console.warn('Price API returned non-OK status:', response.status);
        return 0;
      }

      const data = await response.json();
      
      // Handle different response formats
      const priceData = data.data || data;
      
      if (!priceData || typeof priceData !== 'object') {
        console.warn('Invalid price data format:', data);
        return 0;
      }
      
      return priceData[tokenMint]?.price || 0;
    } catch (error) {
      console.log('Error fetching token price:', error);
      return 0;
    }
  }

  /**
   * Get multiple token prices (Price API V3)
   */
  async getTokenPrices(tokenMints: string[]): Promise<Record<string, number>> {
    try {
      const ids = tokenMints.join(',');
      const response = await fetch(`${this.priceApiUrl}/price?ids=${ids}`);
      
      if (!response.ok) {
        console.warn('Price API returned non-OK status:', response.status);
        // Return 0 for all tokens when API fails
        return tokenMints.reduce((acc, mint) => ({ ...acc, [mint]: 0 }), {});
      }

      const data = await response.json();
      console.log('Jupiter Price API response:', data); // Debug log
      
      const prices: Record<string, number> = {};

      // Handle different response formats
      // Jupiter Price API V3 formats:
      // 1. { data: { mint: { price: X } } }
      // 2. { mint: { price: X } }
      let priceData: any;
      
      if (data && typeof data === 'object') {
        if (data.data && typeof data.data === 'object') {
          priceData = data.data;
        } else {
          priceData = data;
        }
      }

      if (!priceData || typeof priceData !== 'object') {
        console.warn('Invalid or missing price data, returning zeros');
        return tokenMints.reduce((acc, mint) => ({ ...acc, [mint]: 0 }), {});
      }

      // Extract prices safely
      for (const mint of tokenMints) {
        try {
          const tokenData = priceData[mint];
          prices[mint] = (tokenData && typeof tokenData === 'object' && typeof tokenData.price === 'number') 
            ? tokenData.price 
            : 0;
        } catch (err) {
          console.warn(`Failed to parse price for ${mint}:`, err);
          prices[mint] = 0;
        }
      }

      return prices;
    } catch (error) {
      console.log('Error fetching token prices:', error);
      // Return 0 for all tokens on error
      return tokenMints.reduce((acc, mint) => ({ ...acc, [mint]: 0 }), {});
    }
  }
}

// Export singleton instance
export const jupiterService = new JupiterService();

