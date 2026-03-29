-- ============================================================
-- Consolidates:
--   20260317000001_founder_metric_snapshots.sql
--   20260320000001_stripe_verification_signal_strength.sql
--   20260321000001_momentum_behavioural.sql
--   20260322000002_qscore_cohort_gtm_columns.sql
--   20260322000003_percentile_rpc.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260317000001_founder_metric_snapshots.sql
-- ============================================================

-- founder_metric_snapshots
-- Stores raw metric values + dimension scores after every Q-Score calculation.
-- Used by the cohort scorer to compute percentile ranks without hardcoded thresholds.
-- Cohort scoring activates automatically once MIN_COHORT_SIZE (30) rows exist.

CREATE TABLE IF NOT EXISTS founder_metric_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  qscore_history_id   uuid REFERENCES qscore_history(id) ON DELETE SET NULL,
  sector              text NOT NULL DEFAULT 'default',

  -- Raw numeric metric values extracted from assessment
  -- Stored as JSONB for schema flexibility — add new metrics without migrations
  metrics             jsonb NOT NULL DEFAULT '{}',
  -- Example:
  -- {
  --   "tam": 5000000,
  --   "conversion_rate": 2.5,
  --   "activity_rate": 15.0,
  --   "ltv_cac_ratio": 4.2,
  --   "gross_margin_pct": 68.0,
  --   "arr": 120000,
  --   "runway_months": 14,
  --   "projected_growth_pct": 150,
  --   "channels_tried": 3,
  --   "channel_results": 2,
  --   "cac_ratio": 0.8,
  --   "conversation_count": 25,
  --   "build_time_days": 14
  -- }

  -- Computed dimension scores (0–100) from this assessment
  -- Used directly for cohort percentile calculation — no need to recompute
  dimension_scores    jsonb NOT NULL DEFAULT '{}',
  -- Example:
  -- {
  --   "market": 72,
  --   "product": 65,
  --   "goToMarket": 58,
  --   "financial": 81,
  --   "team": 70,
  --   "traction": 44
  -- }

  overall_score       numeric(5,2),
  calculated_at       timestamptz DEFAULT now()
);

-- Indexes for cohort queries
CREATE INDEX idx_fms_sector          ON founder_metric_snapshots(sector);
CREATE INDEX idx_fms_calculated_at   ON founder_metric_snapshots(calculated_at DESC);
CREATE INDEX idx_fms_user_id         ON founder_metric_snapshots(user_id);
-- GIN index for JSONB metric lookups (e.g. where metrics->>'arr' is not null)
CREATE INDEX idx_fms_metrics         ON founder_metric_snapshots USING GIN(metrics);
CREATE INDEX idx_fms_dimension_scores ON founder_metric_snapshots USING GIN(dimension_scores);

-- RLS: founders can only read their own snapshots
ALTER TABLE founder_metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own metric snapshots"
  ON founder_metric_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used in API routes) can insert/read all
CREATE POLICY "Service role full access"
  ON founder_metric_snapshots FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- SOURCE: 20260320000001_stripe_verification_signal_strength.sql
-- ============================================================

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

-- ============================================================
-- SOURCE: 20260321000001_momentum_behavioural.sql
-- ============================================================

-- Phase 4: Momentum Score + Behavioural Signals
-- Momentum: 30-day score improvement normalised against same-stage cohort
-- Behavioural: iteration speed, ICP refinement trajectory, contradiction engagement

-- ── founder_profiles additions ───────────────────────────────────────────────

ALTER TABLE founder_profiles
  -- Momentum: score delta over 30 days (can be negative)
  ADD COLUMN IF NOT EXISTS momentum_score        INTEGER,
  -- Last time momentum was recalculated
  ADD COLUMN IF NOT EXISTS momentum_updated_at   TIMESTAMPTZ,
  -- Behavioural composite score (0-100) aggregated from all signals
  ADD COLUMN IF NOT EXISTS behavioural_score     INTEGER CHECK (behavioural_score BETWEEN 0 AND 100),
  -- Investor parameter weight preferences (stored per investor, but referenced here for founders)
  ADD COLUMN IF NOT EXISTS visibility_gated      BOOLEAN NOT NULL DEFAULT FALSE;
  -- visibility_gated = TRUE when signal_strength < 40 (set by calculate route)

-- ── founder_behavioural_signals table ────────────────────────────────────────
-- Records granular behavioural events that feed into the behavioural_score

CREATE TABLE IF NOT EXISTS founder_behavioural_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type   TEXT NOT NULL,
  -- signal_type values:
  --   'iteration_speed'          — days between assessment retakes (lower = faster)
  --   'agent_session_frequency'  — days between agent conversations (lower = more active)
  --   'icp_refinement'           — specificity score improvement across ICP versions
  --   'contradiction_engagement' — founder engaged with uncomfortable Atlas data (boolean 0/1)
  signal_value  NUMERIC,          -- numeric value of the signal (context-dependent)
  signal_context JSONB,           -- arbitrary extra data (e.g. { agentId, artifactId, delta })
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavioural_signals_user_type
  ON founder_behavioural_signals(user_id, signal_type, created_at DESC);

-- RLS: founders see own signals; service role can write
ALTER TABLE founder_behavioural_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders read own signals"
  ON founder_behavioural_signals FOR SELECT
  USING (user_id = auth.uid());

-- ── investor_parameter_weights table ─────────────────────────────────────────
-- Each investor can set custom weights across the 5 Q-Score parameters

CREATE TABLE IF NOT EXISTS investor_parameter_weights (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  weight_market    INTEGER NOT NULL DEFAULT 20 CHECK (weight_market    BETWEEN 0 AND 100),
  weight_product   INTEGER NOT NULL DEFAULT 18 CHECK (weight_product   BETWEEN 0 AND 100),
  weight_gtm       INTEGER NOT NULL DEFAULT 17 CHECK (weight_gtm       BETWEEN 0 AND 100),
  weight_financial INTEGER NOT NULL DEFAULT 18 CHECK (weight_financial BETWEEN 0 AND 100),
  weight_team      INTEGER NOT NULL DEFAULT 15 CHECK (weight_team      BETWEEN 0 AND 100),
  weight_traction  INTEGER NOT NULL DEFAULT 12 CHECK (weight_traction  BETWEEN 0 AND 100),
  -- Total should sum to ~100, but we normalise in code so slight drift is OK
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE investor_parameter_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors manage own weights"
  ON investor_parameter_weights
  FOR ALL
  USING (investor_user_id = auth.uid())
  WITH CHECK (investor_user_id = auth.uid());

-- ── Index for momentum-sorted deal flow ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_founder_profiles_momentum
  ON founder_profiles(momentum_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_visibility
  ON founder_profiles(visibility_gated, signal_strength DESC NULLS LAST);

-- ============================================================
-- SOURCE: 20260322000002_qscore_cohort_gtm_columns.sql
-- ============================================================

-- Add cohort_scores and gtm_diagnostics to qscore_history
-- cohort_scores: percentile-based dimension scores once MIN_COHORT_SIZE is reached
-- gtm_diagnostics: D1/D2/D3 diagnostic breakdown (why GTM score is low)

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS cohort_scores   JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gtm_diagnostics JSONB DEFAULT NULL;

COMMENT ON COLUMN qscore_history.cohort_scores IS
  'Percentile-based cohort dimension scores. Null until cohort reaches MIN_COHORT_SIZE (30). '
  'Shape: { market, product, goToMarket, financial, team, traction, overall, cohortSize, sector }';

COMMENT ON COLUMN qscore_history.gtm_diagnostics IS
  'GTM diagnostic result from runGTMDiagnostics(). '
  'Shape: { D1, D2, D3, overallGTMScore, primaryGap, routeToAgent, routeChallenge }';

-- ============================================================
-- SOURCE: 20260322000003_percentile_rpc.sql
-- ============================================================

-- Efficient percentile calculation using a single SQL query.
-- Replaces the JS-side full table scan + in-memory dedup in calculatePercentile().
--
-- Strategy: DISTINCT ON gets the latest score per user, then count those below the target.

CREATE OR REPLACE FUNCTION compute_qscore_percentile(target_score INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH latest_per_user AS (
    SELECT DISTINCT ON (user_id) overall_score
    FROM   qscore_history
    ORDER  BY user_id, calculated_at DESC
  ),
  counts AS (
    SELECT
      COUNT(*)                                        AS total,
      COUNT(*) FILTER (WHERE overall_score < target_score) AS below
    FROM latest_per_user
  )
  SELECT
    CASE
      WHEN total = 0 THEN 50
      ELSE ROUND((below::NUMERIC / total) * 100)::INTEGER
    END
  FROM counts;
$$;

-- Only callable from authenticated sessions + service role
REVOKE ALL ON FUNCTION compute_qscore_percentile(INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION compute_qscore_percentile(INTEGER) TO authenticated;
GRANT  EXECUTE ON FUNCTION compute_qscore_percentile(INTEGER) TO service_role;
