-- Replies to outreach this product itself sent — the record of a detected reply, and the cursor
-- that keeps detection cheap.
--
-- WHY THIS EXISTS: the executive team drafts and (on the founder's approval) sends outreach, and
-- then nothing comes back. The chain dies at "sent". This is the first half of closing it: the
-- product notices a reply and can tell the founder about it. What it does with that is one
-- existing Action, run on a founder's click.
--
-- ⚠️ THIS IS NOT THE OUTCOME LOOP (ADR-009 / F15). No lib/outcomes/, no outcomes table, no
-- POST /api/outcomes, no outcome→score mapping. A row here feeds the founder's attention and one
-- Action's Company Context. It is never aggregated, never scored, and the Q-Score does not move
-- from anything in this table (ADR-005). __tests__/score-invariant.test.ts and the ADR guard test
-- are what keep that true.
--
-- ⚠️ WRITTEN ONLY BY lib/signals/outreach-replies.ts, reachable only from a founder-initiated
-- request — never a cron, never a Rhythm cycle step (ADR-026). lib/signals/context.ts does a
-- PASSIVE READ of this table into Company Context, the same shape founder_pulled_data
-- (20260826000003) and lib/connectors/context.ts already use. Nothing in lib/rhythm/** calls a
-- Connector, and lib/rhythm/delta.ts stays free of any reference to this — a signal there would
-- flip hasNewInput and make a reply CAUSE regeneration, which is ADR-028's decided territory.
--
-- ⚠️ CONTENT DISCIPLINE. reply_from_domain is a DOMAIN, never an address (CLAUDE.md §3).
-- reply_excerpt is Gmail's own short snippet, capped, never a body — the same category of content
-- founder_pulled_data.content already holds, in a table with the same founder scoping and the
-- same erasure cascade.
--
-- Additive, idempotent, reversible.

create table if not exists outreach_reply_signals (
  id                 uuid primary key default gen_random_uuid(),
  founder_id         uuid not null references founder_profiles(user_id) on delete cascade,
  -- The send this replies to. Cascades with the founder's erasure; the pg_trigger_depth()
  -- carve-out on the append-only trigger below is what lets that cascade through.
  sent_action_log_id uuid not null references action_log(id) on delete cascade,
  action_id          text not null,
  program_id         uuid references programs(id),
  provider           text not null default 'gmail_read',
  -- The RFC-5322 Message-ID we stamped at send time (lib/connectors/gmail/send.ts's
  -- messageIdFor). Recomputable from action_log.payload_hash, but stored so a correlation stays
  -- provable after the fact even if that derivation ever changes.
  sent_message_id    text not null,
  -- The provider's own id for the REPLY. Half the dedupe key. Never an address.
  reply_provider_id  text not null,
  reply_from_domain  text,
  reply_excerpt      text,
  replied_at         timestamptz,
  detected_at        timestamptz not null default now(),
  -- '<sent_message_id>:<reply_provider_id>' — stable across sweeps, so re-running is free and a
  -- second browser tab writes nothing. Same role as founder_leads.dedupe_key.
  dedupe_key         text not null
);

create unique index if not exists outreach_reply_signals_dedupe
  on outreach_reply_signals (founder_id, dedupe_key);
create index if not exists outreach_reply_signals_founder_recent
  on outreach_reply_signals (founder_id, detected_at desc);
create index if not exists outreach_reply_signals_by_send
  on outreach_reply_signals (sent_action_log_id);

alter table outreach_reply_signals enable row level security;

-- Read-only for authenticated, team-widened exactly as action_log's siblings are (20260811000002):
-- a teammate looking at the shared workspace must see the same replies the owner does. No insert,
-- update or delete policy — a founder must never be able to manufacture a signal about
-- themselves; writes are service-role only.
drop policy if exists "outreach_reply_signals_select_own" on outreach_reply_signals;
create policy "outreach_reply_signals_select_own"
  on outreach_reply_signals for select
  to authenticated
  using (founder_id in (select public.team_founder_ids()));

-- ── Append-only ────────────────────────────────────────────────────────────────────
-- Shipping WITH the pg_trigger_depth() carve-out from day one. executive_briefings needed a
-- follow-up migration (20260715000010) because its append-only trigger blocked the
-- auth.users → founder_profiles → ... cascade, so a founder with any history could never delete
-- their account. The guarantee wanted is "nobody edits or prunes history", NOT "records outlive
-- the founder". Not repeating that.
create or replace function outreach_reply_signals_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    -- Cascaded from the founder's own deletion (account erasure) — allowed.
    return old;
  end if;
  raise exception 'outreach_reply_signals is append-only: % is not permitted', tg_op
    using errcode = 'check_violation';
  return null;
end;
$$;

drop trigger if exists outreach_reply_signals_no_mutation on outreach_reply_signals;
create trigger outreach_reply_signals_no_mutation
  before update or delete on outreach_reply_signals
  for each row
  execute function outreach_reply_signals_append_only();

-- ── The sweep cursor. A CACHE, not a log — deliberately mutable. ────────────────────
-- An append-only table cannot record "I looked and found nothing", and without that the cadence
-- gate never advances and every page load would hit Gmail. This is the same cache-beside-a-log
-- split founder_pulled_data already makes beside action_log: one row per founder, overwritten.
create table if not exists outreach_reply_sweeps (
  founder_id    uuid primary key references founder_profiles(user_id) on delete cascade,
  last_swept_at timestamptz not null default now(),
  last_status   text not null default 'ok'
                check (last_status in ('ok', 'skipped', 'not_connected', 'error')),
  last_error    text,
  sends_checked integer not null default 0,
  replies_found integer not null default 0
);

alter table outreach_reply_sweeps enable row level security;

drop policy if exists "outreach_reply_sweeps_select_own" on outreach_reply_sweeps;
create policy "outreach_reply_sweeps_select_own"
  on outreach_reply_sweeps for select
  to authenticated
  using (founder_id in (select public.team_founder_ids()));

comment on table outreach_reply_signals is
  'Append-only record of a reply to outreach this product sent, correlated via the RFC-5322 Message-ID stamped by lib/connectors/gmail/send.ts. NOT the Outcome Loop (ADR-009/F15) — never aggregated, never scored. Domain-only sender; a snippet, never a body. Read-only for authenticated; writes are service-role and founder-triggered only.';
comment on column outreach_reply_signals.reply_from_domain is
  'The replying sender''s DOMAIN. Never a full address — action_log''s rule (CLAUDE.md §3).';
comment on column outreach_reply_signals.dedupe_key is
  '<sent_message_id>:<reply_provider_id>. Makes a re-sweep free: the same real reply always produces the same key, so ON CONFLICT DO NOTHING absorbs it.';
comment on table outreach_reply_sweeps is
  'A CACHE holding when reply detection last ran per founder, so a page-load-triggered sweep is rate-limited and a sweep that finds nothing still advances the cursor. Not history — outreach_reply_signals owns that.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop policy   if exists "outreach_reply_sweeps_select_own" on outreach_reply_sweeps;
--   drop table    if exists outreach_reply_sweeps;
--   drop trigger  if exists outreach_reply_signals_no_mutation on outreach_reply_signals;
--   drop function if exists outreach_reply_signals_append_only();
--   drop policy   if exists "outreach_reply_signals_select_own" on outreach_reply_signals;
--   drop index    if exists outreach_reply_signals_by_send;
--   drop index    if exists outreach_reply_signals_founder_recent;
--   drop index    if exists outreach_reply_signals_dedupe;
--   drop table    if exists outreach_reply_signals;
