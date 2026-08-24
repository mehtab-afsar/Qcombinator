-- Apollo enrichment + contact promotion on founder_leads (docs/AGI_ACTIONS_PRD.md, spine slice 2).
--
-- Slice 1 gave leads a home. This adds the three columns enrichment needs:
--
--   apollo_org_id / apollo_person_id — idempotency for PAID work. Resolving a company costs an
--   Apollo credit and revealing an email costs another; re-running enrichment must never pay
--   twice for an answer we already have. Cached per lead rather than in a shared table because
--   Apollo's ids are stable and a lead is where the answer is actually used.
--
--   promoted_at — when the founder promoted this lead into founder_contacts. NOT a foreign key:
--   the founder may later delete that contact, and this column records that the promotion
--   HAPPENED, which stays true regardless. It exists so the UI can stop offering a button whose
--   work is already done.
--
-- ⚠️ Promotion is the ONLY path from a lead to a contact, and it is deliberately founder-driven.
-- founder_contacts is the sole recipient source for a Gmail send (lib/contacts/context.ts), and
-- generate.ts's assertRecipientsInContext refuses any payload naming someone outside it. A
-- founder clicking "add to contacts" on a verified email IS the vouching that guard assumes.
-- Nothing may copy a lead into founder_contacts automatically.

alter table founder_leads
  add column if not exists apollo_org_id    text,
  add column if not exists apollo_person_id text,
  add column if not exists promoted_at      timestamptz;

-- Enrichment reads "leads still missing an email, newest-ranked first". Partial, because an
-- already-enriched lead is never a candidate again.
create index if not exists founder_leads_unenriched
  on founder_leads (founder_id, score desc nulls last)
  where email_status = 'none';

comment on column founder_leads.apollo_org_id is
  'Apollo organization id, cached after the first (credit-costing) company resolution so re-enrichment never pays for it twice.';
comment on column founder_leads.apollo_person_id is
  'Apollo person id, cached after a successful people search. Present without an email means Apollo knew the person but had no address to reveal.';
comment on column founder_leads.promoted_at is
  'When the founder promoted this lead into founder_contacts. Deliberately not an FK — it records that the promotion happened, which stays true even if the contact is later deleted.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop index if exists founder_leads_unenriched;
--   alter table founder_leads
--     drop column if exists promoted_at,
--     drop column if exists apollo_person_id,
--     drop column if exists apollo_org_id;
