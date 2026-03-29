-- ============================================================================
-- Edge Alpha IQ Score v2 — Migration 4: qscore_reconciliation_log table
-- Observability: per-submission AI reconciliation audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS qscore_reconciliation_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_id         TEXT NOT NULL,
  founder_value        JSONB,
  ai_estimate          JSONB,
  deviation            NUMERIC,
  anomaly_severity     TEXT,   -- 'none' | 'low' | 'high' | 'extreme'
  confidence_adjustment NUMERIC,
  vc_alert             TEXT,
  applied              BOOLEAN NOT NULL DEFAULT false,
  error                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reconciliation_log_user_idx
  ON qscore_reconciliation_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reconciliation_log_indicator_idx
  ON qscore_reconciliation_log(indicator_id, created_at DESC);

ALTER TABLE qscore_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own reconciliation logs"
  ON qscore_reconciliation_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manage reconciliation logs"
  ON qscore_reconciliation_log FOR ALL USING (auth.role() = 'service_role');
