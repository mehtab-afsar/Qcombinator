/**
 * OpenAI Embedding Wrapper
 *
 * Uses text-embedding-3-small (1536 dims) for vector embeddings.
 * Only used for artifact chunk embeddings — not for chat or scoring.
 *
 * Requires OPENAI_API_KEY env var.
 */

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
const MAX_BATCH_SIZE = 20;

export { EMBEDDING_DIMS };

/**
 * Embed a single text string into a 1536-dimensional vector.
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('[Embedder] OPENAI_API_KEY not configured');
  }

  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH_SIZE) {
    throw new Error(`[Embedder] Batch size ${texts.length} exceeds max ${MAX_BATCH_SIZE}`);
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMS,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[Embedder] OpenAI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const embeddings: { index: number; embedding: number[] }[] = data.data;

  // Sort by index to ensure order matches input
  return embeddings
    .sort((a, b) => a.index - b.index)
    .map(e => e.embedding);
}
