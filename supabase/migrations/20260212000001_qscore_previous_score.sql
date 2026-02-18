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
