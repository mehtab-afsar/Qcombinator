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

-- founder_profiles onboarding columns defined in 20260700000001_founder_profiles_squashed.sql

-- qscore_history data_source column defined in 20260200000001_qscore_history_squashed.sql

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

-- qscore_history ai_actions, source_artifact_type, indexes, and qscore_with_delta view
-- defined in 20260200000001_qscore_history_squashed.sql
