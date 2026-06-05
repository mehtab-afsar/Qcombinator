-- Performance indexes for high-traffic queries

-- Deal-flow: investor browsing founders by startup_name (NOT NULL filter)
CREATE INDEX IF NOT EXISTS idx_founder_profiles_startup_name
  ON founder_profiles(startup_name)
  WHERE startup_name IS NOT NULL;

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
