-- Investor watchlist: lets investors watch specific founders and get alerted
-- when they hit a Q-Score threshold.

CREATE TABLE IF NOT EXISTS investor_watchlist (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  founder_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threshold_qscore  integer,    -- alert when founder reaches this score (null = watch only)
  notified_at       timestamptz,-- when the threshold alert was sent (null = not yet sent)
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(investor_id, founder_id)
);

CREATE INDEX IF NOT EXISTS idx_investor_watchlist_investor ON investor_watchlist(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_watchlist_threshold
  ON investor_watchlist(threshold_qscore, notified_at)
  WHERE notified_at IS NULL;

-- RLS: investors can only see/manage their own watchlist
ALTER TABLE investor_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investor_watchlist_own"
  ON investor_watchlist FOR ALL
  USING (auth.uid() = investor_id)
  WITH CHECK (auth.uid() = investor_id);
