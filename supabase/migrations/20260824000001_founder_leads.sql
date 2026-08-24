-- Founder leads — the first table an Action can write a real record into.
--
-- ⚠️ THE SPINE, SLICE 1 (see docs/AGI_ACTIONS_PRD.md). Until this table, every one of the 61
-- seeded Actions ended in prose: the structured JSON a model produced was parsed, briefly held
-- in the vault, read for four email fields, and deleted (lib/actions/execute.ts). There was no
-- table an Action could insert a row into at all, which is why P005's AI SDR could research
-- "CEO of Acme Corp" and have that research dead-end inside a document. This is where that
-- research becomes a record the founder can see, rank, edit and act on.
--
-- ⚠️ DELIBERATELY SEPARATE FROM founder_contacts, and it must stay that way. A lead is an
-- AI-researched HYPOTHESIS; a contact is a person the founder has personally vouched for.
-- generate.ts's assertRecipientsInContext refuses to prepare any send whose recipient does not
-- literally appear in Company Context, and Company Context's recipient source is
-- founder_contacts alone (lib/contacts/context.ts) — ROADMAP_STATUS.md calls that guard the
-- mitigation for "the largest unmitigated risk in Story 3". Merging these two tables would let
-- an AI-invented row become an email recipient, which is precisely the fabrication that guard
-- exists to prevent. A lead becomes a contact only by an explicit, later, founder-facing
-- promotion step — never implicitly.
--
-- Mutable by design, unlike action_log: a lead's status legitimately moves and the founder edits
-- it directly. No append-only trigger, therefore, and no version history — "what did the team do"
-- is action_log's job already and a second source of truth for that fact would violate
-- CLAUDE.md §4.

create table if not exists founder_leads (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founder_profiles(user_id) on delete cascade,

  company       text not null,
  title         text,
  -- Null until an enrichment provider fills them in. find_decision_makers deliberately only
  -- ever names a ROLE, never a real person (see its own registry header) — so a lead written by
  -- AI research has a title and no name, by design, and that is not a defect.
  contact_name  text,
  email         text,
  email_status  text not null default 'none' check (email_status in ('none', 'found', 'verified')),

  score         integer check (score is null or (score >= 0 and score <= 100)),
  rationale     text,
  status        text not null default 'researched'
                check (status in ('researched', 'contacted', 'replied', 'qualified', 'dead')),
  source        text not null default 'ai_research'
                check (source in ('ai_research', 'founder', 'enrichment')),

  -- Provenance: which Program run produced this. Nullable and ON DELETE SET NULL for the same
  -- reason action_log.execution_id is — clearing a failed run must never destroy the leads it
  -- legitimately found.
  program_id    uuid references programs(id) on delete set null,
  execution_id  uuid references operating_rhythm_runs(id) on delete set null,

  notes         text,

  -- lower(company) || '|' || lower(coalesce(title,'')), computed in TypeScript at write time
  -- (lib/entities/leads.ts::dedupeKey). A plain column rather than an expression index so
  -- supabase-js's .upsert({ onConflict }) can name it directly — an expression index cannot be
  -- targeted that way. This is what makes a weekly cycle idempotent instead of duplicating
  -- every lead it already found last week.
  dedupe_key    text not null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists founder_leads_founder_dedupe_idx
  on founder_leads (founder_id, dedupe_key);

create index if not exists founder_leads_founder_recent
  on founder_leads (founder_id, score desc nulls last, created_at desc);

alter table founder_leads enable row level security;

-- Same proven FOR ALL shape as founder_contacts_own: a plain mutable list the founder manages
-- directly. WITH CHECK is explicit defense-in-depth even though USING would imply it on write.
drop policy if exists "founder_leads_own" on founder_leads;
create policy "founder_leads_own"
  on founder_leads for all
  to authenticated
  using (auth.uid() = founder_id)
  with check (auth.uid() = founder_id);

comment on table founder_leads is
  'AI-researched leads — the first entity an Action can write (docs/AGI_ACTIONS_PRD.md, spine slice 1). Written by score_and_prioritize_leads (P005) via lib/entities/leads.ts; founder-editable. DELIBERATELY NOT a recipient source: only founder_contacts feeds Company Context for sends, so an AI-researched row can never become an email recipient without an explicit founder promotion.';
comment on column founder_leads.dedupe_key is
  'lower(company)|lower(title), computed at write time by lib/entities/leads.ts::dedupeKey. Keeps a re-run of the weekly cycle idempotent. Recompute it if company or title is ever edited.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop policy if exists "founder_leads_own" on founder_leads;
--   drop index   if exists founder_leads_founder_recent;
--   drop index   if exists founder_leads_founder_dedupe_idx;
--   drop table   if exists founder_leads;
