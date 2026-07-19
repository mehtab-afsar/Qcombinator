-- Performance indexes for high-traffic queries

-- Deal-flow: investor browsing founders by startup_name (NOT NULL filter)
--
-- ⚠️ REPLAY-GUARDED (20 Jul 2026, FU-003): founder_profiles is created by the JULY squash
-- (20260700000001), which replays after this April file. Skipped when absent; the squash
-- recreates this index. Production ran this against the then-live table; never re-run.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'founder_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_founder_profiles_startup_name
      ON founder_profiles(startup_name)
      WHERE startup_name IS NOT NULL;
  END IF;
END $$;

-- idx_qscore_history_user_date defined in 20260200000001_qscore_history_squashed.sql

-- Connections: founder and investor lookups
CREATE INDEX IF NOT EXISTS idx_connection_requests_founder_id
  ON connection_requests(founder_id);

CREATE INDEX IF NOT EXISTS idx_connection_requests_investor_id
  ON connection_requests(investor_id)
  WHERE investor_id IS NOT NULL;

-- Agent activity: weekly activity count per founder
CREATE INDEX IF NOT EXISTS idx_agent_activity_user_created
  ON agent_activity(user_id, created_at DESC);
