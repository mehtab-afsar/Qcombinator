-- F10 — Operating Rhythm Engine. One cycle per company per week. Idempotent.
--
-- The weekly loop's record: one row per (founder, cycle_key). Created before any LLM work,
-- so a duplicate trigger fails fast (unique constraint) and costs nothing — "never run the
-- same cycle twice" (US-10.2). The rhythm writes only internal, reversible state (Asset
-- versions + Briefings + this row); no external actions in v1 (those are Story 3).
--
-- This migration also lands the FKs deferred by F11 and F12: asset_versions.execution_id and
-- executive_briefings.execution_id now reference this table (ADR-024/025). Both are
-- nullable-by-design (founder edits have no run), so the FKs permit NULL.
--
-- Idempotent, additive, reversible. Mirrors the Story-2 migration patterns.

create table if not exists operating_rhythm_runs (
  id            uuid        primary key default gen_random_uuid(),
  founder_id    uuid        not null references founder_profiles(user_id) on delete cascade,
  -- The mandate this cycle ran under (epoch stamp; ADR-022). Nullable FK.
  contract_id   uuid        references executive_contracts(id) on delete set null,
  -- 'YYYY-Www' ISO week, e.g. '2026-W29'. The idempotency key with founder_id.
  cycle_key     text        not null,
  status        text        not null default 'running'
                            check (status in ('running', 'completed', 'failed')),
  -- Per-stage status per Program (UC-10 step 5): {"P001": {"assets":"completed","briefing":"completed"}}.
  stages        jsonb       not null default '{}',
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,

  -- THE IDEMPOTENCY GUARANTEE. A second trigger for the same founder + week cannot create a
  -- second run — the insert raises 23505 and the cycle is rejected before any work.
  unique (founder_id, cycle_key)
);

create index if not exists operating_rhythm_runs_founder_recent
  on operating_rhythm_runs (founder_id, started_at desc);

-- ─── RLS — read-only for authenticated; the run is written by the service role ──────

alter table operating_rhythm_runs enable row level security;

drop policy if exists "operating_rhythm_runs_select_own" on operating_rhythm_runs;
create policy "operating_rhythm_runs_select_own"
  on operating_rhythm_runs for select
  using (auth.uid() = founder_id);

-- No insert/update/delete policy for authenticated — the rhythm runs server-side (service role).
-- No permissive using(true) policy. No DELETE policy — a cycle's record is audit history.

-- ─── The deferred execution_id FKs (F11 + F12 land here) ────────────────────────────
-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so drop-then-add for idempotency. Both
-- columns are nullable; the FK permits NULL (founder edits carry no run). on delete set null
-- keeps the Asset/Briefing as history if a run row is ever removed.

alter table asset_versions
  drop constraint if exists asset_versions_execution_fk;
alter table asset_versions
  add constraint asset_versions_execution_fk
  foreign key (execution_id) references operating_rhythm_runs(id) on delete set null;

alter table executive_briefings
  drop constraint if exists executive_briefings_execution_fk;
alter table executive_briefings
  add constraint executive_briefings_execution_fk
  foreign key (execution_id) references operating_rhythm_runs(id) on delete set null;

comment on table operating_rhythm_runs is
  'F10 — one Operating-Rhythm cycle per (founder, cycle_key). Idempotent; fail-fast on a duplicate week. status running|completed|failed, per-stage detail in stages jsonb. Written by the service role; read-only for the founder. Internal/reversible only — no external actions in v1.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter table executive_briefings drop constraint if exists executive_briefings_execution_fk;
--   alter table asset_versions      drop constraint if exists asset_versions_execution_fk;
--   drop policy if exists "operating_rhythm_runs_select_own" on operating_rhythm_runs;
--   drop index if exists operating_rhythm_runs_founder_recent;
--   drop table if exists operating_rhythm_runs;
--
-- Additive: one new table + two FK constraints on existing (empty) columns.
