-- ============================================================
-- Consolidates:
--   20260313000001_rag_evidence_embeddings.sql
--   20260314000001_observability.sql
--   20260315000001_rag_logs_v2.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260313000001_rag_evidence_embeddings.sql
-- ============================================================

-- RAG Evidence Embeddings & Cache
-- Enables pgvector for semantic search across agent artifacts,
-- allowing Q-Score to cross-reference founder claims with evidence.

-- Enable pgvector extension
create extension if not exists vector;

-- Embeddings for agent artifacts (semantically chunked by JSON key)
create table if not exists artifact_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  artifact_id uuid references agent_artifacts(id) on delete cascade not null,
  chunk_index int not null,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Indexes for artifact_embeddings
create index if not exists artifact_embeddings_user_idx
  on artifact_embeddings(user_id);

create index if not exists artifact_embeddings_artifact_idx
  on artifact_embeddings(artifact_id);

create index if not exists artifact_embeddings_vector_idx
  on artifact_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Cache table for RAG scores (avoid re-computing on same assessment data)
-- Invalidated two ways:
--   1. expires_at TTL (24 hours)
--   2. embedding-pipeline.ts deletes user rows after new artifact embedding
create table if not exists rag_score_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  assessment_hash text not null,
  scores jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '24 hours',
  unique(user_id, assessment_hash)
);

-- Index for TTL cleanup
create index if not exists rag_score_cache_expires_idx
  on rag_score_cache(expires_at);

-- Vector similarity search function for evidence matching
create or replace function match_artifact_embeddings(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float default 0.7,
  match_count int default 3
)
returns table (
  id uuid,
  artifact_id uuid,
  chunk_index int,
  chunk_text text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    ae.id,
    ae.artifact_id,
    ae.chunk_index,
    ae.chunk_text,
    ae.metadata,
    1 - (ae.embedding <=> query_embedding) as similarity
  from artifact_embeddings ae
  where ae.user_id = match_user_id
    and 1 - (ae.embedding <=> query_embedding) > match_threshold
  order by ae.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS policies
alter table artifact_embeddings enable row level security;
alter table rag_score_cache enable row level security;

-- Users can only see their own embeddings
create policy "Users can view own embeddings"
  on artifact_embeddings for select
  using (auth.uid() = user_id);

create policy "Users can insert own embeddings"
  on artifact_embeddings for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own embeddings"
  on artifact_embeddings for delete
  using (auth.uid() = user_id);

-- Users can only see their own cache
create policy "Users can view own cache"
  on rag_score_cache for select
  using (auth.uid() = user_id);

create policy "Users can insert own cache"
  on rag_score_cache for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own cache"
  on rag_score_cache for delete
  using (auth.uid() = user_id);

-- ============================================================
-- SOURCE: 20260314000001_observability.sql
-- ============================================================

-- ─── Observability: RAG + Tool Execution Logs ────────────────────────────────
-- These tables are internal/admin-only. No RLS needed.

-- RAG scoring execution log
-- Written fire-and-forget from app/api/qscore/calculate/route.ts
CREATE TABLE IF NOT EXISTS rag_execution_logs (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  scoring_method           TEXT        NOT NULL,              -- 'rag' | 'heuristic' | 'blended'
  rag_confidence           NUMERIC(4,3),                      -- 0.000–1.000
  latency_ms               INTEGER,
  answer_quality           JSONB,                             -- { problemStory: 72, customerQuote: 45, ... }
  evidence_corroborations  INTEGER     NOT NULL DEFAULT 0,
  evidence_conflicts       INTEGER     NOT NULL DEFAULT 0,
  error_msg                TEXT,                              -- null if successful
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_logs_created
  ON rag_execution_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_logs_user
  ON rag_execution_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_logs_method
  ON rag_execution_logs(scoring_method, created_at DESC);

-- Agent tool execution log
-- Written fire-and-forget from app/api/agents/chat/route.ts
CREATE TABLE IF NOT EXISTS tool_execution_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id     TEXT        NOT NULL,
  tool_name    TEXT        NOT NULL,   -- 'lead_enrich' | 'web_research' | 'create_deal' | artifact type
  status       TEXT        NOT NULL,   -- 'success' | 'error' | 'timeout'
  latency_ms   INTEGER,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_logs_created
  ON tool_execution_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_logs_agent
  ON tool_execution_logs(agent_id, tool_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_logs_status
  ON tool_execution_logs(status, created_at DESC);

-- ============================================================
-- SOURCE: 20260315000001_rag_logs_v2.sql
-- ============================================================

-- Migration: rag_logs_v2
-- Adds per-dimension columns to rag_execution_logs for Task 21 (Phase 7 Observability)
-- Adds args_hash + cost_usd to tool_execution_logs for Task 9 (Phase 3 executor)

-- ─── rag_execution_logs additions ────────────────────────────────────────────

ALTER TABLE rag_execution_logs
  ADD COLUMN IF NOT EXISTS dimension        TEXT,                           -- 'market' | 'product' | etc.
  ADD COLUMN IF NOT EXISTS rubric_score     NUMERIC(5,2),                   -- Layer 1 score 0–100
  ADD COLUMN IF NOT EXISTS evidence_score   NUMERIC(5,2),                   -- Layer 2 score 0–100
  ADD COLUMN IF NOT EXISTS benchmark_score  NUMERIC(5,2),                   -- Layer 3 score 0–100
  ADD COLUMN IF NOT EXISTS final_score      NUMERIC(5,2),                   -- blended final 0–100
  ADD COLUMN IF NOT EXISTS tokens_used      INTEGER,                        -- total LLM tokens
  ADD COLUMN IF NOT EXISTS cache_hit        BOOLEAN      NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_rag_logs_dimension
  ON rag_execution_logs(dimension, created_at DESC);

-- ─── tool_execution_logs additions ───────────────────────────────────────────

ALTER TABLE tool_execution_logs
  ADD COLUMN IF NOT EXISTS args_hash       TEXT,                            -- SHA-256 of args JSON
  ADD COLUMN IF NOT EXISTS cost_usd        NUMERIC(10,6),                   -- estimated API cost
  ADD COLUMN IF NOT EXISTS cache_hit       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS conversation_id UUID;                            -- for log correlation
