import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PriceModule } from '../price/price.module';
import { BlockchainService } from './blockchain.service';

@Module({
    imports: [ConfigModule, PrismaModule, PriceModule],
    providers: [BlockchainService],
    exports: [BlockchainService],
})
export class BlockchainModule { }
