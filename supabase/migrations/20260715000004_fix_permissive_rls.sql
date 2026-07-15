-- SECURITY FIX — four tables have RLS enabled but NOT enforced.
--
-- Any authenticated user can read, update and delete every founder's rows in
-- scheduled_actions, agent_goals, delegation_tasks and founder_metric_snapshots.
-- Exploitable from a browser console with an ordinary account.
--
-- ─── The bug ─────────────────────────────────────────────────────────────────
--
--   create policy "founders read own scheduled actions"
--     on scheduled_actions for select
--     using (auth.uid() = user_id);          -- correct
--
--   create policy "service role full access"
--     on scheduled_actions for all
--     using (true) with check (true);        -- NO `TO` CLAUSE
--
-- A policy with no TO clause defaults to `TO PUBLIC` — anon and authenticated.
-- Postgres **OR**s permissive policies together, so the second policy overrides
-- the first entirely. The founder-scoped rule becomes decoration.
--
-- ─── Why dropping them is the whole fix ──────────────────────────────────────
--
-- These policies exist to give the service role access. It never needed one:
-- Supabase's `service_role` has BYPASSRLS and does not consult policies at all.
-- They grant the world access in order to achieve nothing.
--
-- ─── What was exposed ────────────────────────────────────────────────────────
--
--   founder_metric_snapshots  every founder's MRR, burn, runway (`metrics` jsonb)
--   scheduled_actions         outreach payloads — third-party contacts + email bodies
--   agent_goals               every founder's agent goals
--   delegation_tasks          cross-agent task payloads
--
-- ─── Why a previous fix missed ───────────────────────────────────────────────
--
-- 20260421000008_fix_missing_rls.sql — a migration NAMED "fix missing RLS" —
-- added a correctly scoped `FOR ALL TO service_role` policy to delegation_tasks
-- but never dropped the broken one. Policies are additive and OR'd, so it fixed
-- nothing there. No DROP POLICY for these existed anywhere in 60 migrations.
--
-- Later tables got it right (agent_activity, startup_state, the academy tables
-- all use `FOR ALL TO service_role`). The pattern was learned; the early tables
-- were never revisited.
--
-- Detail: PHASE0_AUDIT.md §8d.

-- ─── Verified safe before dropping ───────────────────────────────────────────
--
-- Every writer to these tables uses the service role, which bypasses RLS and is
-- therefore unaffected:
--   scheduled_actions        schedule/run (admin) · engine/tool-runner (admin)
--   agent_goals              chat (supabaseAdmin) · generate/run (getAdminClient)
--   delegation_tasks         delegation.ts · process-delegation · track-competitor
--   founder_metric_snapshots admin/metrics (explicit SERVICE_ROLE_KEY client)
--
-- No client-side (anon key) code touches any of them. The only user-scoped access
-- is app/api/agents/agent-goals/route.ts, which SELECTs and is covered by
-- "founders read own goals".
--
-- What each table retains after this migration:
--   scheduled_actions         "founders read own scheduled actions" (SELECT own)
--   agent_goals               "founders read own goals" (SELECT own)
--                             + "agent_goals_owner" (ALL, own)
--   delegation_tasks          "delegation_tasks: users manage own rows" (ALL, own)
--                             + "delegation_tasks: service role full access" (TO service_role)
--                             + "founders read own delegation tasks" (SELECT own)
--   founder_metric_snapshots  "Users see own metric snapshots" (SELECT own)

drop policy if exists "service role full access" on scheduled_actions;
drop policy if exists "service role full access" on agent_goals;
drop policy if exists "service role full access" on delegation_tasks;
drop policy if exists "Service role full access" on founder_metric_snapshots;

-- Belt and braces: prove RLS is still ON. Dropping a policy does not disable RLS,
-- but a table with RLS off and no policies is wide open — and that failure would
-- look identical from the outside.
alter table scheduled_actions        enable row level security;
alter table agent_goals              enable row level security;
alter table delegation_tasks         enable row level security;
alter table founder_metric_snapshots enable row level security;

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: "Migrations additive and reversible; test the rollback."
--
-- Reversible, but DO NOT ROLL THIS BACK. Recreating these policies restores a
-- cross-tenant data breach. Recorded for completeness only:
--
--   create policy "service role full access" on scheduled_actions
--     for all using (true) with check (true);
--   ...
--
-- If a legitimate need appears for the service role to have an explicit policy,
-- scope it: `for all TO service_role using (true) with check (true)` — as
-- agent_activity and startup_state already do. Never without the TO clause.
