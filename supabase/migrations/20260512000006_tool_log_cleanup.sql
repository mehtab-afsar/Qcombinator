-- Scheduled cleanup for log tables to prevent unbounded growth.
-- At 10k users × 5 tool calls/day = 18M rows/year without cleanup.
-- Run via pg_cron (Supabase Dashboard → Database → pg_cron) or a
-- Supabase Edge Function triggered by a cron schedule.

-- Enable pg_cron extension if not already enabled
-- (Supabase enables this by default on Pro plans)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 03:00 UTC
-- Uncomment and run in Supabase SQL editor once pg_cron is available:
--
-- SELECT cron.schedule(
--   'clean-tool-logs',
--   '0 3 * * *',
--   $$DELETE FROM tool_execution_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
-- );
--
-- SELECT cron.schedule(
--   'clean-rag-logs',
--   '0 3 * * *',
--   $$DELETE FROM rag_execution_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
-- );
--
-- SELECT cron.schedule(
--   'clean-rag-cache',
--   '0 4 * * *',
--   $$DELETE FROM rag_score_cache WHERE expires_at < NOW()$$
-- );

-- Plain indexes for cleanup queries and time-range scans
CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_recent
  ON tool_execution_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_execution_logs_recent
  ON rag_execution_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_score_cache_active
  ON rag_score_cache (expires_at);
