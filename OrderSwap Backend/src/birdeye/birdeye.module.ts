import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BirdeyeService } from './birdeye.service';
import { CandleAggregatorService } from './candle-aggregator.service';
import { BirdeyeController } from './birdeye.controller';

@Module({
  imports: [ConfigModule],
  controllers: [BirdeyeController],
  providers: [BirdeyeService, CandleAggregatorService],
  exports: [BirdeyeService, CandleAggregatorService],
})
export class BirdeyeModule {}

