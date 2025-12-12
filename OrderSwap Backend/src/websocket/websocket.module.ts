import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { PriceModule } from '../price/price.module';
import { BirdeyeModule } from '../birdeye/birdeye.module';

@Module({
  imports: [PriceModule, BirdeyeModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}

