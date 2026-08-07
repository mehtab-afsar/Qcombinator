-- Add columns that are defined in the squashed migration but not yet in the live (production)
-- DB — the same class of gap 20260609000001 fixed for a different set of columns, using the
-- same IF NOT EXISTS pattern so this is safe to run multiple times and safe on a fresh rebuild.
--
-- Found live (7 Aug 2026): the dashboard's weekly check-in widget reads gate_progress and
-- customer_calls_count via a direct client-side PostgREST query
-- (app/founder/dashboard/page.tsx) and got a 400 "column does not exist" on production.
-- Confirmed via information_schema on the local (rebuilt-from-empty) database that all 5 of
-- these columns already exist there — the squash's own CREATE TABLE IF NOT EXISTS created them
-- correctly on a fresh database. Production's founder_profiles predates the squash, so that
-- CREATE TABLE was a no-op there, and nobody wrote the corresponding ALTER TABLE for these five
-- specifically (unlike the five 20260609000001 already backfills).
--
-- ⚠️ REPLAY-GUARDED, same reasoning as 20260609000001: on a rebuild-from-empty, the July squash
-- (20260700000001) already creates all five columns, so this file safely no-ops there too.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'founder_profiles') THEN
    ALTER TABLE founder_profiles
      ADD COLUMN IF NOT EXISTS weekly_goal          TEXT,
      ADD COLUMN IF NOT EXISTS weekly_metric_value  TEXT,
      ADD COLUMN IF NOT EXISTS weekly_checkin_at    TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS gate_progress        JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS customer_calls_count INT   DEFAULT 0;
  END IF;
END $$;
