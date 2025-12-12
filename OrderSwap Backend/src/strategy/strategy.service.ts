import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrategyDto, UpdateStrategyDto } from './dto/strategy.dto';
import { PriceService } from '../price/price.service';

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  constructor(
    private prisma: PrismaService,
    private priceService: PriceService,
  ) { }

  /**
   * Create a new trading strategy
   */
  async createStrategy(userId: string, walletId: string, dto: CreateStrategyDto) {
    // Validate token addresses
    if (dto.fromToken === dto.toToken) {
      throw new BadRequestException('From and to tokens must be different');
    }

    // Validate stop loss and take profit for price triggers
    if (dto.triggerType === 'price') {
      if (dto.stopLoss && dto.stopLoss >= dto.triggerValue) {
        throw new BadRequestException('Stop loss must be less than target price');
      }
      if (dto.takeProfit && dto.takeProfit <= dto.triggerValue) {
        throw new BadRequestException('Take profit must be greater than target price');
      }
    }

    // Create strategy
    const strategy = await this.prisma.strategy.create({
      data: {
        userId,
        walletId,
        name: dto.name,
        description: dto.description,
        fromToken: dto.fromToken,
        toToken: dto.toToken,
        triggerType: dto.triggerType,
        triggerValue: dto.triggerValue,
        amountType: dto.amountType,
        amount: dto.amount,
        stopLoss: dto.stopLoss,
        takeProfit: dto.takeProfit,
        nextStrategyId: dto.nextStrategyId,
        metadata: dto.metadata || {},
        status: 'active',
      },
    });

    // Log creation
    await this.createLog(strategy.id, 'info', 'Strategy created', {
      triggerType: dto.triggerType,
      triggerValue: dto.triggerValue,
    });

    return strategy;
  }

  /**
   * Get all strategies for a user
   */
  async getUserStrategies(userId: string, filters?: {
    status?: string;
    walletId?: string;
  }) {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.walletId) {
      where.walletId = filters.walletId;
    }

    return this.prisma.strategy.findMany({
      where,
      include: {
        wallet: true,
        nextStrategy: true,
        trades: {
          orderBy: { executedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId: string, userId: string) {
    const strategy = await this.prisma.strategy.findFirst({
      where: {
        id: strategyId,
        userId,
      },
      include: {
        wallet: true,
        nextStrategy: true,
        previousStrategy: true,
        trades: {
          orderBy: { executedAt: 'desc' },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    return strategy;
  }

  /**
   * Update strategy
   */
  async updateStrategy(strategyId: string, userId: string, dto: UpdateStrategyDto) {
    const strategy = await this.getStrategy(strategyId, userId);

    if (strategy.status === 'completed') {
      throw new BadRequestException('Cannot update completed strategy');
    }

    const updated = await this.prisma.strategy.update({
      where: { id: strategyId },
      data: {
        name: dto.name,
        description: dto.description,
        triggerValue: dto.triggerValue,
        amount: dto.amount,
        stopLoss: dto.stopLoss,
        takeProfit: dto.takeProfit,
        status: dto.status,
        metadata: dto.metadata,
      },
    });

    await this.createLog(strategyId, 'info', 'Strategy updated', dto);

    return updated;
  }

  /**
   * Update strategy metadata (name/description) by PDA address
   */
  async updateMetadata(pdaStrategy: string, name: string, description?: string) {
    const strategy = await this.prisma.strategy.findUnique({
      where: { pdaStrategy },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with address ${pdaStrategy} not found`);
    }

    const updated = await this.prisma.strategy.update({
      where: { pdaStrategy },
      data: {
        name,
        ...(description !== undefined && { description }),
      },
    });

    await this.createLog(strategy.id, 'info', 'Strategy metadata updated', { name, description });

    return updated;
  }

  /**
   * Cancel strategy
   */
  async cancelStrategy(strategyId: string, userId: string) {
    const strategy = await this.getStrategy(strategyId, userId);

    if (strategy.status === 'completed') {
      throw new BadRequestException('Strategy already completed');
    }

    const updated = await this.prisma.strategy.update({
      where: { id: strategyId },
      data: { status: 'cancelled' },
    });

    await this.createLog(strategyId, 'info', 'Strategy cancelled by user');

    return updated;
  }

  /**
   * Delete strategy
   */
  async deleteStrategy(strategyId: string, userId: string) {
    await this.getStrategy(strategyId, userId);

    return this.prisma.strategy.delete({
      where: { id: strategyId },
    });
  }

  /**
   * Check if strategy conditions are met
   */
  async checkStrategyTrigger(strategyId: string): Promise<boolean> {
    const strategy = await this.prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy || strategy.status !== 'active') {
      return false;
    }

    const tokenShort = `${strategy.toToken.slice(0, 8)}...${strategy.toToken.slice(-8)}`;

    try {
      const currentPrice = await this.priceService.getTokenPrice(strategy.toToken);

      switch (strategy.triggerType) {
        case 'price':
          const shouldTrigger = currentPrice >= strategy.triggerValue;

          if (currentPrice === 0) {
            this.logger.warn(
              `⚠️  Strategy ${strategy.name} (${strategyId.slice(0, 8)}...): ` +
              `Cannot check trigger - price is 0 for token ${tokenShort}`
            );
          } else {
            this.logger.debug(
              `📊 Strategy ${strategy.name}: Current price $${currentPrice} ` +
              `${shouldTrigger ? '✅ TRIGGERS' : '❌ does not trigger'} ` +
              `(target: $${strategy.triggerValue})`
            );
          }

          return shouldTrigger;

        case 'marketCap':
          const marketCap = await this.priceService.getTokenMarketCap(strategy.toToken);
          const mcTrigger = marketCap >= strategy.triggerValue;

          if (marketCap === 0) {
            this.logger.warn(
              `⚠️  Strategy ${strategy.name} (${strategyId.slice(0, 8)}...): ` +
              `Cannot check trigger - market cap is 0 for token ${tokenShort}`
            );
          }

          return mcTrigger;

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(
        `❌ Error checking trigger for strategy ${strategy.name} (${strategyId.slice(0, 8)}...): ${error.message}`
      );

      await this.createLog(strategyId, 'error', 'Error checking trigger', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Check if strategy conditions are met using pre-fetched price (for batch operations)
   */
  checkStrategyTriggerWithPrice(
    strategy: any,
    priceMap: Map<string, number>,
    marketCapMap?: Map<string, number>,
  ): boolean {
    if (!strategy || strategy.status !== 'active') {
      return false;
    }

    const tokenShort = `${strategy.toToken.slice(0, 8)}...${strategy.toToken.slice(-8)}`;

    switch (strategy.triggerType) {
      case 'price':
        const currentPrice = priceMap.get(strategy.toToken) || 0;
        const shouldTrigger = currentPrice >= strategy.triggerValue;

        if (currentPrice === 0) {
          this.logger.warn(
            `⚠️  Strategy ${strategy.name} (${strategy.id.slice(0, 8)}...): ` +
            `Cannot check trigger - price is 0 for token ${tokenShort}`
          );
        } else {
          this.logger.debug(
            `📊 Strategy ${strategy.name}: Current price $${currentPrice} ` +
            `${shouldTrigger ? '✅ TRIGGERS' : '❌ does not trigger'} ` +
            `(target: $${strategy.triggerValue})`
          );
        }

        return shouldTrigger;

      case 'marketCap':
        const marketCap = marketCapMap?.get(strategy.toToken) || 0;
        const mcTrigger = marketCap >= strategy.triggerValue;

        if (marketCap === 0) {
          this.logger.warn(
            `⚠️  Strategy ${strategy.name} (${strategy.id.slice(0, 8)}...): ` +
            `Cannot check trigger - market cap is 0 for token ${tokenShort}`
          );
        }

        return mcTrigger;

      default:
        return false;
    }
  }

  /**
   * Mark strategy as triggered
   */
  async markStrategyTriggered(strategyId: string) {
    return this.prisma.strategy.update({
      where: { id: strategyId },
      data: {
        status: 'triggered',
        triggeredAt: new Date(),
      },
    });
  }

  /**
   * Mark strategy as completed
   */
  async markStrategyCompleted(strategyId: string) {
    return this.prisma.strategy.update({
      where: { id: strategyId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Mark strategy as failed
   */
  async markStrategyFailed(strategyId: string, error: string) {
    await this.createLog(strategyId, 'error', 'Strategy execution failed', { error });

    return this.prisma.strategy.update({
      where: { id: strategyId },
      data: { status: 'failed' },
    });
  }

  /**
   * Get all active strategies for monitoring
   */
  async getActiveStrategies() {
    return this.prisma.strategy.findMany({
      where: { status: 'active' },
      include: {
        wallet: true,
        user: true,
      },
    });
  }

  /**
   * Create strategy log
   */
  async createLog(strategyId: string, level: string, message: string, data?: any) {
    return this.prisma.strategyLog.create({
      data: {
        strategyId,
        level,
        message,
        data: data || {},
      },
    });
  }

  /**
   * Get strategy statistics
   */
  async getStrategyStats(userId: string) {
    const strategies = await this.prisma.strategy.findMany({
      where: { userId },
    });

    const trades = await this.prisma.trade.findMany({
      where: { userId },
    });

    const stats = {
      totalStrategies: strategies.length,
      activeStrategies: strategies.filter(s => s.status === 'active').length,
      completedStrategies: strategies.filter(s => s.status === 'completed').length,
      totalTrades: trades.length,
      successfulTrades: trades.filter(t => t.status === 'completed').length,
      failedTrades: trades.filter(t => t.status === 'failed').length,
    };

    return stats;
  }
}

