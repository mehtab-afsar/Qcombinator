-- Drop the legacy stage CHECK constraint so all onboarding stage values are valid.
-- The API maps new values (pre-product, beta, growing) to legacy equivalents,
-- but removing the constraint future-proofs the column.

ALTER TABLE founder_profiles
  DROP CONSTRAINT IF EXISTS founder_profiles_stage_check;
