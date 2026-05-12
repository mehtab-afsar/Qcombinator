-- Enable RLS on rag_execution_logs and tool_execution_logs.
-- These two tables were missing RLS policies, allowing authenticated
-- users to read other users' log data via the anon key.

ALTER TABLE rag_execution_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_execution_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own logs; service role bypasses RLS for admin/cron.
CREATE POLICY "Users see own rag logs"
  ON rag_execution_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users see own tool logs"
  ON tool_execution_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (cron/admin) needs INSERT on tool_execution_logs
CREATE POLICY "Service role can insert tool logs"
  ON tool_execution_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert rag logs"
  ON rag_execution_logs
  FOR INSERT
  WITH CHECK (true);
