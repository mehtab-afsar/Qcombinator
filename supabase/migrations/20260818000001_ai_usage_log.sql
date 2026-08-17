-- Phase 10 Part 1 — the AI Usage / Cost Ledger.
--
-- Nothing tracks token usage or spend anywhere in this product today. `routedCall`'s response
-- type discarded the Anthropic SDK's own `usage.input_tokens`/`output_tokens` before this
-- change (lib/llm/types.ts). This table is what a real call actually costs, tied to which
-- Program/Action/Asset produced it — an admin-facing cost/unit-economics surface, not
-- founder-facing product data.
--
-- Shape follows action_log/team_audit_log: founder-scoped, append-only, read-only for
-- authenticated. Writes are best-effort from lib/llm/router.ts — a logging failure must never
-- break a real LLM call, so there is no foreign-key-driven hard failure path here beyond the
-- ordinary ones Postgres already enforces on insert.

create table if not exists ai_usage_log (
  id                 uuid primary key default gen_random_uuid(),
  founder_id         uuid not null references founder_profiles(user_id) on delete cascade,
  program_id         uuid references programs(id) on delete set null,
  action_id          text,
  asset_id           text,
  -- ON DELETE SET NULL, same reasoning as action_log.execution_id: clearing a failed run must
  -- never destroy cost history.
  execution_id       uuid references operating_rhythm_runs(id) on delete set null,
  model              text not null,
  input_tokens       integer not null,
  output_tokens      integer not null,
  -- null when the model isn't in lib/llm/pricing.ts's table yet — the usage is still real and
  -- worth keeping even before pricing is known for it.
  estimated_cost_usd numeric(10,6),
  latency_ms         integer,
  created_at         timestamptz not null default now()
);

create index if not exists ai_usage_log_founder_recent
  on ai_usage_log (founder_id, created_at desc);
create index if not exists ai_usage_log_program
  on ai_usage_log (program_id, created_at desc)
  where program_id is not null;

alter table ai_usage_log enable row level security;

-- Read-only for authenticated, same as action_log — a founder can see their own usage, but
-- every row is written server-side (service role) from routedCall, never asserted by a client.
drop policy if exists "ai_usage_log_select_own" on ai_usage_log;
create policy "ai_usage_log_select_own"
  on ai_usage_log for select
  to authenticated
  using (auth.uid() = founder_id);

-- ── Append-only ────────────────────────────────────────────────────────────────────
-- Same pg_trigger_depth() carve-out as action_log/team_audit_log, shipped from day one so a
-- founder account deletion cascade is never blocked by this table (the bug executive_briefings
-- needed a follow-up migration to fix — not repeating it a third time).
create or replace function ai_usage_log_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'ai_usage_log is append-only: % is not permitted', tg_op
    using errcode = 'check_violation';
  return null;
end;
$$;

drop trigger if exists ai_usage_log_no_mutation on ai_usage_log;
create trigger ai_usage_log_no_mutation
  before update or delete on ai_usage_log
  for each row
  execute function ai_usage_log_append_only();

comment on table ai_usage_log is
  'Phase 10 Part 1 — append-only ledger of LLM token usage and estimated cost, tied to the Program/Action/Asset that caused the call. Admin-facing cost surface, not founder-facing product data. Written best-effort from lib/llm/router.ts::routedCall when usageContext is supplied.';
comment on column ai_usage_log.estimated_cost_usd is
  'From lib/llm/pricing.ts::estimateCost at write time. Null if the model was not yet in the pricing table — update the table when Anthropic changes prices, this column does not stay in sync automatically.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop trigger  if exists ai_usage_log_no_mutation on ai_usage_log;
--   drop function if exists ai_usage_log_append_only();
--   drop policy   if exists "ai_usage_log_select_own" on ai_usage_log;
--   drop index    if exists ai_usage_log_program;
--   drop index    if exists ai_usage_log_founder_recent;
--   drop table    if exists ai_usage_log;
