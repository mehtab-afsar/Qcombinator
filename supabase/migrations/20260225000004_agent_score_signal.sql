-- Add source_artifact_type to qscore_history
-- Tracks when a score row was produced by an agent artifact completion
-- (data_source = 'agent_completion') so we can prevent double-counting
-- boosts for the same artifact type per user.

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS source_artifact_type TEXT;

COMMENT ON COLUMN qscore_history.source_artifact_type IS
  'Set when data_source = ''agent_completion''. Prevents the same artifact type from boosting the score twice for the same user.';

CREATE INDEX IF NOT EXISTS idx_qscore_history_artifact_signal
  ON qscore_history(user_id, source_artifact_type)
  WHERE source_artifact_type IS NOT NULL;

-- Refresh the delta view to include data_source and source_artifact_type
-- DROP + CREATE because CREATE OR REPLACE cannot change column order/position
DROP VIEW IF EXISTS qscore_with_delta;
CREATE VIEW qscore_with_delta AS
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
  cur.data_source,
  cur.source_artifact_type,

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
