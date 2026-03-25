-- Add public portfolio fields to founder_profiles
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS is_public   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug TEXT    UNIQUE;

-- Index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_founder_profiles_public_slug
  ON founder_profiles (public_slug)
  WHERE public_slug IS NOT NULL;
