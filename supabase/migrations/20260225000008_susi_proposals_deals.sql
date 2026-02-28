-- Susi Sales Agent: proposals + deals pipeline

-- proposals: tracks every sent sales proposal
CREATE TABLE IF NOT EXISTS proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id      UUID,                           -- links to the sales_script agent_artifact
  prospect_name    TEXT NOT NULL,
  prospect_email   TEXT NOT NULL,
  prospect_company TEXT,
  prospect_title   TEXT,
  deal_value       TEXT,                           -- e.g. "$12,000/year"
  use_case         TEXT,                           -- what they want to solve
  subject          TEXT NOT NULL,
  proposal_html    TEXT NOT NULL,                  -- full HTML email body
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at        TIMESTAMPTZ,
  replied_at       TIMESTAMPTZ,
  resend_id        TEXT,
  status           TEXT NOT NULL DEFAULT 'sent'    -- sent | opened | replied | won | lost
);

CREATE INDEX IF NOT EXISTS idx_proposals_user     ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_prospect ON proposals(user_id, prospect_email);
CREATE INDEX IF NOT EXISTS idx_proposals_sent_at  ON proposals(user_id, sent_at DESC);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proposals' AND policyname='Founders manage own proposals') THEN
    CREATE POLICY "Founders manage own proposals" ON proposals
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;


-- deals: lightweight CRM pipeline
CREATE TABLE IF NOT EXISTS deals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company          TEXT NOT NULL,
  contact_name     TEXT,
  contact_email    TEXT,
  contact_title    TEXT,
  stage            TEXT NOT NULL DEFAULT 'lead',   -- lead | qualified | proposal | negotiating | won | lost
  value            TEXT,                           -- deal value string e.g. "$5,000/mo"
  notes            TEXT,
  next_action      TEXT,                           -- what to do next
  next_action_date DATE,
  source           TEXT DEFAULT 'manual',          -- manual | susi_suggested | proposal_sent
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_user  ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(user_id, stage);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deals' AND policyname='Founders manage own deals') THEN
    CREATE POLICY "Founders manage own deals" ON deals
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
