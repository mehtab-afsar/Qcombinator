-- SECURITY FIX — demo_investors is readable by anyone, including anonymous callers.
--
-- Real investor PII (name, firm, thesis, check sizes, AUM-adjacent fields, geography)
-- is synced into this table on every investor onboarding and every profile edit
-- (app/api/investor/onboarding/route.ts:86-101, :112-124). The table's only RLS
-- policy has no TO clause, so it is queryable directly via PostgREST by anyone
-- holding the public anon key — no session required, Next.js entirely bypassed.
--
-- ─── The bug ─────────────────────────────────────────────────────────────────
--
--   create policy "demo_investors_select"
--     on demo_investors for select
--     using (is_active = true);          -- NO `TO` CLAUSE
--
-- A policy with no TO clause defaults to `TO PUBLIC` — anon and authenticated.
-- Introduced in 20260508000001_demo_investors_rls.sql, which *tightened* an
-- even more permissive prior policy but never scoped the role.
--
-- The app-layer fix in app/api/investors/route.ts (S-2, gated behind verifyAuth)
-- only protects that one Next.js route. It does not change this policy, so the
-- underlying table has remained fully exposed to direct Supabase access the
-- entire time. This is the same bug class fixed for scheduled_actions,
-- agent_goals, delegation_tasks, and founder_metric_snapshots in
-- 20260715000004_fix_permissive_rls.sql — never applied here.
--
-- Detail: docs/INVESTOR_AUDIT.md §2, finding C-1.
--
-- ─── Verified safe before tightening ─────────────────────────────────────────
--
-- Every reader of demo_investors requires an authenticated session already:
--   app/api/investors/route.ts            verifyAuth() gate (service-role client)
--   app/api/matching/scores/route.ts      authenticated founder matching flow
--   app/founder/messages/page.tsx         client-side read, behind founder auth
--   features/investor/.../investor-settings.service.ts  investor's own settings
-- No anonymous/public page reads this table. Scoping SELECT to `authenticated`
-- breaks nothing.
--
-- Every writer uses the service role (createAdminClient / getAdminClient), which
-- bypasses RLS entirely and is therefore unaffected by this change:
--   app/api/investor/onboarding/route.ts
--   app/api/admin/embed-investors/route.ts

drop policy if exists "demo_investors_select" on demo_investors;

create policy "demo_investors_select"
  on demo_investors
  for select
  to authenticated
  using (is_active = true);

-- Belt and braces: prove RLS is still ON.
alter table demo_investors enable row level security;

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: "Migrations additive and reversible; test the rollback."
--
-- Reversible, but DO NOT ROLL THIS BACK. Recreating the unscoped policy restores
-- public exposure of real investor PII. Recorded for completeness only:
--
--   create policy "demo_investors_select" on demo_investors
--     for select using (is_active = true);
