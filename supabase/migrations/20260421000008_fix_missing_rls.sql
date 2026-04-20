-- Enable RLS on tables that were created without it.
-- Without these policies any authenticated user could read other users' data.

-- ─── agent_activity ───────────────────────────────────────────────────────────
ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_activity: users read own rows"
  ON agent_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "agent_activity: service role full access"
  ON agent_activity FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── startup_state ────────────────────────────────────────────────────────────
ALTER TABLE startup_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "startup_state: users manage own rows"
  ON startup_state FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "startup_state: service role full access"
  ON startup_state FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── delegation_tasks ─────────────────────────────────────────────────────────
ALTER TABLE delegation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delegation_tasks: users manage own rows"
  ON delegation_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "delegation_tasks: service role full access"
  ON delegation_tasks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── agent_messages_embedding ─────────────────────────────────────────────────
-- Embeddings are accessed via service role only (vector search happens server-side).
-- Authenticated users must not directly query this table.
ALTER TABLE agent_messages_embedding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_messages_embedding: service role full access"
  ON agent_messages_embedding FOR ALL TO service_role
  USING (true) WITH CHECK (true);
