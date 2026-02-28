-- Add unique index on deals(user_id, contact_email) for upsert support
-- Partial index: only enforces uniqueness when contact_email is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_user_contact_email
  ON deals(user_id, contact_email)
  WHERE contact_email IS NOT NULL;
