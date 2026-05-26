-- Add portfolio_investor_id to founder_profiles
-- Set when a founder joins via an investor's invite link,
-- or auto-linked when they register with a matching email.

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS portfolio_investor_id UUID
    REFERENCES investor_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fp_portfolio_investor_id
  ON founder_profiles (portfolio_investor_id)
  WHERE portfolio_investor_id IS NOT NULL;
