/**
 * Privacy Module - BullMQ + Database Configuration
 * 
 * Registers the privacy queue, processor, and database access.
 * Supports Railway's REDIS_URL or individual REDIS_HOST/PORT/PASSWORD.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { PrivacyProcessor } from './privacy.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        BullModule.registerQueueAsync({
            name: 'privacy',
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                // Railway provides REDIS_URL, parse it if available
                const redisUrl = configService.get<string>('REDIS_URL');

                if (redisUrl) {
                    // Parse Redis URL (redis://default:password@host:port)
                    const url = new URL(redisUrl);
                    return {
                        connection: {
                            host: url.hostname,
                            port: parseInt(url.port) || 6379,
                            password: url.password || undefined,
                            username: url.username !== 'default' ? url.username : undefined,
                        },
                        defaultJobOptions: {
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 60000 },
                        },
                    };
                }

                // Fallback to individual env vars
                return {
                    connection: {
                        host: configService.get<string>('REDIS_HOST', 'localhost'),
                        port: configService.get<number>('REDIS_PORT', 6379),
                        password: configService.get<string>('REDIS_PASSWORD'),
                    },
                    defaultJobOptions: {
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 60000 },
                    },
                };
            },
        }),
    ],
    controllers: [PrivacyController],
    providers: [PrivacyService, PrivacyProcessor],
    exports: [PrivacyService],
})
export class PrivacyModule { }

