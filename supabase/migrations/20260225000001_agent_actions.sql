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
