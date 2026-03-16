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
