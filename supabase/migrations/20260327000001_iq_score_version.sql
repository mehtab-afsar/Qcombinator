-- ============================================================================
-- Edge Alpha IQ Score v2 — Migration 1: score_version column + is_impact_focused
-- Freeze legacy v1_prd scores, new submissions tagged v2_iq
-- ============================================================================

-- 1. Add score_version to qscore_history (safely idempotent)
ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS score_version TEXT NOT NULL DEFAULT 'v1_prd';

-- Backfill existing rows as legacy
UPDATE qscore_history
  SET score_version = 'v1_prd'
  WHERE score_version IS NULL OR score_version = '';

-- 2. Add is_impact_focused to founder_profiles
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS is_impact_focused BOOLEAN NOT NULL DEFAULT false;

-- 3. Index for version-filtered queries (dashboard/investor portal)
CREATE INDEX IF NOT EXISTS qscore_history_version_idx
  ON qscore_history(user_id, score_version, calculated_at DESC);
