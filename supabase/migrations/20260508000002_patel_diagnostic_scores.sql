-- Patel per-founder 20-indicator GTM diagnostic scores
-- Separate from Q-Score P1 traction indicators — these measure GTM methodology quality.
-- One row per founder, upserted on each Patel session that produces scored signals.

CREATE TABLE IF NOT EXISTS patel_diagnostic_scores (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  scores     JSONB NOT NULL DEFAULT '{}',
  -- e.g. { "icp.specificity": 3, "icp.validation": 1, "insight.problem": 2 }
  confidence JSONB NOT NULL DEFAULT '{}',
  -- e.g. { "icp.specificity": "validated", "icp.validation": "assumed" }
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT patel_diagnostic_scores_user_unique UNIQUE (user_id)
);

ALTER TABLE patel_diagnostic_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_write" ON patel_diagnostic_scores
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS patel_diagnostic_scores_user_idx ON patel_diagnostic_scores(user_id);
