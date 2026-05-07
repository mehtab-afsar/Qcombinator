-- Notifications inbox
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,  -- 'agent_complete' | 'investor_view' | 'qscore_update' | 'message'
  title      TEXT        NOT NULL,
  body       TEXT,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "service role insert notifications"
  ON notifications FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "users update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Notification preferences (replaces JSONB columns on investor/founder profiles)
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
