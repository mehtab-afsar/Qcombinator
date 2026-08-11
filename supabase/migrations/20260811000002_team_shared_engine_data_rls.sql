-- Team Management, Phase 2 — the actual product becomes visible to a shared team.
--
-- executive_contracts / asset_versions / operating_rhythm_runs / action_log / qscore_history /
-- executive_briefings are all scoped to a single individual (`founder_id`/`user_id` =
-- auth.uid()) with no awareness of startup_members at all. A teammate who joins a startup
-- today sees none of the Mandate, Assets, Rhythm runs, Actions, Q-Score, or Briefings —
-- every read is gated on their own empty founder_id slot, not their team's.
--
-- (executive_briefings was found while wiring app/api/executive/[executiveId]/chat/route.ts,
-- which reads it directly — not one of the 5 tables originally scoped; same founder_id-only
-- pattern, so it gets the same fix here rather than shipping a route that silently returns
-- zero briefings for every teammate but the owner.)
--
-- Deliberately NOT adding a startup_id column + backfill to these tables. Every row's
-- founder_id already anchors to one identity (startups.owner_user_id); every teammate
-- already links to the same startup via their own founder_profiles.startup_id. So this is
-- a SELECT-policy widening + one resolver function, not a schema migration.
--
-- The naive version of that widening is wrong in a way that fails silently:
--   using (founder_id in (
--     select user_id from founder_profiles
--     where startup_id = (select startup_id from founder_profiles where user_id = auth.uid())
--   ))
-- founder_profiles SELECT RLS is `auth.uid() = user_id` only (20260700000001, line ~187) — the
-- inner subquery is itself subject to that policy, so it only ever returns the caller's own
-- row. The "widened" policy collapses back to exactly `founder_id = auth.uid()`. Every
-- owner-testing-their-own-account check passes; the actual goal (teammate sees shared data)
-- silently fails. Same class of bug as 20260806000001_fix_startup_members_rls_recursion.sql —
-- same fix: a SECURITY DEFINER function, which runs as its owner and is not subject to RLS.

CREATE OR REPLACE FUNCTION public.team_founder_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT fp.user_id
  FROM founder_profiles fp
  WHERE fp.startup_id = (SELECT startup_id FROM founder_profiles WHERE user_id = auth.uid())
    AND fp.startup_id IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.team_founder_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_founder_ids() TO authenticated;

-- Only SELECT widens. INSERT/UPDATE policies are untouched — every RLS-gated write stays
-- scoped to auth.uid() = founder_id exactly as today; write-side team gating is an
-- application-level check (Phase 3), not an RLS change (see lib/team/founder-permissions.ts).

DROP POLICY IF EXISTS "executive_contracts_select_own" ON executive_contracts;
CREATE POLICY "executive_contracts_select_own"
  ON executive_contracts FOR SELECT
  USING (founder_id IN (SELECT public.team_founder_ids()));

DROP POLICY IF EXISTS "asset_versions_select_own" ON asset_versions;
CREATE POLICY "asset_versions_select_own"
  ON asset_versions FOR SELECT
  USING (founder_id IN (SELECT public.team_founder_ids()));

DROP POLICY IF EXISTS "operating_rhythm_runs_select_own" ON operating_rhythm_runs;
CREATE POLICY "operating_rhythm_runs_select_own"
  ON operating_rhythm_runs FOR SELECT
  USING (founder_id IN (SELECT public.team_founder_ids()));

DROP POLICY IF EXISTS "action_log_select_own" ON action_log;
CREATE POLICY "action_log_select_own"
  ON action_log FOR SELECT
  TO authenticated
  USING (founder_id IN (SELECT public.team_founder_ids()));

-- qscore_history uses `user_id`, not `founder_id` — same idea, same function.
DROP POLICY IF EXISTS "Users can view own qscore history" ON qscore_history;
CREATE POLICY "Users can view own qscore history"
  ON qscore_history FOR SELECT
  USING (user_id IN (SELECT public.team_founder_ids()));

DROP POLICY IF EXISTS "executive_briefings_select_own" ON executive_briefings;
CREATE POLICY "executive_briefings_select_own"
  ON executive_briefings FOR SELECT
  USING (founder_id IN (SELECT public.team_founder_ids()));

-- Deliberately EXCLUDED from this migration: agent_conversations (user_id-scoped, per-person
-- AI advisory chat history). The settings page's own "What's private" copy promises this stays
-- personal — this migration keeps that true by not touching it.
