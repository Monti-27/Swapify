import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JupiterService } from './jupiter.service';
import { PriceService } from '../price/price.service';
import { ExecuteTradeDto } from './dto/trade.dto';

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(
    private prisma: PrismaService,
    private jupiterService: JupiterService,
    private priceService: PriceService,
  ) {}

  /**
   * Prepare a trade (get quote and transaction)
   * 
   * IMPORTANT: amount must be in the token's smallest unit (lamports for SOL)
   * Example: For 0.5 SOL, pass 500000000 (0.5 * 10^9)
   */
  async prepareTrade(params: {
    userId: string;
    walletId: string;
    fromToken: string;
    toToken: string;
    amount: number;  // Amount in smallest token unit (lamports for SOL, etc.)
    strategyId?: string;
  }) {
    const { userId, walletId, fromToken, toToken, amount, strategyId } = params;

    // Get wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet || wallet.userId !== userId) {
      throw new BadRequestException('Invalid wallet');
    }

    // Get quote from Jupiter
    const quote = await this.jupiterService.getQuote({
      inputMint: fromToken,
      outputMint: toToken,
      amount,
      slippageBps: 50, // 0.5% slippage
    });

    // Get swap transaction
    const swapTransaction = await this.jupiterService.getSwapTransaction({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey,
    });

    // Create pending trade record
    const trade = await this.prisma.trade.create({
      data: {
        userId,
        walletId,
        strategyId,
        type: 'swap',
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: parseInt(quote.outAmount),
        executionPrice: parseFloat(quote.outAmount) / amount,
        slippage: quote.slippageBps / 10000,
        status: 'pending',
        metadata: {
          quote,
          priceImpact: quote.priceImpactPct,
        },
      },
    });

    return {
      trade,
      transaction: swapTransaction.swapTransaction,
      quote,
    };
  }

  /**
   * Execute a trade (after user signs)
   */
  async executeTrade(tradeId: string, dto: ExecuteTradeDto) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: { strategy: true, user: true },
    });

    if (!trade) {
      throw new BadRequestException('Trade not found');
    }

    if (trade.status !== 'pending') {
      throw new BadRequestException('Trade already processed');
    }

    try {
      // Deserialize and send signed transaction
      const signedTx = this.jupiterService.deserializeTransaction(dto.signedTransaction);
      const signature = await this.jupiterService.sendAndConfirmTransaction(signedTx);

      // Update trade record
      const updatedTrade = await this.prisma.trade.update({
        where: { id: tradeId },
        data: {
          status: 'completed',
          txSignature: signature,
          completedAt: new Date(),
        },
      });

      // If this trade is part of a strategy, mark strategy as completed
      if (trade.strategyId) {
        await this.prisma.strategy.update({
          where: { id: trade.strategyId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        this.logger.log(`Strategy ${trade.strategyId} marked as completed`);
      }

      return updatedTrade;
    } catch (error) {
      // Mark trade as failed
      await this.prisma.trade.update({
        where: { id: tradeId },
        data: {
          status: 'failed',
          error: error.message,
        },
      });

      // If strategy-related, mark strategy as failed too
      if (trade.strategyId) {
        await this.prisma.strategy.update({
          where: { id: trade.strategyId },
          data: {
            status: 'failed',
          },
        });
      }

      throw new BadRequestException('Trade execution failed: ' + error.message);
    }
  }

  /**
   * Confirm trade execution after user signs (simplified flow)
   */
  async confirmTradeExecution(
    tradeId: string,
    userId: string,
    signature: string,
    status: 'success' | 'failed',
  ) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: { strategy: true },
    });

    if (!trade) {
      throw new BadRequestException('Trade not found');
    }

    if (trade.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    try {
      // Update trade record
      const updatedTrade = await this.prisma.trade.update({
        where: { id: tradeId },
        data: {
          status: status === 'success' ? 'completed' : 'failed',
          txSignature: signature,
          completedAt: status === 'success' ? new Date() : null,
          error: status === 'failed' ? 'Transaction failed' : null,
        },
      });

      // If this trade is part of a strategy, mark strategy as completed
      if (trade.strategyId) {
        await this.prisma.strategy.update({
          where: { id: trade.strategyId },
          data: {
            status: status === 'success' ? 'completed' : 'failed',
            completedAt: status === 'success' ? new Date() : null,
          },
        });

        this.logger.log(`Strategy ${trade.strategyId} marked as ${status === 'success' ? 'completed' : 'failed'}`);

        // TODO: Send WebSocket event (need to inject WebsocketGateway)
        // this.websocketGateway.notifyUser(userId, {
        //   type: 'strategy_completed',
        //   strategyId: trade.strategyId,
        //   tradeId: trade.id,
        //   signature,
        // });
      }

      return updatedTrade;
    } catch (error) {
      this.logger.error('Error confirming trade:', error);
      throw new BadRequestException('Failed to confirm trade');
    }
  }

  /**
   * Get trade history for user
   */
  async getTradeHistory(userId: string, filters?: {
    walletId?: string;
    strategyId?: string;
    status?: string;
    limit?: number;
  }) {
    const where: any = { userId };

    if (filters?.walletId) {
      where.walletId = filters.walletId;
    }

    if (filters?.strategyId) {
      where.strategyId = filters.strategyId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.trade.findMany({
      where,
      include: {
        wallet: true,
        strategy: true,
      },
      orderBy: { executedAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  /**
   * Get trade by ID
   */
  async getTrade(tradeId: string, userId: string) {
    const trade = await this.prisma.trade.findFirst({
      where: {
        id: tradeId,
        userId,
      },
      include: {
        wallet: true,
        strategy: true,
      },
    });

    if (!trade) {
      throw new BadRequestException('Trade not found');
    }

    return trade;
  }

  /**
   * Get trade statistics
   */
  async getTradeStats(userId: string) {
    const trades = await this.prisma.trade.findMany({
      where: { userId },
    });

    const completed = trades.filter(t => t.status === 'completed');
    const failed = trades.filter(t => t.status === 'failed');

    // Calculate total volume
    const totalVolume = completed.reduce((sum, t) => sum + t.fromAmount, 0);

    return {
      totalTrades: trades.length,
      completedTrades: completed.length,
      failedTrades: failed.length,
      pendingTrades: trades.filter(t => t.status === 'pending').length,
      totalVolume,
      successRate: trades.length > 0 ? (completed.length / trades.length) * 100 : 0,
    };
  }

  /**
   * Simulate a trade to estimate outcome
   */
  async simulateTrade(params: {
    fromToken: string;
    toToken: string;
    amount: number;
  }) {
    return this.jupiterService.simulateSwap({
      inputMint: params.fromToken,
      outputMint: params.toToken,
      amount: params.amount,
    });
  }

  /**
   * Cancel a pending trade
   */
  async cancelTrade(tradeId: string, userId: string) {
    const trade = await this.getTrade(tradeId, userId);

    if (trade.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending trades');
    }

    return this.prisma.trade.update({
      where: { id: tradeId },
      data: { status: 'failed', error: 'Cancelled by user' },
    });
  }
}

