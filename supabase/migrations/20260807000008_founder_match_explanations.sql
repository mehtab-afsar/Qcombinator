-- ============================================================
-- founder_match_explanations — real caching for the AI "why this match" text
--
-- features/matching/services/match-rationale.ts generates a 2-3 sentence explanation of why
-- an investor is a good fit for a founder, shown on /founder/matching. Its doc comment (and
-- app/api/connections/rationale/route.ts's) claimed this was "cached in
-- connection_requests.match_metadata" — verified false: that column is never written. Every
-- hover on every page load fired a fresh LLM call with zero persistence.
--
-- Keyed the same way connection_requests already handles the real/demo investor ambiguity
-- (supabase/migrations/20260225000006_investors_and_connections.sql,
-- 20260512000004_connection_requests_unique.sql): twin nullable columns, since a demo investor
-- has no auth.users row to FK against. One improvement over that precedent: the CHECK constraint
-- enforces "exactly one investor id set" at the DB level instead of only in app code.
-- ============================================================

CREATE TABLE IF NOT EXISTS founder_match_explanations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  demo_investor_id  uuid,
  explanation       text        NOT NULL,
  match_score       integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founder_match_explanations_one_investor
    CHECK ((investor_id IS NOT NULL) <> (demo_investor_id IS NOT NULL))
);

COMMENT ON COLUMN founder_match_explanations.demo_investor_id IS
  'UUID from demo_investors. Used instead of investor_id when caching an explanation for a demo investor profile — demo investors have no auth.users row.';

-- Postgres UNIQUE ignores NULLs, so these two indexes don't conflict with each other — exactly
-- one of investor_id/demo_investor_id is ever set per row (enforced by the CHECK above).
CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_match_explanations_real_pair
  ON founder_match_explanations(founder_id, investor_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_match_explanations_demo_pair
  ON founder_match_explanations(founder_id, demo_investor_id);
CREATE INDEX IF NOT EXISTS idx_founder_match_explanations_founder
  ON founder_match_explanations(founder_id);

ALTER TABLE founder_match_explanations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founder_match_explanations_own" ON founder_match_explanations;
CREATE POLICY "founder_match_explanations_own" ON founder_match_explanations FOR ALL
  USING (auth.uid() = founder_id) WITH CHECK (auth.uid() = founder_id);
