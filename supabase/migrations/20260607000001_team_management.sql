-- ============================================================
-- Team Management
-- Adds: startups, startup_members, team_invites,
--       investor_team_members, investor_team_invites
-- ============================================================

-- ── 1. Canonical startup entity ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS startups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  industry        TEXT,
  stage           TEXT,
  website         TEXT,
  description     TEXT,
  owner_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill: one startup per existing founder, then link it via startup_id.
--
-- ⚠️ GUARDED + MADE IDEMPOTENT (19 Jul 2026). Two bugs surfaced on `db push`:
--
--  1. ORDERING. This June migration writes `founder_profiles.startup_id`, but that
--     column is defined in the JULY squash (20260700000001) that runs *after*
--     this one — and does not exist in production. Replaying in date order,
--     June-before-July, the UPDATE aborted with "column startup_id does not
--     exist" (SQLSTATE 42703). When these dashboard-first migrations were written
--     every object existed at once, so ordering was never exercised.
--
--  2. NON-IDEMPOTENT INSERT. The original `INSERT ... ON CONFLICT DO NOTHING`
--     conflicts on the random-UUID primary key, so it never conflicts — a re-run
--     would create a duplicate startup for every founder.
--
-- Fix: guard the whole backfill on the column existing (no-op until it does —
-- linking is impossible without it, so creating orphan startups is pointless),
-- and insert only for founders who don't already have a startup.
--
-- This touches only backfill DATA of the old-model team feature; no old code path.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'founder_profiles'
      AND column_name  = 'startup_id'
  ) THEN
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
  END IF;
END $$;

-- ── 2. Workspace membership ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS startup_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id  UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by  UUID REFERENCES auth.users(id),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (startup_id, user_id)
);

-- Backfill: every existing founder is the owner of their startup
INSERT INTO startup_members (startup_id, user_id, role, joined_at)
SELECT s.id, s.owner_user_id, 'owner', NOW()
FROM   startups s
WHERE  s.owner_user_id IS NOT NULL
ON CONFLICT (startup_id, user_id) DO NOTHING;

-- ── 3. Pending team invites (founder side) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id  UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_token     ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_startup   ON team_invites(startup_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email     ON team_invites(email);

-- ── 4. Investor team members (analyst access) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS investor_team_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('admin', 'analyst')),
  invited_by        UUID REFERENCES auth.users(id),
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (investor_user_id, member_user_id)
);

CREATE TABLE IF NOT EXISTS investor_team_invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('admin', 'analyst')),
  token             TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by        UUID REFERENCES auth.users(id),
  expires_at        TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_team_invites_token    ON investor_team_invites(token);
CREATE INDEX IF NOT EXISTS idx_inv_team_invites_investor ON investor_team_invites(investor_user_id);

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_startup_members_startup  ON startup_members(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_members_user     ON startup_members(user_id);
CREATE INDEX IF NOT EXISTS idx_startups_owner           ON startups(owner_user_id);
-- idx_founder_profiles_startup defined in 20260700000001_founder_profiles_squashed.sql

-- ── 6. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE startups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_team_invites ENABLE ROW LEVEL SECURITY;

-- startups: readable by members, writable by owner/admin
drop policy if exists "startup members can read their startup" on startups;
CREATE POLICY "startup members can read their startup"
  ON startups FOR SELECT
  USING (
    id IN (
      SELECT startup_id FROM startup_members WHERE user_id = auth.uid()
    )
  );

drop policy if exists "startup owner can update" on startups;
CREATE POLICY "startup owner can update"
  ON startups FOR UPDATE
  USING (owner_user_id = auth.uid());

-- startup_members: members can read their workspace; owner can insert/delete
drop policy if exists "members can read their workspace members" on startup_members;
CREATE POLICY "members can read their workspace members"
  ON startup_members FOR SELECT
  USING (
    startup_id IN (
      SELECT startup_id FROM startup_members WHERE user_id = auth.uid()
    )
  );

drop policy if exists "owner or admin can add members" on startup_members;
CREATE POLICY "owner or admin can add members"
  ON startup_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM startup_members
      WHERE startup_id = startup_members.startup_id
        AND user_id    = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

drop policy if exists "owner can remove members" on startup_members;
CREATE POLICY "owner can remove members"
  ON startup_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM startup_members sm
      WHERE sm.startup_id = startup_members.startup_id
        AND sm.user_id    = auth.uid()
        AND sm.role       = 'owner'
    )
    OR user_id = auth.uid()  -- members can remove themselves
  );

-- team_invites: readable by workspace members; creatable by owner/admin
drop policy if exists "workspace members can read invites" on team_invites;
CREATE POLICY "workspace members can read invites"
  ON team_invites FOR SELECT
  USING (
    startup_id IN (
      SELECT startup_id FROM startup_members WHERE user_id = auth.uid()
    )
  );

drop policy if exists "owner or admin can create invites" on team_invites;
CREATE POLICY "owner or admin can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM startup_members
      WHERE startup_id = team_invites.startup_id
        AND user_id    = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

drop policy if exists "owner or admin can delete invites" on team_invites;
CREATE POLICY "owner or admin can delete invites"
  ON team_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM startup_members
      WHERE startup_id = team_invites.startup_id
        AND user_id    = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- investor_team_members: readable by the investor and their members
drop policy if exists "investor team members can read" on investor_team_members;
CREATE POLICY "investor team members can read"
  ON investor_team_members FOR SELECT
  USING (
    investor_user_id = auth.uid()
    OR member_user_id = auth.uid()
  );

drop policy if exists "investor owner can manage team" on investor_team_members;
CREATE POLICY "investor owner can manage team"
  ON investor_team_members FOR ALL
  USING (investor_user_id = auth.uid());

-- investor_team_invites: readable/writable by the investor owner
drop policy if exists "investor owner can manage invites" on investor_team_invites;
CREATE POLICY "investor owner can manage invites"
  ON investor_team_invites FOR ALL
  USING (investor_user_id = auth.uid());
