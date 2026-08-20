-- Founder contacts — a real recipient source for the AI SDR send.
--
-- The AI SDR pipeline's one real-send Action, generate_personalized_outreach (P005, Gmail),
-- has never been able to produce anything approvable: find_decision_makers deliberately only
-- ever names ROLES ("VP of Engineering"), never a real person — there is no people-search
-- connector, and inventing an email address is exactly the fabrication that boundary exists to
-- prevent (see find-decision-makers.ts's own header). generate.ts's assertRecipientsInContext
-- now refuses to generate a payload whose recipient doesn't literally appear in Company
-- Context — a good guard, but until this table exists, nothing ever puts a real email there.
--
-- This table is a founder's own small, real list of people they actually want prospected. Fed
-- into Company Context narrowly (only for Gmail-send Actions — see lib/rhythm/run.ts's
-- founderContactsContextFor, added alongside this migration), never into every Asset/Briefing
-- across the whole account.
--
-- A plain, founder-managed CRUD list — not an audit log, not versioned. No status/soft-delete
-- field, deliberately: whether someone's been contacted is action_log's job already; a second
-- place to track that would be a second source of truth for the same fact (CLAUDE.md §4).

create table if not exists founder_contacts (
  id         uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  name       text not null,
  email      text not null,
  company    text,
  title      text,
  notes      text,
  created_at timestamptz not null default now()
);

-- Prevents an accidental duplicate entry from silently doubling up in the rendered context list.
create unique index if not exists founder_contacts_founder_email_idx
  on founder_contacts (founder_id, lower(email));

create index if not exists founder_contacts_founder_recent
  on founder_contacts (founder_id, created_at desc);

alter table founder_contacts enable row level security;

-- A plain mutable list a founder manages directly — mirrors investor_contacts's proven
-- FOR ALL USING (auth.uid() = founder_id) shape, NOT strategy_sessions's split-policy
-- versioned shape (that table's shape answers a different problem: immutable history).
-- WITH CHECK is explicit defense-in-depth even though USING would already imply it on write.
drop policy if exists "founder_contacts_own" on founder_contacts;
create policy "founder_contacts_own"
  on founder_contacts for all
  to authenticated
  using (auth.uid() = founder_id)
  with check (auth.uid() = founder_id);

comment on table founder_contacts is
  'A founder''s own real prospect list — fed narrowly into Company Context for Gmail-send Actions only (find_decision_makers/etc. never produce real people or emails, by design). Founder-managed CRUD, not an audit log; row-count and field-length caps are enforced at the API layer (app/api/contacts/route.ts), not here.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop policy if exists "founder_contacts_own" on founder_contacts;
--   drop index   if exists founder_contacts_founder_recent;
--   drop index   if exists founder_contacts_founder_email_idx;
--   drop table   if exists founder_contacts;
