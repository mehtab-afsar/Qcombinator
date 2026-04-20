-- Ensure startup names are unique across founder profiles.
-- Before adding the constraint, deduplicate: keep the row with the highest
-- user_id (most recent) and suffix older duplicates so they don't collide.

DO $$
DECLARE
  r RECORD;
  suffix INT;
BEGIN
  FOR r IN
    SELECT startup_name
    FROM founder_profiles
    WHERE startup_name IS NOT NULL
    GROUP BY startup_name
    HAVING COUNT(*) > 1
  LOOP
    suffix := 1;
    UPDATE founder_profiles
    SET startup_name = startup_name || '_dup' || suffix
    WHERE user_id IN (
      SELECT user_id
      FROM founder_profiles
      WHERE startup_name = r.startup_name
      ORDER BY created_at ASC
      LIMIT (
        SELECT COUNT(*) - 1
        FROM founder_profiles
        WHERE startup_name = r.startup_name
      )
    );
  END LOOP;
END $$;

-- Add UNIQUE constraint
ALTER TABLE founder_profiles
  ADD CONSTRAINT founder_profiles_startup_name_unique UNIQUE (startup_name);

-- Normalise stage values: map any legacy/free-form values into the canonical set.
UPDATE founder_profiles
SET stage = CASE
  WHEN stage IN ('idea', 'Idea')            THEN 'idea'
  WHEN stage IN ('mvp', 'MVP')              THEN 'mvp'
  WHEN stage IN ('pre-seed', 'Pre-Seed', 'preseed', 'pre_seed') THEN 'pre-seed'
  WHEN stage IN ('seed', 'Seed', 'launched') THEN 'seed'
  WHEN stage IN ('series-a', 'Series A', 'series_a', 'scaling') THEN 'series-a'
  WHEN stage IN ('bootstrapped', 'Bootstrapped') THEN 'bootstrapped'
  ELSE stage
END
WHERE stage IS NOT NULL;

-- Add a CHECK constraint so only canonical values can be inserted going forward.
ALTER TABLE founder_profiles
  ADD CONSTRAINT founder_profiles_stage_check
  CHECK (stage IS NULL OR stage IN ('idea','mvp','pre-seed','seed','series-a','bootstrapped'));
