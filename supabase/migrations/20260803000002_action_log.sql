-- F14 — the immutable audit of every Action attempt, including the ones that were DENIED.
--
-- CLAUDE.md §3: "Irreversible actions require approval at the Connector boundary. Log every
-- attempt to action_log." §4: "Append-only history — never mutate; insert."
--
-- ⚠️ METADATA, NOT CONTENT — the one place this table deliberately departs from the PRD.
-- EDGE_ALPHA_PRD.md gives a `request jsonb` column, which invites storing the recipient address
-- and the email body. CLAUDE.md §3 forbids PII in logs. Both cannot be honoured literally, so
-- `request` holds recipient COUNT and DOMAIN, subject LENGTH, and the ids — never the body,
-- never an address. See F13_F14_DESIGN.md §4.
--
-- `payload_hash` is what keeps the audit meaningful without retaining what was sent: it proves
-- WHICH payload was approved and WHICH was executed, so a mismatch is provable after the fact
-- from the hash alone. An audit trail answers "did we send, to how many, when, under whose
-- approval" — none of which needs the prose. Storing bodies would make this table the largest
-- PII store in the product and right-to-erasure harder than it needs to be.
--
-- Design: F13_F14_DESIGN.md §4. Additive, idempotent, reversible.

create table if not exists action_log (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founder_profiles(user_id) on delete cascade,
  program_id    uuid references programs(id),
  -- The rhythm run that generated this Action, if any. ON DELETE SET NULL so clearing a failed
  -- run (B5's retry path) never destroys audit history.
  execution_id  uuid references operating_rhythm_runs(id) on delete set null,
  action_id     text not null,
  provider      text,
  -- As resolved AT THE TIME. Recorded rather than re-derived: if a Registry entry changes later,
  -- the log must still say what the gate believed when it decided.
  irreversible  boolean not null,
  status        text not null
                check (status in ('pending_approval','approved','executed','failed','declined','unknown')),
  -- sha256 of the canonical payload. Approval binds to THIS, not to a row id, so an approval
  -- cannot be replayed against a payload the founder never saw.
  payload_hash  text,
  request       jsonb not null default '{}'::jsonb,
  result        jsonb,
  approved_by   text,
  approved_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Idempotency, following the established shape (asset_versions(asset_id, execution_id),
-- executive_briefings(program_id, execution_id)) rather than inventing a lock: the SECOND
-- execution of the same action in the same run gets a clean 23505, which the application
-- converts to a typed AlreadyExecutedError and reports as success-already-done.
-- This is what makes a double-clicked approval safe.
create unique index if not exists action_log_one_execution
  on action_log (action_id, execution_id)
  where status = 'executed' and execution_id is not null;

create index if not exists action_log_founder_recent
  on action_log (founder_id, created_at desc);
-- The founder-facing queue: what is waiting on them right now.
create index if not exists action_log_pending
  on action_log (founder_id, created_at desc)
  where status = 'pending_approval';

alter table action_log enable row level security;

-- Read-only for authenticated. A founder must never be able to write their own audit trail —
-- an approval is recorded by the server after checking it, not asserted by the client.
drop policy if exists "action_log_select_own" on action_log;
create policy "action_log_select_own"
  on action_log for select
  to authenticated
  using (auth.uid() = founder_id);

-- ── Append-only ────────────────────────────────────────────────────────────────────
-- Shipping WITH the pg_trigger_depth() carve-out from day one. executive_briefings needed a
-- follow-up migration (20260715000010) to add it, because the append-only trigger blocked the
-- auth.users → founder_profiles → executive_briefings cascade — so a founder with any history
-- could never delete their account (right-to-erasure). The guarantee wanted is "nobody edits or
-- prunes history", NOT "records outlive the founder". Not repeating that bug here.
--
-- Consequence, by design: a status change APPENDS a new row rather than updating one. A send is
-- a sequence of rows sharing a payload_hash, not one row edited four times.
create or replace function action_log_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    -- Cascaded from the founder's deletion (account erasure) — allowed.
    return old;
  end if;
  raise exception 'action_log is append-only: % is not permitted', tg_op
    using errcode = 'check_violation';
  return null;
end;
$$;

drop trigger if exists action_log_no_mutation on action_log;
create trigger action_log_no_mutation
  before update or delete on action_log
  for each row
  execute function action_log_append_only();

comment on table action_log is
  'F14 — append-only audit of every Action attempt, including denials and failures. METADATA ONLY: request holds recipient count/domain and subject length, never the body or an address (F13_F14_DESIGN.md §4). payload_hash binds an approval to an exact payload. Read-only for authenticated; writes server-side.';
comment on column action_log.payload_hash is
  'sha256 of the canonical payload. Execution recomputes and compares — a mismatch means the payload changed after approval and must be refused.';
comment on column action_log.status is
  'unknown = a send whose outcome we genuinely could not determine (e.g. an ambiguous timeout awaiting reconciliation). Recording failed when we do not know would be a lie the log carries forever.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop trigger  if exists action_log_no_mutation on action_log;
--   drop function if exists action_log_append_only();
--   drop policy   if exists "action_log_select_own" on action_log;
--   drop index    if exists action_log_pending;
--   drop index    if exists action_log_founder_recent;
--   drop index    if exists action_log_one_execution;
--   drop table    if exists action_log;
