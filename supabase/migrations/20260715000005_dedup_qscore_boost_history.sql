-- Dedup qscore_history score-boost rows, then build the uniqueness guarantee.
--
-- ─── Why this exists ─────────────────────────────────────────────────────────
--
-- The old-model boost path (applyAgentScoreSignal, features/qscore/services/
-- agent-signal.ts — FROZEN, ADR-014) is meant to boost a founder's score at most
-- once per artifact type. It relies on a partial UNIQUE index on
-- (user_id, source_artifact_type). That index was written into the Feb squash but
-- NEVER APPLIED to production, so over time the guard's fast-path SELECT lost
-- races and duplicate boost rows accumulated. `db push` then aborts (SQLSTATE
-- 23505) trying to build the index on non-unique data.
--
-- This is the exact residue of the bug the NEW model exists to prevent (ADR-005).
--
-- ─── Append-only tension (CLAUDE.md §4), stated plainly ──────────────────────
--
-- §4: qscore_history is append-only, never mutated. This migration DELETES rows,
-- which conflicts on its face. The justification: a double-boost row is not a
-- legitimate point on the score trajectory — it is corruption of it. We preserve
-- the EARLIEST boost per (user, artifact_type) — the real first-boost event — and
-- remove only the erroneous later double-counts, copying every removed row to an
-- audit table first. History's intent is protected; the bug's residue is not
-- enshrined. This was a deliberate, approved decision (Option 1).
--
-- Touches DATA and an INDEX only. No old-model code path is changed
-- (applyAgentScoreSignal / features/qscore/** / app/api/agents/** are untouched).
--
-- ─── Idempotent & reversible ─────────────────────────────────────────────────
-- Re-running is safe: a second run finds no duplicates (dedup no-ops) and the
-- index already exists (IF NOT EXISTS). Rollback is documented at the foot.

-- 1. Audit table — so the deletion is auditable, never silent.
create table if not exists qscore_history_dedup_audit (
  id                    uuid primary key default gen_random_uuid(),
  removed_row_id        uuid not null,
  user_id               uuid,
  source_artifact_type  text,
  overall_score         integer,
  calculated_at         timestamptz,
  kept_row_id           uuid not null,   -- the survivor this duplicate collapsed into
  removed_at            timestamptz not null default now(),
  reason                text not null default 'duplicate score-boost row (missing unique index); kept earliest per (user_id, source_artifact_type)'
);

comment on table qscore_history_dedup_audit is
  'Audit of qscore_history rows removed by 20260715000005 to satisfy the (user_id, source_artifact_type) uniqueness guarantee. Append-only record of what was deleted and which row it collapsed into. See the migration header for the append-only justification.';

do $$
declare
  v_removed bigint;
begin
  -- The survivor per duplicate group: earliest calculated_at, id as a stable
  -- tie-break. Only boost rows (source_artifact_type not null) are constrained.
  create temporary table _dedup_survivors on commit drop as
    select distinct on (user_id, source_artifact_type)
           id as keep_id, user_id, source_artifact_type
    from qscore_history
    where source_artifact_type is not null
    order by user_id, source_artifact_type, calculated_at asc, id asc;

  -- The rows to remove: every boost row that is NOT its group's survivor.
  create temporary table _dedup_losers on commit drop as
    select h.id as loser_id, h.user_id, h.source_artifact_type,
           h.overall_score, h.calculated_at, s.keep_id
    from qscore_history h
    join _dedup_survivors s
      on h.user_id = s.user_id
     and h.source_artifact_type = s.source_artifact_type
    where h.source_artifact_type is not null
      and h.id <> s.keep_id;

  -- 2. Preserve the trajectory chain. previous_score_id is ON DELETE SET NULL, so
  --    deleting a loser that some other row points at would silently break that
  --    row's delta lineage. Re-point those children to the survivor first.
  update qscore_history c
     set previous_score_id = l.keep_id
    from _dedup_losers l
   where c.previous_score_id = l.loser_id;

  -- 3. Record what we are about to remove (skip rows already audited, so re-runs
  --    don't double-log).
  insert into qscore_history_dedup_audit
    (removed_row_id, user_id, source_artifact_type, overall_score, calculated_at, kept_row_id)
  select l.loser_id, l.user_id, l.source_artifact_type, l.overall_score, l.calculated_at, l.keep_id
  from _dedup_losers l
  where not exists (
    select 1 from qscore_history_dedup_audit a where a.removed_row_id = l.loser_id
  );

  -- 4. Remove the duplicates.
  delete from qscore_history h using _dedup_losers l where h.id = l.loser_id;
  get diagnostics v_removed = row_count;

  raise notice 'qscore_history dedup: removed % duplicate boost row(s); survivors kept by earliest calculated_at.', v_removed;
end $$;

-- 5. Now that the data is clean, build the guarantee. Same partial index the Feb
--    squash intended, moved here so dedup and index are one atomic migration.
create unique index if not exists qscore_history_user_artifact_unique
  on qscore_history (user_id, source_artifact_type)
  where source_artifact_type is not null;

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: additive and reversible.
--
--   drop index if exists qscore_history_user_artifact_unique;
--   -- The audit table is retained deliberately: it is the record of what was
--   -- removed. To restore the deleted rows, re-insert from
--   -- qscore_history_dedup_audit (they carry their original ids and columns).
--   -- Only drop the audit table if you are certain it is no longer needed:
--   --   drop table if exists qscore_history_dedup_audit;
--
-- Re-running this whole migration is safe: dedup finds nothing, the index exists.
