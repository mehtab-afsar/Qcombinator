-- ============================================================
-- Consolidates:
--   20260222000001_agent_artifacts.sql
--   20260224000001_onboarding_data_persistence.sql
--   20260225000001_agent_actions.sql
--   20260225000003_ai_actions.sql
--   20260225000004_agent_score_signal.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260222000001_agent_artifacts.sql
-- ============================================================

-- ============================================================
-- Agent Artifacts — structured deliverables produced by agents
-- e.g. ICP documents, outreach sequences, battle cards, playbooks
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_artifacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id        TEXT NOT NULL,
  artifact_type   TEXT NOT NULL CHECK (artifact_type IN (
    'icp_document', 'outreach_sequence', 'battle_card', 'gtm_playbook'
  )),
  title           TEXT NOT NULL,
  content         JSONB NOT NULL,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_artifacts_user
  ON agent_artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_artifacts_conversation
  ON agent_artifacts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_artifacts_type
  ON agent_artifacts(agent_id, artifact_type);

-- RLS
ALTER TABLE agent_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own artifacts"
  ON agent_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own artifacts"
  ON agent_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artifacts"
  ON agent_artifacts FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- SOURCE: 20260224000001_onboarding_data_persistence.sql
-- ============================================================

-- ============================================================
-- Migration: Add onboarding data persistence columns
-- ============================================================

-- Store extracted data from onboarding conversation
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS onboarding_extracted_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_chat_history JSONB DEFAULT '[]';

-- Track data source for each Q-Score entry (onboarding vs assessment vs combined)
ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'assessment'
    CHECK (data_source IN ('onboarding', 'assessment', 'combined'));

-- ============================================================
-- SOURCE: 20260225000001_agent_actions.sql
-- ============================================================

-- ============================================================
-- Agent Actions — concrete to-dos extracted from agent sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_actions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID    REFERENCES agent_conversations(id) ON DELETE CASCADE,
  user_id         UUID    REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id        TEXT    NOT NULL,
  action_text     TEXT    NOT NULL,
  priority        TEXT    DEFAULT 'medium'  CHECK (priority IN ('high', 'medium', 'low')),
  status          TEXT    DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_user
  ON agent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_conversation
  ON agent_actions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status
  ON agent_actions(user_id, status);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own actions"
  ON agent_actions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Usage Limits — daily caps per feature for free-tier founders
-- (subscription_usage table already exists from migration 001)
-- ============================================================

-- Ensure daily reset column exists (reset_at already in table)
-- No structural change needed — the table exists. This is a no-op migration note.

-- ============================================================
-- SOURCE: 20260225000003_ai_actions.sql
-- ============================================================

-- Add ai_actions column to qscore_history
-- Stores the 5 LLM-generated personalized action items for "What gets me to 80?"
-- Generated lazily on first view and cached here permanently.

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS ai_actions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN qscore_history.ai_actions IS
  'LLM-generated personalized action items to improve Q-Score toward 80. Cached after first generation.';

-- ============================================================
-- SOURCE: 20260225000004_agent_score_signal.sql
-- ============================================================

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
