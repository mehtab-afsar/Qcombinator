-- Add qscore_history to the supabase_realtime publication.
--
-- features/qscore/hooks/useQScore.tsx subscribes to postgres_changes INSERT events on this
-- table to refresh the founder dashboard's Q-Score the moment a new score is calculated. That
-- subscription has always been wired up, but the table was never added to the realtime
-- publication, so the INSERT event was never broadcast and the subscription callback never
-- fired — the dashboard only picked up a new score on a hard page refresh, which remounts the
-- provider and re-fetches from scratch.
--
-- Idempotent — `ALTER PUBLICATION ... ADD TABLE` has no IF NOT EXISTS form and errors
-- (SQLSTATE 42710) on a table already published, so this guards on the catalogue first
-- (same pattern as notifications', 20260523000001_misc_patches.sql, and
-- operating_rhythm_runs', 20260811000001_operating_rhythm_runs_streaming_text.sql).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'qscore_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE qscore_history;
  END IF;
END $$;

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter publication supabase_realtime drop table qscore_history;
