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

-- founder_profiles columns (stripe_verified, stripe_mrr, stripe_arr, stripe_customers,
-- stripe_last30, signal_strength, integrity_index, stripe_account_id, momentum_score,
-- momentum_updated_at, behavioural_score, visibility_gated) and their indexes are
-- defined in 20260700000001_founder_profiles_squashed.sql

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

-- qscore_history cohort_scores, gtm_diagnostics columns, compute_qscore_percentile function
-- defined in 20260200000001_qscore_history_squashed.sql
