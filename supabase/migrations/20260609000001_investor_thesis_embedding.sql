-- ============================================================
-- Migration: Add thesis_embedding to investor_profiles for semantic matching
-- ============================================================

-- Add thesis_embedding vector column to investor_profiles
ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS thesis_embedding vector(1024);

-- Create index for semantic search on thesis embeddings
CREATE INDEX IF NOT EXISTS idx_investor_profiles_thesis_embedding
  ON investor_profiles
  USING ivfflat (thesis_embedding vector_cosine_ops) WITH (lists = 10);

-- Comment for clarity
COMMENT ON COLUMN investor_profiles.thesis_embedding
  IS 'Vector embedding of investment thesis for semantic matching with founders via Voyage API';
