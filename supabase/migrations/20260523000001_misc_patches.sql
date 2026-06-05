-- ============================================================
-- Miscellaneous patches — consolidated from 9 single-purpose files
-- Sources (deleted):
--   20260402000002_tool_execution_model_tier.sql
--   20260420000005_investor_billing.sql
--   20260423000011_portfolio_config.sql
--   20260512000001_artifact_key_fields.sql
--   20260512000002_artifact_conversation_indexes.sql
--   20260513000002_subscription_usage_agent_generate.sql
--   20260513000003_merge_startup_profile_data.sql
--   20260520000003_feed_indexes.sql
--   20260521000003_notifications_realtime.sql
-- ============================================================


-- ── investor_profiles: billing + config ───────────────────────────────────────

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portfolio_display_config JSONB DEFAULT NULL;


-- ── tool_execution_logs: model tier observability ─────────────────────────────

ALTER TABLE tool_execution_logs
  ADD COLUMN IF NOT EXISTS model_tier VARCHAR(16);

COMMENT ON COLUMN tool_execution_logs.model_tier IS 'economy | standard | premium — maps to LLM routing tier used for this tool call';

UPDATE tool_execution_logs SET model_tier = 'standard' WHERE model_tier IS NULL;


-- ── agent_artifacts: key_fields + constraint cleanup ─────────────────────────

ALTER TABLE agent_artifacts
  ADD COLUMN IF NOT EXISTS key_fields JSONB;

ALTER TABLE agent_artifacts
  DROP CONSTRAINT IF EXISTS agent_artifacts_artifact_type_check;


-- ── subscription_usage: feature allowlist fix ─────────────────────────────────

ALTER TABLE subscription_usage
  DROP CONSTRAINT IF EXISTS subscription_usage_feature_check;

ALTER TABLE subscription_usage
  ADD CONSTRAINT subscription_usage_feature_check
  CHECK (feature IN ('agent_chat', 'investor_connection', 'qscore_recalc', 'workshop', 'agent_generate'));


-- ── founder_profiles: merge helper function ───────────────────────────────────

CREATE OR REPLACE FUNCTION merge_startup_profile_data(
  p_user_id UUID,
  p_patch   JSONB
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE founder_profiles
  SET startup_profile_data = COALESCE(startup_profile_data, '{}'::jsonb) || p_patch
  WHERE user_id = p_user_id;
END;
$$;


-- ── indexes: agent_artifacts, agent_conversations, feed_posts ─────────────────

CREATE INDEX IF NOT EXISTS idx_agent_artifacts_user_created
  ON agent_artifacts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id
  ON agent_conversations(user_id);

CREATE INDEX IF NOT EXISTS feed_posts_role_created_idx
  ON feed_posts (role, created_at DESC);

CREATE INDEX IF NOT EXISTS feed_posts_type_created_idx
  ON feed_posts (post_type, created_at DESC);


-- ── notifications: enable Realtime ───────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
