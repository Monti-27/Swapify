import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';

export interface JupiterToken {
  // Jupiter API V2 uses 'id' for token address
  id?: string;
  address?: string; // Fallback for compatibility
  name: string;
  symbol: string;
  decimals: number;
  // Jupiter API V2 uses 'icon' instead of 'logoURI'
  icon?: string;
  logoURI?: string; // Fallback for compatibility
  tags?: string[];
  daily_volume?: number;
  freeze_authority?: string | null;
  mint_authority?: string | null;
  permanent_delegate?: string | null;
  minted_at?: string | null;
  extensions?: {
    coingeckoId?: string;
  };
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private tokenCache: JupiterToken[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private connection: Connection;

  // Cached decimals for common tokens (for performance)
  private readonly TOKEN_DECIMALS: { [address: string]: number } = {
    'So11111111111111111111111111111111111111112': 9, // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 9, // mSOL
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5, // BONK
    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 8, // ETH (Wormhole)
    '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': 6, // BTC (Wormhole)
  };

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get('SOLANA_RPC_URL');
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Fetch all tradable tokens from Jupiter Token API V2
   * Using /search endpoint with empty query returns all tokens
   */
  async getAllTokens(forceRefresh = false): Promise<JupiterToken[]> {
    const now = Date.now();
    
    // Return cached tokens if still valid
    if (!forceRefresh && this.tokenCache.length > 0 && now - this.lastFetch < this.CACHE_DURATION) {
      return this.tokenCache;
    }

    try {
      this.logger.log('Fetching all tradable tokens from Jupiter...');
      
      const tokenApiUrl = this.configService.get('JUPITER_TOKEN_API_URL') || 'https://lite-api.jup.ag/tokens/v2';
      // Use /search endpoint with empty query to get all tokens
      const response = await axios.get(`${tokenApiUrl}/search`, {
        params: { query: '' }
      });
      
      // Normalize token data to ensure consistent format
      const rawTokens = response.data || [];
      const tokens: JupiterToken[] = rawTokens.map((token: any) => ({
        ...token,
        address: token.id || token.address, // Normalize id to address
        logoURI: token.icon || token.logoURI, // Normalize icon to logoURI
      }));
      
      // Cache the results
      this.tokenCache = tokens;
      this.lastFetch = now;
      
      this.logger.log(`Successfully fetched ${tokens.length} tradable tokens`);
      
      return tokens;
    } catch (error) {
      this.logger.error('Error fetching tokens from Jupiter:', error.message);
      
      // Return cached tokens if available, otherwise empty array
      if (this.tokenCache.length > 0) {
        this.logger.warn('Using cached tokens due to fetch error');
        return this.tokenCache;
      }
      
      return [];
    }
  }

  /**
   * Get token by mint address
   * Search for specific token by address
   */
  async getTokenByMint(mintAddress: string): Promise<JupiterToken | null> {
    try {
      const tokenApiUrl = this.configService.get('JUPITER_TOKEN_API_URL') || 'https://lite-api.jup.ag/tokens/v2';
      // Use search endpoint to find token by address
      const response = await axios.get(`${tokenApiUrl}/search`, {
        params: { query: mintAddress }
      });
      
      // Normalize token data
      const rawTokens = response.data || [];
      const tokens: JupiterToken[] = rawTokens.map((token: any) => ({
        ...token,
        address: token.id || token.address,
        logoURI: token.icon || token.logoURI,
      }));
      
      // Return exact match if found
      const exactMatch = tokens.find(t => t.address === mintAddress || t.id === mintAddress);
      return exactMatch || tokens[0] || null;
    } catch (error) {
      this.logger.error(`Error fetching token ${mintAddress}:`, error.message);
      
      // Fallback to cached tokens
      const tokens = await this.getAllTokens();
      return tokens.find(t => t.address === mintAddress) || null;
    }
  }

  /**
   * Get tokens by category/tag
   * Use /tag endpoint with query parameter
   */
  async getTokensByTag(tag: string): Promise<JupiterToken[]> {
    try {
      const tokenApiUrl = this.configService.get('JUPITER_TOKEN_API_URL') || 'https://lite-api.jup.ag/tokens/v2';
      // Use /tag endpoint with query parameter
      const response = await axios.get(`${tokenApiUrl}/tag`, {
        params: { query: tag }
      });
      
      // Normalize token data
      const rawTokens = response.data || [];
      return rawTokens.map((token: any) => ({
        ...token,
        address: token.id || token.address,
        logoURI: token.icon || token.logoURI,
      }));
    } catch (error) {
      this.logger.error(`Error fetching tokens by tag ${tag}:`, error.message);
      return [];
    }
  }

  /**
   * Search tokens by name or symbol
   * Uses Jupiter's native search endpoint
   */
  async searchTokens(query: string, limit = 50): Promise<JupiterToken[]> {
    try {
      if (!query || query.trim().length === 0) {
        // Return popular tokens if no query
        return this.getPopularTokens();
      }

      const tokenApiUrl = this.configService.get('JUPITER_TOKEN_API_URL') || 'https://lite-api.jup.ag/tokens/v2';
      const response = await axios.get(`${tokenApiUrl}/search`, {
        params: { query: query.trim() }
      });
      
      // Normalize token data
      const rawTokens = response.data || [];
      const tokens: JupiterToken[] = rawTokens.map((token: any) => ({
        ...token,
        address: token.id || token.address,
        logoURI: token.icon || token.logoURI,
      }));
      
      return tokens.slice(0, limit);
    } catch (error) {
      this.logger.error('Error searching tokens:', error.message);
      
      // Fallback to local search in cached tokens
      const allTokens = await this.getAllTokens();
      const lowerQuery = query.toLowerCase();
      
      return allTokens
        .filter(token => 
          token.symbol.toLowerCase().includes(lowerQuery) ||
          token.name.toLowerCase().includes(lowerQuery) ||
          token.address.toLowerCase().includes(lowerQuery)
        )
        .slice(0, limit);
    }
  }

  /**
   * Get popular/verified tokens
   */
  async getPopularTokens(): Promise<JupiterToken[]> {
    try {
      // Fetch tokens with the 'verified' tag
      const verified = await this.getTokensByTag('verified');
      if (verified.length > 0) {
        return verified.slice(0, 100); // Return top 100 verified tokens
      }
      
      // If verified fails, return first 100 from all tokens
      const allTokens = await this.getAllTokens();
      return allTokens.slice(0, 100);
    } catch (error) {
      this.logger.error('Error fetching popular tokens:', error.message);
      
      // Fallback to well-known hardcoded tokens
      return [
        {
          address: 'So11111111111111111111111111111111111111112',
          name: 'Wrapped SOL',
          symbol: 'SOL',
          decimals: 9,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        },
        {
          address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          name: 'USDT',
          symbol: 'USDT',
          decimals: 6,
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
        },
      ] as JupiterToken[];
    }
  }

  /**
   * Get token decimals for amount conversion
   * CRITICAL: This method MUST work for ALL tokens, not just famous ones
   * 
   * Fallback chain (fastest to slowest):
   * 1. Hardcoded cache (famous tokens like SOL, USDC)
   * 2. Jupiter token cache (previously fetched tokens)
   * 3. Jupiter API (search by mint address)
   * 4. On-chain fetch (reads directly from blockchain - WORKS FOR ANY SPL TOKEN)
   */
  async getTokenDecimals(mintAddress: string): Promise<number> {
    const shortAddress = `${mintAddress.slice(0, 8)}...${mintAddress.slice(-8)}`;
    
    try {
      // 1. Check hardcoded cache first (fastest - for famous tokens)
      if (this.TOKEN_DECIMALS[mintAddress] !== undefined) {
        this.logger.debug(`✅ Found decimals for ${shortAddress} in hardcoded cache: ${this.TOKEN_DECIMALS[mintAddress]}`);
        return this.TOKEN_DECIMALS[mintAddress];
      }

      // 2. Check if we have this token in our Jupiter cache
      const cachedToken = this.tokenCache.find(
        t => t.address === mintAddress || t.id === mintAddress
      );
      if (cachedToken && cachedToken.decimals !== undefined) {
        this.logger.debug(`✅ Found decimals for ${shortAddress} in Jupiter cache: ${cachedToken.decimals}`);
        return cachedToken.decimals;
      }

      // 3. Try to fetch from Jupiter API (works for most tokens)
      try {
        const token = await this.getTokenByMint(mintAddress);
        if (token && token.decimals !== undefined) {
          this.logger.log(`✅ Found decimals for ${shortAddress} from Jupiter API: ${token.decimals}`);
          return token.decimals;
        }
      } catch (apiError) {
        this.logger.warn(`⚠️  Jupiter API failed for ${shortAddress}, falling back to on-chain fetch`);
      }

      // 4. Fallback to on-chain fetch (THE MOST RELIABLE - works for ANY SPL token)
      this.logger.log(`🔗 Fetching decimals ON-CHAIN for ${shortAddress}...`);
      const mintPubkey = new PublicKey(mintAddress);
      const mintInfo = await getMint(this.connection, mintPubkey);
      
      this.logger.log(`✅ Successfully fetched decimals ON-CHAIN for ${shortAddress}: ${mintInfo.decimals}`);
      return mintInfo.decimals;
    } catch (error) {
      // This should RARELY happen - only if the token mint doesn't exist or RPC fails
      this.logger.error(`❌ CRITICAL: Failed to get decimals for ${shortAddress}:`, error.message);
      this.logger.error(`   Stack:`, error.stack);
      
      // Instead of silently defaulting, throw an error so the strategy fails with clear reason
      throw new Error(
        `Unable to determine decimals for token ${mintAddress}. ` +
        `This token may not exist or there may be RPC issues. Please verify the token address.`
      );
    }
  }

  /**
   * Clear token cache (useful for admin operations)
   */
  clearCache(): void {
    this.tokenCache = [];
    this.lastFetch = 0;
    this.logger.log('Token cache cleared');
  }
}

