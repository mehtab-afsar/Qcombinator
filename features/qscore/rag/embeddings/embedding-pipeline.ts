/**
 * Artifact Embedding Pipeline
 *
 * Chunks artifact content JSON by semantic boundaries (top-level keys),
 * embeds each chunk, and stores in `artifact_embeddings` table.
 *
 * Called fire-and-forget from generate/route.ts after artifact creation.
 * Idempotent: deletes existing embeddings for same artifact before re-inserting.
 * Invalidates rag_score_cache for the user after embedding.
 */

import { createClient } from '@/lib/supabase/server';
import { embedBatch } from './embedder';
import { ARTIFACT_DIMENSION_MAP } from '@/lib/constants/artifact-dimension-map';
import type { ArtifactType } from '@/lib/constants/artifact-types';
import type { Dimension } from '@/lib/constants/dimensions';

const MAX_CHUNK_CHARS = 500;
const OVERLAP_CHARS = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactInput {
  id: string;
  user_id: string;
  artifact_type: string;
  content: Record<string, unknown>;
}

interface Chunk {
  index: number;
  text: string;
  metadata: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Chunking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flatten a JSON object into key-value text chunks.
 * Each top-level key becomes one chunk. Nested objects use dot notation.
 * Large values are split at sentence boundaries with overlap.
 */
function chunkArtifactContent(
  content: Record<string, unknown>,
  artifactType: string,
  artifactId: string
): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  function processValue(key: string, value: unknown): void {
    if (value === null || value === undefined) return;

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Recurse into nested objects with dot notation
      for (const [nestedKey, nestedVal] of Object.entries(value as Record<string, unknown>)) {
        processValue(`${key}.${nestedKey}`, nestedVal);
      }
      return;
    }

    // Convert to string representation
    let text: string;
    if (Array.isArray(value)) {
      text = `${key}: ${value.map(v =>
        typeof v === 'object' ? JSON.stringify(v) : String(v)
      ).join(', ')}`;
    } else {
      text = `${key}: ${String(value)}`;
    }

    // If short enough, single chunk
    if (text.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        index: chunkIndex++,
        text,
        metadata: { artifactType, key, artifactId },
      });
      return;
    }

    // Split large values at sentence boundaries with overlap
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > MAX_CHUNK_CHARS && currentChunk.length > 0) {
        chunks.push({
          index: chunkIndex++,
          text: currentChunk.trim(),
          metadata: { artifactType, key, artifactId },
        });
        // Overlap: keep last portion of current chunk
        const overlapStart = Math.max(0, currentChunk.length - OVERLAP_CHARS);
        currentChunk = currentChunk.slice(overlapStart) + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        index: chunkIndex++,
        text: currentChunk.trim(),
        metadata: { artifactType, key, artifactId },
      });
    }
  }

  for (const [key, value] of Object.entries(content)) {
    processValue(key, value);
  }

  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Embed an artifact's content and store in artifact_embeddings.
 * Idempotent: deletes existing embeddings for same artifact_id first.
 * Invalidates the user's rag_score_cache after embedding.
 *
 * @param artifact - Must have id, user_id, artifact_type, and content (parsed JSON)
 */
export async function embedArtifact(artifact: ArtifactInput): Promise<void> {
  if (!artifact.content || typeof artifact.content !== 'object') {
    console.warn('[Embedding Pipeline] Artifact has no content to embed:', artifact.id);
    return;
  }

  const supabase = await createClient();

  // 1. Chunk the artifact content semantically
  const chunks = chunkArtifactContent(
    artifact.content,
    artifact.artifact_type,
    artifact.id
  );

  if (chunks.length === 0) {
    console.warn('[Embedding Pipeline] No chunks generated for artifact:', artifact.id);
    return;
  }

  // 2. Embed all chunks (batch, max 20 at a time)
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20);
    const embeddings = await embedBatch(batch.map(c => c.text));
    allEmbeddings.push(...embeddings);
  }

  // 3. Delete existing embeddings for this artifact (idempotent)
  await supabase
    .from('artifact_embeddings')
    .delete()
    .eq('artifact_id', artifact.id);

  // 4. Insert new embeddings
  const rows = chunks.map((chunk, i) => ({
    user_id: artifact.user_id,
    artifact_id: artifact.id,
    chunk_index: chunk.index,
    chunk_text: chunk.text,
    embedding: `[${allEmbeddings[i].join(',')}]`,
    metadata: chunk.metadata,
  }));

  const { error } = await supabase
    .from('artifact_embeddings')
    .insert(rows);

  if (error) {
    console.error('[Embedding Pipeline] Insert failed:', error.message);
    return;
  }

  // 5. Dimension-specific cache invalidation
  // Only null the dimension columns affected by this artifact type — other
  // dimension scores in the same cache row remain valid.
  const affectedDims: Dimension[] =
    ARTIFACT_DIMENSION_MAP[artifact.artifact_type as ArtifactType] ?? [];

  if (affectedDims.length > 0) {
    // Build a partial update object that nulls only the affected columns.
    // rag_score_cache stores per-dimension scores as individual JSONB columns
    // named e.g. market_cache, product_cache, etc.
    const nullPatch = Object.fromEntries(
      affectedDims.map(dim => [`${dim}_cache`, null])
    );
    await supabase
      .from('rag_score_cache')
      .update(nullPatch)
      .eq('user_id', artifact.user_id);
  } else {
    // Unknown artifact type — invalidate the whole row to be safe
    await supabase
      .from('rag_score_cache')
      .delete()
      .eq('user_id', artifact.user_id);
  }

}
