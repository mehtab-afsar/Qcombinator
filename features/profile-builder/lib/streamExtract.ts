import type { ExtractMeta } from '@/features/profile-builder/types'
import { readSSE } from '@/features/shared/lib/readSSE'

/**
 * One SSE consumer for /api/profile-builder/extract, shared by the pitch flow, the
 * main section chat, and smart-QA answers — the one established convention for
 * streaming chat in this codebase (app/investor/ai-analysis/page.tsx uses the same
 * parsing loop for its own SSE stream).
 */
export async function streamExtract(
  token: string,
  body: Record<string, unknown>,
  onDelta: (fullTextSoFar: string) => void,
): Promise<{ meta: ExtractMeta; followUpQuestion: string | null }> {
  const res = await fetch('/api/profile-builder/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(`Extract failed: ${res.status} — ${errBody.detail ?? errBody.error ?? ''}`)
  }
  let full = ''
  let meta: ExtractMeta = {}
  let followUpQuestion: string | null = null
  await readSSE(res.body, evt => {
    if (evt.type === 'meta') meta = evt as ExtractMeta
    else if (evt.type === 'delta') { full += evt.text as string; onDelta(full) }
    else if (evt.type === 'done') followUpQuestion = (evt.followUpQuestion as string | null) ?? null
  })
  return { meta, followUpQuestion }
}
