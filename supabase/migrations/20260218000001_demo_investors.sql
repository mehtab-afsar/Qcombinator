-- ============================================================
-- Migration: Demo Investor Seed Data
-- Creates a standalone demo_investors table (no auth.users FK)
-- Used by the founder matching page to show real-looking investors.
-- ============================================================

CREATE TABLE IF NOT EXISTS demo_investors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  firm            TEXT NOT NULL,
  title           TEXT NOT NULL,
  location        TEXT NOT NULL,
  check_sizes     TEXT[] DEFAULT '{}',
  stages          TEXT[] DEFAULT '{}',
  sectors         TEXT[] DEFAULT '{}',
  geography       TEXT[] DEFAULT '{}',
  thesis          TEXT,
  portfolio       TEXT[] DEFAULT '{}',
  response_rate   INTEGER DEFAULT 70,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Public read access (no auth required) — founders browse without login
ALTER TABLE demo_investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read demo investors"
  ON demo_investors FOR SELECT
  USING (true);

-- Investor records are created via the investor onboarding flow (/investor/onboarding).
-- No seed data.
