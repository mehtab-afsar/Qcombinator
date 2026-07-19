-- Investor Portfolio Companies
-- Allows investors to add existing portfolio companies (on or off platform)
-- and invite founders to join via a signed token link.

CREATE TABLE IF NOT EXISTS investor_portfolio_companies (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_user_id  UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  founder_user_id   UUID REFERENCES auth.users ON DELETE SET NULL,
  company_name      TEXT NOT NULL,
  founder_name      TEXT,
  founder_email     TEXT,
  sector            TEXT,
  stage             TEXT,
  invested_at       DATE,
  investment_note   TEXT,
  invite_token      UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  invite_status     TEXT NOT NULL DEFAULT 'not_sent'
                      CHECK (invite_status IN ('not_sent', 'pending', 'accepted')),
  invite_sent_at    TIMESTAMPTZ,
  joined_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup during invite signup
CREATE INDEX IF NOT EXISTS idx_ipc_invite_token
  ON investor_portfolio_companies (invite_token);

-- Fast auto-link when founder registers organically by matching email
CREATE INDEX IF NOT EXISTS idx_ipc_founder_email
  ON investor_portfolio_companies (founder_email)
  WHERE founder_email IS NOT NULL;

-- Fast listing per investor
CREATE INDEX IF NOT EXISTS idx_ipc_investor_user_id
  ON investor_portfolio_companies (investor_user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ipc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists ipc_updated_at on investor_portfolio_companies;
CREATE TRIGGER ipc_updated_at
  BEFORE UPDATE ON investor_portfolio_companies
  FOR EACH ROW EXECUTE FUNCTION update_ipc_updated_at();

-- RLS
ALTER TABLE investor_portfolio_companies ENABLE ROW LEVEL SECURITY;

drop policy if exists "Investor manages own portfolio companies" on investor_portfolio_companies;
CREATE POLICY "Investor manages own portfolio companies"
  ON investor_portfolio_companies
  FOR ALL
  USING (auth.uid() = investor_user_id)
  WITH CHECK (auth.uid() = investor_user_id);

-- Service role can write (for auto-link on signup)
drop policy if exists "Service role full access" on investor_portfolio_companies;
CREATE POLICY "Service role full access"
  ON investor_portfolio_companies
  FOR ALL
  USING (auth.role() = 'service_role');
