-- F10 chunking — track per-step progress so a stalled run is distinguishable from a
-- legitimately-in-progress multi-invocation one (FU-004).
--
-- Before this migration, 'running' meant exactly one thing: a single 8-minute invocation was
-- mid-flight (or had crashed). After chunking, 'running' is the NORMAL state for a run in
-- progress across many short invocations — it may legitimately sit at 'running' for the whole
-- span of several self-triggered steps. last_step_at is what lets a caller tell "still actively
-- stepping" apart from "abandoned mid-chunk" (e.g. the self-trigger chain broke) — FU-004's
-- staleness check reads this column, not started_at.
--
-- Idempotent, additive, reversible.

alter table operating_rhythm_runs
  add column if not exists last_step_at timestamptz not null default now();

-- Backfill any row that pre-dates this column: last_step_at starts equal to started_at (the
-- most honest value — "the last known progress is whenever we first touched it"). Safe to
-- re-run: setting last_step_at = started_at twice is the same as once.
update operating_rhythm_runs
  set last_step_at = started_at;

comment on column operating_rhythm_runs.last_step_at is
  'Updated on every chunked step (F10). Used to distinguish an actively-progressing run from a stalled one — see FU-004.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter table operating_rhythm_runs drop column if exists last_step_at;
