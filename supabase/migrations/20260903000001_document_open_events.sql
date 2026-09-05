-- Document/briefing open tracking — the in-app-queryable answer to "did anyone actually open
-- what the Executive produced," which nothing before this could answer. The only prior signal,
-- briefing_opened (lib/analytics-client.ts), is PostHog-only and PostHog has no query-back path
-- anywhere in this codebase (app/admin/metrics is 100% Supabase-table aggregation) — see
-- docs/EDGE_ALPHA_HONEST_AUDIT.md.
--
-- One append-only row per open, not new columns on asset_versions/executive_briefings: both
-- reject UPDATE (asset_versions retires-then-inserts; executive_briefings rejects UPDATE/DELETE
-- outright), and "was this opened" is a repeatable behavioral fact about the founder, not a fact
-- about the document — a document can be opened zero, one, or many times.
--
-- Zero RLS policies, service-role-only, same shape as qscore_lite_lookups /
-- leverage_check_submissions: nothing founder-facing ever reads this table back — only
-- app/api/admin/metrics/route.ts does, via the admin client. Writes come only from
-- app/api/analytics/document-opened (service role), never a browser Supabase client.
--
-- Ships the pg_trigger_depth() > 1 cascade-delete carve-out from day one — see
-- 20260715000010_briefings_allow_cascade_delete.sql for why: executive_briefings' plain
-- append-only trigger initially blocked account deletion (auth.users -> founder_profiles cascade)
-- and needed a follow-up migration to fix. This table cascades on founder_id too; don't repeat
-- that gap.

create table if not exists document_open_events (
  id           uuid primary key default gen_random_uuid(),
  founder_id   uuid not null references founder_profiles(user_id) on delete cascade,

  document_type text not null check (document_type in ('asset_version', 'briefing')),
  -- The specific asset_versions/executive_briefings row opened, not the stable Registry
  -- AssetId, so "did they act on THIS version afterward" stays precise. No FK: the source
  -- table differs by document_type, validated server-side at write time (same "no FK,
  -- validated in app code" pattern asset_versions.asset_id already uses for the Registry).
  document_id  uuid not null,

  -- Denormalized from the underlying row at write time, so aggregation needs no join back.
  asset_id     text,       -- Registry AssetId (e.g. 'AS001') -- set only when document_type = 'asset_version'
  program_id   uuid references programs(id) on delete set null,

  opened_at    timestamptz not null default now()
);

create index if not exists document_open_events_recent
  on document_open_events (opened_at desc);
create index if not exists document_open_events_founder_document
  on document_open_events (founder_id, document_type, document_id);

alter table document_open_events enable row level security;

-- No policies, on purpose (see header). service_role is the only reader/writer; anon/authenticated
-- get nothing.

-- Append-only -- a founder's open history is never edited or pruned, except when it cascades
-- away with their own account (right-to-erasure). See 20260715000010 for why the depth check
-- exists -- a direct UPDATE/DELETE (depth 1) stays forbidden; a cascaded DELETE from the founder
-- row going away (depth > 1) is allowed.

create or replace function document_open_events_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'document_open_events are append-only: % is not permitted', tg_op
    using errcode = 'check_violation';
  return null;
end;
$$;

drop trigger if exists document_open_events_no_mutation on document_open_events;
create trigger document_open_events_no_mutation
  before update or delete on document_open_events
  for each row
  execute function document_open_events_append_only();

comment on table document_open_events is
  'Append-only log of when a founder actually opened a generated Asset version or Briefing. Written only by app/api/analytics/document-opened (service role); read only by app/api/admin/metrics. Exists because PostHog (briefing_opened) has no in-app query-back path.';
comment on column document_open_events.document_id is
  'The specific asset_versions.id or executive_briefings.id opened, not the stable Registry AssetId.';
comment on column document_open_events.asset_id is
  'Denormalized Registry AssetId, set only for document_type = ''asset_version''.';

-- --- Rollback ------------------------------------------------------------------------
--   drop trigger if exists document_open_events_no_mutation on document_open_events;
--   drop function if exists document_open_events_append_only();
--   drop index if exists document_open_events_founder_document;
--   drop index if exists document_open_events_recent;
--   drop table if exists document_open_events;
