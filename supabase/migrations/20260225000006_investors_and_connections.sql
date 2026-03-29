-- ============================================================
-- Consolidates:
--   20260225000002_investor_personalization.sql
--   20260225000006_demo_investor_connections.sql
--   20260225000013_investor_pipeline.sql
--   20260225000014_investor_notifications.sql
--   20260228000002_investor_demo_investor_id.sql
--   20260228000004_investor_notification_preferences.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260225000002_investor_personalization.sql
-- ============================================================

-- Add AI personalization column to investor_profiles
ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS ai_personalization JSONB DEFAULT '{}';

-- ============================================================
-- SOURCE: 20260225000006_demo_investor_connections.sql
-- ============================================================

-- Add demo_investor_id to connection_requests
-- The existing investor_id column has a FK on auth.users, but demo investors
-- are stored in demo_investors (no auth account). This column stores their UUID.

ALTER TABLE connection_requests
  ADD COLUMN IF NOT EXISTS demo_investor_id UUID;

COMMENT ON COLUMN connection_requests.demo_investor_id IS
  'UUID from demo_investors table. Used instead of investor_id when connecting to demo investor profiles.';

CREATE INDEX IF NOT EXISTS idx_connection_requests_demo_investor
  ON connection_requests(founder_id, demo_investor_id)
  WHERE demo_investor_id IS NOT NULL;

-- RLS: founders can INSERT their own connection requests
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'connection_requests'
      AND policyname = 'Founders can insert own connection requests'
  ) THEN
    CREATE POLICY "Founders can insert own connection requests"
      ON connection_requests FOR INSERT
      WITH CHECK (founder_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'connection_requests'
      AND policyname = 'Founders can read own connection requests'
  ) THEN
    CREATE POLICY "Founders can read own connection requests"
      ON connection_requests FOR SELECT
      USING (founder_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- SOURCE: 20260225000013_investor_pipeline.sql
-- ============================================================

-- Investor Pipeline CRM
-- Investors can track founders through deal stages with private notes

CREATE TABLE IF NOT EXISTS investor_pipeline (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  founder_user_id   UUID NOT NULL,
  stage             TEXT NOT NULL DEFAULT 'watching'
                    CHECK (stage IN ('watching', 'interested', 'meeting', 'in_dd', 'portfolio', 'passed')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_user_id, founder_user_id)
);

-- RLS: investors can only see their own pipeline
ALTER TABLE investor_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors manage own pipeline"
  ON investor_pipeline
  FOR ALL
  USING (investor_user_id = auth.uid())
  WITH CHECK (investor_user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_investor_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investor_pipeline_updated_at
  BEFORE UPDATE ON investor_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_investor_pipeline_updated_at();

-- ============================================================
-- SOURCE: 20260225000014_investor_notifications.sql
-- ============================================================

-- Add deal flow notification preference to investor_profiles
-- Default TRUE — investors are opted in to deal alerts unless they opt out.

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS deal_flow_notifications BOOLEAN DEFAULT true;

-- Investors can manage this via /investor/settings (already built)
COMMENT ON COLUMN investor_profiles.deal_flow_notifications IS
  'When true, investor receives Resend email when a high-Q-Score founder matching their thesis joins the platform.';

-- Add app URL field to avoid hardcoding in API
-- (handled via NEXT_PUBLIC_APP_URL env var — no schema change needed)

-- ============================================================
-- SOURCE: 20260228000002_investor_demo_investor_id.sql
-- ============================================================

-- Add demo_investor_id to investor_profiles
-- This is the bridge column that links a real investor's auth account
-- to their entry in the demo_investors table (which founders discover and connect with).
-- Without this column the investor onboarding route silently fails to persist the link.

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS demo_investor_id UUID REFERENCES demo_investors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_investor_profiles_demo_investor_id
  ON investor_profiles(demo_investor_id)
  WHERE demo_investor_id IS NOT NULL;

COMMENT ON COLUMN investor_profiles.demo_investor_id IS
  'FK to demo_investors.id — populated on first onboarding so founders can discover and connect with this real investor.';

-- ============================================================
-- SOURCE: 20260228000004_investor_notification_preferences.sql
-- ============================================================

-- Store all investor notification preferences in a JSONB column.
-- deal_flow_notifications (existing boolean) stays for high-Q-Score alerts.
-- notification_preferences JSONB holds the richer per-type flags.

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN investor_profiles.notification_preferences IS
  'JSONB map of per-type notification flags: { highQScore, connectionReq, weeklyDigest }';
