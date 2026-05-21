-- Idempotency table for webhook deduplication.
-- Prevents double-processing when Stripe or Resend retries delivery.
-- event_id is the provider's unique event identifier (e.g. evt_... for Stripe, svix-id for Resend).

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'resend',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS processed_webhook_events_event_id_idx
  ON processed_webhook_events (event_id);

-- Auto-purge events older than 30 days to keep the table lean.
-- Run manually or via a cron job:
-- DELETE FROM processed_webhook_events WHERE processed_at < NOW() - INTERVAL '30 days';

-- RLS: service role only (webhooks use admin client, no user auth)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
