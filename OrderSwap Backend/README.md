# OrderSwap Backend

Secure, production-ready backend for automated Solana trading with multi-step trading strategies.

## Features

- ✅ **Non-custodial** - Never stores user private keys
- ✅ **Wallet-based Authentication** - JWT auth with wallet signature verification
- ✅ **Multi-step Trading Strategies** - Chain multiple automated trades
- ✅ **Jupiter Aggregator Integration** - Optimized swaps with best rates
- ✅ **Price Monitoring** - Real-time price tracking via DexScreener
- ✅ **WebSocket Support** - Real-time notifications to frontend
- ✅ **Automated Execution** - Monitoring bot checks triggers every 5 seconds
- ✅ **Comprehensive Logging** - Full audit trail of all operations
- ✅ **API Documentation** - Interactive Swagger/OpenAPI docs

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Robust relational database
- **Solana Web3.js** - Solana blockchain integration
- **Jupiter SDK** - Optimized token swaps
- **Socket.io** - WebSocket communication
- **JWT** - Secure authentication

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Database URL
- JWT secret
- Solana RPC endpoint
- API keys

3. **Set up database:**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

4. **Start the development server:**
```bash
npm run start:dev
```

The backend will run on `http://localhost:3000`

API documentation available at: `http://localhost:3000/api/docs`

## API Endpoints

### Authentication
- `POST /auth/message` - Get message to sign
- `POST /auth/authenticate` - Authenticate with signed message
- `GET /auth/me` - Get current user info
- `POST /auth/refresh` - Refresh access token

### Wallets
- `GET /wallets` - Get user wallets
- `GET /wallets/:id` - Get wallet details
- `GET /wallets/:id/balance` - Get wallet balances
- `PATCH /wallets/:id` - Update wallet
- `DELETE /wallets/:id` - Delete wallet

### Strategies
- `POST /strategies` - Create trading strategy
- `GET /strategies` - List user strategies
- `GET /strategies/:id` - Get strategy details
- `PATCH /strategies/:id` - Update strategy
- `POST /strategies/:id/cancel` - Cancel strategy
- `DELETE /strategies/:id` - Delete strategy
- `GET /strategies/stats` - Get strategy statistics

### Trades
- `POST /trades/prepare` - Prepare a trade (get quote)
- `POST /trades/:id/execute` - Execute prepared trade
- `POST /trades/simulate` - Simulate trade outcome
- `GET /trades` - Get trade history
- `GET /trades/:id` - Get trade details
- `POST /trades/:id/cancel` - Cancel pending trade
- `GET /trades/stats` - Get trade statistics

### Prices
- `GET /prices?token=ADDRESS` - Get token price
- `POST /prices/batch` - Get multiple token prices
- `GET /prices/info?token=ADDRESS` - Get detailed token info
- `GET /prices/market-cap?token=ADDRESS` - Get market cap

## Architecture

### Core Services

#### AuthService
- Wallet signature verification
- JWT token generation
- Non-custodial authentication

#### StrategyService
- Create and manage trading strategies
- Multi-step strategy chaining
- Trigger condition evaluation

#### TradeService
- Jupiter SDK integration
- Trade preparation and execution
- Transaction management

#### PriceService
- DexScreener API integration
- Price caching (5s TTL)
- Batch price fetching

#### MonitoringService
- Continuous strategy monitoring (5s interval)
- Automatic trigger detection
- Trade execution orchestration
- Health checks and cleanup

#### WebsocketGateway
- Real-time user notifications
- Strategy update broadcasts
- Price feeds

### Database Schema

**User** - User accounts
- id, createdAt, updatedAt
- Relations: wallets, strategies, trades

**Wallet** - User wallet addresses
- id, publicKey, userId, name, isActive
- Relations: user, strategies, trades

**Strategy** - Automated trading rules
- id, userId, walletId, name, description
- fromToken, toToken, triggerType, triggerValue
- amountType, amount, stopLoss, takeProfit
- nextStrategyId (for chaining)
- status, triggeredAt, completedAt
- Relations: user, wallet, trades, logs, nextStrategy

**Trade** - Executed trades
- id, userId, walletId, strategyId
- type, fromToken, toToken, fromAmount, toAmount
- executionPrice, slippage, txSignature
- status, executedAt, completedAt

**StrategyLog** - Strategy execution logs
**PriceCache** - Cached price data
**SystemLog** - System-wide logs

## Security Features

✅ **Non-custodial Architecture**
- Private keys never stored on server
- All transactions signed client-side
- Backend only broadcasts signed transactions

✅ **Authentication**
- Wallet signature-based auth
- JWT tokens for API access
- Automatic token expiration

✅ **Input Validation**
- class-validator for all DTOs
- Automatic request sanitization
- Type-safe database queries

✅ **Rate Limiting**
- 100 requests per 60 seconds per IP
- Configurable via environment

✅ **Security Headers**
- Helmet.js integration
- CORS configuration
- XSS protection

✅ **Error Handling**
- Safe error messages
- No sensitive data leakage
- Comprehensive logging

## Monitoring & Logging

The monitoring bot runs continuously and:
- Checks all active strategies every 5 seconds
- Evaluates trigger conditions (price, market cap)
- Prepares trades when triggered
- Notifies users via WebSocket
- Activates chained strategies
- Performs health checks every 5 minutes
- Cleans up old data every hour

All operations are logged to:
- Console (development)
- Database (SystemLog, StrategyLog)
- Available via Prisma Studio

## Production Deployment

### Environment Configuration

For production, update `.env`:
```env
NODE_ENV=production
SOLANA_RPC_URL=https://your-premium-rpc-endpoint.com
JWT_SECRET=use-a-strong-random-secret
DATABASE_URL=your-production-database-url
CORS_ORIGINS=https://your-frontend-domain.com
```

### Database Migration

```bash
npm run build
npm run prisma:migrate
npm run start:prod
```

### Recommended Setup

- Use a premium Solana RPC (Alchemy, QuickNode, Helius)
- Enable database connection pooling
- Set up monitoring (Datadog, New Relic)
- Configure log aggregation (CloudWatch, Papertrail)
- Use environment-based secrets management
- Enable SSL/TLS
- Set up backup strategies

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Development Tools

```bash
# Watch mode
npm run start:dev

# Debug mode
npm run start:debug

# Prisma Studio (database GUI)
npm run prisma:studio

# Linting
npm run lint

# Formatting
npm run format
```

## WebSocket Events

### Client to Server
- `authenticate` - Authenticate WebSocket connection
- `subscribe_strategy` - Subscribe to strategy updates
- `unsubscribe_strategy` - Unsubscribe from strategy

### Server to Client
- `authenticated` - Authentication success
- `notification` - General notifications
- `strategy_update` - Strategy status changes
- `strategy_triggered` - Strategy trigger notification
- `strategy_failed` - Strategy execution failed
- `trade_update` - Trade status update
- `price_update` - Token price update

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## License

MIT

