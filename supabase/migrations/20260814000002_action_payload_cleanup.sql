-- Defensive cleanup for Action payloads nobody ever decided on. The real path already deletes
-- the vault secret the moment a decision is made (lib/actions/approve.ts on decline,
-- lib/actions/execute.ts once a terminal outcome is recorded) — this only catches the case where
-- neither ever happens (the founder never opens the app again before the 24h TTL passes).
--
-- Same "commented template, enable manually via the dashboard" convention this codebase already
-- uses for tool_execution_logs/rag_execution_logs/rag_score_cache (20260512000006), not
-- auto-applied here.

-- Plain index for the cleanup query and for the "what's actually pending" scan.
CREATE INDEX IF NOT EXISTS idx_action_log_payload_cleanup
  ON action_log (expires_at)
  WHERE status = 'pending_approval' AND payload_ref IS NOT NULL;

-- Uncomment and run in the Supabase SQL editor once pg_cron is available (see 20260512000006 for
-- the same pattern already in use):
--
-- SELECT cron.schedule(
--   'clean-expired-action-payloads',
--   '0 4 * * *',
--   $$
--     SELECT delete_secret_for_connector(payload_ref::uuid)
--     FROM action_log
--     WHERE status = 'pending_approval' AND payload_ref IS NOT NULL AND expires_at < NOW();
--   $$
-- );
--
-- The action_log row itself is untouched — it's append-only history (20260803000002) and stays
-- exactly as it is; only the vault secret it points at is removed. A stale payload_ref on an old
-- row is expected and harmless: resolvePayload already fails closed (VaultError) on a missing
-- secret, and nothing re-reads a payload_ref once its row is no longer 'pending_approval'.

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   -- SELECT cron.unschedule('clean-expired-action-payloads');
--   DROP INDEX IF EXISTS idx_action_log_payload_cleanup;
