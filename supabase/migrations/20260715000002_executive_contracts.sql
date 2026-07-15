-- S002 — Executive Contracts and the Programs they activate.
--
-- The founder's mandate (F08). Generated from their Strategy, confirmed ONCE,
-- and immutable thereafter (ADR-003). A change never edits: it supersedes the
-- old contract and starts a new operating epoch.
--
-- This is what makes the Operating Rhythm legal: only Programs the current
-- contract marks active may run (ADR-008, mandate integrity).

create table if not exists executive_contracts (
  id          uuid        primary key default gen_random_uuid(),
  founder_id  uuid        not null references founder_profiles(user_id) on delete cascade,
  strategy_id uuid        not null references strategy_sessions(id),

  -- ADR-022 — these are NOT the same number.
  --   version : increments on EVERY row, including drafts never confirmed.
  --   epoch   : increments only when a new mandate SUPERSEDES a confirmed one.
  -- draft v1/e1 -> redraft v2/e1 -> confirm v2/e1 -> change -> v3/e2.
  -- The epoch is "what were we operating under, when" (ADR-003's rationale);
  -- the version is bookkeeping. A draft governs nothing, so it burns no epoch.
  epoch       int         not null default 1 check (epoch >= 1),
  version     int         not null default 1 check (version >= 1),

  is_current  boolean     not null default true,
  status      text        not null default 'draft'
                          check (status in ('draft', 'confirmed', 'superseded')),

  priorities        jsonb not null default '[]',
  success_metrics   jsonb not null default '[]',
  responsibilities  jsonb not null default '[]',
  -- Registry Program ids, e.g. ["P001"]. Validated in lib/mandate/contract.ts
  -- against the code Registry before insert — Postgres cannot check it, because
  -- the Registry is TypeScript (ADR-010). This is the seam between a code-based
  -- registry and a database, and this column is where it first bites.
  active_programs   jsonb not null default '[]',

  previous_contract_id uuid references executive_contracts(id) on delete set null,
  confirmed_at         timestamptz,
  created_at           timestamptz not null default now(),

  -- A contract is confirmed if and only if it has a confirmation time. Prevents
  -- the pair drifting apart into a state nobody can interpret later.
  constraint executive_contracts_confirmed_at_matches_status
    check ((status = 'confirmed') = (confirmed_at is not null))
);

-- One current contract per founder. Application code cannot guarantee this:
-- two concurrent requests can both read "no current" and both insert. Same
-- lesson as strategy_sessions and agent-signal.ts.
create unique index if not exists executive_contracts_one_current_per_founder
  on executive_contracts (founder_id) where is_current;

create unique index if not exists executive_contracts_founder_version
  on executive_contracts (founder_id, version);

-- At most ONE confirmed contract per epoch. An epoch is a period the company
-- operated under one mandate; two confirmed contracts in the same epoch would
-- make "what were we operating under, when" unanswerable (ADR-003).
create unique index if not exists executive_contracts_one_confirmed_per_epoch
  on executive_contracts (founder_id, epoch) where status = 'confirmed';

create index if not exists executive_contracts_founder_idx
  on executive_contracts (founder_id, created_at desc);

-- ─── Programs — instances activated by a confirmed contract ───────────────────

create table if not exists programs (
  id            uuid        primary key default gen_random_uuid(),
  contract_id   uuid        not null references executive_contracts(id) on delete cascade,
  -- Denormalised from the contract so RLS can scope without a join.
  founder_id    uuid        not null references founder_profiles(user_id) on delete cascade,

  -- The Registry id ('P001'). Not a foreign key — the Registry is code, not data
  -- (ADR-010). lib/mandate/contract.ts validates it via getProgram() before insert.
  template_id   text        not null,
  owner         text        not null,
  objective     text        not null,
  success_metric text       not null,

  status        text        not null default 'active'
                            check (status in ('active', 'paused', 'complete')),
  created_at    timestamptz not null default now(),

  -- A contract activates a given Program once. Prevents a double-confirm
  -- creating two live copies of P001.
  constraint programs_one_per_contract unique (contract_id, template_id)
);

create index if not exists programs_contract_idx on programs (contract_id, status);
create index if not exists programs_founder_idx  on programs (founder_id, status);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
--
-- Founder-scoped only. NO permissive "service role full access" policy: a policy
-- without a TO clause applies to PUBLIC, and permissive policies are OR'd, so it
-- would override everything below. Four existing tables have exactly that bug —
-- see PHASE0_AUDIT.md §8d. The service role has BYPASSRLS and needs no policy.

alter table executive_contracts enable row level security;
alter table programs            enable row level security;

create policy "executive_contracts_select_own"
  on executive_contracts for select
  using (auth.uid() = founder_id);

create policy "executive_contracts_insert_own"
  on executive_contracts for insert
  with check (auth.uid() = founder_id);

-- ⚠️ THIS IS WHERE IMMUTABILITY IS ENFORCED (ADR-003).
--
-- A contract's CONTENT is never editable — not by a crafted request, not by a
-- bug, not by a future developer who forgets. The only permitted transitions are
-- lifecycle ones, and the WITH CHECK forbids writing a row back to 'draft' or
-- resurrecting a superseded one.
--
-- Postgres cannot compare OLD to NEW inside a policy, so "priorities never
-- change" is additionally enforced by the trigger below. The policy narrows the
-- door; the trigger guards what comes through it.
create policy "executive_contracts_transition_own"
  on executive_contracts for update
  using (auth.uid() = founder_id)
  with check (auth.uid() = founder_id and status in ('confirmed', 'superseded'));

-- No DELETE policy — history is never destroyed (CLAUDE.md §4, ADR-003).

create policy "programs_select_own"
  on programs for select
  using (auth.uid() = founder_id);

create policy "programs_insert_own"
  on programs for insert
  with check (auth.uid() = founder_id);

-- Pausing/completing a Program is a lifecycle change the founder may make.
create policy "programs_update_own"
  on programs for update
  using (auth.uid() = founder_id)
  with check (auth.uid() = founder_id);

-- ─── Immutability trigger ────────────────────────────────────────────────────
--
-- RLS narrows WHO may update and to WHAT status. It cannot say "these columns
-- may never change" — a policy sees only NEW. This does.
--
-- Without it, "contracts are immutable" is a convention that holds until someone
-- writes an UPDATE. ADR-003 is a locked decision; it deserves a lock.

create or replace function executive_contracts_reject_content_edit()
returns trigger
language plpgsql
as $$
begin
  if new.priorities       is distinct from old.priorities
  or new.success_metrics  is distinct from old.success_metrics
  or new.responsibilities is distinct from old.responsibilities
  or new.active_programs  is distinct from old.active_programs
  or new.strategy_id      is distinct from old.strategy_id
  or new.epoch            is distinct from old.epoch
  or new.version          is distinct from old.version
  then
    raise exception
      'executive_contracts are immutable (ADR-003): content cannot be edited in place. Issue a new epoch instead.'
      using errcode = 'check_violation';
  end if;

  -- A confirmed contract may only ever move on to superseded.
  if old.status = 'confirmed' and new.status = 'draft' then
    raise exception 'a confirmed contract cannot return to draft'
      using errcode = 'check_violation';
  end if;
  if old.status = 'superseded' and new.status <> 'superseded' then
    raise exception 'a superseded contract cannot be revived'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger executive_contracts_immutable
  before update on executive_contracts
  for each row
  execute function executive_contracts_reject_content_edit();

-- ─── Confirm: one transaction, or nothing ────────────────────────────────────
--
-- "Confirming activates Programs" is F08's headline acceptance criterion, and it
-- must be atomic. Two sequential client calls cannot be: if the Programs insert
-- fails after the status flips, the founder is left holding a CONFIRMED mandate
-- that activates NOTHING. The Rhythm would then run nothing, every week, in
-- silence — the worst kind of failure, because everything looks fine.
--
-- SECURITY INVOKER (the default, stated for the avoidance of doubt): this runs as
-- the caller, so RLS still applies and a founder cannot confirm someone else's
-- contract. A SECURITY DEFINER here would quietly bypass every policy above.

create or replace function confirm_executive_contract(
  p_contract_id uuid,
  p_programs    jsonb   -- [{"template_id","owner","objective","success_metric"}, ...]
) returns executive_contracts
language plpgsql
security invoker
as $$
declare
  v_contract executive_contracts%rowtype;
  v_program  jsonb;
begin
  -- Lock the row: two concurrent confirms must not both proceed.
  select * into v_contract
    from executive_contracts
    where id = p_contract_id
    for update;

  if not found then
    raise exception 'contract % not found', p_contract_id using errcode = 'no_data_found';
  end if;

  if v_contract.status <> 'draft' then
    raise exception 'only a draft contract can be confirmed (current status: %)', v_contract.status
      using errcode = 'check_violation';
  end if;

  if jsonb_array_length(p_programs) = 0 then
    -- A mandate that activates nothing is not a mandate. Better to refuse than to
    -- leave a founder believing their executive team is at work.
    raise exception 'a contract must activate at least one program'
      using errcode = 'check_violation';
  end if;

  update executive_contracts
     set status = 'confirmed', confirmed_at = now()
   where id = p_contract_id
   returning * into v_contract;

  for v_program in select * from jsonb_array_elements(p_programs)
  loop
    insert into programs (contract_id, founder_id, template_id, owner, objective, success_metric)
    values (
      p_contract_id,
      v_contract.founder_id,
      v_program ->> 'template_id',
      v_program ->> 'owner',
      v_program ->> 'objective',
      v_program ->> 'success_metric'
    );
  end loop;

  return v_contract;
end;
$$;

comment on function confirm_executive_contract is
  'Atomically confirm a draft contract and activate its Programs. Either both happen or neither does — a confirmed contract with no active Programs would make the Rhythm run nothing, silently.';

comment on table executive_contracts is
  'S002 Executive Contract — the founder''s mandate. Immutable (ADR-003): confirmed once, then superseded by a new epoch, never edited. epoch counts confirmed mandates; version counts rows (ADR-022).';

comment on table programs is
  'Program instances activated by a confirmed contract. template_id references the code Registry (ADR-010) and is validated in lib/mandate/contract.ts, not by a foreign key.';

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: "Migrations additive and reversible; test the rollback."
--
--   drop trigger if exists executive_contracts_immutable on executive_contracts;
--   drop function if exists executive_contracts_reject_content_edit();
--   drop policy if exists "programs_update_own" on programs;
--   drop policy if exists "programs_insert_own" on programs;
--   drop policy if exists "programs_select_own" on programs;
--   drop policy if exists "executive_contracts_transition_own" on executive_contracts;
--   drop policy if exists "executive_contracts_insert_own" on executive_contracts;
--   drop policy if exists "executive_contracts_select_own" on executive_contracts;
--   drop table if exists programs;
--   drop table if exists executive_contracts;
--
-- Purely additive: two new tables, nothing existing touched.
