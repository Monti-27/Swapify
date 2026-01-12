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
                const redisUrl = configService.get<string>('REDIS_URL');

                if (redisUrl) {
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
