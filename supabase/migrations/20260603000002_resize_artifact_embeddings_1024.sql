-- ============================================================
-- Resize artifact_embeddings from vector(1536) to vector(1024)
-- ============================================================
-- The embedder switched from OpenAI text-embedding-3-small (1536 dims)
-- to Voyage AI voyage-3 (1024 dims). All embedding columns and RPCs
-- that reference the old dimension must be updated to match.
--
-- Safe to run: existing rows have their embedding column set to NULL
-- after the column type change (no data is lost — embeddings will
-- be regenerated on the next artifact save).
-- ============================================================

-- ── Resize artifact_embeddings.embedding column ──────────────────────────
-- Drop the ivfflat index first (can't alter column type with index active)
drop index if exists artifact_embeddings_vector_idx;

-- Change column type — existing values become NULL (dimension mismatch)
alter table artifact_embeddings
  alter column embedding type vector(1024)
  using null;

-- Recreate vector index for new dimension
create index if not exists artifact_embeddings_vector_idx
  on artifact_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── Update match_artifact_embeddings RPC to vector(1024) ─────────────────
create or replace function match_artifact_embeddings(
  query_embedding  vector(1024),
  match_user_id    uuid,
  match_threshold  float default 0.7,
  match_count      int   default 3
)
returns table (
  id           uuid,
  artifact_id  uuid,
  chunk_index  int,
  chunk_text   text,
  metadata     jsonb,
  similarity   float
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
    and ae.embedding is not null
    and 1 - (ae.embedding <=> query_embedding) > match_threshold
  order by ae.embedding <=> query_embedding
  limit match_count;
$$;
