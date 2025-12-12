import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BirdeyeModule } from '../birdeye/birdeye.module';

@Module({
  imports: [ConfigModule, PrismaModule, BirdeyeModule],
  controllers: [PriceController],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}

