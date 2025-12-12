import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StrategyService } from '../strategy/strategy.service';
import { TradeService } from '../trade/trade.service';
import { PriceService } from '../price/price.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TokenService } from '../token/token.service';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringService.name);
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private strategyService: StrategyService,
    private tradeService: TradeService,
    private priceService: PriceService,
    private websocketGateway: WebsocketGateway,
    private prisma: PrismaService,
    private walletService: WalletService,
    private tokenService: TokenService,
  ) { }

  onModuleInit() {
    // Start monitoring on module initialization
    this.startMonitoring();
    this.logger.log('Monitoring service initialized');
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring already running');
      return;
    }

    this.isMonitoring = true;
    const interval = this.configService.get<number>('MONITORING_INTERVAL') || 5000;

    this.monitoringInterval = setInterval(async () => {
      await this.checkStrategies();
    }, interval);

    this.logger.log(`Monitoring started with ${interval}ms interval`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;
    this.logger.log('Monitoring stopped');
  }

  /**
   * Check all active strategies for triggers (batch optimized)
   */
  async checkStrategies() {
    try {
      const activeStrategies = await this.strategyService.getActiveStrategies();

      if (activeStrategies.length === 0) {
        return;
      }

      this.logger.debug(`Checking ${activeStrategies.length} active strategies`);

      // Extract unique tokens needing price checks
      const uniqueTokens = new Set<string>();
      for (const strategy of activeStrategies) {
        if (strategy.triggerType === 'price') {
          uniqueTokens.add(strategy.toToken);
        }
      }

      // Batch fetch all prices in one API call
      const priceMap = await this.priceService.getMultipleTokenPrices(
        Array.from(uniqueTokens)
      );

      this.logger.debug(`Fetched prices for ${uniqueTokens.size} unique tokens`);

      // Evaluate strategies in memory
      for (const strategy of activeStrategies) {
        await this.checkStrategyWithPrice(strategy, priceMap);
      }
    } catch (error) {
      this.logger.error('Error checking strategies:', error);
      await this.logSystemError('monitoring', 'Error in checkStrategies', error);
    }
  }

  /**
   * Check individual strategy using pre-fetched price data
   */
  private async checkStrategyWithPrice(
    strategy: any,
    priceMap: Map<string, number>,
  ) {
    try {
      const isTriggered = this.strategyService.checkStrategyTriggerWithPrice(
        strategy,
        priceMap,
      );

      if (isTriggered) {
        this.logger.log(`Strategy ${strategy.id} triggered!`);
        await this.executeStrategy(strategy);
      }
    } catch (error) {
      this.logger.error(`Error checking strategy ${strategy.id}:`, error);
      await this.strategyService.createLog(
        strategy.id,
        'error',
        'Error checking trigger',
        { error: error.message },
      );
    }
  }

  /**
   * Execute triggered strategy
   */
  private async executeStrategy(strategy: any) {
    try {
      // Check stop loss before executing
      if (strategy.stopLoss) {
        const currentPrice = await this.priceService.getTokenPrice(strategy.toToken);
        if (currentPrice > 0 && currentPrice <= strategy.stopLoss) {
          this.logger.warn(`Strategy ${strategy.id} hit stop loss at $${currentPrice}. Cancelling...`);
          await this.strategyService.cancelStrategy(strategy.id, strategy.userId);
          await this.strategyService.createLog(
            strategy.id,
            'warning',
            `Stop loss triggered at $${currentPrice}. Strategy cancelled.`,
            { stopLoss: strategy.stopLoss, currentPrice }
          );

          // Notify user
          this.websocketGateway.notifyUser(strategy.userId, {
            type: 'strategy_cancelled',
            strategyId: strategy.id,
            strategyName: strategy.name,
            reason: 'stop_loss',
            message: `Strategy "${strategy.name}" cancelled due to stop loss at $${currentPrice}`,
          });

          return; // Don't execute the trade
        }
      }

      // Mark as triggered
      await this.strategyService.markStrategyTriggered(strategy.id);

      // Calculate amount to trade (human-readable)
      let humanAmount: number;
      if (strategy.amountType === 'percentage') {
        // Get wallet balance and calculate percentage
        const balance = await this.getTokenBalance(
          strategy.wallet.publicKey,
          strategy.fromToken,
        );
        humanAmount = (balance * strategy.amount) / 100;

        this.logger.log(`Calculated amount: ${humanAmount} from ${balance} balance (${strategy.amount}%)`);
      } else {
        humanAmount = strategy.amount;
      }

      // Get token decimals for conversion
      const decimals = await this.tokenService.getTokenDecimals(strategy.fromToken);

      // Convert to smallest unit (lamports for SOL, base units for other tokens)
      const amountInSmallestUnit = Math.floor(humanAmount * Math.pow(10, decimals));

      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.log(`💰 AMOUNT CONVERSION FOR STRATEGY ${strategy.id}`);
      this.logger.log(`   Token: ${strategy.fromToken.slice(0, 8)}...`);
      this.logger.log(`   Decimals: ${decimals}`);
      this.logger.log(`   Human-readable amount: ${humanAmount}`);
      this.logger.log(`   Smallest unit amount: ${amountInSmallestUnit}`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Prepare trade with amount in smallest unit
      const { trade, transaction } = await this.tradeService.prepareTrade({
        userId: strategy.userId,
        walletId: strategy.walletId,
        fromToken: strategy.fromToken,
        toToken: strategy.toToken,
        amount: amountInSmallestUnit,  // ✅ Now sending lamports/smallest units
        strategyId: strategy.id,
      });

      // Notify user via WebSocket
      this.websocketGateway.notifyUser(strategy.userId, {
        type: 'strategy_triggered',
        strategyId: strategy.id,
        strategyName: strategy.name,
        tradeId: trade.id,
        transaction,
        fromToken: strategy.fromToken,
        toToken: strategy.toToken,
        amount: humanAmount,  // Send human-readable amount for display
        amountInSmallestUnit: amountInSmallestUnit,  // Also send for reference
        message: `Strategy "${strategy.name}" has been triggered. Please sign the transaction.`,
      });

      this.logger.log(`Notification sent to user ${strategy.userId} for strategy ${strategy.id}`);

      // Log execution
      await this.strategyService.createLog(
        strategy.id,
        'info',
        'Strategy triggered and trade prepared',
        {
          tradeId: trade.id,
          humanAmount,
          amountInSmallestUnit,
          decimals,
        },
      );

      // Check if there's a next strategy in the chain
      if (strategy.nextStrategyId) {
        // Activate next strategy
        await this.activateNextStrategy(strategy.nextStrategyId);
      }
    } catch (error) {
      this.logger.error(`Error executing strategy ${strategy.id}:`, error);
      await this.strategyService.markStrategyFailed(strategy.id, error.message);

      // Notify user of failure
      this.websocketGateway.notifyUser(strategy.userId, {
        type: 'strategy_failed',
        strategyId: strategy.id,
        error: error.message,
      });
    }
  }

  /**
   * Activate next strategy in chain
   */
  private async activateNextStrategy(strategyId: string) {
    try {
      await this.prisma.strategy.update({
        where: { id: strategyId },
        data: { status: 'active' },
      });

      this.logger.log(`Activated next strategy in chain: ${strategyId}`);
    } catch (error) {
      this.logger.error(`Error activating next strategy ${strategyId}:`, error);
    }
  }

  /**
   * Get token balance from wallet
   */
  private async getTokenBalance(walletPublicKey: string, tokenAddress: string): Promise<number> {
    try {
      // Check if it's native SOL (common addresses)
      const solAddresses = [
        'So11111111111111111111111111111111111111112',
        'SOL',
        'sol',
      ];

      if (solAddresses.includes(tokenAddress)) {
        const balance = await this.walletService.getSolBalance(walletPublicKey);
        this.logger.debug(`SOL balance for ${walletPublicKey.slice(0, 8)}...: ${balance}`);
        return balance;
      } else {
        // SPL Token balance
        const balance = await this.walletService.getTokenBalance(walletPublicKey, tokenAddress);
        this.logger.debug(`Token ${tokenAddress.slice(0, 8)}... balance: ${balance}`);
        return balance;
      }
    } catch (error) {
      this.logger.error(`Error fetching balance for ${tokenAddress}:`, error);
      return 0;
    }
  }

  /**
   * Clean up old data periodically
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldData() {
    try {
      // Clean old price cache
      await this.priceService.clearOldCache();

      // Clean old logs (keep last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.prisma.systemLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log('Old data cleanup completed');
    } catch (error) {
      this.logger.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Health check
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheck() {
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      // Check active strategies count
      const activeCount = await this.prisma.strategy.count({
        where: { status: 'active' },
      });

      this.logger.debug(`Health check: ${activeCount} active strategies, monitoring: ${this.isMonitoring}`);
    } catch (error) {
      this.logger.error('Health check failed:', error);
      await this.logSystemError('system', 'Health check failed', error);
    }
  }

  /**
   * Log system error
   */
  private async logSystemError(service: string, message: string, error: any) {
    try {
      await this.prisma.systemLog.create({
        data: {
          level: 'error',
          service,
          message,
          data: {
            error: error.message,
            stack: error.stack,
          },
        },
      });
    } catch (e) {
      this.logger.error('Failed to log system error:', e);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      interval: this.configService.get('MONITORING_INTERVAL') || 5000,
    };
  }
}

