-- ============================================================
-- Phase 4 additions
-- 1. outreach_sends: add updated_at for webhook status updates
-- 2. deals: add win_reason + loss_reason for win/loss logging
-- 3. applications: add status for rejection tracking
-- ============================================================

-- Allow webhook to update status + timestamp on outreach_sends
ALTER TABLE outreach_sends
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for resend_id lookups (webhook events)
CREATE INDEX IF NOT EXISTS idx_outreach_sends_resend_id
  ON outreach_sends (resend_id)
  WHERE resend_id IS NOT NULL;

-- Index for contact_email lookups (webhook fallback)
CREATE INDEX IF NOT EXISTS idx_outreach_sends_contact_email
  ON outreach_sends (contact_email, user_id);

-- Win/loss reason logging on deals
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS win_reason  TEXT,
  ADD COLUMN IF NOT EXISTS loss_reason TEXT;

-- Application status for Harper rejection flow
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';  -- new | reviewed | rejected | accepted
