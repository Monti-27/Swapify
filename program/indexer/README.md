# WeSwap Indexer

Event indexer that listens to WeSwap program events and stores strategy data in Supabase.

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key

### 2. Initialize Database

Run the SQL schema in Supabase SQL Editor:

```bash
# Copy contents of supabase-schema.sql
# Paste into Supabase SQL Editor and execute
```

### 3. Configure

Create `.env` file:

```env
RPC_URL=https://api.mainnet-beta.solana.com
PROGRAM_ID=AFhpyoVmDCEVofP3sqj8wCPSFYYGpL83sbXKuwMZtcoQ
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
POLL_INTERVAL_MS=2000
```

### 4. Install & Run

```bash
npm install
npm start
```

## How It Works

1. **Event Listening**: Subscribes to WeSwap program events
   - `createStrategyEvent` → Stores new strategy
   - `executeStrategyEvent` → Marks strategy as executed
   - `cancelStrategyEvent` → Marks strategy as cancelled

2. **Database Storage**: Stores in Supabase tables
   - `strategies` table: All strategy data
   - `escrows` table: Escrow balances

3. **Real-time Updates**: Updates database as events occur

## Database Schema

### strategies
- All strategy configuration
- Execution status
- Timestamps

### escrows
- Deposited/withdrawn amounts
- Links to strategy via `strategy_pubkey`

### active_strategies (view)
- Convenient view for keeper queries
- Filters active, non-executed strategies with funds

## Integration with Keeper

The keeper bot queries Supabase instead of scanning on-chain:

```typescript
// In strategy-discovery.ts
const { data } = await supabase
  .from('active_strategies')
  .select('*');
```

This is much more efficient than on-chain scanning!

