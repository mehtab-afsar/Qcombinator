'use client'

/**
 * The node workspace's load/save/restore/direct-a-rework logic (CANVAS_SPEC §5), extracted from
 * app/founder/assets/[id]/page.tsx so the new cockpit slide-over (AssetWorkspacePanel.tsx) and
 * that existing page can both use it without a second copy (CLAUDE.md "no duplicated logic").
 *
 * Thin over /api/assets/:id (GET/PUT) and /api/assets/:id/direct — no backend changes, all three
 * routes already work correctly; this only moves the client-side orchestration to one place.
 */

import { useCallback, useEffect, useState } from 'react'

export interface AssetVersion {
  id: string
  version: number
  isCurrent: boolean
  content: unknown
  authoredBy: 'program' | 'founder'
  updateReason: string | null
  createdAt: string
}

export interface AssetDefinition { id: string; name: string; outputSchema: 'markdown' | 'json' }

/** Content ⇄ editable text. markdown is already a string; json is pretty-printed. */
export function toText(content: unknown, schema: 'markdown' | 'json'): string {
  if (schema === 'markdown') return typeof content === 'string' ? content : ''
  try { return JSON.stringify(content ?? {}, null, 2) } catch { return '' }
}
function fromText(text: string, schema: 'markdown' | 'json'): unknown {
  return schema === 'markdown' ? text : JSON.parse(text)
}

export function useAssetWorkspace(assetId: string) {
  const [def, setDef] = useState<AssetDefinition | null>(null)
  const [history, setHistory] = useState<AssetVersion[]>([])
  const [draft, setDraft] = useState('')
  const [current, setCurrent] = useState<AssetVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')
  const [directing, setDirecting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}`)
      if (res.status === 404) { setError('This asset is not available.'); return }
      if (!res.ok) throw new Error('load')
      const data = await res.json()
      setDef(data.definition)
      setCurrent(data.asset)
      setHistory(data.history ?? [])
      setDraft(data.asset ? toText(data.asset.content, data.definition.outputSchema) : '')
    } catch {
      setError('Could not load this asset.')
    } finally {
      setLoading(false)
    }
  }, [assetId])

  useEffect(() => { void load() }, [load])

  async function put(content: unknown, reason: string): Promise<void> {
    setSaving(true); setError(null); setNote(null)
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, updateReason: reason }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not save.'); return }
      setNote(`Saved as version ${data.asset.version}.`)
      await load()
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function save(): Promise<void> {
    if (!def) return
    let content: unknown
    try { content = fromText(draft, def.outputSchema) }
    catch { setError('This needs to be valid JSON before it can be saved.'); return }
    await put(content, 'Founder edit')
  }

  async function restore(v: AssetVersion): Promise<void> {
    // Restore writes a NEW current version from an old one — it never rewinds history.
    await put(v.content, `Restored version ${v.version}`)
  }

  // F09 Stage 4 / CANVAS_SPEC §5 "Direct the AI" — a scoped command about THIS document, never
  // an open chat (ADR-034 stays dead). One instruction in, one new version out.
  async function direct(): Promise<void> {
    if (!instruction.trim()) return
    setDirecting(true); setError(null); setNote(null)
    try {
      const res = await fetch(`/api/assets/${assetId}/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: instruction.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not direct a rework.'); return }
      setInstruction('')
      setNote(`Reworked — now version ${data.asset.version}.`)
      await load()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setDirecting(false)
    }
  }

  return {
    def, history, draft, setDraft, current, loading, saving, error, note,
    instruction, setInstruction, directing, save, restore, direct,
  }
}
