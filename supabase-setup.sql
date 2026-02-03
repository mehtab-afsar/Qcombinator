-- ============================================
-- Edge Alpha - Complete Database Setup
-- ============================================
-- This file creates all tables and RLS policies
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLE 1: founder_profiles
-- ============================================
CREATE TABLE founder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  startup_name TEXT,
  industry TEXT,
  stage TEXT CHECK (stage IN ('idea', 'mvp', 'launched', 'scaling')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  onboarding_completed BOOLEAN DEFAULT false,
  assessment_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_founder_profiles_user_id ON founder_profiles(user_id);
CREATE INDEX idx_founder_profiles_subscription ON founder_profiles(subscription_tier);

-- ============================================
-- TABLE 2: qscore_assessments
-- ============================================
CREATE TABLE qscore_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_data JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'scored')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assessments_user ON qscore_assessments(user_id);
CREATE INDEX idx_assessments_status ON qscore_assessments(status);

-- ============================================
-- TABLE 3: qscore_history
-- ============================================
CREATE TABLE qscore_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES qscore_assessments(id),

  -- Overall Score
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  percentile INTEGER CHECK (percentile BETWEEN 0 AND 100),
  grade TEXT CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F')),

  -- 6 Dimension Scores (0-100 scale)
  market_score INTEGER CHECK (market_score BETWEEN 0 AND 100),
  product_score INTEGER CHECK (product_score BETWEEN 0 AND 100),
  gtm_score INTEGER CHECK (gtm_score BETWEEN 0 AND 100),
  financial_score INTEGER CHECK (financial_score BETWEEN 0 AND 100),
  team_score INTEGER CHECK (team_score BETWEEN 0 AND 100),
  traction_score INTEGER CHECK (traction_score BETWEEN 0 AND 100),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qscore_history_user ON qscore_history(user_id);
CREATE INDEX idx_qscore_history_calculated ON qscore_history(calculated_at DESC);

-- ============================================
-- TABLE 4: agent_conversations
-- ============================================
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  title TEXT,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON agent_conversations(user_id);
CREATE INDEX idx_conversations_agent ON agent_conversations(agent_id);

-- ============================================
-- TABLE 5: agent_messages
-- ============================================
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX idx_messages_created ON agent_messages(created_at DESC);

-- ============================================
-- TABLE 6: subscription_usage
-- ============================================
CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('agent_chat', 'investor_connection', 'qscore_recalc', 'workshop')),
  usage_count INTEGER DEFAULT 0,
  limit_count INTEGER,
  reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user ON subscription_usage(user_id);
CREATE INDEX idx_usage_feature ON subscription_usage(feature);

-- ============================================
-- TABLE 7: connection_requests
-- ============================================
CREATE TABLE connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES auth.users(id),
  investor_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'declined', 'meeting_scheduled')),
  personal_message TEXT,
  founder_qscore INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connections_founder ON connection_requests(founder_id);
CREATE INDEX idx_connections_investor ON connection_requests(investor_id);
CREATE INDEX idx_connections_status ON connection_requests(status);

-- ============================================
-- TABLE 8: analytics_events
-- ============================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_user ON analytics_events(user_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_created ON analytics_events(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qscore_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qscore_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Founder profiles: users can only see/edit their own profile
CREATE POLICY "Users can view own profile"
  ON founder_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON founder_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON founder_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Q-Score assessments: users can only see/edit their own
CREATE POLICY "Users can view own assessments"
  ON qscore_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assessments"
  ON qscore_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON qscore_assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- Q-Score history: users can only see their own scores
CREATE POLICY "Users can view own qscore history"
  ON qscore_history FOR SELECT
  USING (auth.uid() = user_id);

-- Agent conversations: users can only see their own
CREATE POLICY "Users can view own conversations"
  ON agent_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON agent_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON agent_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Agent messages: users can only see messages from their conversations
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

-- Subscription usage: users can only see their own usage
CREATE POLICY "Users can view own usage"
  ON subscription_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON subscription_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON subscription_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Connection requests: founders and investors can see relevant requests
CREATE POLICY "Users can view relevant connection requests"
  ON connection_requests FOR SELECT
  USING (auth.uid() = founder_id OR auth.uid() = investor_id);

CREATE POLICY "Founders can create connection requests"
  ON connection_requests FOR INSERT
  WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Users can update relevant connection requests"
  ON connection_requests FOR UPDATE
  USING (auth.uid() = founder_id OR auth.uid() = investor_id);

-- Analytics events: users can only see their own events
CREATE POLICY "Users can view own events"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- All 8 tables created with indexes
-- RLS policies enabled for security
-- Ready to use with your Edge Alpha app
-- ============================================
