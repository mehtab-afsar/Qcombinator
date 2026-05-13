-- Add icp_id column to agent_artifacts for ICP version tracking.
-- Populated when artifact_type = 'icp_document' from the parsed icp_id field
-- in the artifact JSON (format: [COUNTRY]_[SEGMENT]_[USECASE]_v1).
-- Enables: iteration detection (v1 → v2 count → auto-score P1.4),
--          deduplication, and versioned ICP history display.

ALTER TABLE agent_artifacts
  ADD COLUMN IF NOT EXISTS icp_id TEXT;

-- Index for fast lookup of all ICP versions for a given user + segment
CREATE INDEX IF NOT EXISTS idx_agent_artifacts_icp_id
  ON agent_artifacts (user_id, icp_id)
  WHERE icp_id IS NOT NULL;
