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




