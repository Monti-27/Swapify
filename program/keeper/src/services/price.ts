import axios from "axios";

export interface PriceData {
  price: number;
  timestamp: number;
}

interface JupiterPriceResponse {
  [mint: string]: {
    decimals: number;
    usdPrice: number;
    priceChange24h?: number | null;
    blockId?: number | null;
  };
}

export class PriceService {
  constructor(private apiUrl: string) {}

  /**
   * Get current price for a token pair using Jupiter Price API
   * Returns the price ratio (outputMint / inputMint) in USD terms
   */
  async getPrice(inputMint: string, outputMint: string): Promise<PriceData | null> {
    try {
      console.log(`📊 Fetching price for ${inputMint} -> ${outputMint}`);
      
      const headers: any = {};
      
      // Add API key if provided (Jupiter price API may require it)
      const apiKey = process.env.JUPITER_API_KEY;
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }
      
      // Fetch prices for both tokens
      const response = await axios.get<JupiterPriceResponse>(`${this.apiUrl}/price/v3`, {
        params: {
          ids: `${inputMint},${outputMint}`,
        },
        headers,
      });

      const prices = response.data;

      const inputPrice = prices[inputMint];
      const outputPrice = prices[outputMint];

      if (!inputPrice || !outputPrice) {
        console.error(`❌ Missing price data for tokens`);
        return null;
      }

      // Calculate price ratio: how many output tokens per input token
      // Price = (inputPriceUSD / inputDecimals) / (outputPriceUSD / outputDecimals)
      // Simplified: outputPrice / inputPrice (both in USD)
      const priceRatio = outputPrice.usdPrice / inputPrice.usdPrice;

      if (!isFinite(priceRatio) || priceRatio <= 0) {
        console.error(`❌ Invalid price ratio calculated: ${priceRatio}`);
        return null;
      }

      console.log(
        `💰 Price: ${inputMint.slice(0, 8)}... = $${inputPrice.usdPrice}, ` +
        `${outputMint.slice(0, 8)}... = $${outputPrice.usdPrice}, ` +
        `Ratio: ${priceRatio.toFixed(6)}`
      );

      return {
        price: priceRatio,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`❌ Error fetching price from Jupiter:`, error);
      return null;
    }
  }

  /**
   * Get price scaled to match strategy's price precision
   * Converts price ratio to a scaled integer for comparison with trigger_price
   */
  scalePrice(price: number, precision: number): bigint {
    const multiplier = BigInt(10 ** precision);
    return BigInt(Math.floor(price * Number(multiplier)));
  }
}

