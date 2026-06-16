-- ============================================================
-- Migration: Add missing performance indexes
-- ============================================================
-- These indexes improve query performance for high-cardinality lookups
-- and reduce 200-500ms latency on deal-flow, messaging, and agent routes.

-- 1. Agent artifacts lookup by user_id (used in context building)
CREATE INDEX IF NOT EXISTS idx_agent_artifacts_user_id
  ON agent_artifacts(user_id);

-- 2. Agent conversations lookup by user and agent (used in chat history)
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_agent
  ON agent_conversations(user_id, agent_id)
  WHERE created_at > NOW() - INTERVAL '6 months';

-- 3. Agent messages lookup by conversation_id (used in thread fetches)
--    Note: column is conversation_id (not agent_conversation_id)
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_id
  ON agent_messages(conversation_id, created_at DESC);

-- 4. Founder profiles lookup by role (used in deal-flow filtering)
CREATE INDEX IF NOT EXISTS idx_founder_profiles_role
  ON founder_profiles(role, assessment_completed);

-- 5. Subscription usage lookup by user and feature (used in quota checks)
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_feature
  ON subscription_usage(user_id, feature)
  WHERE reset_at > NOW();

-- 6. Messages lookup by connection and creation date (used for thread pagination)
CREATE INDEX IF NOT EXISTS idx_messages_connection_created
  ON messages(connection_request_id, created_at DESC);

-- 7. Profile builder data lookup by user and section (used in submit validation)
CREATE INDEX IF NOT EXISTS idx_profile_builder_data_user_section
  ON profile_builder_data(user_id, section)
  WHERE created_at > NOW() - INTERVAL '1 year';
