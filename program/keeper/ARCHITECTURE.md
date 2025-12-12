# Keeper Bot Architecture & Integration

## Overview

The keeper bot is an automated service that monitors WeSwap strategies and executes them when trigger conditions are met. It acts as a trusted executor that integrates with Jupiter for swaps.

## How It Works

### 1. **Monitoring Loop** (`keeper.ts`)

```
┌─────────────────┐
│  Start Bot      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Poll Strategies │ (every 10s by default)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Each      │
│ Strategy        │
└────────┬────────┘
         │
         ├─► Price Check
         ├─► Trigger Validation
         └─► Execute if Ready
```

### 2. **Strategy Discovery** (`strategy-discovery.ts`)

The bot needs to find active strategies. Current implementation has placeholders for:

- **Event Listening**: Subscribe to `createStrategyEvent` to track new strategies
- **GraphQL Indexer**: Query Helius/QuickNode for all active strategies
- **Owner Scanning**: Scan known strategy owners (inefficient but works)

**Current State**: Returns empty array - needs implementation

### 3. **Price Checking** (`price.ts`)

```
Jupiter Price API (/price/v3)
    │
    ├─► Fetch USD price for inputMint
    ├─► Fetch USD price for outputMint
    └─► Calculate ratio: outputPrice / inputPrice
```

**Example**:
- BONK = $0.00001 USD
- WIF = $2.00 USD
- Ratio = 2.00 / 0.00001 = 200,000 (WIF per BONK)

This ratio is then scaled by the strategy's `price_precision` for comparison.

### 4. **Execution Flow**

When a strategy is ready to execute:

```
┌─────────────────────────────────────┐
│ 1. Validate Strategy                  │
│    - Is active?                       │
│    - Not executed?                    │
│    - Price >= trigger?                │
└──────────────┬────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Get Escrow Details               │
│    - Fetch escrow account            │
│    - Calculate available amount      │
│    - Get escrow_token_account PDA    │
└──────────────┬────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Get Jupiter Quote                │
│    GET /v6/quote                     │
│    - inputMint, outputMint, amount   │
│    - Returns: route, outAmount, etc. │
└──────────────┬────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Get Jupiter Swap Instruction     │
│    POST /v6/swap                    │
│    - userPublicKey: escrowTokenPDA  │
│    - Returns: instruction data + accounts │
└──────────────┬────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. Build Transaction                 │
│    - Compute budget instructions     │
│    - execute_strategy instruction    │
│    - Jupiter accounts (remaining)    │
└──────────────┬────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 6. Sign & Send                       │
│    - Keeper signs transaction        │
│    - Send to network                 │
│    - Confirm execution               │
└─────────────────────────────────────┘
```

## Integration with WeSwap Program

### Transaction Structure

```
Transaction {
  instructions: [
    ComputeBudgetInstruction (CU limit),
    ComputeBudgetInstruction (CU price),
    ExecuteStrategyInstruction {
      accounts: [
        keeper (signer),
        strategy (PDA - auto-derived),
        escrow (PDA - auto-derived),
        escrow_token_account (PDA),
        transfer_authority (PDA),
        owner_receive_token_account,
        treasury,
        treasury_token_account,
        owner,
        sell_token_mint,
        buy_token_mint,
        jupiter_program,
        global (PDA),
        system_program,
        token_program
      ],
      remaining_accounts: [
        ...jupiter_swap_accounts (20-50+ accounts)
      ],
      data: {
        strategy_id,
        current_price,
        transfer_authority_bump,
        jupiter_instruction_data,
        jupiter_accounts
      }
    }
  ]
}
```

### What Happens in the Program

When `execute_strategy` is called:

1. **Validation** (Lines 110-126)
   - Checks strategy is active and not executed
   - Validates current price meets trigger
   - Checks TP/SL conditions

2. **Amount Calculation** (Lines 132-146)
   - Determines how much to sell
   - Handles percentage vs fixed amount
   - Uses available escrow balance

3. **Jupiter Swap Execution** (Lines 159-205)
   - Builds Jupiter instruction from params
   - Invokes Jupiter via `invoke_signed` with PDA
   - Jupiter swaps from `escrow_token_account` → `owner_receive_token_account`

4. **Fee Collection** (Lines 227-244)
   - Reads tokens received from swap
   - Calculates platform fee (basis points)
   - Transfers fee to treasury
   - Owner receives net amount

5. **State Update** (Lines 246-252)
   - Marks strategy as executed
   - Updates escrow withdrawn amount
   - Records execution price and tokens received

## Key Design Decisions

### Why Escrow Token Account as Input?

The `escrow_token_account` is owned by `transfer_authority` PDA. This allows:
- Program to control token transfers
- Secure execution without owner signature
- Atomic swap execution

### Why Remaining Accounts?

Jupiter requires many accounts (routes, AMMs, token accounts, etc.). These are:
- Dynamic based on swap route
- Passed as `remaining_accounts` to avoid bloating instruction
- Provided by keeper from Jupiter API response

### Why PDA Signing?

The `transfer_authority` PDA signs the Jupiter swap because:
- `escrow_token_account` authority is the PDA
- Jupiter needs permission to transfer from escrow
- Program uses `invoke_signed` with PDA seeds

## Data Flow Example

**Scenario**: User wants to swap 1M BONK when BONK/WIF price >= 200,000

1. **User creates strategy**:
   - Deposits 1M BONK to escrow
   - Sets trigger_price = 200,000 (scaled)
   - price_precision = 6

2. **Keeper monitors**:
   - Fetches prices: BONK=$0.00001, WIF=$2.00
   - Calculates ratio: 200,000
   - Scaled: 200,000 * 10^6 = 200,000,000,000
   - Compares: 200,000,000,000 >= 200,000 ✅

3. **Keeper executes**:
   - Gets Jupiter quote for 1M BONK → WIF
   - Gets swap instruction
   - Calls `execute_strategy`

4. **Program executes**:
   - Validates price ✅
   - Invokes Jupiter swap
   - Jupiter: 1M BONK → ~5 WIF (example)
   - Calculates fee: 5 WIF * 0.5% = 0.025 WIF
   - Transfers 0.025 WIF to treasury
   - Transfers 4.975 WIF to owner
   - Marks strategy executed

## Security Considerations

1. **Keeper Authorization**: Only authorized keepers can execute
2. **Price Validation**: Program validates price meets trigger
3. **Escrow Control**: Tokens locked in PDA-controlled account
4. **Atomic Execution**: All-or-nothing transaction
5. **Fee Collection**: Automatic and enforced

## Current Limitations

1. **Strategy Discovery**: Not implemented - returns empty array
2. **Price Source**: Uses Jupiter (good for most tokens)
3. **Error Recovery**: Basic retry logic
4. **Monitoring**: Simple polling (could use websockets)

## Next Steps for Production

1. Implement strategy discovery (GraphQL indexer recommended)
2. Add websocket price feeds for real-time monitoring
3. Implement retry logic with exponential backoff
4. Add metrics and alerting
5. Set up multiple keeper instances for redundancy

