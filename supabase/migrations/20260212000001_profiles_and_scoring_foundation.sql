-- ============================================================
-- Consolidates:
--   20260212000001_qscore_previous_score.sql
--   20260212000002_onboarding_profiles.sql
--   20260218000001_demo_investors.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260212000001_qscore_previous_score.sql
-- ============================================================

-- qscore_history previous_score_id, index, and qscore_with_delta view
-- defined in 20260200000001_qscore_history_squashed.sql

-- ============================================================
-- SOURCE: 20260212000002_onboarding_profiles.sql
-- ============================================================

-- ============================================================
-- Migration: Founder & Investor Onboarding Profiles
-- File:      20260212000002_onboarding_profiles.sql
-- Depends:   20250101000001 (creates founder_profiles)
--
-- Founder onboarding (4 screens):
--   Screen 0  Welcome splash
--   Screen 1  Quick Questions  → stage, funding, time_commitment
--   Screen 2  Account creation → email + password → auth.users + founder_profiles
--   Screen 3  Ready to Begin  → sets onboarding_completed = true
--
-- Investor onboarding (4 steps):
--   Step 1  Personal info    → full_name, email, phone, linkedin_url
--   Step 2  Firm info        → firm_name, firm_type, firm_size, aum, website, location
--   Step 3  Investment profile → check_sizes[], stages[], sectors[], geography[]
--   Step 4  Investment thesis → thesis, deal_flow_strategy, decision_process,
--                               monthly_deal_volume
-- ============================================================


-- founder_profiles columns (funding, time_commitment, role, tagline, bio, website,
-- linkedin_url, location) and their indexes are defined in
-- 20260700000001_founder_profiles_squashed.sql

-- ============================================================
-- PART 2: investor_profiles  (new table)
-- ============================================================

CREATE TABLE IF NOT EXISTS investor_profiles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Step 1: Personal Info
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  linkedin_url TEXT,

  -- Step 2: Firm Information
  firm_name TEXT,
  firm_type TEXT CHECK (firm_type IN (
    'vc', 'pe', 'angel', 'family-office', 'corporate', 'accelerator'
  )),
  firm_size TEXT CHECK (firm_size IN ('1-5', '6-20', '21-50', '50+')),
  aum       TEXT CHECK (aum IN (
    '<10m', '10-50m', '50-100m', '100-500m', '500m-1b', '>1b'
  )),
  website  TEXT,
  location TEXT,

  -- Step 3: Investment Profile (multi-select badge arrays)
  check_sizes TEXT[] DEFAULT '{}',  -- ['$100K-$500K', '$500K-$1M', ...]
  stages      TEXT[] DEFAULT '{}',  -- ['Pre-Seed', 'Seed', ...]
  sectors     TEXT[] DEFAULT '{}',  -- ['AI/ML', 'SaaS', ...]
  geography   TEXT[] DEFAULT '{}',  -- ['North America', 'Europe', ...]

  -- Step 4: Investment Thesis & Process
  thesis              TEXT,
  deal_flow_strategy  TEXT,
  decision_process    TEXT CHECK (decision_process IN (
    '1-2weeks', '2-4weeks', '1-2months', '2-3months', '3+months'
  )),
  monthly_deal_volume TEXT CHECK (monthly_deal_volume IN (
    '1-5', '6-15', '16-30', '30+'
  )),

  -- Onboarding & verification state
  onboarding_completed BOOLEAN DEFAULT false,
  verified             BOOLEAN DEFAULT false,
  verification_status  TEXT    DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for matching queries
CREATE INDEX IF NOT EXISTS idx_investor_profiles_user_id  ON investor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_verified ON investor_profiles(verified);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_sectors  ON investor_profiles USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_stages   ON investor_profiles USING GIN (stages);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_geography ON investor_profiles USING GIN (geography);


-- ============================================================
-- PART 3: Row Level Security for investor_profiles
-- ============================================================

ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;

-- Investors manage their own profile
CREATE POLICY "Investors can view own profile"
  ON investor_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Investors can insert own profile"
  ON investor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Investors can update own profile"
  ON investor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Founders with a completed Q-Score can see verified investor profiles
-- (used by the matching page to fetch real investors)
--
-- ⚠️ REPLAY-GUARDED (20 Jul 2026, FU-003). This file's header claims founder_profiles comes
-- from 20250101000001; in fact its creation lives in the JULY squash (20260700000001), which
-- replays AFTER this file — so a rebuild-from-empty died here (SQLSTATE 42P01). Guarded to
-- skip when the table is absent; the squash recreates this policy once founder_profiles
-- exists. Production is unaffected either way: it ran this file back when the table already
-- existed, and applied migrations are never re-run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'founder_profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Founders can view verified investors for matching"
        ON investor_profiles FOR SELECT
        USING (
          verified = true
          AND EXISTS (
            SELECT 1 FROM founder_profiles fp
            WHERE fp.user_id   = auth.uid()
              AND fp.role      = 'founder'
              AND fp.assessment_completed = true
          )
        )
    $policy$;
  END IF;
END $$;


-- ============================================================
-- PART 4: updated_at auto-trigger for investor_profiles
-- ============================================================

-- Generic function (CREATE OR REPLACE is safe to run multiple times)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop before create so re-running migrations is idempotent
DROP TRIGGER IF EXISTS investor_profiles_updated_at ON investor_profiles;
CREATE TRIGGER investor_profiles_updated_at
  BEFORE UPDATE ON investor_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SOURCE: 20260218000001_demo_investors.sql
-- ============================================================

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
