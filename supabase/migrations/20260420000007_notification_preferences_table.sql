-- Dedicated notification preferences table (replaces JSONB columns on investor/founder profiles)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  high_q_score            BOOLEAN     NOT NULL DEFAULT true,
  connection_req          BOOLEAN     NOT NULL DEFAULT true,
  weekly_digest           BOOLEAN     NOT NULL DEFAULT true,
  deal_flow_notifications BOOLEAN     NOT NULL DEFAULT true,
  email_notifications     BOOLEAN     NOT NULL DEFAULT true,
  qscore_updates          BOOLEAN     NOT NULL DEFAULT true,
  investor_messages       BOOLEAN     NOT NULL DEFAULT true,
  runway_alerts           BOOLEAN     NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own notification preferences"
  ON notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_preferences_updated_at();
