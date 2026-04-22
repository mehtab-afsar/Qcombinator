-- Academy content tables.
-- All content is publicly readable (anon + authenticated).
-- Only service_role can write — content is managed via the Supabase dashboard or admin API.

-- ─── academy_workshops ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_workshops (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  date            DATE NOT NULL,
  time            TEXT NOT NULL,            -- e.g. "4:00 PM UTC"
  duration        TEXT NOT NULL,            -- e.g. "90 minutes"
  instructor      TEXT NOT NULL,
  instructor_title TEXT NOT NULL,
  topic           TEXT NOT NULL CHECK (topic IN ('go-to-market','product','fundraising','team','operations','sales')),
  status          TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','past','live')),
  capacity        INTEGER NOT NULL DEFAULT 50,
  registered      INTEGER NOT NULL DEFAULT 0,
  spots_left      INTEGER NOT NULL DEFAULT 50,
  is_past         BOOLEAN NOT NULL DEFAULT false,
  recording_url   TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academy_workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_workshops: public read"
  ON academy_workshops FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "academy_workshops: service role full access"
  ON academy_workshops FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── academy_mentors ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_mentors (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                TEXT NOT NULL,
  title               TEXT NOT NULL,
  company             TEXT NOT NULL,
  expertise           TEXT[] NOT NULL DEFAULT '{}',
  availability        TEXT NOT NULL,
  sessions_completed  INTEGER NOT NULL DEFAULT 0,
  rating              NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  bio                 TEXT NOT NULL,
  avatar              TEXT NOT NULL DEFAULT '',   -- URL or empty string (initials used as fallback)
  linkedin            TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academy_mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_mentors: public read"
  ON academy_mentors FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "academy_mentors: service role full access"
  ON academy_mentors FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── academy_programs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_programs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  duration        TEXT NOT NULL,            -- e.g. "8 weeks"
  start_date      DATE NOT NULL,
  cohort_size     INTEGER NOT NULL DEFAULT 20,
  spots_left      INTEGER NOT NULL DEFAULT 20,
  min_q_score     INTEGER NOT NULL DEFAULT 0,
  stage           TEXT[] NOT NULL DEFAULT '{}',  -- e.g. ['pre-seed','seed']
  curriculum      TEXT[] NOT NULL DEFAULT '{}',  -- ordered list of module names
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','in-progress')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academy_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_programs: public read"
  ON academy_programs FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "academy_programs: service role full access"
  ON academy_programs FOR ALL TO service_role
  USING (true) WITH CHECK (true);
