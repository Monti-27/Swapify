import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainService } from './blockchain.service';

@Module({
    imports: [ConfigModule, PrismaModule],
    providers: [BlockchainService],
    exports: [BlockchainService],
})
export class BlockchainModule { }
