-- ============================================================
-- Add user_id to agent_messages for direct user-scoped queries
-- (activity-boost message count, future analytics)
-- Also add missing performance indexes.
-- ============================================================

-- 1. Add user_id to agent_messages, back-filled via parent conversation
ALTER TABLE agent_messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Back-fill from agent_conversations
UPDATE agent_messages am
SET user_id = ac.user_id
FROM agent_conversations ac
WHERE am.conversation_id = ac.id
  AND am.user_id IS NULL;

-- 2. Add sender column alias (chat route uses 'sender', schema uses 'role')
-- The activity-boost route queries .eq('sender', 'user') — create the column if missing
ALTER TABLE agent_messages
  ADD COLUMN IF NOT EXISTS sender TEXT
    GENERATED ALWAYS AS (role) STORED;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_agent_activity_user_created
  ON agent_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_artifacts_user_type
  ON agent_artifacts(user_id, artifact_type);

CREATE INDEX IF NOT EXISTS idx_agent_messages_user_created
  ON agent_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qscore_history_user_calculated
  ON qscore_history(user_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_sends_resend_id
  ON outreach_sends(resend_id);

CREATE INDEX IF NOT EXISTS idx_deals_user_stage
  ON deals(user_id, stage);

-- 4. RLS policy for direct user_id access on agent_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_messages'
      AND policyname = 'Users can view own messages by user_id'
  ) THEN
    CREATE POLICY "Users can view own messages by user_id"
      ON agent_messages FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_messages'
      AND policyname = 'Users can insert messages by user_id'
  ) THEN
    CREATE POLICY "Users can insert messages by user_id"
      ON agent_messages FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
