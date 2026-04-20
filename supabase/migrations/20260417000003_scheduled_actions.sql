-- Scheduled Actions — async follow-ups dispatched by agents (Day 3/7/14 sequences).

create table if not exists scheduled_actions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  agent_id    text        not null,
  action_type text        not null,   -- 'send_email_step' | 'vapi_call' | 'followup_check'
  payload     jsonb       not null default '{}',
  execute_at  timestamptz not null,
  status      text        not null default 'pending'
                          check (status in ('pending', 'running', 'done', 'failed')),
  result      jsonb,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists scheduled_actions_execute_at_idx on scheduled_actions (execute_at, status);
create index if not exists scheduled_actions_user_idx       on scheduled_actions (user_id, status);

alter table scheduled_actions enable row level security;

create policy "founders read own scheduled actions"
  on scheduled_actions for select
  using (auth.uid() = user_id);

create policy "service role full access"
  on scheduled_actions for all
  using (true)
  with check (true);
