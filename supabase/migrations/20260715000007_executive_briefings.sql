-- F12 — Executive Briefings. The founder-facing output of each Program run.
--
-- A briefing is a ~5-minute read in the executive's voice: a verdict + a structured body,
-- pointing at what changed and linking to the underlying Assets. Produced during a rhythm
-- cycle (F10, later), one per Program per run. Founders read the latest on the Command View
-- and keep past ones as an operating record (F12 US-12.2).
--
-- ─── Append-only, not versioned ──────────────────────────────────────────────────
-- Unlike asset_versions, briefings are never edited or superseded — a new row each cycle
-- (CLAUDE.md §4: append-only history). So: no version/is_current columns, no RPC, no
-- retire-then-insert. A plain insert, deduped by a unique index, and a trigger that rejects
-- UPDATE and DELETE outright (stricter than asset_versions' retire-only rule).
--
-- ─── Writes are server-side only ─────────────────────────────────────────────────
-- Briefings are written by the rhythm (F10), never by the founder. So the table is
-- read-only for authenticated (a single SELECT-own policy; no write policy → direct writes
-- are RLS-denied) and all writes go through a service-role server path. No function is
-- exposed, so nothing to revoke.
--
-- ─── Idempotent, additive, reversible ────────────────────────────────────────────
-- Mirrors 20260715000006_asset_versions.sql. Rollback at the foot.

create table if not exists executive_briefings (
  id            uuid        primary key default gen_random_uuid(),
  founder_id    uuid        not null references founder_profiles(user_id) on delete cascade,

  -- The program INSTANCE this briefing reports on. on delete set null keeps the briefing as
  -- history if the program row is ever removed (append-only — never cascade-delete a briefing).
  program_id    uuid        references programs(id) on delete set null,

  -- The run that produced this. Caller-supplied; NO foreign key yet — the run table
  -- (operating_rhythm_runs) is built by F10, later. FK deferred to F10's migration.
  execution_id  uuid,

  -- The mandate that governed this cycle (ADR-022: briefings are stamped with the epoch).
  -- The epoch is derived from this immutable contract — single source, no duplicated int.
  -- PRD §8's briefing schema omits this; added here to realise the locked ADR.
  contract_id   uuid        references executive_contracts(id) on delete set null,

  -- The headline judgement (F12 acceptance: "one Briefing per Program run, with a verdict").
  verdict       text        not null,
  -- The structured body (sections, changed-asset refs, etc.). Shape finalised by F10.
  body          jsonb       not null default '{}',
  created_at    timestamptz not null default now()
);

-- One briefing per Program per run (F12 acceptance + CLAUDE.md §4 idempotency). Partial
-- because execution_id is null only for the rare orphaned row; live briefings always carry it.
create unique index if not exists executive_briefings_one_per_run
  on executive_briefings (program_id, execution_id) where execution_id is not null;

-- History reads, newest first.
create index if not exists executive_briefings_founder_recent
  on executive_briefings (founder_id, created_at desc);
create index if not exists executive_briefings_program_recent
  on executive_briefings (program_id, created_at desc);

-- ─── RLS — read-only for authenticated; writes server-side (see header) ────────────

alter table executive_briefings enable row level security;

drop policy if exists "executive_briefings_select_own" on executive_briefings;
create policy "executive_briefings_select_own"
  on executive_briefings for select
  using (auth.uid() = founder_id);

-- No insert/update/delete policy for authenticated → direct writes are RLS-denied. No
-- permissive using(true) policy. No DELETE policy — history is never destroyed.

-- ─── Append-only trigger ───────────────────────────────────────────────────────────
-- A briefing, once written, is never changed or removed — not by a founder, not by a bug,
-- not even by the service role (triggers are not bypassed by BYPASSRLS). Inserts are allowed;
-- UPDATE and DELETE are rejected. Stricter than asset_versions (which permits retirement),
-- because a briefing has no lifecycle — it just happened.

create or replace function executive_briefings_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'executive_briefings are append-only: % is not permitted', tg_op
    using errcode = 'check_violation';
  return null;
end;
$$;

drop trigger if exists executive_briefings_no_mutation on executive_briefings;
create trigger executive_briefings_no_mutation
  before update or delete on executive_briefings
  for each row
  execute function executive_briefings_append_only();

comment on table executive_briefings is
  'F12 — the founder-facing output of each Program run (verdict + body). Append-only, one per Program per run; read-only for authenticated, writes server-side only. Stamped with the governing contract (ADR-022). Generated by the rhythm (F10).';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: additive and reversible.
--
--   drop trigger  if exists executive_briefings_no_mutation on executive_briefings;
--   drop function if exists executive_briefings_append_only();
--   drop policy   if exists "executive_briefings_select_own" on executive_briefings;
--   drop index    if exists executive_briefings_program_recent;
--   drop index    if exists executive_briefings_founder_recent;
--   drop index    if exists executive_briefings_one_per_run;
--   drop table    if exists executive_briefings;
--
-- Purely additive: one new table, nothing existing touched.
