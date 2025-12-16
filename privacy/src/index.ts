#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { privacyRouter } from './api/privacy-send.js';

const app = express();

// CORS configuration
const corsOptions = {
  origin: env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : [
    'http://localhost:3000',  // Next.js dev
    'http://localhost:3001',    // Next.js prod
    'https://yourapp.com'       // Production domain
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting for privacy operations
const privacyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit to 20 requests per 5 minutes per IP
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Privacy Cash API',
    timestamp: new Date().toISOString() 
  });
});

// Privacy routes with rate limiting
app.use('/api/privacy', privacyLimiter, privacyRouter);

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Privacy API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Privacy API endpoint not found' });
});

/**
 * Main entry point for the Privacy Cash API
 */
function main() {
  const port = env.API_PORT || 3001;
  
  app.listen(port, () => {
    console.log('🚀 Starting Privacy Cash API...');
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Log Level: ${env.LOG_LEVEL}`);
    console.log(`🔐 Privacy Cash API server running on port ${port}`);
    console.log(`📋 Health check: http://localhost:${port}/health`);
    console.log(`💰 Deposit: POST http://localhost:${port}/api/privacy/deposit (client signs)`);
    console.log(`💸 Withdraw: POST http://localhost:${port}/api/privacy/withdraw (server executes)`);
    console.log(`📡 Relay: POST http://localhost:${port}/api/privacy/relay (for deposits)`);
    console.log(`📖 Deposit: client signs → Withdraw: direct execution`);
  });
}

// Start the API server
main();

