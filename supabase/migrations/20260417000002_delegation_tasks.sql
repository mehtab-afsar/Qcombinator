-- Delegation Tasks — async typed task handoffs between agents.
-- Replaces text-injection orchestration with real structured payloads.

create table if not exists delegation_tasks (
  id           uuid        primary key default gen_random_uuid(),
  from_agent   text        not null,
  to_agent     text        not null,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  instruction  text        not null,
  payload_type text        not null,
  payload_data jsonb       not null default '{}',
  priority     text        not null default 'background'
                           check (priority in ('immediate', 'background')),
  status       text        not null default 'pending'
                           check (status in ('pending', 'running', 'complete', 'failed', 'expired')),
  result       jsonb,
  error        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  expires_at   timestamptz not null default now() + interval '24 hours'
);

-- Lookup by recipient agent
create index if not exists delegation_tasks_to_agent_idx  on delegation_tasks (to_agent, user_id, status);
create index if not exists delegation_tasks_from_agent_idx on delegation_tasks (from_agent, user_id);
create index if not exists delegation_tasks_expires_idx    on delegation_tasks (expires_at);

alter table delegation_tasks enable row level security;

-- Founders can read their own delegation tasks; service role can write
create policy "founders read own delegation tasks"
  on delegation_tasks for select
  using (auth.uid() = user_id);

create policy "service role full access"
  on delegation_tasks for all
  using (true)
  with check (true);

-- Auto-expire tasks that are still pending after 24h (run periodically via pg_cron or edge function)
-- This is handled at query time via the expires_at gt filter in getPendingDelegations().
