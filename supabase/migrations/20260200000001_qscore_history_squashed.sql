-- ============================================================
-- qscore_history — single authoritative definition
-- Replaces 14 scattered CREATE/ALTER TABLE statements across:
--   20250101000001, 20250101000002, 20250101000003
--   20260212000001, 20260222000001, 20260225000005
--   20260310000001, 20260317000001, 20260326000001
--   20260327000001, 20260422000010
-- And consolidates + deletes:
--   20260506000001_retire_legacy_dimensions.sql
--   20260604000001_qscore_decay_and_idempotency.sql
--   20260605000003_qscore_latest_rpc.sql
-- Depends on: qscore_assessments (created in 20250101000001)
-- ============================================================

CREATE TABLE IF NOT EXISTS qscore_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id   UUID REFERENCES qscore_assessments(id),

  -- ── Core scores ───────────────────────────────────────────
  overall_score   INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  percentile      INTEGER          CHECK (percentile     BETWEEN 0 AND 100),
  grade           TEXT             CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F')),

  -- ── P1–P6 dimension scores (replaces legacy market/product/gtm/financial/team/traction) ──
  p1_score        INTEGER CHECK (p1_score BETWEEN 0 AND 100),  -- Market Readiness
  p2_score        INTEGER CHECK (p2_score BETWEEN 0 AND 100),  -- Market Potential
  p3_score        INTEGER CHECK (p3_score BETWEEN 0 AND 100),  -- IP & Defensibility
  p4_score        INTEGER CHECK (p4_score BETWEEN 0 AND 100),  -- Founder & Team
  p5_score        INTEGER CHECK (p5_score BETWEEN 0 AND 100),  -- Structural Impact
  p6_score        INTEGER CHECK (p6_score BETWEEN 0 AND 100),  -- Financials

  -- ── Score lineage ─────────────────────────────────────────
  previous_score_id UUID REFERENCES qscore_history(id) ON DELETE SET NULL,
  score_version     TEXT NOT NULL DEFAULT 'v1_prd',

  -- ── Data provenance ───────────────────────────────────────
  data_source TEXT DEFAULT 'assessment'
    CHECK (data_source IN (
      'registration', 'profile_builder', 'agent_completion', 'agent_artifact',
      'manual', 'onboarding', 'assessment', 'combined'
    )),
  source_artifact_type TEXT,
  track                TEXT DEFAULT 'commercial',

  -- ── Cached computation blobs ─────────────────────────────
  assessment_data     JSONB DEFAULT '{}'::jsonb,
  ai_actions          JSONB DEFAULT '[]'::jsonb,
  iq_breakdown        JSONB,
  cohort_scores       JSONB DEFAULT NULL,
  gtm_diagnostics     JSONB DEFAULT NULL,
  reconciliation_flags JSONB DEFAULT '[]',
  validation_warnings  JSONB DEFAULT '[]',
  available_iq        NUMERIC(5,2),

  -- ── Temporal bookkeeping ─────────────────────────────────
  last_decayed_at TIMESTAMPTZ,
  calculated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN qscore_history.ai_actions IS
  'LLM-generated personalized action items to improve Q-Score toward 80. Cached after first generation.';
COMMENT ON COLUMN qscore_history.source_artifact_type IS
  'Set when data_source = ''agent_completion''. Prevents the same artifact type from boosting the score twice for the same user.';
COMMENT ON COLUMN qscore_history.assessment_data IS
  'Copy of the AssessmentData object that produced this score row. Cached here for fast access without a join.';
COMMENT ON COLUMN qscore_history.cohort_scores IS
  'Percentile-based cohort dimension scores. Null until cohort reaches MIN_COHORT_SIZE (30). '
  'Shape: { market, product, goToMarket, financial, team, traction, overall, cohortSize, sector }';
COMMENT ON COLUMN qscore_history.gtm_diagnostics IS
  'GTM diagnostic result from runGTMDiagnostics(). '
  'Shape: { D1, D2, D3, overallGTMScore, primaryGap, routeToAgent, routeChallenge }';


-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_qscore_history_user
  ON qscore_history(user_id);

CREATE INDEX IF NOT EXISTS idx_qscore_history_user_date
  ON qscore_history(user_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_qscore_history_calculated
  ON qscore_history(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_qscore_history_previous
  ON qscore_history(previous_score_id);

CREATE INDEX IF NOT EXISTS idx_qscore_history_artifact_signal
  ON qscore_history(user_id, source_artifact_type)
  WHERE source_artifact_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qscore_history_assessment_data
  ON qscore_history(user_id, calculated_at DESC)
  WHERE assessment_data IS NOT NULL AND assessment_data != '{}'::jsonb;

CREATE INDEX IF NOT EXISTS qscore_history_version_idx
  ON qscore_history(user_id, score_version, calculated_at DESC);

CREATE INDEX IF NOT EXISTS qscore_history_v2_idx
  ON qscore_history(user_id, score_version, calculated_at DESC)
  WHERE score_version = 'v2_iq';

-- Partial unique index: guarantees each artifact type only boosts a user's score once.
CREATE UNIQUE INDEX IF NOT EXISTS qscore_history_user_artifact_unique
  ON qscore_history(user_id, source_artifact_type)
  WHERE source_artifact_type IS NOT NULL;


-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE qscore_history ENABLE ROW LEVEL SECURITY;

drop policy if exists "Users can view own qscore history" on qscore_history;
CREATE POLICY "Users can view own qscore history"
  ON qscore_history FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can insert own qscore history" on qscore_history;
CREATE POLICY "Users can insert own qscore history"
  ON qscore_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── View: qscore_with_delta ───────────────────────────────────────────────────
-- Joins each score row to its predecessor for O(1) delta lookups.

CREATE OR REPLACE VIEW qscore_with_delta AS
SELECT
  cur.id,
  cur.user_id,
  cur.assessment_id,
  cur.previous_score_id,
  cur.overall_score,
  cur.percentile,
  cur.grade,
  cur.p1_score,
  cur.p2_score,
  cur.p3_score,
  cur.p4_score,
  cur.p5_score,
  cur.p6_score,
  cur.calculated_at,

  cur.overall_score - COALESCE(prev.overall_score, cur.overall_score) AS overall_change,
  cur.p1_score - COALESCE(prev.p1_score, cur.p1_score) AS p1_change,
  cur.p2_score - COALESCE(prev.p2_score, cur.p2_score) AS p2_change,
  cur.p3_score - COALESCE(prev.p3_score, cur.p3_score) AS p3_change,
  cur.p4_score - COALESCE(prev.p4_score, cur.p4_score) AS p4_change,
  cur.p5_score - COALESCE(prev.p5_score, cur.p5_score) AS p5_change,
  cur.p6_score - COALESCE(prev.p6_score, cur.p6_score) AS p6_change

FROM qscore_history cur
LEFT JOIN qscore_history prev ON cur.previous_score_id = prev.id;


-- ── RPC: compute_qscore_percentile ───────────────────────────────────────────
-- Returns the percentile rank of a given score relative to all users' latest scores.

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
      COUNT(*)                                             AS total,
      COUNT(*) FILTER (WHERE overall_score < target_score) AS below
    FROM latest_per_user
  )
  SELECT
    CASE WHEN total = 0 THEN 50
         ELSE ROUND((below::NUMERIC / total) * 100)::INTEGER
    END
  FROM counts;
$$;

REVOKE ALL ON FUNCTION compute_qscore_percentile(INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION compute_qscore_percentile(INTEGER) TO authenticated;
GRANT  EXECUTE ON FUNCTION compute_qscore_percentile(INTEGER) TO service_role;


-- ── RPC: get_latest_qscores ───────────────────────────────────────────────────
-- Returns one latest qscore_history row per user from a given set of user_ids.
-- Eliminates JS-side deduplication in the deal-flow route.

CREATE OR REPLACE FUNCTION get_latest_qscores(user_ids uuid[])
RETURNS TABLE(
  user_id        uuid,
  overall_score  integer,
  p1_score       integer,
  p2_score       integer,
  p3_score       integer,
  p4_score       integer,
  p5_score       integer,
  p6_score       integer,
  percentile     numeric,
  calculated_at  timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (user_id)
    user_id, overall_score,
    p1_score, p2_score, p3_score, p4_score, p5_score, p6_score,
    percentile, calculated_at
  FROM qscore_history
  WHERE user_id = ANY(user_ids)
  ORDER BY user_id, calculated_at DESC;
$$;
