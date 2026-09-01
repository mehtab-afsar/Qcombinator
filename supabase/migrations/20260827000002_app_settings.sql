-- The pre-launch signup gate, made flippable without a deploy.
--
-- The gate itself (lib/auth/signup-access.ts) read two environment variables. That worked, but
-- Vercel bakes env vars into a deployment, so both "open the product" and — far more often —
-- "let one more tester in" required a redeploy. Moving both values to a row means they are
-- edited in Supabase's table editor and take effect on the next request.
--
-- ONE ROW, ENFORCED. `id boolean primary key default true check (id)` permits exactly one row
-- ever: the primary key admits only `true`, and the check rejects `false`. A second row is a
-- constraint violation rather than a silently-ignored second opinion about whether the product
-- is open. Read it with `.maybeSingle()`; no row at all means closed, same as a failed read.
--
-- DEFAULTS ARE CLOSED, and deliberately so: applying this migration must never be the thing that
-- opens signup. The failure worth designing against is "we thought it was gated and it wasn't".
--
-- RLS is enabled with NO policies, which is the point rather than an oversight: a table with RLS
-- on and no policy is readable by nothing except the service role. Founders must not be able to
-- read the allowlist (it is other people's email addresses) and must certainly not be able to
-- write the flag that decides whether the product is open.

create table if not exists app_settings (
  id                boolean primary key default true check (id),
  -- Is signup open to the general public? When true the allowlist stops being consulted.
  signup_open       boolean not null default false,
  -- Comma-separated emails allowed to sign up while closed. Each gets their OWN startup, unlike
  -- a team invite, which puts the person inside the inviter's workspace.
  signup_allowlist  text    not null default '',
  updated_at        timestamptz not null default now()
);

alter table app_settings enable row level security;

comment on table app_settings is
  'Single-row runtime configuration for the pre-launch signup gate (lib/auth/signup-access.ts). Edited by hand in the Supabase table editor; read server-side with the service role only. RLS is on with no policies on purpose — nothing else may read the allowlist or write the flag.';

-- Seed the single row so the table editor has something to edit rather than an empty grid.
-- Closed, with an empty allowlist. Idempotent: re-running changes nothing.
insert into app_settings (id) values (true)
on conflict (id) do nothing;

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop table if exists app_settings;
