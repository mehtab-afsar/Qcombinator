-- Create investor_configs table.
--
-- ⚠️ MADE IDEMPOTENT (15 Jul 2026) so it can run against a database where this
-- table may already exist.
--
-- Why: schema changes on this project were often applied through the Supabase
-- dashboard, with the migration file written afterwards to document them — see
-- 20260601000001_missing_agent_tables.sql ("tables that exist in the live DB but
-- had no migration file... created directly via Supabase dashboard"). So a
-- pending migration cannot assume its objects are absent.
--
-- This file had never been applied (absent from the remote migration history),
-- so editing it is safe: no deployed database has run the previous version.
--
-- Every other pending migration already guards this way. This one did not, and
-- would have aborted `db push` part-way through the batch.

CREATE TABLE IF NOT EXISTS investor_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_type TEXT NOT NULL
    CHECK (investor_type IN ('angel', 'seed-vc', 'growth-vc', 'corporate')),
  preferences_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (idempotent — safe to run even if already enabled)
ALTER TABLE investor_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can only view/edit their own config.
-- CREATE POLICY has no IF NOT EXISTS, so drop first.
-- Correctly scoped: no permissive `using (true)` escape hatch — see
-- PHASE0_AUDIT.md §8d for what that bug did to four other tables.
DROP POLICY IF EXISTS "Users can view/edit own config" ON investor_configs;
CREATE POLICY "Users can view/edit own config"
  ON investor_configs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_investor_configs_user_id ON investor_configs(user_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_investor_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CREATE TRIGGER has no IF NOT EXISTS either.
DROP TRIGGER IF EXISTS trigger_investor_configs_updated_at ON investor_configs;
CREATE TRIGGER trigger_investor_configs_updated_at
  BEFORE UPDATE ON investor_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_configs_updated_at();
