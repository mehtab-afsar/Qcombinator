-- Session summary on each conversation (written async by Haiku after the conversation ends)
ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS summary TEXT;

-- Per-agent relationship memory (one row per user × agent, updated async after each session)
CREATE TABLE IF NOT EXISTS agent_memory (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id          TEXT        NOT NULL,
  session_count     INTEGER     NOT NULL DEFAULT 0,
  relationship_tier TEXT        NOT NULL DEFAULT 'stranger'
                                CHECK (relationship_tier IN ('stranger', 'acquainted', 'familiar', 'trusted')),
  key_facts         TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS agent_memory_user_agent_idx ON agent_memory (user_id, agent_id);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own agent memory"
  ON agent_memory FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "service role manage agent memory"
  ON agent_memory FOR ALL TO service_role
  WITH CHECK (true);
