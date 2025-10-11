import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  
  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Prisma will automatically disconnect on app shutdown via OnModuleDestroy

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('OrderSwap API')
    .setDescription('Secure, production-ready API for automated Solana trading')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('strategies', 'Trading strategy management')
    .addTag('trades', 'Trade execution and history')
    .addTag('wallets', 'Wallet management')
    .addTag('prices', 'Price and market data')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT') || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 OrderSwap Backend running on port: ${port}`);
  console.log(`📚 API Documentation available at: /api/docs`);
}

bootstrap();

