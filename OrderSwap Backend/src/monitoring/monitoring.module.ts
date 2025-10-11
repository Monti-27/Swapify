import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { StrategyModule } from '../strategy/strategy.module';
import { TradeModule } from '../trade/trade.module';
import { PriceModule } from '../price/price.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { WalletModule } from '../wallet/wallet.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [PrismaModule, StrategyModule, TradeModule, PriceModule, WebsocketModule, WalletModule, TokenModule],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}

