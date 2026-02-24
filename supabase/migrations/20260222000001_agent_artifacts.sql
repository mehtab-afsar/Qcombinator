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
