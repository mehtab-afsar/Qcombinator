-- Store all investor notification preferences in a JSONB column.
-- deal_flow_notifications (existing boolean) stays for high-Q-Score alerts.
-- notification_preferences JSONB holds the richer per-type flags.

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN investor_profiles.notification_preferences IS
  'JSONB map of per-type notification flags: { highQScore, connectionReq, weeklyDigest }';
