import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { BirdeyeModule } from '../birdeye/birdeye.module';
import { TransparencyController } from './transparency.controller';
import { TransparencyService } from './transparency.service';
import { HeliusService } from './helius.service';
import { AnalysisService } from './analysis.service';
import { ClusterService } from './cluster.service';

@Module({
    imports: [ConfigModule, PrismaModule, BirdeyeModule],
    controllers: [TransparencyController],
    providers: [TransparencyService, HeliusService, AnalysisService, ClusterService],
    exports: [TransparencyService, HeliusService, ClusterService],
})
export class TransparencyModule { }

