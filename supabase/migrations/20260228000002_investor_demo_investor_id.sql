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
