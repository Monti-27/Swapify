-- WeSwap Indexer Database Schema for Supabase

-- Strategies table
CREATE TABLE IF NOT EXISTS strategies (
  pubkey TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  strategy_id BIGINT NOT NULL,
  sell_token_mint TEXT NOT NULL,
  buy_token_mint TEXT NOT NULL,
  sell_token_decimals SMALLINT NOT NULL,
  buy_token_decimals SMALLINT NOT NULL,
  trigger_price TEXT NOT NULL,
  price_precision SMALLINT NOT NULL,
  take_profit_price TEXT,
  stop_loss_price TEXT,
  sell_amount TEXT NOT NULL,
  use_percentage BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_executed BOOLEAN NOT NULL DEFAULT false,
  boomerang_mode BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL,
  executed_at BIGINT,
  execution_price TEXT,
  tokens_received TEXT,
  last_updated BIGINT NOT NULL,
  created_at_db TIMESTAMPTZ DEFAULT NOW(),
  updated_at_db TIMESTAMPTZ DEFAULT NOW()
);

-- Escrows table
CREATE TABLE IF NOT EXISTS escrows (
  strategy_pubkey TEXT PRIMARY KEY REFERENCES strategies(pubkey) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  sell_token_mint TEXT NOT NULL,
  deposited_amount TEXT NOT NULL,
  withdrawn_amount TEXT NOT NULL DEFAULT '0',
  last_updated BIGINT NOT NULL,
  created_at_db TIMESTAMPTZ DEFAULT NOW(),
  updated_at_db TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_strategies_owner ON strategies(owner);
CREATE INDEX IF NOT EXISTS idx_strategies_active ON strategies(is_active, is_executed);
CREATE INDEX IF NOT EXISTS idx_strategies_tokens ON strategies(sell_token_mint, buy_token_mint);
CREATE INDEX IF NOT EXISTS idx_strategies_created ON strategies(created_at);
CREATE INDEX IF NOT EXISTS idx_escrows_owner ON escrows(owner);

-- Function to update updated_at_db timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at_db = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at_db
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for active strategies (for keeper queries)
CREATE OR REPLACE VIEW active_strategies AS
SELECT 
  s.*,
  e.deposited_amount,
  e.withdrawn_amount,
  (CAST(e.deposited_amount AS NUMERIC) - CAST(e.withdrawn_amount AS NUMERIC)) AS available_amount
FROM strategies s
JOIN escrows e ON s.pubkey = e.strategy_pubkey
WHERE s.is_active = true 
  AND s.is_executed = false
  AND (CAST(e.deposited_amount AS NUMERIC) - CAST(e.withdrawn_amount AS NUMERIC)) > 0;

