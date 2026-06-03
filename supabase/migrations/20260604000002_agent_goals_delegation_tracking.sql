-- Track when a delegation was last created for an at-risk agent goal.
-- Prevents the cron from creating duplicate delegations on every 15-min run.
-- A null value means "no delegation has been created yet for this at-risk state."
-- The column is reset to null when the goal transitions out of at_risk.

ALTER TABLE agent_goals
  ADD COLUMN IF NOT EXISTS last_delegation_created_at timestamptz;

-- Index for the cron query: at-risk goals that haven't had a delegation created yet
CREATE INDEX IF NOT EXISTS idx_agent_goals_at_risk_pending
  ON agent_goals(status, last_delegation_created_at)
  WHERE status = 'at_risk';
