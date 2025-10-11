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
}

