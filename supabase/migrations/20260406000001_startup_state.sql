-- ── Startup State — shared world model across all 11 agents ──────────────────
-- One row per user. Every agent reads this for context, every agent writes
-- back when they produce new facts (Felix → MRR/burn/runway, Nova → PMF/retention, etc.)

CREATE TABLE IF NOT EXISTS startup_state (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  company_name             text,
  industry                 text,
  stage                    text,

  -- Financial (Felix)
  mrr                      numeric,
  arr                      numeric,
  monthly_burn             numeric,
  runway_months            numeric,
  gross_margin             numeric,

  -- Traction (Susi / Patel)
  open_deals_count         integer,
  paying_customer_count    integer,
  mrr_growth_rate          numeric,   -- % month-over-month

  -- Product (Nova / Carter)
  pmf_score                numeric,   -- 0–100
  day30_retention          numeric,   -- % of users still active at day 30
  nps_score                numeric,   -- -100 to 100
  churn_rate               numeric,   -- % monthly

  -- Competitive (Atlas)
  competitor_count         integer,
  last_competitor_scan     timestamptz,

  -- Team (Harper)
  team_size                integer,
  open_roles_count         integer,

  -- Fundraising (Sage / Felix)
  investor_readiness_score numeric,   -- 0–100
  fundraising_stage        text,      -- 'pre-seed' | 'seed' | 'series-a' | etc.

  -- Growth (Riley / Patel)
  cac                      numeric,
  monthly_growth_rate      numeric,   -- % MoM

  -- Meta
  last_updated_by          text,      -- agent_id that last wrote
  updated_at               timestamptz DEFAULT now(),
  created_at               timestamptz DEFAULT now(),

  CONSTRAINT startup_state_user_id_unique UNIQUE (user_id)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS startup_state_user_id_idx ON startup_state (user_id);

-- RLS: users can only read/write their own row
ALTER TABLE startup_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "startup_state_select_own" ON startup_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "startup_state_insert_own" ON startup_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "startup_state_update_own" ON startup_state
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role bypass (agent chat runs with service role key)
CREATE POLICY "startup_state_service_role_all" ON startup_state
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_startup_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER startup_state_updated_at
  BEFORE UPDATE ON startup_state
  FOR EACH ROW EXECUTE FUNCTION update_startup_state_timestamp();

-- ── Proactive trigger log — tracks when automated agent actions fired ─────────
CREATE TABLE IF NOT EXISTS agent_trigger_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id    text NOT NULL,
  trigger     text NOT NULL,   -- 'weekly_scan' | 'runway_alert' | 'churn_risk' | 'stale_deal'
  status      text NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'done' | 'failed'
  result      text,
  fired_at    timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS agent_trigger_log_user_idx ON agent_trigger_log (user_id, agent_id);
CREATE INDEX IF NOT EXISTS agent_trigger_log_fired_idx ON agent_trigger_log (fired_at);

ALTER TABLE agent_trigger_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trigger_log_service_role" ON agent_trigger_log
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "trigger_log_select_own" ON agent_trigger_log
  FOR SELECT USING (auth.uid() = user_id);
