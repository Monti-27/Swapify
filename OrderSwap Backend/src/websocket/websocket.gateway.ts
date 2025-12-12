import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PriceService } from '../price/price.service';
import { ChartTimeframe } from '../price/dto/price-history.dto';
import { CandleAggregatorService } from '../birdeye/candle-aggregator.service';
import { OHLCVCandle } from '../price/dto/price-history.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private chartSubscriptions: Map<string, Map<string, Set<string>>> = new Map(); // tokenAddress -> timeframe -> Set of socketIds

  constructor(
    private priceService: PriceService,
    private candleAggregator: CandleAggregatorService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from user mapping
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }

    // Remove from chart subscriptions
    for (const [tokenAddress, timeframeMap] of this.chartSubscriptions.entries()) {
      for (const [timeframe, sockets] of timeframeMap.entries()) {
        if (sockets.has(client.id)) {
          sockets.delete(client.id);
          
          // If no more subscribers for this timeframe, unsubscribe from aggregator
          if (sockets.size === 0) {
            timeframeMap.delete(timeframe);
            this.candleAggregator.unsubscribeFromCandles(
              tokenAddress,
              timeframe as ChartTimeframe,
              this.handleCandleUpdate.bind(this),
            );
          }
        }
      }
      
      // Clean up empty token entries
      if (timeframeMap.size === 0) {
        this.chartSubscriptions.delete(tokenAddress);
      }
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    
    this.userSockets.get(userId).add(client.id);
    this.logger.log(`User ${userId} authenticated with socket ${client.id}`);
    
    client.emit('authenticated', { success: true });
  }

  @SubscribeMessage('subscribe_strategy')
  handleSubscribeStrategy(
    @MessageBody() data: { strategyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`strategy:${data.strategyId}`);
    this.logger.log(`Client ${client.id} subscribed to strategy ${data.strategyId}`);
  }

  @SubscribeMessage('unsubscribe_strategy')
  handleUnsubscribeStrategy(
    @MessageBody() data: { strategyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`strategy:${data.strategyId}`);
    this.logger.log(`Client ${client.id} unsubscribed from strategy ${data.strategyId}`);
  }

  /**
   * Notify specific user
   */
  notifyUser(userId: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        // Send both as 'notification' and as the specific event type
        this.server.to(socketId).emit('notification', data);
        
        // Also emit specific event type if available
        if (data.type) {
          this.server.to(socketId).emit(data.type, data);
          this.logger.debug(`Emitted ${data.type} event to user ${userId}`);
        }
      });
      this.logger.debug(`Notified user ${userId} (${sockets.size} sockets)`);
    } else {
      this.logger.warn(`No active sockets for user ${userId}`);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  /**
   * Notify strategy room
   */
  notifyStrategy(strategyId: string, data: any) {
    this.server.to(`strategy:${strategyId}`).emit('strategy_update', data);
  }

  /**
   * Send price update
   */
  sendPriceUpdate(tokenAddress: string, price: number) {
    this.broadcast('price_update', { tokenAddress, price });
  }

  /**
   * Send trade update
   */
  sendTradeUpdate(userId: string, trade: any) {
    this.notifyUser(userId, {
      type: 'trade_update',
      trade,
    });
  }

  /**
   * Subscribe to chart updates for a token
   */
  @SubscribeMessage('subscribe_chart')
  handleSubscribeChart(
    @MessageBody() data: { tokenAddress: string; timeframe?: ChartTimeframe },
    @ConnectedSocket() client: Socket,
  ) {
    const { tokenAddress, timeframe = ChartTimeframe.ONE_HOUR } = data;

    if (!this.chartSubscriptions.has(tokenAddress)) {
      this.chartSubscriptions.set(tokenAddress, new Map());
    }

    const timeframeMap = this.chartSubscriptions.get(tokenAddress);
    if (!timeframeMap.has(timeframe)) {
      timeframeMap.set(timeframe, new Set());
      
      // Subscribe to candle aggregator for this token/timeframe
      this.candleAggregator.subscribeToCandles(
        tokenAddress,
        timeframe,
        this.handleCandleUpdate.bind(this),
      );
      
      const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
      this.logger.log(`Subscribed to live candles for ${shortAddress} (${timeframe})`);
    }

    timeframeMap.get(timeframe).add(client.id);
    
    const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
    this.logger.log(`Client ${client.id} subscribed to chart updates for ${shortAddress} (${timeframe})`);

    client.emit('chart_subscribed', { tokenAddress, timeframe, success: true });
  }

  /**
   * Unsubscribe from chart updates
   */
  @SubscribeMessage('unsubscribe_chart')
  handleUnsubscribeChart(
    @MessageBody() data: { tokenAddress: string; timeframe?: ChartTimeframe },
    @ConnectedSocket() client: Socket,
  ) {
    const { tokenAddress, timeframe = ChartTimeframe.ONE_HOUR } = data;
    const timeframeMap = this.chartSubscriptions.get(tokenAddress);

    if (timeframeMap) {
      const sockets = timeframeMap.get(timeframe);
      
      if (sockets) {
        sockets.delete(client.id);
        
        // If no more subscribers, unsubscribe from aggregator
        if (sockets.size === 0) {
          timeframeMap.delete(timeframe);
          this.candleAggregator.unsubscribeFromCandles(
            tokenAddress,
            timeframe,
            this.handleCandleUpdate.bind(this),
          );
        }
      }
      
      // Clean up empty token entries
      if (timeframeMap.size === 0) {
        this.chartSubscriptions.delete(tokenAddress);
      }
    }

    const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
    this.logger.log(`Client ${client.id} unsubscribed from chart updates for ${shortAddress} (${timeframe})`);
    client.emit('chart_unsubscribed', { tokenAddress, timeframe, success: true });
  }

  /**
   * Handle candle updates from aggregator and broadcast to subscribers
   */
  private handleCandleUpdate(tokenAddress: string, candle: OHLCVCandle): void {
    const timeframeMap = this.chartSubscriptions.get(tokenAddress);
    
    if (!timeframeMap || timeframeMap.size === 0) {
      return;
    }

    // Broadcast to all subscribers of this token (across all timeframes)
    let totalSubscribers = 0;
    
    timeframeMap.forEach((sockets, timeframe) => {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('chart_update', {
          tokenAddress,
          candle,
          timeframe,
          timestamp: Date.now(),
        });
        totalSubscribers++;
      });
    });

    if (totalSubscribers > 0) {
      const shortAddress = `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`;
      this.logger.debug(`Broadcasted candle update for ${shortAddress} to ${totalSubscribers} clients`);
    }
  }

  /**
   * Get candle aggregator statistics
   */
  getCandleAggregatorStats() {
    return this.candleAggregator.getStats();
  }
}

