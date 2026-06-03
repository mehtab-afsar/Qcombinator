-- Add verification_status to investor_profiles
-- pending   = newly registered, awaiting admin review
-- verified  = admin approved, full access unlocked
-- rejected  = admin rejected (shown error state on dashboard)

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT
    NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Index for admin queue queries
CREATE INDEX IF NOT EXISTS idx_investor_profiles_verification_status
  ON investor_profiles (verification_status);

-- For now, mark all existing investors as verified (they were manually reviewed)
UPDATE investor_profiles
  SET verification_status = 'verified'
  WHERE onboarding_completed = true;
