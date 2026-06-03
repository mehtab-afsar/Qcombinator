-- ── Q-Score: decay timestamp + artifact-boost idempotency ─────────────────────
--
-- 1. last_decayed_at: records when the overall_score was last written back with
--    temporal decay applied. Lets us skip redundant writes within the same day.
--
-- 2. Partial unique index on (user_id, source_artifact_type): guarantees that
--    the one-time artifact score boost is truly one-time even under concurrent
--    requests (the SELECT-then-INSERT in applyAgentScoreSignal has a race window
--    without this index). Only applies to rows where source_artifact_type IS NOT
--    NULL (i.e. agent_completion rows), so regular assessment rows are unaffected.

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS last_decayed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS qscore_history_user_artifact_unique
  ON qscore_history (user_id, source_artifact_type)
  WHERE source_artifact_type IS NOT NULL;
