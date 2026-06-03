-- Add 3 fields to startup_state needed for upgraded agent evaluators.
--
-- last_icp_updated_at   — stamped by Patel when icp_document is generated.
--                          Patel evaluator fires if > 90 days without an update.
-- last_brand_updated_at — stamped by Maya when brand_messaging is generated.
--                          Maya evaluator fires if > 90 days without an update.
-- legal_risk_unresolved — written by Leo when legal_checklist is generated.
--                          Counts items with status='unresolved'.
--                          Leo evaluator fires if count > 2.

ALTER TABLE startup_state
  ADD COLUMN IF NOT EXISTS last_icp_updated_at     timestamptz,
  ADD COLUMN IF NOT EXISTS last_brand_updated_at   timestamptz,
  ADD COLUMN IF NOT EXISTS legal_risk_unresolved   integer NOT NULL DEFAULT 0;
