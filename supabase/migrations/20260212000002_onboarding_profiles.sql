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
