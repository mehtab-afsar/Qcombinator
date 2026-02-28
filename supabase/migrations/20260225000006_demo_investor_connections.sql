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
