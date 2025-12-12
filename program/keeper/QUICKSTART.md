# Quick Start Guide

## Prerequisites

- Node.js 18+
- Solana CLI tools
- A keeper keypair authorized in the protocol

## Setup Steps

### 1. Install Dependencies

```bash
cd keeper
npm install
```

### 2. Generate Keeper Keypair

```bash
solana-keygen new -o keeper-keypair.json
```

**Important**: Add this keypair's public key as an authorized keeper in the protocol's global state.

### 3. Configure

Copy the example config:
```bash
cp config.example.json config.json
```

Edit `config.json` with your settings:
- RPC URL (use a reliable endpoint)
- Keeper keypair path
- Program ID
- API URLs

Or use environment variables (see `.env.example`).

### 4. Build

```bash
npm run build
```

### 5. Run

```bash
npm start
```

## Implementation Notes

### Strategy Discovery

The bot currently has a placeholder for strategy discovery. You need to implement one of:

1. **GraphQL Indexer** (Recommended)
   ```typescript
   // Example with Helius
   const query = `
     query {
       strategies(where: { isActive: true, isExecuted: false }) {
         pubkey
         owner
         id
       }
     }
   `;
   ```

2. **Event Listener**
   ```typescript
   // Listen to CreateStrategy events
   program.addEventListener("CreateStrategyEvent", (event) => {
     // Track new strategies
   });
   ```

3. **Manual Registry**
   - Maintain a list of strategy owners
   - Poll their strategies

### Price Service

Implement actual price fetching:

```typescript
// Example with Pyth
import { PythHttpClient, getPythProgramKeyForCluster } from "@pythnetwork/pyth-evm-js";

const pythClient = new PythHttpClient(
  getPythProgramKeyForCluster("mainnet-beta"),
  connection
);

const price = await pythClient.getPriceData(inputMint);
```

### Testing

Test with a single strategy first:

1. Create a test strategy
2. Update `findExecutableStrategies()` to return that strategy
3. Run the bot and verify execution

## Troubleshooting

### "UnauthorizedKeeper" Error
- Ensure keeper keypair is added to global state's keeper list

### "Strategy not found"
- Check strategy discovery implementation
- Verify strategy PDA derivation

### Jupiter API Errors
- Check API endpoint URL
- Verify token mints are valid
- Check slippage settings

### Transaction Failures
- Check compute budget settings
- Verify all accounts are correct
- Check escrow has sufficient funds

