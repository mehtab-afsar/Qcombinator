-- ============================================================
-- Migration 003: Enable Row Level Security + policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qscore_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qscore_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- ---- founder_profiles ----
CREATE POLICY "Users can view own profile"
  ON founder_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON founder_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON founder_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ---- qscore_assessments ----
CREATE POLICY "Users can view own assessments"
  ON qscore_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assessments"
  ON qscore_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON qscore_assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- ---- qscore_history ----
CREATE POLICY "Users can view own qscore history"
  ON qscore_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own qscore history"
  ON qscore_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---- agent_conversations ----
CREATE POLICY "Users can view own conversations"
  ON agent_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON agent_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON agent_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- ---- agent_messages ----
CREATE POLICY "Users can view own messages"
  ON agent_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_conversations
      WHERE agent_conversations.id = agent_messages.conversation_id
      AND agent_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON agent_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_conversations
      WHERE agent_conversations.id = agent_messages.conversation_id
      AND agent_conversations.user_id = auth.uid()
    )
  );

-- ---- subscription_usage ----
CREATE POLICY "Users can view own usage"
  ON subscription_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON subscription_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- ---- connection_requests ----
CREATE POLICY "Users can view relevant connection requests"
  ON connection_requests FOR SELECT
  USING (auth.uid() = founder_id OR auth.uid() = investor_id);

CREATE POLICY "Founders can create connection requests"
  ON connection_requests FOR INSERT
  WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Users can update relevant connection requests"
  ON connection_requests FOR UPDATE
  USING (auth.uid() = founder_id OR auth.uid() = investor_id);

-- ---- analytics_events ----
CREATE POLICY "Users can view own events"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
