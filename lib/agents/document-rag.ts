/**
 * Document RAG — user-uploaded file retrieval for agent context injection.
 *
 * Files uploaded via /api/agents/chat/upload are chunked, embedded (OpenAI
 * text-embedding-3-small, 1536 dims), and stored in document_embeddings.
 *
 * At agent chat time, the current message is embedded and the top-k most
 * similar chunks are retrieved and injected into the system prompt.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { embedText, embedBatch } from '@/features/qscore/scoring/embeddings/embedder'

const CHUNK_SIZE = 512        // chars per chunk — fits cleanly within embedding model limits
const CHUNK_OVERLAP = 64      // overlap to avoid cutting mid-sentence
const MAX_CHUNKS_PER_FILE = 20

// ── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text]
  const chunks: string[] = []
  let pos = 0
  while (pos < text.length) {
    chunks.push(text.slice(pos, pos + CHUNK_SIZE))
    pos += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks.slice(0, MAX_CHUNKS_PER_FILE)
}

// ── Storage ───────────────────────────────────────────────────────────────────

/**
 * Embeds and stores document chunks in document_embeddings.
 * Designed to be called fire-and-forget — never throws to callers.
 */
export async function embedAndStoreDocument(
  userId: string,
  filename: string,
  parsedText: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (!parsedText || parsedText.trim().length < 20) return

  const chunks = chunkText(parsedText.trim())
  if (chunks.length === 0) return

  // Embed all chunks in one batch (max 20 — matches embedder batch limit)
  const embeddings = await embedBatch(chunks)

  const rows = chunks.map((chunk, i) => ({
    user_id:     userId,
    source_name: filename,
    chunk_index: i,
    chunk_text:  chunk,
    embedding:   JSON.stringify(embeddings[i]),  // Supabase expects array as JSON for vector
  }))

  await supabase.from('document_embeddings').insert(rows)
}

// ── Query ─────────────────────────────────────────────────────────────────────

interface DocumentChunk {
  source_name: string
  chunk_text:  string
  similarity:  number
}

/**
 * Retrieves the top-k most relevant document chunks for the current message.
 * Returns a formatted system prompt addition, or null if nothing relevant found.
 */
export async function getRelevantDocumentChunks(
  userId: string,
  query: string,
  supabase: SupabaseClient,
  maxChunks = 3,
): Promise<string | null> {
  const queryEmbedding = await embedText(query)

  const { data, error } = await supabase.rpc('match_document_embeddings', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_user_id:   userId,
    match_threshold: 0.65,
    match_count:     maxChunks,
  })

  if (error || !data || data.length === 0) return null

  const chunks = data as DocumentChunk[]

  // Group by source document for cleaner injection
  const bySource: Record<string, string[]> = {}
  for (const chunk of chunks) {
    if (!bySource[chunk.source_name]) bySource[chunk.source_name] = []
    bySource[chunk.source_name].push(chunk.chunk_text)
  }

  const sections = Object.entries(bySource).map(([name, texts]) =>
    `[From: ${name}]\n${texts.join('\n...\n')}`
  )

  return `\n\nFOUNDER DOCUMENTS — Relevant excerpts from files the founder has uploaded:\n${sections.join('\n\n')}\nUse this content when answering — it contains real data the founder shared.`
}
