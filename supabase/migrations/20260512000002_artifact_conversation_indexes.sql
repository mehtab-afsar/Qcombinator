-- Indexes for agent_artifacts and agent_conversations user-scoped queries.
-- These tables are queried almost exclusively filtered by user_id, so explicit
-- composite indexes outperform the implicit FK index under production load.

CREATE INDEX IF NOT EXISTS idx_agent_artifacts_user_created
  ON agent_artifacts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id
  ON agent_conversations(user_id);
