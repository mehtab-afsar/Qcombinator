# Supabase Setup Guide for Edge Alpha

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Organization**: Create new or select existing
   - **Name**: `edge-alpha-prod` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier (50K MAU, 500MB database, 1GB file storage)

4. Click **"Create new project"** and wait ~2 minutes for provisioning

## Step 2: Get Your Credentials

Once your project is created:

1. Go to **Settings** (⚙️ icon in sidebar) → **API**
2. You'll see:
   - **Project URL**: `https://[project-id].supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
   - **service_role secret**: Another long string (keep this secure!)

3. Copy these values - you'll add them to `.env.local`

## Step 3: Update Environment Variables

Add these to your `/Users/mohammedmehtabafsar/Desktop/Qcombinator/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (your anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (your service role key - DO NOT expose publicly)
```

## Step 4: Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor** (📝 icon in sidebar)
2. Click **"New Query"**
3. Copy and paste the SQL from the sections below
4. Click **"Run"** to execute each section

### Table 1: founder_profiles

```sql
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
```

### Table 2: qscore_assessments

```sql
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
```

### Table 3: qscore_history

```sql
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
```

### Table 4: agent_conversations (for Phase 2)

```sql
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
```

### Table 5: agent_messages (for Phase 2)

```sql
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX idx_messages_created ON agent_messages(created_at DESC);
```

### Table 6: subscription_usage (for Phase 2)

```sql
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
```

### Table 7: connection_requests (for Phase 3)

```sql
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
```

### Table 8: analytics_events (for Phase 3)

```sql
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
```

## Step 5: Enable Row Level Security (RLS)

For security, enable RLS on all tables. Run this SQL:

```sql
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
```

## Step 6: Test Connection

1. Restart your dev server: `npm run dev`
2. Check the console - there should be no Supabase errors
3. Try signing up a test user (we'll build the signup form in Step 3)

## Troubleshooting

**Error: "Invalid API key"**
- Double-check your `.env.local` file has correct keys
- Restart dev server after updating env vars

**Error: "relation does not exist"**
- Make sure you ran all the table creation SQL
- Check SQL Editor for any error messages

**Error: "Row Level Security policy violation"**
- Make sure you created the RLS policies
- Check that policies reference `auth.uid()` correctly

## Next Steps

Once Supabase is set up:
1. ✅ Database tables created
2. ✅ RLS policies enabled
3. ✅ Environment variables configured
4. ⏭️ Next: Build the PRD-aligned Q-Score model (Step 2)

---

**Need help?** Check the [Supabase Docs](https://supabase.com/docs) or ask in the Edge Alpha team chat.
