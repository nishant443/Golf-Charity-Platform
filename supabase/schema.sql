-- ============================================================
-- Golf Charity Subscription Platform — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'lapsed');
CREATE TYPE draw_status AS ENUM ('pending', 'simulated', 'published');
CREATE TYPE draw_logic AS ENUM ('random', 'algorithmic');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'rejected');
CREATE TYPE match_type AS ENUM ('five_match', 'four_match', 'three_match');
CREATE TYPE user_role AS ENUM ('subscriber', 'admin');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'subscriber',
  handicap NUMERIC(4,1),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHARITIES
-- ============================================================

CREATE TABLE charities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHARITY EVENTS
-- ============================================================

CREATE TABLE charity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  charity_id UUID REFERENCES charities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_paid NUMERIC(10,2) NOT NULL,        -- total subscription fee
  charity_id UUID REFERENCES charities(id),
  charity_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00, -- min 10%
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  next_renewal_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GOLF SCORES
-- ============================================================

CREATE TABLE golf_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  played_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only keep latest 5 scores per user (enforced via trigger)

-- Trigger function to enforce 5-score rolling window
CREATE OR REPLACE FUNCTION enforce_score_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete oldest scores beyond 5
  DELETE FROM golf_scores
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM golf_scores
      WHERE user_id = NEW.user_id
      ORDER BY played_on DESC, created_at DESC
      LIMIT 5
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_score_insert
AFTER INSERT ON golf_scores
FOR EACH ROW EXECUTE FUNCTION enforce_score_limit();

-- ============================================================
-- DRAWS
-- ============================================================

CREATE TABLE draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  status draw_status NOT NULL DEFAULT 'pending',
  logic draw_logic NOT NULL DEFAULT 'random',
  drawn_numbers INTEGER[] NOT NULL DEFAULT '{}',  -- 5 numbers drawn
  total_pool NUMERIC(10,2) DEFAULT 0,
  jackpot_pool NUMERIC(10,2) DEFAULT 0,           -- rolled over from previous if needed
  four_match_pool NUMERIC(10,2) DEFAULT 0,
  three_match_pool NUMERIC(10,2) DEFAULT 0,
  five_match_won BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (month, year)
);

-- ============================================================
-- DRAW ENTRIES (users entered into a draw)
-- ============================================================

CREATE TABLE draw_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  scores INTEGER[] NOT NULL,                      -- snapshot of 5 scores at draw time
  matched_numbers INTEGER[] DEFAULT '{}',          -- which drawn numbers matched
  match_count INTEGER DEFAULT 0,
  match_type match_type,                           -- null if no match
  prize_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (draw_id, user_id)
);

-- ============================================================
-- WINNER VERIFICATIONS
-- ============================================================

CREATE TABLE winner_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_entry_id UUID REFERENCES draw_entries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  draw_id UUID REFERENCES draws(id),
  proof_url TEXT,                                  -- uploaded screenshot
  payment_status payment_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRIZE POOL CONFIG (admin-configurable)
-- ============================================================

CREATE TABLE prize_pool_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_pool_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00, -- % of subscription fee going to prize pool
  five_match_share NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  four_match_share NUMERIC(5,2) NOT NULL DEFAULT 35.00,
  three_match_share NUMERIC(5,2) NOT NULL DEFAULT 25.00,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 9.99,
  yearly_price NUMERIC(10,2) NOT NULL DEFAULT 99.99,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO prize_pool_config (id) VALUES (uuid_generate_v4());

-- ============================================================
-- SEED DATA — Charities
-- ============================================================

INSERT INTO charities (name, description, logo_url, is_featured, is_active) VALUES
  ('Cancer Research UK', 'Pioneering research to prevent, diagnose and treat cancer.', NULL, TRUE, TRUE),
  ('Age UK', 'Improving later life for everyone through support and campaigns.', NULL, FALSE, TRUE),
  ('Mind', 'Mental health charity providing advice and support.', NULL, FALSE, TRUE),
  ('British Heart Foundation', 'Funding research into heart and circulatory diseases.', NULL, TRUE, TRUE),
  ('RNLI', 'Saving lives at sea since 1824.', NULL, FALSE, TRUE),
  ('Macmillan Cancer Support', 'Supporting people living with cancer.', NULL, FALSE, TRUE);

-- ============================================================
-- SEED DATA — Admin User (password: Admin@123!)
-- bcrypt hash of "Admin@123!" with 10 rounds
-- ============================================================

INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@golfcharity.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uHlmFHFNO', 'Platform Admin', 'admin');

-- NOTE: Replace the password_hash above with a real bcrypt hash when deploying.
-- Generate with: node -e "const bcrypt=require('bcrypt');bcrypt.hash('Admin@123!',10).then(console.log)"

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX idx_golf_scores_user_id ON golf_scores(user_id);
CREATE INDEX idx_golf_scores_played_on ON golf_scores(played_on DESC);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_draw_entries_draw_id ON draw_entries(draw_id);
CREATE INDEX idx_draw_entries_user_id ON draw_entries(user_id);
CREATE INDEX idx_winner_verifications_payment_status ON winner_verifications(payment_status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — basic setup
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE winner_verifications ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::TEXT = id::TEXT);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::TEXT = id::TEXT);

-- Golf scores
CREATE POLICY "Users manage own scores" ON golf_scores FOR ALL USING (auth.uid()::TEXT = user_id::TEXT);

-- Subscriptions
CREATE POLICY "Users view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid()::TEXT = user_id::TEXT);
