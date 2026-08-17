-- F14 — wiring up real execution. Give the real payload somewhere safe and short-lived to live
-- between generation and the founder's approval decision.
--
-- action_log.request already holds METADATA ONLY, deliberately (20260803000002's own comment):
-- recipient count/domain, subject length — never the body, never an address. That rule is
-- correct for the permanent audit log and stays untouched here.
--
-- But it meant the real content was never persisted ANYWHERE — not for execution to send, and
-- not for the founder to read before approving. `payload_ref` fixes that the same way
-- connector_grants.token_ref already does for OAuth credentials (20260803000001): the value
-- lives in Supabase Vault, never in a plain column; this is only a reference id.
--
-- expires_at mirrors delegation_tasks' query-time-filter convention (20260417000002) and matches
-- APPROVAL_TTL_MS (lib/actions/approve.ts, already 24h) — used only by the defensive cleanup
-- sweep, never as the actual authorization check (approveAction's own TTL check stays the real
-- authority).

alter table action_log
  add column if not exists payload_ref text,
  add column if not exists expires_at timestamptz default (now() + interval '24 hours');

comment on column action_log.payload_ref is
  'A Supabase Vault secret id holding the REAL payload (recipients/subject/body) for an irreversible Action, JSON-encoded — never the content itself. Set only on pending_approval rows for irreversible Actions; deleted from the vault (this column left as a stale pointer, same as any other append-only row) once a terminal outcome is recorded or the founder declines. NULL for every reversible/internal Action, which never had real external content to protect.';
comment on column action_log.expires_at is
  'Defensive cleanup horizon only, not an authorization check — approveAction''s own APPROVAL_TTL_MS re-check is the real authority. Lets a scheduled sweep find and delete vault secrets nobody ever acted on.';

-- Nothing to backfill — every existing row predates payload storage, so payload_ref is
-- legitimately null for all of them (no vault secret to point at).

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter table action_log drop column if exists expires_at;
--   alter table action_log drop column if exists payload_ref;
