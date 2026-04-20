-- Atlas: tracked competitors
create table if not exists tracked_competitors (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  website      text,
  threat_level text not null default 'medium' check (threat_level in ('critical','high','medium','watch')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tracked_competitors_user_id_idx on tracked_competitors(user_id);
alter table tracked_competitors enable row level security;
create policy "owner" on tracked_competitors for all using (auth.uid() = user_id);

-- Harper: hiring candidates
create table if not exists hiring_candidates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null,
  stage      text not null default 'sourcing' check (stage in ('sourcing','screening','interviewing','offer','hired','rejected')),
  score      int check (score between 1 and 5),
  source     text,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists hiring_candidates_user_id_idx on hiring_candidates(user_id);
alter table hiring_candidates enable row level security;
create policy "owner" on hiring_candidates for all using (auth.uid() = user_id);

-- Leo: legal risks
create table if not exists legal_risks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  severity   text not null default 'medium' check (severity in ('critical','high','medium','low')),
  category   text not null default 'General',
  resolved   boolean not null default false,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists legal_risks_user_id_idx on legal_risks(user_id);
alter table legal_risks enable row level security;
create policy "owner" on legal_risks for all using (auth.uid() = user_id);

-- Carter: customer accounts
create table if not exists customer_accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company      text not null,
  contact_name text,
  arr          numeric,
  health       text not null default 'green' check (health in ('green','yellow','red')),
  stage        text not null default 'onboarding' check (stage in ('onboarding','active','at-risk','churned','champion')),
  last_contact date,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists customer_accounts_user_id_idx on customer_accounts(user_id);
alter table customer_accounts enable row level security;
create policy "owner" on customer_accounts for all using (auth.uid() = user_id);

-- Riley: growth experiments
create table if not exists growth_experiments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  hypothesis text not null,
  metric     text,
  channel    text,
  status     text not null default 'backlog' check (status in ('backlog','running','won','killed')),
  result     text,
  created_at timestamptz not null default now()
);
create index if not exists growth_experiments_user_id_idx on growth_experiments(user_id);
alter table growth_experiments enable row level security;
create policy "owner" on growth_experiments for all using (auth.uid() = user_id);

-- Maya: content calendar
create table if not exists content_calendar (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  channel    text not null,
  week       int not null check (week between 1 and 4),
  topic      text not null,
  angle      text,
  status     text not null default 'idea' check (status in ('idea','draft','scheduled','published')),
  created_at timestamptz not null default now()
);
create index if not exists content_calendar_user_id_idx on content_calendar(user_id);
alter table content_calendar enable row level security;
create policy "owner" on content_calendar for all using (auth.uid() = user_id);
