import type { ExtractMeta } from '@/features/profile-builder/types'

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
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let full = ''
  let meta: ExtractMeta = {}
  let followUpQuestion: string | null = null
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of dec.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload || payload === '[DONE]') continue
      let evt: Record<string, unknown>
      try { evt = JSON.parse(payload) } catch { continue }
      if (evt.type === 'meta') meta = evt as ExtractMeta
      else if (evt.type === 'delta') { full += evt.text as string; onDelta(full) }
      else if (evt.type === 'done') followUpQuestion = (evt.followUpQuestion as string | null) ?? null
    }
  }
  return { meta, followUpQuestion }
}
