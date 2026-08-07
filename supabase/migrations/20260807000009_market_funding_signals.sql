-- ============================================================
-- market_funding_signals — RAG Phase 3: a real, scheduled, free-data pipeline
--
-- Ingested by app/api/cron/ingest-market-signals/route.ts from TechCrunch's public venture RSS
-- feed (free, no paywall, no API key — see lib/techcrunch-rss.ts for the exact source and its
-- terms). Every classified item is stored, not just funding ones — that's what stops the same
-- non-funding commentary piece from being re-fetched and re-classified (burning LLM cost) on
-- every future cron tick, since the "have we seen this guid before" check is what skips it.
--
-- Consumed by lib/comparables/market-signals.ts → CompanyContext.marketSignals — unverified
-- third-party news, a different kind of fact from founder_profiles data, never anonymized (it's
-- already public), never touching the Q-Score.
-- ============================================================

CREATE TABLE IF NOT EXISTS market_funding_signals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL,
  external_id   text NOT NULL,
  published_at  timestamptz,
  source_url    text NOT NULL,
  event_type    text CHECK (event_type IN ('funding', 'acquisition', 'other')),
  company_name  text,
  sector        text,
  stage         text,
  round_amount  text,
  investors     text[],
  summary       text,
  raw_title     text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_market_funding_signals_type_published
  ON market_funding_signals(event_type, published_at);

ALTER TABLE market_funding_signals ENABLE ROW LEVEL SECURITY;

-- No policies, deliberately — service-role only, same shape as processed_webhook_events
-- (supabase/migrations/20260521000002_stripe_webhook_idempotency.sql). This is shared platform-wide market
-- data, not founder-scoped, and nothing ever queries it with a founder's own anon/authenticated
-- client — only the cron route (admin client) writes, only lib/comparables/market-signals.ts
-- (admin client) reads. RLS enabled with zero policies means anon/authenticated get nothing;
-- service_role bypasses RLS entirely, same as everywhere else in this codebase.
