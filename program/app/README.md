# Weswap CLI & Client

Command-line interface and TypeScript client for the Weswap automated trading protocol.

## Installation

```bash
npm install
npm run build
```

## Usage

### CLI Commands

Initialize the protocol:
```bash
npm run cli -- init -k /path/to/admin-keypair.json -u https://api.devnet.solana.com
```

Get global protocol state:
```bash
npm run cli -- get-global -k /path/to/admin-keypair.json
```

Create a trading strategy:
```bash
npm run cli -- create-strategy 0 \
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  So11111111111111111111111111111111111111112 \
  50000 9 1000000000 1000000000 \
  --tp 70000 --sl 30000 \
  -k /path/to/user-keypair.json
```

Get user strategies:
```bash
npm run cli -- get-user-strategies <USER_PUBKEY> -k /path/to/keypair.json
```

Deposit to escrow:
```bash
npm run cli -- deposit-escrow 0 500000000 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  -k /path/to/user-keypair.json
```

Withdraw from escrow:
```bash
npm run cli -- withdraw-escrow 0 0 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --cancel -k /path/to/user-keypair.json
```

Execute strategy (keeper only):
```bash
npm run cli -- execute-strategy <OWNER_PUBKEY> 0 \
  --price 55000 -k /path/to/keeper-keypair.json
```

### Client Library

```typescript
import { WeswapClient } from './client';

const client = new WeswapClient(
  'https://api.devnet.solana.com',
  '/path/to/keypair.json'
);

// Get all active strategies
const strategies = await client.getAllActiveStrategies();

// Create a strategy
await client.createStrategy(params, sellMint, buyMint);

// Check strategy status
const status = await client.getStrategyStatus(owner, strategyId);
```

## Strategy Parameters

- **Strategy ID**: Unique identifier for the user's strategy (0-9 for max 10 strategies)
- **Sell Token Mint**: Token to sell (e.g., BONK)
- **Buy Token Mint**: Token to buy (e.g., SOL)
- **Trigger Price**: Price at which to execute the strategy
- **Price Precision**: Decimal places for price (e.g., 9 for $0.000050000)
- **Sell Amount**: Amount to sell (in token base units)
- **Deposit Amount**: Initial escrow deposit
- **Take Profit**: Optional price to take profits
- **Stop Loss**: Optional price to stop losses
- **Use Percentage**: Whether sell amount is a percentage of escrow
- **Boomerang Mode**: Re-enter position after TP/SL execution

## Examples

### BONK → SOL Strategy
```bash
# Create strategy: Sell 1000 BONK when price hits $0.00005
npm run cli -- create-strategy 0 \
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263 \
  So11111111111111111111111111111111111111112 \
  50000 9 100000000000 100000000000 \
  --tp 70000 --sl 30000
```

### USDC → WIF Strategy with Percentage
```bash
# Create strategy: Sell 50% of USDC escrow when WIF hits $2.50
npm run cli -- create-strategy 1 \
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm \
  2500000 6 5000 1000000000 \
  --percentage
```

## Admin Commands

Add keeper:
```bash
npm run cli -- add-keeper <KEEPER_PUBKEY> -k /path/to/admin-keypair.json
```

Remove keeper:
```bash
npm run cli -- remove-keeper <KEEPER_PUBKEY> -k /path/to/admin-keypair.json
```

## Development

Run in development mode:
```bash
npm run dev -- <command> <args>
```

Build TypeScript:
```bash
npm run build
```
