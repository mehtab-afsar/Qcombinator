-- Academy calendar registration — schema.
--
-- academy_workshops.date/time are separate free-text-ish columns ("4:00 PM UTC") with no
-- reliable ISO datetime for calendar placement or a "Add to Google Calendar" link. Adding
-- starts_at/ends_at as new nullable columns rather than replacing date/time: the existing
-- list-view cards in app/founder/academy/page.tsx keep reading date/time unchanged, zero
-- regression risk. starts_at/ends_at become the source of truth for anything calendar-shaped;
-- every new row (seed migration, future admin writes) should set all four fields consistently.

ALTER TABLE academy_workshops
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_academy_workshops_starts_at ON academy_workshops(starts_at);

-- ─── academy_event_registrations ───────────────────────────────────────────────
-- founder_id references auth.users(id) directly — matching connection_requests.founder_id's
-- exact FK target (supabase/migrations/20250101000001_create_tables.sql), not founder_profiles.
--
-- Unregistering flips status to 'cancelled' rather than deleting the row: preserves an audit
-- trail, and re-registering flips it back via ON CONFLICT ... DO UPDATE (see the RPC migration)
-- rather than a second insert racing the UNIQUE constraint.

CREATE TABLE IF NOT EXISTS academy_event_registrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id  TEXT NOT NULL REFERENCES academy_workshops(id) ON DELETE CASCADE,
  founder_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE (workshop_id, founder_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_registrations_founder ON academy_event_registrations(founder_id);

ALTER TABLE academy_event_registrations ENABLE ROW LEVEL SECURITY;

-- Postgres has no CREATE POLICY IF NOT EXISTS — an explicit DROP IF EXISTS immediately
-- before each CREATE is the only way this migration is safe to re-run (verified by
-- __tests__/migration-idempotency.test.ts; schema here has previously been changed via
-- the Supabase dashboard with the migration file written after the fact).

DROP POLICY IF EXISTS "academy_event_registrations: founder reads own" ON academy_event_registrations;
CREATE POLICY "academy_event_registrations: founder reads own"
  ON academy_event_registrations FOR SELECT TO authenticated
  USING (founder_id = auth.uid());

DROP POLICY IF EXISTS "academy_event_registrations: founder inserts own" ON academy_event_registrations;
CREATE POLICY "academy_event_registrations: founder inserts own"
  ON academy_event_registrations FOR INSERT TO authenticated
  WITH CHECK (founder_id = auth.uid());

DROP POLICY IF EXISTS "academy_event_registrations: founder updates own" ON academy_event_registrations;
CREATE POLICY "academy_event_registrations: founder updates own"
  ON academy_event_registrations FOR UPDATE TO authenticated
  USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());

DROP POLICY IF EXISTS "academy_event_registrations: service role full access" ON academy_event_registrations;
CREATE POLICY "academy_event_registrations: service role full access"
  ON academy_event_registrations FOR ALL TO service_role
  USING (true) WITH CHECK (true);
