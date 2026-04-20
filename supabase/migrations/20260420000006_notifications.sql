-- Real-time notifications table
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
