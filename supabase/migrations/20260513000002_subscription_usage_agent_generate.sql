-- Add 'agent_generate' to the subscription_usage feature allowlist.
-- The signup route inserts this feature value but the original CHECK constraint
-- did not include it, causing every signup to return 500.
ALTER TABLE subscription_usage
  DROP CONSTRAINT IF EXISTS subscription_usage_feature_check;

ALTER TABLE subscription_usage
  ADD CONSTRAINT subscription_usage_feature_check
  CHECK (feature IN ('agent_chat', 'investor_connection', 'qscore_recalc', 'workshop', 'agent_generate'));
