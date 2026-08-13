-- Records who actually wrote connection_requests.personal_message.
--
-- Founder-initiated requests (app/api/connections/route.ts) always have founder_id = the writer.
-- Investor-initiated outreach (app/api/investor/outreach/route.ts) always has investor_id = the
-- writer. But nothing recorded which case a given row was, so every UI that renders the note
-- (features/messaging/components/ThreadPanel.tsx) had to guess — it guessed "the other party
-- wrote it," which is only correct for the recipient's own view. The sender viewing their own
-- accepted connection saw their own words attributed to the person they sent them to.
--
-- Nullable: existing rows have no reliable way to backfill this (both flows write to the same
-- personal_message column with no other distinguishing signal). Callers treat NULL as "unknown"
-- and fall back to the same assumption the UI already made before this column existed, so
-- historical threads keep rendering exactly as they did — only new connections get it right.
ALTER TABLE connection_requests
  ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN connection_requests.requested_by IS
  'Which user actually wrote personal_message — founder_id for founder-initiated requests, investor_id for investor-initiated outreach. NULL for rows created before this column existed.';
