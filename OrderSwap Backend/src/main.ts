import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  console.log('🚀 Starting OrderSwap Backend...');
  console.log('📍 Node Environment:', process.env.NODE_ENV || 'development');
  console.log('📍 Port:', process.env.PORT || 3000);
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  
  // Log important config (without sensitive data)
  console.log('🔧 Configuration loaded:');
  console.log('   - CORS Origins:', configService.get('CORS_ORIGINS') || 'Not set');
  console.log('   - Database:', configService.get('DATABASE_URL') ? '✅ Set' : '❌ Missing');
  console.log('   - JWT Secret:', configService.get('JWT_SECRET') ? '✅ Set' : '❌ Missing');
  console.log('   - Solana RPC:', configService.get('SOLANA_RPC_URL') ? '✅ Set' : '❌ Missing');

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
  
  try {
    await app.listen(port, '0.0.0.0');
    console.log('✅ Server started successfully!');
    console.log(`🚀 OrderSwap Backend running on port: ${port}`);
    console.log(`📚 API Documentation available at: /api/docs`);
    console.log(`🏥 Healthcheck endpoint: /`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Fatal error during bootstrap:', error);
  process.exit(1);
});

