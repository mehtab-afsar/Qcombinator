-- S001 — Strategy Sessions. The founder's direction; the root of the mandate.
--
-- The first table of the new Executive model (F07). Everything downstream hangs
-- off it: Strategy (S001) -> Executive Contract (S002) -> the Operating Rhythm
-- runs the contract-active Programs. No strategy, no mandate, nothing runs.
--
-- Versioned, never overwritten. A revision creates a new current version and
-- retains the previous one (PRD §8, Featureinventory F07).

create table if not exists strategy_sessions (
  id          uuid        primary key default gen_random_uuid(),

  -- PRD §8 references founder_profiles(user_id), which is UNIQUE. auth.uid()
  -- returns the same value, so the RLS policies below compare against it directly.
  founder_id  uuid        not null references founder_profiles(user_id) on delete cascade,

  version     int         not null default 1 check (version >= 1),
  is_current  boolean     not null default true,

  -- The founder's direction. Nullable so a half-finished session can be saved
  -- and resumed (F07 edge case: "abandoned mid-session -> save partial").
  -- Completeness is enforced where it matters — F08 blocks Contract generation
  -- on an incomplete Strategy — not by refusing to save someone's draft.
  mission     text,
  priorities  jsonb       not null default '[]',
  goals       jsonb       not null default '[]',

  -- Provenance: which version this supersedes. Null on the first.
  previous_version_id uuid references strategy_sessions(id) on delete set null,

  created_at  timestamptz not null default now()
);

-- ⚠️ THE INTEGRITY GUARANTEE. "Exactly one current version" cannot be enforced in
-- application code: two concurrent requests can both read "no current row" or both
-- flip the old one, and both insert is_current = true. Only the database can make
-- that impossible.
--
-- The same lesson is already recorded in features/qscore/services/agent-signal.ts:
-- "the DB also enforces this via a partial unique index so concurrent requests
-- can't both slip through this SELECT before either INSERT lands."
create unique index if not exists strategy_sessions_one_current_per_founder
  on strategy_sessions (founder_id)
  where is_current;

-- Version numbers are unique per founder — no two v2s, whatever the ordering.
create unique index if not exists strategy_sessions_founder_version
  on strategy_sessions (founder_id, version);

create index if not exists strategy_sessions_founder_idx
  on strategy_sessions (founder_id, created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
--
-- ⚠️ DELIBERATELY NOT COPYING THE HOUSE PATTERN. Four existing tables
-- (scheduled_actions, agent_goals, delegation_tasks, founder_metric_snapshots)
-- pair a founder-scoped policy with:
--
--     create policy "service role full access" on <t> for all
--       using (true) with check (true);      -- no TO clause
--
-- A policy without `TO` applies to PUBLIC — anon and authenticated. Permissive
-- policies are OR'd, so that second policy OVERRIDES the first and every
-- authenticated user can read and write every row. See PHASE0_AUDIT.md §8d.
--
-- There is no service-role policy below because none is needed: Supabase's
-- service_role has BYPASSRLS and never consults policies. The policy those tables
-- carry grants the world access in order to achieve nothing.

alter table strategy_sessions enable row level security;

create policy "strategy_sessions_select_own"
  on strategy_sessions for select
  using (auth.uid() = founder_id);

create policy "strategy_sessions_insert_own"
  on strategy_sessions for insert
  with check (auth.uid() = founder_id);

-- Update is permitted only to retire a version (is_current true -> false).
-- Content is never edited in place: a change is a new row (PRD §8 — versioned,
-- never overwritten). The USING clause scopes the rows a founder may touch; the
-- WITH CHECK clause prevents them writing a row back as current.
create policy "strategy_sessions_retire_own"
  on strategy_sessions for update
  using (auth.uid() = founder_id)
  with check (auth.uid() = founder_id and is_current = false);

-- No DELETE policy. History is never destroyed (CLAUDE.md §4: append-only).

comment on table strategy_sessions is
  'S001 Strategy Session — the founder''s direction. Versioned; exactly one is_current per founder, enforced by a partial unique index. Feeds F08 Executive Contract.';

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: "Migrations additive and reversible; test the rollback."
--
--   drop policy if exists "strategy_sessions_retire_own" on strategy_sessions;
--   drop policy if exists "strategy_sessions_insert_own" on strategy_sessions;
--   drop policy if exists "strategy_sessions_select_own" on strategy_sessions;
--   drop index  if exists strategy_sessions_founder_idx;
--   drop index  if exists strategy_sessions_founder_version;
--   drop index  if exists strategy_sessions_one_current_per_founder;
--   drop table  if exists strategy_sessions;
--
-- Purely additive: this migration creates one new table and touches nothing
-- existing, so the rollback cannot affect the live product.
