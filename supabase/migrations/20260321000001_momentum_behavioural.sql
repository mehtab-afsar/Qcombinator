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
