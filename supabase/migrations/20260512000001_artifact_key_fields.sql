-- Add key_fields JSONB column to agent_artifacts.
-- Stores extracted text fields for faster relevance scoring in context-compressor.ts.
-- Column is optional — existing rows simply have NULL.

ALTER TABLE agent_artifacts
  ADD COLUMN IF NOT EXISTS key_fields JSONB;

-- Expand artifact_type CHECK constraint to allow all types defined in lib/constants/artifact-types.ts
ALTER TABLE agent_artifacts
  DROP CONSTRAINT IF EXISTS agent_artifacts_artifact_type_check;
