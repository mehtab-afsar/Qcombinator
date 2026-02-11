-- ============================================================
-- Migration 002: Create indexes for performance
-- ============================================================

-- founder_profiles
CREATE INDEX IF NOT EXISTS idx_founder_profiles_user_id ON founder_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_subscription ON founder_profiles(subscription_tier);

-- qscore_assessments
CREATE INDEX IF NOT EXISTS idx_assessments_user ON qscore_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON qscore_assessments(status);

-- qscore_history
CREATE INDEX IF NOT EXISTS idx_qscore_history_user ON qscore_history(user_id);
CREATE INDEX IF NOT EXISTS idx_qscore_history_calculated ON qscore_history(calculated_at DESC);

-- agent_conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON agent_conversations(agent_id);

-- agent_messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON agent_messages(created_at DESC);

-- subscription_usage
CREATE INDEX IF NOT EXISTS idx_usage_user ON subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_feature ON subscription_usage(feature);

-- connection_requests
CREATE INDEX IF NOT EXISTS idx_connections_founder ON connection_requests(founder_id);
CREATE INDEX IF NOT EXISTS idx_connections_investor ON connection_requests(investor_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connection_requests(status);

-- analytics_events
CREATE INDEX IF NOT EXISTS idx_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at DESC);
