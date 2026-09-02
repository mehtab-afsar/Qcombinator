-- Idempotency for a founder-triggered ad-hoc Action run.
--
-- action_log's existing idempotency is `action_log_one_execution`, a partial unique index on
-- (action_id, execution_id) WHERE execution_id IS NOT NULL. The ad-hoc path (lib/actions/direct.ts)
-- runs an Action outside any cycle, so its execution_id is NULL and that index does not apply to
-- it at all — two clicks would be two rows and two paid Claude calls.
--
-- Same shape and same job as notifications.dedupe_key (20260826000001): a caller-supplied stable
-- key, a partial unique index, and a clean 23505 the app turns into AlreadyExecutedError. Nullable
-- so every existing row and every rhythm-cycle row is unaffected.
--
-- Additive, idempotent, reversible. No RLS change: action_log's policies are untouched, and this
-- column is written service-side like every other.

alter table action_log add column if not exists dedupe_key text;

create unique index if not exists action_log_dedupe
  on action_log (founder_id, dedupe_key)
  where dedupe_key is not null;

comment on column action_log.dedupe_key is
  'Stable key for a founder-triggered ad-hoc run, where execution_id is null and the per-run unique index therefore does not apply. e.g. followup:<signal id>. Null for every rhythm-cycle row.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop index if exists action_log_dedupe;
--   alter table action_log drop column if exists dedupe_key;
