-- outreach_sends: tracks every email Patel sends on behalf of a founder
-- Enables "Patel sent 47 emails today, 3 replied" reporting

CREATE TABLE IF NOT EXISTS outreach_sends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id     UUID,                             -- references agent_artifacts.id (nullable — may not be persisted yet)
  sequence_name   TEXT,                             -- e.g. "SaaS Founder Outreach"
  contact_email   TEXT NOT NULL,
  contact_name    TEXT,
  contact_company TEXT,
  contact_title   TEXT,
  step_index      INTEGER NOT NULL DEFAULT 0,       -- 0=first email, 1=follow-up, etc.
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  resend_id       TEXT,                             -- Resend message ID for tracking
  status          TEXT NOT NULL DEFAULT 'sent'      -- sent | opened | clicked | replied | bounced
);

CREATE INDEX IF NOT EXISTS idx_outreach_sends_user    ON outreach_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sends_email   ON outreach_sends(contact_email);
CREATE INDEX IF NOT EXISTS idx_outreach_sends_sent_at ON outreach_sends(user_id, sent_at DESC);

-- RLS: founders only see their own sends
ALTER TABLE outreach_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outreach_sends' AND policyname='Founders see own sends') THEN
    CREATE POLICY "Founders see own sends" ON outreach_sends
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- pending_actions: approval queue for all agent actions before execution
CREATE TABLE IF NOT EXISTS pending_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,                      -- 'patel', 'felix', 'sage', etc.
  action_type   TEXT NOT NULL,                      -- 'send_outreach', 'deploy_site', 'send_invoice', etc.
  title         TEXT NOT NULL,                      -- "Send 47 emails to SaaS founders"
  summary       TEXT,                               -- "3 email steps, personalized per contact"
  payload       JSONB NOT NULL DEFAULT '{}',        -- full action data (contacts, content, etc.)
  status        TEXT NOT NULL DEFAULT 'pending',    -- pending | approved | rejected | executing | done | failed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  executed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_actions_user   ON pending_actions(user_id, status);

ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pending_actions' AND policyname='Founders manage own actions') THEN
    CREATE POLICY "Founders manage own actions" ON pending_actions
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- agent_activity: audit log of everything agents do
CREATE TABLE IF NOT EXISTS agent_activity (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  action_type   TEXT NOT NULL,
  description   TEXT NOT NULL,                      -- human-readable: "Sent 47 emails to SaaS founders"
  metadata      JSONB DEFAULT '{}',                 -- { count: 47, opens: 12, replies: 3 }
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_user ON agent_activity(user_id, created_at DESC);

ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_activity' AND policyname='Founders see own activity') THEN
    CREATE POLICY "Founders see own activity" ON agent_activity
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
