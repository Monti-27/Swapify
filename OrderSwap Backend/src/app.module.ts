import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { StrategyModule } from './strategy/strategy.module';
import { TradeModule } from './trade/trade.module';
import { PriceModule } from './price/price.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { WebsocketModule } from './websocket/websocket.module';
import { LoggerModule } from './logger/logger.module';
import { TokenModule } from './token/token.module';
import { HealthModule } from './health/health.module';
import { BirdeyeModule } from './birdeye/birdeye.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per TTL
    }]),
    
    // Scheduling for monitoring bot
    ScheduleModule.forRoot(),
    
    // Core modules
    PrismaModule,
    LoggerModule,
    HealthModule,
    BirdeyeModule,
    
    // Feature modules
    AuthModule,
    WalletModule,
    StrategyModule,
    TradeModule,
    PriceModule,
    TokenModule,
    MonitoringModule,
    WebsocketModule,
  ],
})
export class AppModule {}

