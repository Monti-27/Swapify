'use client';

import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

type WebSocketMessageHandler = (data: any) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private url: string;
  private handlers: Map<string, Set<WebSocketMessageHandler>> = new Map();
  private currentUserId: string | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(token?: string) {
    if (this.socket?.connected) {
      // console.log('✅ Socket.IO already connected');
      return;
    }

    // console.log('🔌 Connecting to Socket.IO server:', this.url);

    // Create Socket.IO connection
    this.socket = io(this.url, {
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: token ? { token } : undefined,
    });

    this.socket.on('connect', () => {
      // console.log('✅ Socket.IO connected!', this.socket?.id);

      // Auto-authenticate if token is provided
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId || payload.sub;
          this.currentUserId = userId;

          // console.log('🔐 Authenticating with userId:', userId);

          // Send authenticate message
          this.socket?.emit('authenticate', { userId, token });
        } catch (error) {
          console.log('Failed to decode JWT:', error);
          toast.error('WebSocket Authentication Failed', {
            description: 'Please reconnect your wallet'
          });
        }
      }
    });

    this.socket.on('authenticated', (data: any) => {
      if (data.success) {
        // console.log('✅ Socket.IO authenticated successfully!');
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.log('Socket.IO connection error:', error.message);
      toast.error('Real-time Connection Failed', {
        description: 'Some features may not work properly'
      });
    });

    // Listen for all custom events
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Listen for notification events
    this.socket.on('notification', (data: any) => {
      console.log('📬 Received notification:', data);
      this.triggerHandlers('notification', data);
    });

    // Listen for specific event types
    this.socket.on('strategy_triggered', (data: any) => {
      console.log('🎯 Strategy triggered event:', data);
      this.triggerHandlers('strategy_triggered', data);
    });

    this.socket.on('strategy_completed', (data: any) => {
      console.log('✅ Strategy completed event:', data);
      this.triggerHandlers('strategy_completed', data);
    });

    this.socket.on('trade_update', (data: any) => {
      console.log('💱 Trade update event:', data);
      this.triggerHandlers('trade_update', data);
    });

    this.socket.on('price_update', (data: any) => {
      this.triggerHandlers('price_update', data);
    });

    this.socket.on('balance_update', (data: any) => {
      this.triggerHandlers('balance_update', data);
    });

    this.socket.on('chart_update', (data: any) => {
      this.triggerHandlers('chart_update', data);
    });

    this.socket.on('chart_subscribed', (data: any) => {
      console.log('📊 Subscribed to chart updates:', data);
      this.triggerHandlers('chart_subscribed', data);
    });

    this.socket.on('chart_unsubscribed', (data: any) => {
      console.log('📊 Unsubscribed from chart updates:', data);
      this.triggerHandlers('chart_unsubscribed', data);
    });
  }

  private triggerHandlers(event: string, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  on(event: string, handler: WebSocketMessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    // console.log(`📡 Registered handler for event: ${event}`);
  }

  off(event: string, handler: WebSocketMessageHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  send(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket.IO is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  subscribeToChart(tokenAddress: string, timeframe?: string) {
    this.send('subscribe_chart', { tokenAddress, timeframe });
  }

  unsubscribeFromChart(tokenAddress: string) {
    this.send('unsubscribe_chart', { tokenAddress });
  }
}

// Export singleton instance
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
export const wsClient = new WebSocketClient(WS_URL);

// WebSocket event types
export const WS_EVENTS = {
  PRICE_UPDATE: 'price_update',
  TRADE_UPDATE: 'trade_update',
  STRATEGY_TRIGGERED: 'strategy_triggered',
  STRATEGY_COMPLETED: 'strategy_completed',
  BALANCE_UPDATE: 'balance_update',
  NOTIFICATION: 'notification',
  CHART_UPDATE: 'chart_update',
  CHART_SUBSCRIBED: 'chart_subscribed',
  CHART_UNSUBSCRIBED: 'chart_unsubscribed',
} as const;

