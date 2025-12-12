# WeSwap Keeper Bot

Automated keeper bot for executing WeSwap strategies when trigger conditions are met.

## Features

- 🔍 Monitors strategies for execution opportunities
- 💱 Integrates with Jupiter V6 for swaps
- 📊 Price checking (supports multiple price sources)
- ⚡ Automated execution with proper error handling
- 🔐 Secure keypair management

## Setup

### 1. Install Dependencies

```bash
cd keeper
npm install
```

### 2. Configure

Create a `config.json` file or set environment variables:

```json
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "keeperKeypairPath": "./keeper-keypair.json",
  "programId": "AFhpyoVmDCEVofP3sqj8wCPSFYYGpL83sbXKuwMZtcoQ",
  "jupiterProgramId": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "jupiterApiUrl": "https://quote-api.jup.ag/v6",
  "priceApiUrl": "https://api.coingecko.com/api/v3",
  "pollIntervalMs": 10000,
  "maxStrategiesPerPoll": 50,
  "minExecutionAmount": 1000,
  "slippageBps": 50
}
```

Or use environment variables:
```bash
export RPC_URL="https://api.mainnet-beta.solana.com"
export KEEPER_KEYPAIR_PATH="./keeper-keypair.json"
export JUPITER_API_URL="https://quote-api.jup.ag/v6"
```

### 3. Create Keeper Keypair

```bash
solana-keygen new -o keeper-keypair.json
```

Make sure this keypair is added as an authorized keeper in the protocol's global state.

### 4. Build

```bash
npm run build
```

### 5. Run

```bash
npm start
```

## Architecture

```
keeper/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration management
│   └── services/
│       ├── keeper.ts         # Core keeper logic
│       ├── jupiter.ts        # Jupiter API integration
│       └── price.ts          # Price fetching service
├── package.json
└── tsconfig.json
```

## How It Works

1. **Polling**: The bot polls for executable strategies at regular intervals
2. **Price Check**: Fetches current price and compares with strategy trigger price
3. **Jupiter Integration**: Gets swap quote and instruction from Jupiter V6 API
4. **Execution**: Builds and sends transaction to execute strategy via CPI
5. **Monitoring**: Logs all activities and errors

## Strategy Discovery

The current implementation has a placeholder for strategy discovery. You need to implement one of:

1. **Event Indexing**: Listen to `CreateStrategy` events
2. **GraphQL Indexer**: Use Helius, QuickNode, or similar
3. **Program-Derived Accounts**: Track strategies in a separate account
4. **Manual List**: Maintain a list of strategy owners/IDs

## Price Sources

The price service currently has a placeholder. Implement one of:

- **Pyth Network**: On-chain price feeds
- **Switchboard**: Oracle network
- **CoinGecko**: Off-chain API (for testing)
- **Custom Oracle**: Your own price source

## Error Handling

The bot handles:
- Network errors
- Insufficient funds
- Invalid strategies
- Jupiter API failures
- Transaction failures

All errors are logged with context for debugging.

## Security

- Keep keeper keypair secure
- Use environment variables for sensitive data
- Monitor for unauthorized access
- Set appropriate compute budgets
- Validate all inputs

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build
```

## Production Deployment

1. Use a process manager (PM2, systemd, etc.)
2. Set up monitoring and alerts
3. Use a dedicated RPC endpoint
4. Implement proper logging
5. Set up health checks

## License

ISC

