-- Migration: Tighten RLS on demo_investors
-- Replaces the open "Anyone can read" policy with one that only exposes active records.
-- INSERT / UPDATE / DELETE remain unavailable to regular users;
-- the service_role key (used server-side) bypasses RLS by default.

-- Ensure RLS is enabled (idempotent — safe to run even if already enabled)
ALTER TABLE demo_investors ENABLE ROW LEVEL SECURITY;

-- Drop the old permissive policy that allowed reading ALL rows
DROP POLICY IF EXISTS "Anyone can read demo investors" ON demo_investors;

-- Public read: only active investors are visible
CREATE POLICY "demo_investors_select"
  ON demo_investors
  FOR SELECT
  USING (is_active = true);

-- No INSERT / UPDATE / DELETE policies for regular (authenticated / anon) users.
-- The service_role key bypasses RLS entirely, so server-side writes continue to work.
