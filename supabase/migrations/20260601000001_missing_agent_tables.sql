-- Migration: backfill tables that exist in the live DB but had no migration file.
-- These were created directly via Supabase dashboard. Writing them here so that
-- a full tear-down + rebuild from migrations produces an identical schema.
-- All statements use CREATE TABLE IF NOT EXISTS so they are safe to run against
-- a DB that already has these tables.

-- ── agent_goals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_goals (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id           text        NOT NULL,
  goal               text        NOT NULL,
  priority           text        NOT NULL,
  status             text        NOT NULL DEFAULT 'active',
  reason             text        NOT NULL DEFAULT '',
  success_condition  text        NOT NULL,
  suggested_action   text,
  last_evaluated     timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_goals ENABLE ROW LEVEL SECURITY;
drop policy if exists "agent_goals_owner" on agent_goals;
CREATE POLICY "agent_goals_owner" ON agent_goals
  USING (auth.uid() = user_id);

-- ── artifact_embeddings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artifact_embeddings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id  uuid        NOT NULL REFERENCES agent_artifacts(id) ON DELETE CASCADE,
  chunk_index  integer     NOT NULL,
  chunk_text   text        NOT NULL,
  embedding    text,           -- stored as text; cast to vector in queries
  metadata     jsonb,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE artifact_embeddings ENABLE ROW LEVEL SECURITY;
drop policy if exists "artifact_embeddings_owner" on artifact_embeddings;
CREATE POLICY "artifact_embeddings_owner" ON artifact_embeddings
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_artifact
  ON artifact_embeddings (artifact_id);

-- ── content_calendar ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_calendar (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week       integer     NOT NULL,
  channel    text        NOT NULL,
  topic      text        NOT NULL,
  angle      text,
  status     text        NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
drop policy if exists "content_calendar_owner" on content_calendar;
CREATE POLICY "content_calendar_owner" ON content_calendar
  USING (auth.uid() = user_id);

-- ── customer_accounts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company      text        NOT NULL,
  contact_name text,
  arr          numeric,
  health       text        NOT NULL DEFAULT 'healthy',
  stage        text        NOT NULL DEFAULT 'active',
  last_contact date,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
drop policy if exists "customer_accounts_owner" on customer_accounts;
CREATE POLICY "customer_accounts_owner" ON customer_accounts
  USING (auth.uid() = user_id);

-- ── growth_experiments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth_experiments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hypothesis text        NOT NULL,
  channel    text,
  metric     text,
  result     text,
  status     text        NOT NULL DEFAULT 'running',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE growth_experiments ENABLE ROW LEVEL SECURITY;
drop policy if exists "growth_experiments_owner" on growth_experiments;
CREATE POLICY "growth_experiments_owner" ON growth_experiments
  USING (auth.uid() = user_id);

-- ── hiring_candidates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hiring_candidates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  role       text        NOT NULL,
  stage      text        NOT NULL DEFAULT 'applied',
  score      numeric,
  source     text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hiring_candidates ENABLE ROW LEVEL SECURITY;
drop policy if exists "hiring_candidates_owner" on hiring_candidates;
CREATE POLICY "hiring_candidates_owner" ON hiring_candidates
  USING (auth.uid() = user_id);

-- ── knowledge_library ─────────────────────────────────────────────────────────
-- Shared (admin-managed) content library used by the Academy feature.
-- No user_id FK — rows are global, not per-user.
CREATE TABLE IF NOT EXISTS knowledge_library (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  summary          text        NOT NULL,
  type             text        NOT NULL,
  format           text        NOT NULL DEFAULT 'article',
  source           text        NOT NULL,
  url              text,
  author           text,
  topic_cluster    text        NOT NULL,
  function_owner   text        NOT NULL,
  access_level     text        NOT NULL DEFAULT 'free',
  tags             text[]      NOT NULL DEFAULT '{}',
  stage_relevance  text[]      NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_library ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read; only service role can write.
drop policy if exists "knowledge_library_read" on knowledge_library;
CREATE POLICY "knowledge_library_read" ON knowledge_library
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── legal_risks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legal_risks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  category   text        NOT NULL DEFAULT 'general',
  severity   text        NOT NULL DEFAULT 'medium',
  resolved   boolean     NOT NULL DEFAULT false,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE legal_risks ENABLE ROW LEVEL SECURITY;
drop policy if exists "legal_risks_owner" on legal_risks;
CREATE POLICY "legal_risks_owner" ON legal_risks
  USING (auth.uid() = user_id);

-- ── qscore_knowledge_chunks ───────────────────────────────────────────────────
-- Seeded content used by the Q-Score RAG retrieval pipeline.
-- id is text (slug-based), not a generated uuid.
CREATE TABLE IF NOT EXISTS qscore_knowledge_chunks (
  id         text        PRIMARY KEY,
  title      text        NOT NULL,
  content    text        NOT NULL,
  dimension  text        NOT NULL,
  category   text        NOT NULL,
  sector     text[]      NOT NULL,
  stage      text[]      NOT NULL,
  metadata   jsonb       NOT NULL DEFAULT '{}',
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qscore_knowledge_chunks ENABLE ROW LEVEL SECURITY;
drop policy if exists "qscore_knowledge_chunks_read" on qscore_knowledge_chunks;
CREATE POLICY "qscore_knowledge_chunks_read" ON qscore_knowledge_chunks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_qscore_knowledge_chunks_dimension
  ON qscore_knowledge_chunks (dimension);
CREATE INDEX IF NOT EXISTS idx_qscore_knowledge_chunks_active
  ON qscore_knowledge_chunks (active) WHERE active = true;
