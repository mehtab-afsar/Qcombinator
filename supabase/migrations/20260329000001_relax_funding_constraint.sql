-- Drop the legacy funding CHECK constraint.
-- Onboarding form sends values like 'friends-and-family' and 'series-a-plus'
-- which the old constraint rejects. The API maps these to legacy values,
-- but dropping the constraint future-proofs the column.
ALTER TABLE founder_profiles
  DROP CONSTRAINT IF EXISTS founder_profiles_funding_check;
