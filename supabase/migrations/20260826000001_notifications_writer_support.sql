-- Phase 1 of the notification-system consolidation plan: additive support for a single writer
-- (lib/notifications/create.ts) instead of the 16 ad-hoc inserts it replaces.

-- Idempotency: lets the writer upsert on (user_id, dedupe_key) so a retried cron run or a
-- re-entered Rhythm cycle can't create the same notification twice. NULL dedupe_key (most
-- existing call sites won't pass one) is excluded from the uniqueness check — only rows that
-- opt in are deduped.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_key_idx
  ON notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Lets the UI distinguish "read a moment ago" from "read a week ago" without inferring it from
-- created_at — not used by any query yet, just available for Phase 3's inbox page.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- One new preference category: Rhythm cycle / Briefing notifications (coverage plan Phase 5).
-- The existing 8 columns already cover Q-Score, connections, deal flow, and digests — this is
-- the only category from the plan with no existing column to reuse. "Approvals & actions" is
-- deliberately NOT a column here: it's the product's one safety checkpoint, so the writer never
-- gates it on a preference — it always sends, matching ActionsPanel's own no-approval-gate rule.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS cycle_briefings BOOLEAN NOT NULL DEFAULT true;
