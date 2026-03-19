-- Migration: Stripe verification + Signal Strength + Integrity Index
-- Phase 2: External Verification Layer

-- ── founder_profiles additions ────────────────────────────────────────────────

ALTER TABLE founder_profiles
  -- Stripe verification (metrics stored, key is never persisted)
  ADD COLUMN IF NOT EXISTS stripe_verified        BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_verified_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_mrr             INTEGER,       -- verified MRR in USD
  ADD COLUMN IF NOT EXISTS stripe_arr             INTEGER,       -- verified ARR in USD
  ADD COLUMN IF NOT EXISTS stripe_customers       INTEGER,       -- active subscription count
  ADD COLUMN IF NOT EXISTS stripe_last30          INTEGER,       -- last 30-day revenue USD

  -- Signal Strength: weighted average of source confidence multipliers (0-100)
  -- Stripe fields = 1.0, document-backed = 0.85, self-reported = 0.55
  ADD COLUMN IF NOT EXISTS signal_strength        INTEGER CHECK (signal_strength BETWEEN 0 AND 100),

  -- Integrity Index: (corroborated claims / total scored claims) × 100
  -- Driven by bluff detection + RAG evidence conflicts
  ADD COLUMN IF NOT EXISTS integrity_index        INTEGER CHECK (integrity_index BETWEEN 0 AND 100),

  -- Source of Q-Score data used for last calculation
  ADD COLUMN IF NOT EXISTS stripe_account_id      TEXT;          -- set when Stripe is connected

-- Index for fast investor dashboard queries that sort by signal_strength
CREATE INDEX IF NOT EXISTS idx_founder_profiles_signal_strength
  ON founder_profiles(signal_strength DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_stripe_verified
  ON founder_profiles(stripe_verified);
