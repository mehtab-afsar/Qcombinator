-- M4: Add model_tier tracking to tool_execution_logs
-- Allows observability on which model tier was used per tool call

ALTER TABLE tool_execution_logs
  ADD COLUMN IF NOT EXISTS model_tier VARCHAR(16);

COMMENT ON COLUMN tool_execution_logs.model_tier IS 'economy | standard | premium — maps to LLM routing tier used for this tool call';

-- Backfill existing rows as standard (the previous default)
UPDATE tool_execution_logs SET model_tier = 'standard' WHERE model_tier IS NULL;
