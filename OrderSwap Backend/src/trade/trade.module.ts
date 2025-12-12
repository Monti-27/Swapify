import { Module } from '@nestjs/common';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { JupiterService } from './jupiter.service';
import { PriceModule } from '../price/price.module';

@Module({
  imports: [PriceModule],
  controllers: [TradeController],
  providers: [TradeService, JupiterService],
  exports: [TradeService, JupiterService],
})
export class TradeModule {}

