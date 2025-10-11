-- =====================================================
-- CRON BACKEND DATABASE SCHEMA
-- =====================================================

-- =====================================================
-- 1. CREATE USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  cron_id VARCHAR(255) UNIQUE NOT NULL,
  primary_address VARCHAR(255) UNIQUE NOT NULL,
  wallet_address TEXT[] UNIQUE NOT NULL,
  avatar_url TEXT,
  preferred_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  local_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  face_id_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 2. CREATE INDEXES 
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_cron_id ON users(cron_id);
CREATE INDEX IF NOT EXISTS idx_users_primary_address ON users(primary_address);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- =====================================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. CREATE CUSTOM TYPES
-- =====================================================
CREATE TYPE tx_token AS (
  amount NUMERIC(20,8),
  token_address TEXT
);

CREATE TYPE tx_status AS ENUM ('pending', 'completed', 'failed');

-- =====================================================
-- 6. CREATE TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  transaction_hash TEXT PRIMARY KEY,
  sender_uid UUID NOT NULL REFERENCES users(user_id),
  receiver_uid UUID NOT NULL REFERENCES users(user_id),
  amount DECIMAL(20,8) NOT NULL,
  token tx_token[] NOT NULL, -- Array of tx_token type
  chain_id INTEGER NOT NULL,
  status tx_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 7. CREATE INDEXES FOR TRANSACTIONS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_transactions_sender_uid ON transactions(sender_uid);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_uid ON transactions(receiver_uid);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_chain_id ON transactions(chain_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_completed_at ON transactions(completed_at);

