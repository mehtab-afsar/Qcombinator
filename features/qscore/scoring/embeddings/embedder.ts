/**
 * Voyage AI Embedding Wrapper
 *
 * Uses voyage-3 (1024 dims) for vector embeddings.
 * Used for document chunk RAG and investor/founder matching.
 *
 * Requires VOYAGE_API_KEY env var.
 */

const EMBEDDING_MODEL = 'voyage-3';
const EMBEDDING_DIMS  = 1024;
const MAX_BATCH_SIZE  = 20;
const VOYAGE_URL      = 'https://api.voyageai.com/v1/embeddings';

export { EMBEDDING_DIMS };

/**
 * Embed a single text string into a 1024-dimensional vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const [result] = await embedBatch([text]);
  return result;
}

/**
 * Embed multiple texts in a single API call (max 20).
 * Returns embeddings in the same order as inputs.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('[Embedder] VOYAGE_API_KEY not configured');

  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH_SIZE) {
    throw new Error(`[Embedder] Batch size ${texts.length} exceeds max ${MAX_BATCH_SIZE}`);
  }

  const response = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[Embedder] Voyage API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as {
    data: Array<{ index: number; embedding: number[] }>;
  };

  return data.data
    .sort((a, b) => a.index - b.index)
    .map(e => e.embedding);
}
