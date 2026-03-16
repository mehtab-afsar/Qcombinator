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
