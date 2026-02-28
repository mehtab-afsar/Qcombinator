-- Add deal flow notification preference to investor_profiles
-- Default TRUE — investors are opted in to deal alerts unless they opt out.

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS deal_flow_notifications BOOLEAN DEFAULT true;

-- Investors can manage this via /investor/settings (already built)
COMMENT ON COLUMN investor_profiles.deal_flow_notifications IS
  'When true, investor receives Resend email when a high-Q-Score founder matching their thesis joins the platform.';

-- Add app URL field to avoid hardcoding in API
-- (handled via NEXT_PUBLIC_APP_URL env var — no schema change needed)
