-- The Operating Rhythm's circuit breaker — a hard ceiling on paid steps per run.
--
-- Each chunked step is a PAID Claude call that self-schedules the next one
-- (app/api/rhythm/step/route.ts). Before this migration there was no ceiling at all: a bug in
-- "what's next" — a step that runs but never advances `stages` — would self-trigger, and bill,
-- forever.
--
-- step_count is the fuse. It is reserved at the START of every step, in its own write, BEFORE
-- any Claude call, and deliberately NOT inside the `stages` update: the failure mode being
-- guarded against is precisely one where `stages` stops advancing, so a counter living in
-- `stages` would stop advancing with it and the breaker would never fire.
--
-- failure_reason names the fuse blowing in machine-readable form ('step_limit_exceeded'), so a
-- tripped run can be told apart from an ordinary failure. An ordinary failure is retryable
-- (lib/rhythm/runs.ts createOrResumeRun clears it and starts fresh); a blown fuse must NOT be,
-- or every cron tick hands the same runaway a brand new budget — a fuse that resets itself is
-- not a fuse.
--
-- Idempotent, additive, reversible. No backfill: the defaults are correct for existing rows (an
-- in-flight run starts from 0 and gets a full budget, which is safe — the ceiling always exceeds
-- the work remaining).

alter table operating_rhythm_runs
  add column if not exists step_count integer not null default 0;

alter table operating_rhythm_runs
  add column if not exists failure_reason text;

comment on column operating_rhythm_runs.step_count is
  'Steps ATTEMPTED by this run. Reserved before each step''s Claude call via compare-and-set. The circuit breaker fails the run once it reaches the ceiling derived from the run''s own Programs — see lib/rhythm/limits.ts.';

comment on column operating_rhythm_runs.failure_reason is
  'Machine-readable failure cause, e.g. ''step_limit_exceeded''. NULL for an ordinary failure. A run failed for this reason is NOT auto-retried by createOrResumeRun.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter table operating_rhythm_runs drop column if exists failure_reason;
--   alter table operating_rhythm_runs drop column if exists step_count;
