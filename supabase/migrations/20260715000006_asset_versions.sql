-- F11 — Asset Persistence & Versioning. The company's versioned memory.
--
-- Each Management Asset (AS001 ICP Profiles, …) is stored as an immutable version.
-- A Program run writes a new version; the founder can edit directly (ADR-007), which
-- also creates a new current version — no approval, no review (ADR-006). Nothing here
-- touches the Q-Score (ADR-005). Behind FF_NEW_EXECUTIVE_MODEL.
--
-- Follows the Story 1 patterns exactly (20260715000001 / …02): a partial unique index
-- makes "exactly one current" a DATABASE guarantee, an immutability trigger makes a
-- written version un-editable, and the write happens inside one transaction.
--
-- ─── Why writes are server-side only ─────────────────────────────────────────────
-- The persistence validation gate (Registry checks: asset exists, belongs to the
-- correct Program/Executive, structure) is TypeScript — the Registry is code, not data
-- (ADR-010), so those checks CANNOT live in the database. Therefore the write must not
-- be reachable without going through the gate. Two doors are closed below: the RPC is
-- revoked from authenticated (it is a PostgREST endpoint by default), and there is NO
-- authenticated insert/update policy (a direct POST would skip the gate too). All writes
-- flow route → verifyAuth → gate → service-role client → persist_asset_version().
--
-- ─── Idempotent, additive, reversible ────────────────────────────────────────────
-- Re-running is safe (IF NOT EXISTS / DROP … IF EXISTS). Rollback at the foot.

create table if not exists asset_versions (
  id                   uuid        primary key default gen_random_uuid(),
  founder_id           uuid        not null references founder_profiles(user_id) on delete cascade,

  -- Registry AssetId ('AS001'). NOT a foreign key — the Registry is code (ADR-010);
  -- validated in lib/assets/validation.ts via getAsset() before the write.
  asset_id             text        not null,

  -- The program INSTANCE (programs table row) that produced this. Null for founder edits.
  program_id           uuid        references programs(id) on delete set null,

  -- The run that produced this. Caller-supplied; NO foreign key yet — the run table
  -- (operating_rhythm_runs) is built by F10, later. The FK is deferred to F10's
  -- migration; presence is enforced by the CHECK below and uniqueness by the index.
  execution_id         uuid,

  version              int         not null check (version >= 1),
  is_current           boolean     not null default true,

  -- jsonb per PRD §8. markdown assets store a JSON string, json assets an object;
  -- consumers read getAsset(id).outputSchema to interpret.
  content              jsonb       not null,

  -- Provenance (PRD §8).
  registry_version     text,
  executive_id         text,       -- owning ExecutiveId, derived via getProgram(asset.program).owner
  authored_by          text        not null default 'program'
                                   check (authored_by in ('program', 'founder')),
  previous_version_id  uuid        references asset_versions(id) on delete set null,
  source_refs          jsonb       not null default '[]',
  update_reason        text,
  created_at           timestamptz not null default now(),

  -- "Valid execution reference" as a DATABASE invariant: a program-authored version HAS
  -- a run; a founder edit does NOT. Mirrors executive_contracts' confirmed_at<->status
  -- biconditional. This makes F11's step-2 "valid execution reference" un-forgeable.
  constraint asset_versions_execution_matches_author
    check ((authored_by = 'founder') = (execution_id is null))
);

-- (a) EXACTLY ONE current per (founder, asset). App code cannot guarantee this — two
--     concurrent writes can both read "no current" and both insert. Only the DB can.
create unique index if not exists asset_versions_one_current_per_asset
  on asset_versions (founder_id, asset_id) where is_current;

-- (b) Sequential, no duplicate version numbers per (founder, asset).
create unique index if not exists asset_versions_founder_asset_version
  on asset_versions (founder_id, asset_id, version);

-- (c) "Not already persisted for THIS execution" (F11 edge case). Only program-authored
--     rows carry an execution_id, so the partial predicate scopes it to them.
create unique index if not exists asset_versions_one_per_execution
  on asset_versions (asset_id, execution_id) where execution_id is not null;

-- (d) History reads, newest first.
create index if not exists asset_versions_history
  on asset_versions (founder_id, asset_id, version desc);

-- ─── RLS — read-only for authenticated; writes are server-side (see header) ───────

alter table asset_versions enable row level security;

drop policy if exists "asset_versions_select_own" on asset_versions;
create policy "asset_versions_select_own"
  on asset_versions for select
  using (auth.uid() = founder_id);

-- No insert/update/delete policy for authenticated: direct writes are RLS-denied, so the
-- validation gate cannot be bypassed. No permissive using(true) policy. No DELETE policy —
-- history is never destroyed (CLAUDE.md §4); "restore" is a NEW version.

-- ─── Immutability trigger ────────────────────────────────────────────────────────
-- A version, once written, is immutable except for retirement (is_current true -> false).
-- RLS narrows who may act; only a trigger can say "these columns may never change" (a
-- policy sees NEW, not OLD). Mirrors executive_contracts_reject_content_edit (ADR-003).

create or replace function asset_versions_reject_content_edit()
returns trigger
language plpgsql
as $$
begin
  if new.content            is distinct from old.content
  or new.asset_id           is distinct from old.asset_id
  or new.program_id         is distinct from old.program_id
  or new.execution_id       is distinct from old.execution_id
  or new.executive_id       is distinct from old.executive_id
  or new.authored_by        is distinct from old.authored_by
  or new.version            is distinct from old.version
  or new.founder_id         is distinct from old.founder_id
  or new.source_refs        is distinct from old.source_refs
  or new.previous_version_id is distinct from old.previous_version_id
  then
    raise exception
      'asset_versions are immutable: a version''s content cannot be edited in place. Write a new version instead.'
      using errcode = 'check_violation';
  end if;

  -- The only permitted transition is retirement. A retired version cannot be revived
  -- (that would create two currents by another path); "restore" writes a new row.
  if old.is_current = false and new.is_current = true then
    raise exception 'a retired asset version cannot be made current again; restore creates a new version'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists asset_versions_immutable on asset_versions;
create trigger asset_versions_immutable
  before update on asset_versions
  for each row
  execute function asset_versions_reject_content_edit();

-- ─── Atomic write: retire current + insert new, in one transaction ────────────────
-- "A crash mid-way must not leave an Asset with zero current versions or two." App-level
-- retire-then-insert (as strategy_sessions does) has a crash window that can leave zero
-- current. This function closes it: both the retire and the insert commit, or neither.
--
-- The Registry validation gate runs in TypeScript BEFORE this is called (ADR-010). This
-- function owns only the DB-enforceable invariants: one-current, sequential version,
-- dedupe, immutability — all of which hold regardless of caller.

create or replace function persist_asset_version(
  p_founder_id       uuid,
  p_asset_id         text,
  p_program_id       uuid,
  p_execution_id     uuid,
  p_content          jsonb,
  p_authored_by      text,
  p_executive_id     text,
  p_registry_version text,
  p_source_refs      jsonb,
  p_update_reason    text
) returns asset_versions
language plpgsql
security invoker
as $$
declare
  v_current asset_versions%rowtype;
  v_new     asset_versions%rowtype;
begin
  -- Lock the current row (if any) so two concurrent writes serialise here. On the very
  -- first version there is nothing to lock and the unique indexes are the backstop.
  select * into v_current
    from asset_versions
    where founder_id = p_founder_id and asset_id = p_asset_id and is_current
    for update;

  if found then
    update asset_versions set is_current = false where id = v_current.id;
  end if;

  insert into asset_versions (
    founder_id, asset_id, program_id, execution_id, version, is_current, content,
    registry_version, executive_id, authored_by, previous_version_id, source_refs, update_reason
  ) values (
    p_founder_id, p_asset_id, p_program_id, p_execution_id,
    coalesce(v_current.version, 0) + 1, true, p_content,
    p_registry_version, p_executive_id, p_authored_by, v_current.id,
    coalesce(p_source_refs, '[]'::jsonb), p_update_reason
  )
  returning * into v_new;

  return v_new;
end;
$$;

comment on function persist_asset_version is
  'Atomically retire the current asset version and insert a new one. Server-side only (revoked from authenticated) so the lib/assets validation gate cannot be bypassed. Owns the DB invariants (one-current, sequential, dedupe); the Registry checks run in TypeScript before this is called.';

-- Server-side only. Without this it is a public PostgREST endpoint that skips the gate.
revoke execute on function persist_asset_version(
  uuid, text, uuid, uuid, jsonb, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function persist_asset_version(
  uuid, text, uuid, uuid, jsonb, text, text, text, jsonb, text
) to service_role;

comment on table asset_versions is
  'F11 — versioned Management Asset store (company memory). Immutable versions; exactly one is_current per (founder, asset), enforced by a partial unique index. Read-only for authenticated; all writes go through persist_asset_version via a server-side validation gate. authored_by program|founder (ADR-007).';

-- ─── Rollback ────────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: additive and reversible.
--
--   drop function if exists persist_asset_version(uuid,text,uuid,uuid,jsonb,text,text,text,jsonb,text);
--   drop trigger  if exists asset_versions_immutable on asset_versions;
--   drop function if exists asset_versions_reject_content_edit();
--   drop policy   if exists "asset_versions_select_own" on asset_versions;
--   drop index    if exists asset_versions_history;
--   drop index    if exists asset_versions_one_per_execution;
--   drop index    if exists asset_versions_founder_asset_version;
--   drop index    if exists asset_versions_one_current_per_asset;
--   drop table    if exists asset_versions;
--
-- Purely additive: one new table + one function, nothing existing touched.
