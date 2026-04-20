-- Agent Goals — one persistent goal row per agent per founder.
-- Evaluated daily by the proactive engine; status reflects world model state.

create table if not exists agent_goals (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  agent_id         text        not null,
  goal             text        not null,
  success_condition text       not null,
  priority         text        not null check (priority in ('critical', 'high', 'medium', 'low')),
  status           text        not null default 'blocked'
                               check (status in ('on_track', 'at_risk', 'blocked', 'achieved')),
  reason           text        not null default '',
  suggested_action text,
  last_evaluated   timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  unique (user_id, agent_id)
);

create index if not exists agent_goals_user_id_idx on agent_goals (user_id);
create index if not exists agent_goals_status_idx  on agent_goals (status);

alter table agent_goals enable row level security;

-- Founders can read their own goals; service role can write
create policy "founders read own goals"
  on agent_goals for select
  using (auth.uid() = user_id);

create policy "service role full access"
  on agent_goals for all
  using (true)
  with check (true);
