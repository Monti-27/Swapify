import type {
  Trade,
  Strategy,
  Wallet,
  TokenPrice,
  TokenInfo,
  PrepareTradeDto,
  ExecuteTradeDto,
  SimulateTradeDto,
  CreateStrategyDto,
  UpdateStrategyDto,
  UpdateWalletDto,
  TradeStats,
  StrategyStats,
  PriceHistoryResponse,
} from '@/types/api';
import { ChartTimeframe } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Trade API
  async prepareTrade(dto: PrepareTradeDto): Promise<any> {
    return this.request('/trades/prepare', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async executeTrade(id: string, dto: ExecuteTradeDto): Promise<Trade> {
    return this.request(`/trades/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async simulateTrade(dto: SimulateTradeDto): Promise<any> {
    return this.request('/trades/simulate', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getTradeHistory(params?: {
    walletId?: string;
    strategyId?: string;
    status?: string;
    limit?: number;
  }): Promise<Trade[]> {
    const queryParams = new URLSearchParams(
      Object.entries(params || {}).filter(([_, v]) => v != null) as any
    );
    return this.request(`/trades?${queryParams}`);
  }

  async getTradeStats(): Promise<TradeStats> {
    return this.request('/trades/stats');
  }

  async getTrade(id: string): Promise<Trade> {
    return this.request(`/trades/${id}`);
  }

  async cancelTrade(id: string): Promise<Trade> {
    return this.request(`/trades/${id}/cancel`, { method: 'POST' });
  }

  // Strategy API
  async createStrategy(dto: CreateStrategyDto): Promise<Strategy> {
    return this.request('/strategies', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getStrategies(params?: {
    status?: string;
    walletId?: string;
  }): Promise<Strategy[]> {
    const queryParams = new URLSearchParams(
      Object.entries(params || {}).filter(([_, v]) => v != null) as any
    );
    return this.request(`/strategies?${queryParams}`);
  }

  async getStrategyStats(): Promise<StrategyStats> {
    return this.request('/strategies/stats');
  }

  async getStrategy(id: string): Promise<Strategy> {
    return this.request(`/strategies/${id}`);
  }

  async updateStrategy(id: string, dto: UpdateStrategyDto): Promise<Strategy> {
    return this.request(`/strategies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async cancelStrategy(id: string): Promise<Strategy> {
    return this.request(`/strategies/${id}/cancel`, { method: 'POST' });
  }

  async deleteStrategy(id: string): Promise<void> {
    return this.request(`/strategies/${id}`, { method: 'DELETE' });
  }

  async updateStrategyMetadata(
    pdaAddress: string,
    data: { name: string; description?: string }
  ): Promise<Strategy> {
    return this.request(`/strategies/${pdaAddress}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Wallet API
  async getWallets(): Promise<Wallet[]> {
    return this.request('/wallets');
  }

  async getWallet(id: string): Promise<Wallet> {
    return this.request(`/wallets/${id}`);
  }

  async getWalletBalance(id: string): Promise<any> {
    return this.request(`/wallets/${id}/balance`);
  }

  async updateWallet(id: string, dto: UpdateWalletDto): Promise<Wallet> {
    return this.request(`/wallets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async deleteWallet(id: string): Promise<void> {
    return this.request(`/wallets/${id}`, { method: 'DELETE' });
  }

  // Price API
  async getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
    return this.request(`/prices?token=${tokenAddress}`);
  }

  async getBatchPrices(tokens: string[]): Promise<{ prices: Record<string, number> }> {
    return this.request('/prices/batch', {
      method: 'POST',
      body: JSON.stringify({ tokens }),
    });
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    return this.request(`/prices/info?token=${tokenAddress}`);
  }

  async getMarketCap(tokenAddress: string): Promise<{ marketCap: number }> {
    return this.request(`/prices/market-cap?token=${tokenAddress}`);
  }

  async getPriceHistory(
    tokenAddress: string,
    timeframe: ChartTimeframe = ChartTimeframe.ONE_HOUR,
    limit: number = 200,
    from?: number,
    to?: number
  ): Promise<PriceHistoryResponse> {
    const params = new URLSearchParams({
      token: tokenAddress,
      timeframe,
      limit: limit.toString(),
    });

    if (from) params.append('from', from.toString());
    if (to) params.append('to', to.toString());

    return this.request(`/prices/history?${params.toString()}`);
  }

  // Token API
  async getAllTokens(refresh = false): Promise<any[]> {
    return this.request(`/tokens${refresh ? '?refresh=true' : ''}`);
  }

  async getPopularTokens(): Promise<any[]> {
    return this.request('/tokens/popular');
  }

  async searchTokens(query: string, limit = 50): Promise<any[]> {
    return this.request(`/tokens/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getTokenByMint(mint: string): Promise<any> {
    return this.request(`/tokens/${mint}`);
  }

  // Transparency API
  async getWalletRisk(address: string): Promise<import('@/types/api').WalletRiskReport> {
    return this.request(`/transparency/${address}`);
  }

  async scanWalletRisk(address: string): Promise<import('@/types/api').WalletRiskReport> {
    return this.request(`/transparency/scan/${address}`, { method: 'POST' });
  }
}

// Export singleton instance
export const api = new ApiClient(API_URL);

// Export class for testing or multiple instances
export default ApiClient;

