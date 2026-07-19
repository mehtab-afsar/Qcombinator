-- ============================================================
-- Migration: Add missing performance indexes
-- ============================================================
-- These indexes improve query performance for high-cardinality lookups
-- and reduce 200-500ms latency on deal-flow, messaging, and agent routes.
--
-- ⚠️ FIXED (19 Jul 2026): three of these had a time-relative partial predicate
-- (`WHERE created_at > NOW() - INTERVAL '...'` / `WHERE reset_at > NOW()`).
-- Postgres REJECTS that — "functions in index predicate must be marked IMMUTABLE"
-- (SQLSTATE 42P17) — because NOW() is STABLE, not IMMUTABLE. Such an index is
-- invalid on ANY database, so it never actually built (this migration had never
-- been applied). A "recent rows only" partial index is not expressible: the
-- cutoff would have to be a fixed timestamp baked in at creation, wrong the day
-- after. The predicates are removed — the indexes now cover all rows (marginally
-- larger, identical correctness). db push blocker #7.

-- 1. Agent artifacts lookup by user_id (used in context building)
CREATE INDEX IF NOT EXISTS idx_agent_artifacts_user_id
  ON agent_artifacts(user_id);

-- 2. Agent conversations lookup by user and agent (used in chat history)
--    WHERE created_at > NOW() - INTERVAL '6 months' removed — non-immutable.
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_agent
  ON agent_conversations(user_id, agent_id);

-- 3. Agent messages lookup by conversation_id (used in thread fetches)
--    Note: column is conversation_id (not agent_conversation_id)
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_id
  ON agent_messages(conversation_id, created_at DESC);

-- 4. Founder profiles lookup by role (used in deal-flow filtering)
CREATE INDEX IF NOT EXISTS idx_founder_profiles_role
  ON founder_profiles(role, assessment_completed);

-- 5. Subscription usage lookup by user and feature (used in quota checks)
--    WHERE reset_at > NOW() removed — non-immutable.
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_feature
  ON subscription_usage(user_id, feature);

-- 6. Messages lookup by connection and creation date (used for thread pagination)
CREATE INDEX IF NOT EXISTS idx_messages_connection_created
  ON messages(connection_request_id, created_at DESC);

-- 7. Profile builder data lookup by user and section (used in submit validation)
--    WHERE created_at > NOW() - INTERVAL '1 year' removed — non-immutable.
CREATE INDEX IF NOT EXISTS idx_profile_builder_data_user_section
  ON profile_builder_data(user_id, section);
