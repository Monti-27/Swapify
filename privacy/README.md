# Privacy Cash API

A REST API server for Privacy Cash operations on Solana. This API enables private SOL deposits, withdrawals, and balance checks using the Privacy Cash SDK with zero-knowledge proofs.

## Features

- 🔐 **Private Deposits**: Create unsigned deposit transactions for client-side signing
- 💸 **Private Withdrawals**: Execute withdrawals directly using the Privacy Cash SDK
- 💰 **Balance Checks**: Query private balances using encrypted UTXOs
- 📡 **Transaction Relay**: Relay signed transactions to the Privacy Cash indexer
- 🚀 **Stateless**: No database required - Privacy Cash SDK handles all state via LocalStorage
- 🔒 **Wallet-Agnostic**: Works with any Solana wallet via Solana Wallet Adapter

## Architecture

### Components

- **API Routes**: REST endpoints for deposit, withdraw, relay, and balance operations
- **Privacy Cash SDK**: Zero-knowledge proof operations and UTXO management
- **Express Server**: HTTP server with CORS and rate limiting

### Tech Stack

- **Express**: HTTP server framework
- **Privacy Cash SDK**: Private SOL transfers with zero-knowledge proofs
- **Solana Web3.js**: Solana blockchain interactions
- **TypeScript**: Type-safe development

## Setup

### Prerequisites

- Node.js 20+
- Solana RPC endpoint (mainnet or devnet)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **(Optional) Build the Privacy Cash SDK if you've changed it:**

```bash
npm run build:sdk
```

3. **Set up environment variables:**

Create a `.env` file with the following variables:

```env
# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# API Server
API_PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,https://yourapp.com

# App Config
NODE_ENV=development
LOG_LEVEL=info
```

4. **Start the API server:**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server status and timestamp.

### Deposit

```
POST /api/privacy/deposit
```

Creates an unsigned deposit transaction for the client to sign.

**Request Body:**
```json
{
  "amount": 0.1,
  "senderWallet": "YourWalletAddress...",
  "signedMessage": "base64EncodedSignedMessage"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": "base64EncodedTransaction",
  "message": "Created deposit transaction for 0.1 SOL",
  "details": {
    "amount": 0.1,
    "lamports": 100000000,
    "sender": "YourWalletAddress...",
    "instructions": {
      "step1": "Sign this transaction with your wallet",
      "step2": "Send signed transaction to /api/privacy/relay",
      "step3": "Transaction will be submitted to Solana network"
    }
  }
}
```

### Relay

```
POST /api/privacy/relay
```

Relays a signed transaction to the Privacy Cash indexer.

**Request Body:**
```json
{
  "signedTransaction": "base64EncodedSignedTransaction",
  "transactionType": "deposit"
}
```

**Response:**
```json
{
  "success": true,
  "signature": "transactionSignature...",
  "message": "deposit transaction confirmed",
  "explorerUrl": "https://explorer.solana.com/tx/...",
  "details": {
    "transactionType": "deposit",
    "signer": "YourWalletAddress..."
  }
}
```

### Withdraw

```
POST /api/privacy/withdraw
```

Executes a private withdrawal directly (no client-side signing needed).

**Request Body:**
```json
{
  "amount": 0.1,
  "senderWallet": "YourWalletAddress...",
  "recipient": "RecipientAddress...",
  "signedMessage": "base64EncodedSignedMessage"
}
```

**Response:**
```json
{
  "success": true,
  "signature": "transactionSignature...",
  "message": "Privacy withdraw completed for 0.1 SOL",
  "transaction": {
    "signature": "transactionSignature...",
    "amount": {
      "sol": "0.100000000",
      "lamports": 100000000
    },
    "fee": {
      "sol": "0.000000000",
      "lamports": 0
    },
    "recipient": "RecipientAddress...",
    "sender": "YourWalletAddress...",
    "isPartial": false,
    "explorerUrl": "https://explorer.solana.com/tx/..."
  }
}
```

### Balance

```
POST /api/privacy/balance
```

Get private balance for a wallet address.

**Request Body:**
```json
{
  "walletAddress": "YourWalletAddress...",
  "signedMessage": "base64EncodedSignedMessage"
}
```

**Response:**
```json
{
  "success": true,
  "balance": {
    "lamports": 100000000,
    "sol": "0.100000000"
  },
  "utxos": {
    "count": 1,
    "details": [
      {
        "amount": {
          "lamports": 100000000,
          "sol": "0.100000000"
        },
        "index": 0
      }
    ]
  },
  "wallet": "YourWalletAddress...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage Flow

### Deposit Flow

1. Client signs a message with their wallet (using Solana Wallet Adapter)
2. Client sends signed message to `/api/privacy/deposit`
3. API returns unsigned transaction
4. Client signs the transaction with their wallet
5. Client sends signed transaction to `/api/privacy/relay`
6. API relays transaction to Privacy Cash indexer

### Withdraw Flow

1. Client signs a message with their wallet
2. Client sends signed message and recipient address to `/api/privacy/withdraw`
3. API executes withdrawal directly (indexer handles signing)

### Balance Check Flow

1. Client signs a message with their wallet
2. Client sends signed message to `/api/privacy/balance`
3. API returns private balance from encrypted UTXOs

## Project Structure

```
src/
├── index.ts              # Main entry point (Express server setup)
├── api/
│   └── privacy-send.ts   # Privacy API routes
└── config/
    └── env.ts            # Environment configuration
```

## Development

### Building

```bash
# Build SDK and API
npm run build

# Build SDK only
npm run build:sdk
```

### Running

```bash
# Development with watch
npm run dev:watch

# Development
npm run dev

# Production
npm start
```

## Environment Variables

See `src/config/env.ts` for all required environment variables.

Required:
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `API_PORT` - Port for the API server (default: 3001)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

Optional:
- `SOLANA_NETWORK` - Network (mainnet-beta, devnet, testnet)
- `NODE_ENV` - Environment (development, production, test)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `REDIS_URL` - Redis URL for rate limiting (optional)

## How It Works

The Privacy Cash SDK manages all state internally using LocalStorage:
- Encrypted UTXOs are stored locally in the `cache/` directory
- Each wallet's UTXOs are encrypted using a key derived from a signed message
- The API is stateless - each request is independent
- No database required - all state is managed by the SDK

## Security Notes

- The API never sees or stores private keys
- All signing happens client-side using Solana Wallet Adapter
- Signed messages are used only for encryption key derivation
- Rate limiting is applied to prevent abuse
- CORS is configured to restrict origins

## License

MIT
