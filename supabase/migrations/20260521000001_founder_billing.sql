-- Add Stripe billing columns to founder_profiles
-- Required for founder subscription management (Free → Premium $29/mo)

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id         TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id     TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status        TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
