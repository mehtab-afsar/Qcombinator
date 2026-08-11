-- ============================================================
-- Catch-up backfill: Google OAuth founders still missing a startup workspace
--
-- 20260807000002 backfilled every founder stuck with startup_id = NULL at the time and
-- fixed the email/password signup route (app/api/auth/signup/route.ts) to create a
-- workspace for every future signup — but it never touched app/auth/callback/route.ts
-- (the Google OAuth path), which has never created one. Every founder who signed up via
-- Google since 20260607000001_team_management.sql shipped has startup_id = NULL, same
-- root cause, different route. app/auth/callback/route.ts is fixed alongside this
-- migration (same pattern as the prior fix); this backfills everyone already stuck.
--
-- Idempotent: the same WHERE fp.startup_id IS NULL / NOT EXISTS guards as
-- 20260807000002, so a re-run or a fresh database with no stragglers is a no-op.
-- ============================================================

INSERT INTO startups (id, name, industry, stage, website, description, owner_user_id)
SELECT gen_random_uuid(),
       COALESCE(fp.startup_name, fp.company_name, 'Untitled Startup'),
       fp.industry, fp.stage, fp.website, NULL, fp.user_id
FROM founder_profiles fp
WHERE fp.startup_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM startups s WHERE s.owner_user_id = fp.user_id);

UPDATE founder_profiles fp
SET    startup_id = s.id
FROM   startups s
WHERE  s.owner_user_id = fp.user_id
  AND  fp.startup_id IS NULL;

INSERT INTO startup_members (startup_id, user_id, role, joined_at)
SELECT s.id, s.owner_user_id, 'owner', NOW()
FROM   startups s
WHERE  s.owner_user_id IS NOT NULL
ON CONFLICT (startup_id, user_id) DO NOTHING;
