-- A view was reading around RLS. Every founder's Q-Score history was readable by `anon`.
--
-- ⚠️ THIS IS A LIVE PRODUCTION DATA LEAK, NOT A LINT WARNING. Surfaced by the Supabase advisor
-- on 4 Aug 2026 as "Security Definer View" and confirmed by reproducing it against a real
-- database before writing this migration:
--
--   founder A reading qscore_history directly ......... 1 row   ← RLS working
--   founder A reading the SAME data via the view ...... 2 rows  ← RLS bypassed
--   `anon` (signed out) reading via the view .......... EVERY founder's user_id + overall_score
--
-- Cause: a Postgres view executes as its OWNER unless `security_invoker` is set. This view is
-- owned by `postgres`, which also owns `qscore_history` — and **a table's owner bypasses that
-- table's RLS by default**. So the policies on qscore_history were intact and simply never
-- consulted. Both `anon` and `authenticated` hold SELECT on the view, and the anon key ships in
-- the browser bundle, so the exposure needed no account at all: one PostgREST request to
-- /rest/v1/qscore_with_delta returned the lot.
--
-- This is the same shape as the four tables found in July with "RLS enabled but not enforced":
-- every reassuring fact was true — the table has RLS, the policies exist and are correct — and
-- the data was readable anyway. Counting policies proves nothing; what matters is which
-- principal the query actually runs as.
--
-- Application code was never the protection here. app/api/qscore/latest/route.ts filters
-- `.eq('user_id', user.id)`, which is a filter, not a boundary — PostgREST is reachable directly
-- with the same key.

-- ── 1. Make the view run as the caller, so qscore_history's policies apply ──────────────
-- Postgres 15+. Supabase runs 17. The view's SQL is unchanged; only the executing identity is.
alter view public.qscore_with_delta set (security_invoker = on);

comment on view public.qscore_with_delta is
  'Q-Score rows joined to their predecessor for O(1) deltas. security_invoker=on is REQUIRED, not cosmetic: without it the view runs as its owner, which bypasses qscore_history''s RLS and exposed every founder''s score history to anon (fixed 4 Aug 2026). Never recreate this view with CREATE OR REPLACE VIEW without re-setting this option — REPLACE preserves reloptions, but a DROP + CREATE does not.';

-- ── 2. Defence in depth: a signed-out visitor has no business reading score history ─────
-- With security_invoker on, anon already sees zero rows (the SELECT policy requires
-- auth.uid() = user_id, and anon has no auth.uid()). Revoking as well means the leak needs TWO
-- independent mistakes to return, not one. Nothing reads this view unauthenticated:
-- app/api/qscore/latest/route.ts uses a cookie-authenticated client and returns 401 without one.
revoke select on public.qscore_with_delta from anon;

-- authenticated KEEPS its grant — it is scoped to its own rows by RLS, which is the project's
-- standing model (see 20260727000002): grants are not the tenancy boundary, RLS is.

-- ── Rollback ────────────────────────────────────────────────────────────────────────────
-- Restores the leak. Listed for completeness only; do not run it.
--   alter view public.qscore_with_delta set (security_invoker = off);
--   grant select on public.qscore_with_delta to anon;
