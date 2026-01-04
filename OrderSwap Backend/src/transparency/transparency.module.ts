import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TransparencyController } from './transparency.controller';
import { TransparencyService } from './transparency.service';
import { HeliusService } from './helius.service';
import { AnalysisService } from './analysis.service';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [TransparencyController],
    providers: [TransparencyService, HeliusService, AnalysisService],
    exports: [TransparencyService, HeliusService],
})
export class TransparencyModule { }
