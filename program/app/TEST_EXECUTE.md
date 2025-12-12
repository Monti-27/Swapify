# Test Execute Strategy Script

This script tests the full flow of the `execute_strategy` instruction using WSOL and USDC.

## Prerequisites

1. The protocol must be initialized (run `init` command first)
2. Your keypair must be added as a keeper
3. You need some SOL in your wallet (for wrapping to WSOL)

## Usage

```bash
# From the app directory (defaults to mainnet)
npm run test-execute <path-to-keypair.json>

# Or with environment variables to override
CLUSTER_URL=https://api.devnet.solana.com npm run test-execute <path-to-keypair.json>
```

## What it does

1. **Checks global state** - Verifies the protocol is initialized
2. **Wraps SOL to WSOL** - Converts 0.1 SOL to wrapped SOL
3. **Creates a strategy** - Creates a WSOL -> USDC strategy with:
   - Strategy ID: 0
   - Trigger price: 1,000,000 (1 USDC per WSOL with 6 decimals)
   - Deposit: 90% of wrapped SOL
4. **Executes the strategy** - Gets Jupiter quote, builds swap instruction, and executes

## Token Mints

- **WSOL**: `So11111111111111111111111111111111111111112` (NATIVE_MINT)
- **USDC Mainnet**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDC Devnet**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

## Notes

- **Defaults to mainnet** - The script uses mainnet by default
- The script automatically detects mainnet vs devnet based on the RPC URL
- Make sure you have enough SOL for transaction fees (mainnet fees are real!)
- The script will skip strategy creation if it already exists
- Check the explorer link in the output to see the transaction details
- **⚠️ WARNING**: This uses real SOL on mainnet - use with caution!

