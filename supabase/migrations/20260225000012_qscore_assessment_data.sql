-- Add assessment_data to qscore_history
-- Several API routes (qscore/actions, investor/startup/:id, useFounderData)
-- query assessment_data directly from qscore_history for convenience.
-- Previously it only existed on qscore_assessments (separate table).

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS assessment_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN qscore_history.assessment_data IS
  'Copy of the AssessmentData object that produced this score row. Cached here for fast access without a join.';

-- Index to speed up the common "latest score with assessment data" query
CREATE INDEX IF NOT EXISTS idx_qscore_history_assessment_data
  ON qscore_history(user_id, calculated_at DESC)
  WHERE assessment_data IS NOT NULL AND assessment_data != '{}'::jsonb;
