-- Fix subscription_usage.feature CHECK constraint to include all features
-- used at runtime. The original constraint only listed 4 features but the
-- signup route and agent routes insert 'agent_generate' and others.

ALTER TABLE subscription_usage
  DROP CONSTRAINT IF EXISTS subscription_usage_feature_check;

ALTER TABLE subscription_usage
  ADD CONSTRAINT subscription_usage_feature_check
  CHECK (feature IN (
    'agent_chat',
    'agent_generate',
    'investor_connection',
    'qscore_recalc',
    'workshop'
  ));
