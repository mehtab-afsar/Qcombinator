-- Founder-pulled real data — the cache that lets a founder-triggered pull reach an Action's
-- Company Context without ever calling a Connector live from inside a Rhythm cycle step.
--
-- Gmail-read and PostHog are built, working Connectors that no Action has ever used. Wiring them
-- in autonomously (a cycle calling them on its own, unattended) would reopen the "no autonomous
-- external signal" decision those connectors' own code deliberately deferred — not decided here.
-- A founder-triggered pull respects that boundary: the founder clicks, a route calls the
-- Connector's on-demand function ONCE, and the result lands here. `lib/rhythm/run.ts`'s per-step
-- loop only ever does a passive read of THIS table (same shape as `founder_contacts` and Stripe's
-- `getStripeMetricsContext` in lib/connectors/context.ts) — it never talks to a Connector itself,
-- so ADR-026's "no Connectors inside a cycle" is untouched.
--
-- One row per (founder, action) — last-pull-wins, a CACHE, not an audit log. `action_log` already
-- owns history; this table only answers "what does this action currently know," nothing more.

create table if not exists founder_pulled_data (
  id         uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  action_id  text not null,
  provider   text not null,
  query      text,
  content    text not null,
  pulled_at  timestamptz not null default now()
);

-- Upsert target: a second pull for the same action replaces the first, it doesn't accumulate.
create unique index if not exists founder_pulled_data_founder_action_idx
  on founder_pulled_data (founder_id, action_id);

create index if not exists founder_pulled_data_founder_recent
  on founder_pulled_data (founder_id, pulled_at desc);

alter table founder_pulled_data enable row level security;

drop policy if exists "founder_pulled_data_own" on founder_pulled_data;
create policy "founder_pulled_data_own"
  on founder_pulled_data for all
  to authenticated
  using (auth.uid() = founder_id)
  with check (auth.uid() = founder_id);

comment on table founder_pulled_data is
  'A founder-triggered cache of real Connector data (Gmail-read, PostHog) for a specific Action — never fetched automatically. lib/rhythm/run.ts reads this table passively; only app/api/actions/[actionId]/pull-data/route.ts ever calls a Connector to fill it.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop policy if exists "founder_pulled_data_own" on founder_pulled_data;
--   drop index   if exists founder_pulled_data_founder_recent;
--   drop index   if exists founder_pulled_data_founder_action_idx;
--   drop table   if exists founder_pulled_data;
