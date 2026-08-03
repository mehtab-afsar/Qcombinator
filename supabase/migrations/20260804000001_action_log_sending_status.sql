-- F14 fix — a reservation must not masquerade as a completed send.
--
-- FOUND BY THE FIRST REAL SEND (Stage D, 3 Aug 2026), not by any test.
--
-- executeApprovedAction reserves the idempotency slot BEFORE calling the provider — correct, and
-- the same fail-fast-before-cost rule operating_rhythm_runs follows. But it reserved using
-- status='executed', which has two consequences that only appear in a live run:
--
--   1. THE LOG LIES. A row reading 'executed' may describe a send that never happened — the
--      audit trail's whole purpose is to be trustworthy about exactly this.
--   2. THE SLOT IS CLAIMED FOREVER. If the send fails, or the process dies between reserving
--      and recording the outcome, the unique index keeps rejecting every future attempt. A
--      legitimate retry becomes impossible, and the founder's action is stuck with no way back.
--      Observed: a 401 left a row that permanently blocked re-sending.
--
-- 'sending' separates "I hold the slot" from "it went". The unique index covers BOTH, so
-- idempotency is unchanged — a double-click still loses at the database. But a stuck 'sending'
-- row is now visibly distinct from a real send, diagnosable, and reconcilable.
--
-- Additive, idempotent, reversible.

alter table action_log drop constraint if exists action_log_status_check;
alter table action_log add constraint action_log_status_check
  check (status in ('pending_approval','approved','sending','executed','failed','declined','unknown'));

-- The index guards the RESERVATION, not the outcome.
--
-- It previously covered 'executed', which meant the winner's own outcome row collided with its
-- own reservation: it sent the email, then failed to record that it had. The send happened and
-- the log denied it — the worst possible pair. (Invisible until an execution_id was present,
-- because the index is partial on execution_id IS NOT NULL, and the first real send had none.)
--
-- Guarding only 'sending' gives the identical guarantee: the reservation row is never removed
-- (the table is append-only), so it holds the slot for that (action, run) forever. A second
-- click, or a retry an hour later, still loses on 23505. But the outcome row — executed, failed
-- or unknown — is free to land beside it, which is what makes the log tell the truth.
drop index if exists action_log_one_execution;
create unique index if not exists action_log_one_execution
  on action_log (action_id, execution_id)
  where status = 'sending' and execution_id is not null;

comment on column action_log.status is
  'sending = the slot is reserved and the provider call is in flight; executed = it landed. Separate on purpose: a row saying executed must never describe a send that did not happen, and a crash mid-send must not block a legitimate retry forever (found by the first real send, 3 Aug 2026). unknown = the outcome is genuinely undetermined, awaiting reconciliation.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop index if exists action_log_one_execution;
--   create unique index action_log_one_execution on action_log (action_id, execution_id)
--     where status = 'executed' and execution_id is not null;
--   alter table action_log drop constraint if exists action_log_status_check;
--   alter table action_log add constraint action_log_status_check
--     check (status in ('pending_approval','approved','executed','failed','declined','unknown'));
