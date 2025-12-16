import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates and exports environment variables
 */
export const env = {

  // Solana
  SOLANA_RPC_URL: process.env['SOLANA_RPC_URL'] || 'https://api.mainnet-beta.solana.com',
  SOLANA_NETWORK: (process.env['SOLANA_NETWORK'] || 'mainnet-beta') as 'mainnet-beta' | 'devnet' | 'testnet',

  // Redis (optional, for rate limiting)
  REDIS_URL: process.env['REDIS_URL'],

  // API Server
  API_PORT: process.env['API_PORT'] ? parseInt(process.env['API_PORT']) : 3001,
  ALLOWED_ORIGINS: process.env['ALLOWED_ORIGINS'] || 'http://localhost:3000',

  // App Config
  NODE_ENV: (process.env['NODE_ENV'] || 'development') as 'development' | 'production' | 'test',
  LOG_LEVEL: (process.env['LOG_LEVEL'] || 'info') as 'debug' | 'info' | 'warn' | 'error',
} as const;

