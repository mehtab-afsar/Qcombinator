-- Real 2-way messaging between founders and investors.
-- Messages are scoped to a connection_request (the accepted connection context).

CREATE TABLE IF NOT EXISTS messages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_request_id UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
  sender_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body                 TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  read_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages(connection_request_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient   ON messages(recipient_id, read_at) WHERE read_at IS NULL;

-- RLS: only sender and recipient can see messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_read" ON messages
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
