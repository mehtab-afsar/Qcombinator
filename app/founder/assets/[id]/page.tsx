'use client'

/**
 * F11 — the founder's Asset workspace. View the current version, edit it directly
 * (ADR-007: a save is a new immutable current version, effective immediately, no
 * approval), see the full history, and restore an old version (which writes a NEW
 * version — history is never rewound).
 *
 * Thin: it renders state and calls /api/assets/:id. No executive reasoning here.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, red } from '@/lib/constants/colors'

interface AssetVersion {
  id: string
  version: number
  isCurrent: boolean
  content: unknown
  authoredBy: 'program' | 'founder'
  updateReason: string | null
  createdAt: string
}
interface Definition { id: string; name: string; outputSchema: 'markdown' | 'json' }

/** Content ⇄ editable text. markdown is already a string; json is pretty-printed. */
function toText(content: unknown, schema: 'markdown' | 'json'): string {
  if (schema === 'markdown') return typeof content === 'string' ? content : ''
  try { return JSON.stringify(content ?? {}, null, 2) } catch { return '' }
}
function fromText(text: string, schema: 'markdown' | 'json'): unknown {
  return schema === 'markdown' ? text : JSON.parse(text)
}

export default function AssetPage() {
  const assetId = String(useParams().id ?? '')
  const [def, setDef] = useState<Definition | null>(null)
  const [history, setHistory] = useState<AssetVersion[]>([])
  const [draft, setDraft] = useState('')
  const [current, setCurrent] = useState<AssetVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 size={20} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <p style={{ color: muted, fontSize: 13, margin: 0 }}>{assetId}</p>
        <h1 style={{ color: ink, fontSize: 26, fontWeight: 600, margin: '4px 0 0' }}>
          {def?.name ?? 'Asset'}
        </h1>
        <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
          Edit this directly. Saving creates a new version, effective immediately — your
          executive team works from the current version. Nothing is ever overwritten.
          {current && <span> Currently on version {current.version}.</span>}
        </p>

        {error && (
          <div style={{ background: '#FEF2F2', border: `1px solid ${red}`, color: red,
            borderRadius: 8, padding: '12px 14px', marginTop: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={16}
          spellCheck={def?.outputSchema === 'markdown'}
          placeholder={current ? '' : 'This asset has no versions yet.'}
          style={{
            width: '100%', marginTop: 20, background: bg, border: `1px solid ${bdr}`,
            borderRadius: 8, padding: 14, color: ink, fontSize: 14, lineHeight: 1.6,
            fontFamily: def?.outputSchema === 'json' ? 'ui-monospace, monospace' : 'inherit',
            resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <button
            onClick={() => void save()}
            disabled={saving}
            style={{
              background: blue, color: '#fff', border: 'none', borderRadius: 8,
              padding: '11px 22px', fontSize: 15, fontWeight: 500,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save new version'}
          </button>
          {note && <span style={{ color: green, fontSize: 14 }}>{note}</span>}
        </div>

        {history.length > 0 && (
          <div style={{ marginTop: 40, borderTop: `1px solid ${bdr}`, paddingTop: 20 }}>
            <h2 style={{ color: ink, fontSize: 15, fontWeight: 600, margin: 0 }}>History</h2>
            <p style={{ color: muted, fontSize: 13, marginTop: 4 }}>
              Every version is kept. Restoring one creates a new current version from it.
            </p>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {history.map(h => (
                <div key={h.id} style={{
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
                  padding: '10px 12px', fontSize: 13, color: muted,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ color: ink, minWidth: 84 }}>
                    v{h.version}{h.isCurrent && ' · current'}
                  </span>
                  <span style={{ minWidth: 72 }}>{h.authoredBy}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.updateReason ?? ''}
                  </span>
                  <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                  {!h.isCurrent && (
                    <button
                      onClick={() => void restore(h)}
                      disabled={saving}
                      style={{
                        background: 'none', border: `1px solid ${bdr}`, borderRadius: 6,
                        padding: '4px 10px', color: blue, fontSize: 12,
                        cursor: saving ? 'default' : 'pointer',
                      }}
                    >
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
