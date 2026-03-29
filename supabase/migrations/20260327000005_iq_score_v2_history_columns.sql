-- ============================================================================
-- Edge Alpha IQ Score v2 — Migration 5: qscore_history v2 columns
-- Adds iq_breakdown JSONB and available_iq for the new scoring system
-- Adds track column (commercial | impact) for P5 routing
-- ============================================================================

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS iq_breakdown       JSONB,
  ADD COLUMN IF NOT EXISTS available_iq       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS track              TEXT DEFAULT 'commercial',
  ADD COLUMN IF NOT EXISTS reconciliation_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS validation_warnings  JSONB DEFAULT '[]';

-- Index for fast version-filtered queries
CREATE INDEX IF NOT EXISTS qscore_history_v2_idx
  ON qscore_history(user_id, score_version, calculated_at DESC)
  WHERE score_version = 'v2_iq';
