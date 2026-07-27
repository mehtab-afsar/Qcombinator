-- FU-008 — base table privileges for the application roles.
--
-- THE BUG: a database rebuilt from these migrations is unusable. Every request 403s with
-- "permission denied for table X" — old tables and new alike, the whole founder app, not just
-- the new model.
--
-- THE CAUSE: Postgres checks GRANTs *before* RLS. Hosted Supabase creates tables owned by
-- `supabase_admin`, whose default ACL grants the app roles read/write. Our migrations run as
-- `postgres`, whose default ACL grants those roles only Dxtm (truncate/references/trigger/
-- maintain) — no select/insert/update/delete. So every table THIS repo creates is inaccessible
-- until something grants it. Nothing ever did.
--
-- Nobody noticed because local development points .env.local at the hosted project; the gap only
-- appears on a database actually built from these files. That is exactly what CI needs (FU-003),
-- which is why this blocks giving CI a database, which blocks Story 3.
--
-- ⚠️ GRANTS ARE NOT THE TENANCY BOUNDARY — RLS IS. Postgres checks the grant first, then the
-- row policy. That is the standard Supabase model and it is safe *only while every table has RLS
-- enabled*. `qscore_history_dedup_audit` did not, so a blanket grant would have exposed every
-- founder's user_id and score history to any logged-in user. It is fixed below, and
-- __tests__/rls-policies.test.ts now fails if any public table is left without RLS.
--
-- Idempotent and safe to run against production, where these grants already exist (a no-op).

-- ── 1. Close the one table that a blanket grant would have exposed ────────────────────
-- A pure audit artifact of the 20260715000005 dedup: no app code reads it, and it holds
-- per-founder score rows. RLS on with NO policies = only service_role (which bypasses RLS)
-- can see it. That is the intended reach.
alter table if exists qscore_history_dedup_audit enable row level security;

comment on table qscore_history_dedup_audit is
  'Audit trail for the 20260715000005 Q-Score dedup. RLS enabled with NO policies on purpose: service_role bypasses RLS, and nothing else may read it (it contains per-founder score rows).';

-- ── 2. Grant the application roles what they need on everything that exists ───────────
-- service_role is the trusted server identity and bypasses RLS by design.
grant select, insert, update, delete on all tables    in schema public to service_role;
grant usage,  select                 on all sequences in schema public to service_role;

-- authenticated is scoped to its own rows BY RLS, not by withholding the grant.
grant select, insert, update, delete on all tables    in schema public to authenticated;
grant usage,  select                 on all sequences in schema public to authenticated;

-- anon gets READ ONLY. Some tables intentionally expose public rows to signed-out visitors
-- (academy_workshops/mentors/programs carry `for select to anon` policies) — and a policy
-- without a base grant can never take effect. No write privilege: a signed-out visitor has no
-- business writing anywhere, and RLS should not be the only thing standing between them and a
-- table.
grant select on all tables in schema public to anon;

-- ── 3. Make it stick for tables added later ──────────────────────────────────────────
-- Without this, the very next migration re-creates the problem for its own new table and the
-- next person rediscovers it the hard way.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role, authenticated;
alter default privileges for role postgres in schema public
  grant select on tables to anon;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role, authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
-- ⚠️ Rolling this back makes a locally-built database unusable again. It does NOT re-open a
-- tenancy hole (RLS is untouched), it simply removes access.
--   alter default privileges for role postgres in schema public
--     revoke select, insert, update, delete on tables from service_role, authenticated;
--   alter default privileges for role postgres in schema public revoke select on tables from anon;
--   alter default privileges for role postgres in schema public
--     revoke usage, select on sequences from service_role, authenticated;
--   revoke select, insert, update, delete on all tables in schema public from authenticated;
--   revoke select on all tables in schema public from anon;
--   -- (service_role grants are deliberately NOT listed: revoking them breaks every server path.)
--   alter table if exists qscore_history_dedup_audit disable row level security;
