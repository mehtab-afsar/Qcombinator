-- ============================================================
-- founder_profiles — single source of truth
-- Squashes 20+ ALTER TABLE statements from 2025-01 → 2026-07
-- into one authoritative CREATE TABLE definition.
-- ============================================================

CREATE TABLE IF NOT EXISTS founder_profiles (

  -- ── Identity ────────────────────────────────────────────────
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID        REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name                       TEXT        NOT NULL,
  role                            TEXT        DEFAULT 'founder'
                                              CHECK (role IN ('founder', 'investor')),

  -- ── Company basics ──────────────────────────────────────────
  startup_name                    TEXT        UNIQUE,
  company_name                    TEXT,
  tagline                         TEXT,
  bio                             TEXT,
  description                     TEXT,
  industry                        TEXT,
  stage                           TEXT
                                  CHECK (stage IS NULL OR stage IN (
                                    'idea', 'mvp', 'pre-seed', 'seed', 'series-a', 'bootstrapped'
                                  )),
  location                        TEXT,
  website                         TEXT,
  founded_date                    TEXT,
  incorporation_type              TEXT,

  -- ── Founder info ────────────────────────────────────────────
  founder_name                    TEXT,
  linkedin_url                    TEXT,
  cofounder_count                 INT,
  years_on_problem                TEXT,
  prior_experience                TEXT,
  founder_background              TEXT[]      DEFAULT ARRAY[]::TEXT[],

  -- ── Business status ─────────────────────────────────────────
  revenue_status                  TEXT,
  funding_status                  TEXT,
  fundraising_status              TEXT,
  customer_proof                  TEXT,
  team_size                       TEXT,
  market_size_estimate            TEXT,
  gtm_strategy                    TEXT,

  -- ── Progress & onboarding ───────────────────────────────────
  onboarding_completed            BOOLEAN     DEFAULT false,
  assessment_completed            BOOLEAN     DEFAULT false,
  registration_completed          BOOLEAN     DEFAULT false,
  profile_builder_completed       BOOLEAN     DEFAULT false,
  profile_builder_completed_at    TIMESTAMPTZ,
  startup_profile_completed       BOOLEAN     DEFAULT false,
  is_public                       BOOLEAN     DEFAULT false,
  public_slug                     TEXT        UNIQUE,

  -- ── Subscription / billing ──────────────────────────────────
  subscription_tier               TEXT        DEFAULT 'free'
                                              CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  time_commitment                 TEXT        CHECK (time_commitment IN ('15-mins', 'save-later')),
  stripe_customer_id              TEXT,
  stripe_subscription_id          TEXT,
  subscription_status             TEXT        DEFAULT 'inactive',
  subscription_current_period_end TIMESTAMPTZ,

  -- ── Stripe revenue verification ─────────────────────────────
  stripe_verified                 BOOLEAN     NOT NULL DEFAULT FALSE,
  stripe_verified_at              TIMESTAMPTZ,
  stripe_mrr                      INTEGER,
  stripe_arr                      INTEGER,
  stripe_customers                INTEGER,
  stripe_last30                   INTEGER,
  stripe_account_id               TEXT,
  signal_strength                 INTEGER     CHECK (signal_strength BETWEEN 0 AND 100),
  integrity_index                 INTEGER     CHECK (integrity_index BETWEEN 0 AND 100),

  -- ── Media ───────────────────────────────────────────────────
  avatar_url                      TEXT,
  company_logo_url                TEXT,

  -- ── JSONB blobs ─────────────────────────────────────────────
  startup_profile_data            JSONB       DEFAULT '{}',
  onboarding_extracted_data       JSONB       DEFAULT '{}',
  onboarding_chat_history         JSONB       DEFAULT '[]',
  profile_builder_draft           JSONB,
  profile_builder_flow            JSONB       DEFAULT NULL,
  notification_preferences        JSONB       DEFAULT '{}',

  -- ── Momentum / scoring ──────────────────────────────────────
  momentum_score                  INTEGER,
  momentum_updated_at             TIMESTAMPTZ,
  behavioural_score               INTEGER     CHECK (behavioural_score BETWEEN 0 AND 100),
  visibility_gated                BOOLEAN     NOT NULL DEFAULT FALSE,
  is_impact_focused               BOOLEAN     NOT NULL DEFAULT FALSE,

  -- ── Email confirmation ──────────────────────────────────────
  email_confirmed_at              TIMESTAMPTZ DEFAULT NULL,
  email_confirm_token             UUID        DEFAULT NULL,
  email_day1_sent                 BOOLEAN     DEFAULT FALSE,
  email_day7_sent                 BOOLEAN     DEFAULT FALSE,

  -- ── Integrations (per-founder API keys) ─────────────────────
  calendly_api_key                TEXT,
  posthog_api_key                 TEXT,
  posthog_project_id              TEXT,
  fireflies_api_key               TEXT,

  -- ── Weekly check-in (YC-style accountability) ───────────────
  weekly_goal                     TEXT,
  weekly_metric_value             TEXT,
  weekly_checkin_at               TIMESTAMPTZ,
  gate_progress                   JSONB       DEFAULT '{}',
  customer_calls_count            INT         DEFAULT 0,

  -- ── Relationships ───────────────────────────────────────────
  -- Set when a founder is linked to an investor's portfolio
  portfolio_investor_id           UUID        REFERENCES investor_profiles(id) ON DELETE SET NULL,
  -- Set when a founder is part of a team/startup entity
  startup_id                      UUID        REFERENCES startups(id) ON DELETE SET NULL,

  -- ── Timestamps ──────────────────────────────────────────────
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_founder_profiles_user_id
  ON founder_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_subscription
  ON founder_profiles(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_role
  ON founder_profiles(role);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_stage
  ON founder_profiles(stage);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_assessment_completed
  ON founder_profiles(assessment_completed)
  WHERE assessment_completed = true;

CREATE INDEX IF NOT EXISTS idx_founder_profiles_startup_profile_completed
  ON founder_profiles(startup_profile_completed)
  WHERE startup_profile_completed = true;

CREATE INDEX IF NOT EXISTS idx_founder_profiles_signal_strength
  ON founder_profiles(signal_strength DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_stripe_verified
  ON founder_profiles(stripe_verified);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_momentum
  ON founder_profiles(momentum_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_visibility
  ON founder_profiles(visibility_gated, signal_strength DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_public_slug
  ON founder_profiles(public_slug)
  WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_founder_profiles_confirm_token
  ON founder_profiles(email_confirm_token)
  WHERE email_confirm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fp_portfolio_investor_id
  ON founder_profiles(portfolio_investor_id)
  WHERE portfolio_investor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_founder_profiles_background
  ON founder_profiles USING GIN (founder_background);

-- Composite index for founder matching/discovery queries
CREATE INDEX IF NOT EXISTS idx_founder_profiles_matching
  ON founder_profiles(industry, stage, revenue_status, funding_status)
  WHERE onboarding_completed = true AND profile_builder_completed = true;

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;

drop policy if exists "Users can view own profile" on founder_profiles;
CREATE POLICY "Users can view own profile"
  ON founder_profiles FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on founder_profiles;
CREATE POLICY "Users can insert own profile"
  ON founder_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on founder_profiles;
CREATE POLICY "Users can update own profile"
  ON founder_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Replay repair (FU-003, 20 Jul 2026) ─────────────────────────────────────
-- 20260212000001 defines this policy on investor_profiles but replays BEFORE this squash
-- creates founder_profiles, so it guards itself out on a rebuild-from-empty. Recreate it
-- here, where the table finally exists. Idempotent; on production (where both files were
-- applied long ago and never re-run) this simply never executes again.
drop policy if exists "Founders can view verified investors for matching" on investor_profiles;
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

-- ─── Replay repair (FU-003, 20 Jul 2026): objects defined in pre-squash files ─
-- These earlier files guard themselves out on a rebuild-from-empty because this squash
-- (which creates founder_profiles) replays after them. Recreated here, where the table
-- exists. Idempotent; on production these already exist and this file is never re-run.

-- from 20260422000010_perf_indexes.sql
CREATE INDEX IF NOT EXISTS idx_founder_profiles_startup_name
  ON founder_profiles(startup_name)
  WHERE startup_name IS NOT NULL;

-- from 20260603000001_document_rag_investor_embeddings.sql
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS iq_summary_embedding vector(1024);
