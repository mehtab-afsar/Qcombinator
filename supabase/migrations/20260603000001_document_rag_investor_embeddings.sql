-- ============================================================
-- Document RAG + Investor Embedding Matching
-- ============================================================
-- 1. document_embeddings  — stores user-uploaded file chunks for agent context RAG
-- 2. demo_investors.thesis_embedding — pre-computed thesis vector for cosine matching
-- 3. founder_profiles.iq_summary_embedding — pre-computed founder summary vector
-- 4. match_document_embeddings() — RPC for document RAG queries
-- 5. match_investors_by_embedding() — RPC for vector-based investor matching
-- ============================================================

-- ── 1. Document Embeddings ──────────────────────────────────────────────────
-- Stores chunked text from files uploaded via /api/agents/chat/upload.
-- Each file is split into ≤512-char chunks; each chunk gets a 1536-dim embedding.

create table if not exists document_embeddings (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users(id) on delete cascade not null,
  source_name  text        not null,  -- original filename
  chunk_index  int         not null,
  chunk_text   text        not null,
  embedding    vector(1024),
  created_at   timestamptz default now()
);

create index if not exists document_embeddings_user_idx
  on document_embeddings(user_id);

create index if not exists document_embeddings_vector_idx
  on document_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- RLS: founders can only access their own document embeddings
alter table document_embeddings enable row level security;

create policy "founders_own_document_embeddings"
  on document_embeddings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. match_document_embeddings RPC ───────────────────────────────────────
-- Returns top-k chunks most semantically similar to the query embedding.
-- Used by the agent chat route to inject relevant uploaded document context.

create or replace function match_document_embeddings(
  query_embedding  vector(1024),
  match_user_id    uuid,
  match_threshold  float   default 0.65,
  match_count      int     default 3
)
returns table (
  id           uuid,
  source_name  text,
  chunk_index  int,
  chunk_text   text,
  similarity   float
)
language sql stable
as $$
  select
    de.id,
    de.source_name,
    de.chunk_index,
    de.chunk_text,
    1 - (de.embedding <=> query_embedding) as similarity
  from document_embeddings de
  where de.user_id = match_user_id
    and de.embedding is not null
    and 1 - (de.embedding <=> query_embedding) > match_threshold
  order by de.embedding <=> query_embedding
  limit match_count;
$$;

-- ── 3. Investor thesis embeddings ──────────────────────────────────────────
-- Pre-computed 1536-dim embedding of each investor's thesis text.
-- Populated by /api/admin/embed-investors (admin endpoint).

alter table demo_investors
  add column if not exists thesis_embedding vector(1024);

create index if not exists demo_investors_embedding_idx
  on demo_investors
  using ivfflat (thesis_embedding vector_cosine_ops) with (lists = 10);

-- ── 4. Founder IQ summary embeddings ───────────────────────────────────────
-- Computed at Q-Score submission time from a concatenation of founder profile fields.
-- Used for cosine matching against investor thesis at match time.

alter table founder_profiles
  add column if not exists iq_summary_embedding vector(1024);

-- ── 5. match_investors_by_embedding RPC ────────────────────────────────────
-- Returns investors ranked by cosine similarity to the founder's IQ summary embedding.
-- Called by /api/matching — result is blended 70/30 with formula score.

create or replace function match_investors_by_embedding(
  founder_embedding  vector(1024),
  match_threshold    float  default 0.30,
  match_count        int    default 50
)
returns table (
  id          uuid,
  similarity  float
)
language sql stable
as $$
  select
    di.id,
    1 - (di.thesis_embedding <=> founder_embedding) as similarity
  from demo_investors di
  where di.thesis_embedding is not null
    and di.is_active = true
    and 1 - (di.thesis_embedding <=> founder_embedding) > match_threshold
  order by di.thesis_embedding <=> founder_embedding
  limit match_count;
$$;
