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
