-- Fix: "infinite recursion detected in policy for relation startup_members" (Postgres 42P17).
--
-- All three RLS policies on startup_members (20260607000001_team_management.sql) query
-- startup_members from inside their own USING/WITH CHECK clause. Postgres has to apply
-- RLS to that inner query too — which re-enters the same policy — which queries the
-- table again — forever. Confirmed live: every GET to
-- /rest/v1/startup_members?select=*&startup_id=eq.<id> 500s with this exact error.
--
-- Standard fix (this is Supabase's own documented pattern for self-referencing RLS):
-- move the "does this user belong to / administer / own this startup" lookup into a
-- SECURITY DEFINER function. A SECURITY DEFINER function runs as its owner (the
-- migration role, which is not subject to RLS), so the lookup inside it does not
-- re-trigger the policy that calls it — breaking the recursion. SET search_path is
-- required on SECURITY DEFINER functions (search-path hijacking otherwise).

CREATE OR REPLACE FUNCTION public.user_startup_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT startup_id FROM startup_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_startup_admin(p_startup_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM startup_members
    WHERE startup_id = p_startup_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_startup_owner(p_startup_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM startup_members
    WHERE startup_id = p_startup_id AND user_id = auth.uid() AND role = 'owner'
  )
$$;

DROP POLICY IF EXISTS "members can read their workspace members" ON startup_members;
CREATE POLICY "members can read their workspace members"
  ON startup_members FOR SELECT
  USING (startup_id IN (SELECT public.user_startup_ids()));

DROP POLICY IF EXISTS "owner or admin can add members" ON startup_members;
CREATE POLICY "owner or admin can add members"
  ON startup_members FOR INSERT
  WITH CHECK (public.is_startup_admin(startup_id));

DROP POLICY IF EXISTS "owner can remove members" ON startup_members;
CREATE POLICY "owner can remove members"
  ON startup_members FOR DELETE
  USING (public.is_startup_owner(startup_id) OR user_id = auth.uid());
