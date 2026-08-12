/**
 * The one SSE-consumption method for the whole codebase (`data: {...}\n\n`, ending `[DONE]`).
 *
 * Fixes a real, confirmed bug in the four hand-rolled copies of this loop it replaces
 * (streamExtract.ts, useStreamedProposal.ts, useStreamedRhythmStep.ts, investor ai-analysis
 * page.tsx): each of those decoded and split EVERY chunk from `reader.read()` independently,
 * with no memory of a previous chunk. `reader.read()` chunk boundaries are arbitrary TCP/stream
 * slices, not line boundaries — a large event (e.g. a full generated document) routinely spans
 * two chunks. When it does, the tail half arrives not starting with "data: " (silently dropped)
 * and the head half is truncated JSON (`JSON.parse` throws, silently dropped) — the event never
 * fires, with no error anywhere. Traced as the root cause of a real production bug: the
 * Unveiling flow's final `done` event (carrying the whole proposal) is exactly the event most
 * likely to split, leaving founders stuck on "The read" forever with no error and no way forward.
 *
 * `decoder.decode(value, { stream: true })` — not the zero-arg default — also fixes a smaller,
 * related gap: a multi-byte UTF-8 character split across a chunk boundary.
 */

export async function readSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (evt: Record<string, unknown>) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  function processLine(line: string): void {
    if (!line.startsWith('data: ')) return
    const payload = line.slice(6).trim()
    if (!payload || payload === '[DONE]') return
    try {
      onEvent(JSON.parse(payload))
    } catch {
      /* a malformed line — skip it, same as every caller already did */
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    // The last element is whatever's after the final '\n' seen so far — either '' (the chunk
    // ended exactly on a line break) or a genuinely incomplete line. Either way it is NOT yet a
    // complete line, so it's kept for the next iteration instead of being processed now.
    buffer = lines.pop() ?? ''
    for (const line of lines) processLine(line)
  }

  // Flush: a final chunk with no trailing newline, or a completed multi-byte character still
  // held in the decoder's own internal buffer.
  buffer += decoder.decode()
  if (buffer) processLine(buffer)
}
