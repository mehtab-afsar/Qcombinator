-- Store founder notification preferences in a JSONB column.
-- Mirrors the investor_profiles.notification_preferences pattern.

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN founder_profiles.notification_preferences IS
  'JSONB map of per-type notification flags: { emailNotifications, qScoreUpdates, investorMessages, weeklyDigest }';
