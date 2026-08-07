-- ============================================================
-- Backfill missing startup workspaces
--
-- Found live (7 Aug 2026) while fixing "Invite to team": `supabase db push` of a
-- data-only backfill failed with "column fp.startup_id does not exist" (SQLSTATE
-- 42703). Same class of gap as 20260609000001 / 20260807000001 — the July squash
-- (20260700000001_founder_profiles_squashed.sql) declares `startup_id` inside a
-- `CREATE TABLE IF NOT EXISTS founder_profiles`, which is a no-op on production
-- because that table predates the squash. Nobody wrote the corresponding ALTER
-- TABLE for this column, so it never actually existed on production — every
-- runtime query against founder_profiles.startup_id (team invites, team
-- members, signup) has been failing there. Step 1 below adds it, guarded the
-- same way as the prior two column-backfill migrations.
--
-- Step 2 is the actual data backfill this migration was originally written for:
-- 20260607000001_team_management.sql created one startup + owner membership per
-- founder, but only for founders that existed at that time, and
-- app/api/auth/signup/route.ts never created one for a normal signup afterwards
-- (only for someone joining via an invite teamToken) — so every founder who
-- signed up since then was stuck with startup_id = NULL, and "Invite to team"
-- failed immediately with "No workspace found". The signup route is fixed
-- alongside this migration to create a workspace for every future signup; this
-- backfills everyone already stuck.
--
-- Idempotent throughout: safe to re-run, and a no-op on a fresh rebuild-from-empty
-- database where the July squash already created the column and 20260607000001's
-- own backfill already covers every founder.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'founder_profiles') THEN
    ALTER TABLE founder_profiles
      ADD COLUMN IF NOT EXISTS startup_id UUID REFERENCES startups(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_founder_profiles_startup_id ON founder_profiles(startup_id);

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
