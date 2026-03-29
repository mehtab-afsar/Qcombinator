-- ============================================================
-- Consolidates:
--   20260212000001_qscore_previous_score.sql
--   20260212000002_onboarding_profiles.sql
--   20260218000001_demo_investors.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260212000001_qscore_previous_score.sql
-- ============================================================

-- ============================================================
-- Migration 004: Add previous_score_id chain to qscore_history
--
-- Purpose: Links each Q-Score row to the one before it via a
-- self-referencing FK. This makes week-over-week delta lookups
-- O(1) (single JOIN) instead of relying on ORDER BY + LIMIT 2,
-- which can return wrong results when two scores land at the
-- same millisecond (e.g. during testing).
-- ============================================================

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS previous_score_id UUID
    REFERENCES qscore_history(id) ON DELETE SET NULL;

-- Index for fast delta lookups
CREATE INDEX IF NOT EXISTS idx_qscore_history_previous
  ON qscore_history(previous_score_id);

-- ============================================================
-- View: qscore_with_delta
-- Joins current row to previous row so the API can read both
-- in a single query without application-level N+1s.
-- ============================================================

CREATE OR REPLACE VIEW qscore_with_delta AS
SELECT
  cur.id,
  cur.user_id,
  cur.assessment_id,
  cur.previous_score_id,
  cur.overall_score,
  cur.percentile,
  cur.grade,
  cur.market_score,
  cur.product_score,
  cur.gtm_score,
  cur.financial_score,
  cur.team_score,
  cur.traction_score,
  cur.calculated_at,

  -- Overall change
  cur.overall_score   - COALESCE(prev.overall_score,   cur.overall_score) AS overall_change,

  -- Dimension changes
  cur.market_score    - COALESCE(prev.market_score,    cur.market_score)  AS market_change,
  cur.product_score   - COALESCE(prev.product_score,   cur.product_score) AS product_change,
  cur.gtm_score       - COALESCE(prev.gtm_score,       cur.gtm_score)     AS gtm_change,
  cur.financial_score - COALESCE(prev.financial_score, cur.financial_score) AS financial_change,
  cur.team_score      - COALESCE(prev.team_score,      cur.team_score)    AS team_change,
  cur.traction_score  - COALESCE(prev.traction_score,  cur.traction_score) AS traction_change

FROM qscore_history cur
LEFT JOIN qscore_history prev ON cur.previous_score_id = prev.id;

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


-- ============================================================
-- PART 1: Extend founder_profiles with fields missing from
--         the original schema (non-destructive ALTER only)
-- ============================================================

-- Collected at Screen 1 (Quick Questions)
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS funding TEXT
    CHECK (funding IN ('pre-seed', 'seed', 'series-a', 'bootstrapped')),
  ADD COLUMN IF NOT EXISTS time_commitment TEXT
    CHECK (time_commitment IN ('15-mins', 'save-later'));

-- Role flag — differentiates founder vs investor accounts
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'founder'
    CHECK (role IN ('founder', 'investor'));

-- Richer profile fields — populated from assessment or profile-edit page
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS tagline     TEXT,   -- one-liner elevator pitch
  ADD COLUMN IF NOT EXISTS bio         TEXT,   -- founder bio / backstory
  ADD COLUMN IF NOT EXISTS website     TEXT,   -- startup website URL
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,  -- founder LinkedIn URL
  ADD COLUMN IF NOT EXISTS location    TEXT;   -- city, country

-- Indexes for role/stage queries (investor deal flow, matching filters)
CREATE INDEX IF NOT EXISTS idx_founder_profiles_role  ON founder_profiles(role);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_stage ON founder_profiles(stage);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_assessment_completed
  ON founder_profiles(assessment_completed)
  WHERE assessment_completed = true;


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
  );


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
