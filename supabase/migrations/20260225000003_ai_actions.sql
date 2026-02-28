-- Add ai_actions column to qscore_history
-- Stores the 5 LLM-generated personalized action items for "What gets me to 80?"
-- Generated lazily on first view and cached here permanently.

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS ai_actions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN qscore_history.ai_actions IS
  'LLM-generated personalized action items to improve Q-Score toward 80. Cached after first generation.';
