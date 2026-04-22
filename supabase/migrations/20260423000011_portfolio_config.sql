-- Portfolio display configuration for investor accounts
ALTER TABLE investor_profiles ADD COLUMN IF NOT EXISTS portfolio_display_config JSONB DEFAULT NULL;
