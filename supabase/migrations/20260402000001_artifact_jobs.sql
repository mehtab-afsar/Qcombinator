-- Artifact generation job queue
-- Enables async generation with fire-and-poll pattern

CREATE TABLE IF NOT EXISTS artifact_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  conversation_id UUID,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result        JSONB,         -- { artifact, scoreSignal } on completion
  error         TEXT,          -- error message on failure
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX artifact_jobs_user_status ON artifact_jobs (user_id, status);
CREATE INDEX artifact_jobs_created ON artifact_jobs (created_at DESC);

-- Users can only see their own jobs
ALTER TABLE artifact_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own jobs"
  ON artifact_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update jobs
CREATE POLICY "Service role manages jobs"
  ON artifact_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Add critique_metadata and compressed_summary columns to agent_artifacts
ALTER TABLE agent_artifacts
  ADD COLUMN IF NOT EXISTS critique_metadata JSONB,
  ADD COLUMN IF NOT EXISTS compressed_summary TEXT;

-- Add match_metadata to connection_requests
ALTER TABLE connection_requests
  ADD COLUMN IF NOT EXISTS match_metadata JSONB;
