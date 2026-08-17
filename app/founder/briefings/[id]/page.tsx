'use client'

/**
 * F09 artifact organization, Stage 2 — the full briefing, finally readable.
 *
 * `body.sections` (the actual detailed content of every briefing, per lib/briefings/generate.ts)
 * is generated and persisted every cycle and was, until this page, never rendered anywhere —
 * BriefingsPanel only ever showed the one-line verdict + summary. Mirrors
 * app/founder/assets/[id]/page.tsx's established "reading width" convention (maxWidth 760, not
 * the 1120px grid width) — this is prose, not a browsing surface.
 *
 * No new API route: GET /api/briefings already returns every briefing for the founder; this
 * page fetches that same list and finds by id client-side, same as ExecutiveRoster already does
 * for small fetched lists. Briefings are read-only/append-only, so there's no PUT to justify a
 * dedicated route the way the asset page needs one.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { bg, bdr, ink, muted, blue } from '@/lib/constants/colors'
import { font } from '@/features/shared/tokens'
import { programName } from '@/features/executive/lib/programLabel'

interface ChangedAsset { assetId: string; name?: string }
interface BriefingBody {
  summary?: string
  sections?: Array<{ heading: string; detail: string }>
  changedAssets?: ChangedAsset[]
}
interface Briefing {
  id: string
  /** The underlying database row id — not the Registry Program code. Use programTemplateId. */
  programId: string | null
  /** The Registry Program id, e.g. 'P001' — resolved server-side (attachProgramTemplateId). */
  programTemplateId: string | null
  executiveId: string | null
  verdict: string
  body: unknown
  createdAt: string
}

type LoadState = 'loading' | 'not_found' | 'ready'

export default function BriefingDetailPage() {
  const id = String(useParams().id ?? '')
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/briefings')
        if (!res.ok) { if (live) setState('not_found'); return }
        const data = await res.json()
        const found: Briefing | undefined = (data.briefings ?? []).find((b: Briefing) => b.id === id)
        if (!live) return
        if (!found) { setState('not_found'); return }
        setBriefing(found)
        setState('ready')
      } catch {
        if (live) setState('not_found')
      }
    })()
    return () => { live = false }
  }, [id])

  if (state === 'loading') {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 size={20} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (state === 'not_found' || !briefing) {
    return (
      <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <BackLink />
          <p style={{ color: muted, fontSize: 16, marginTop: 20 }}>This briefing isn&rsquo;t available.</p>
        </div>
      </div>
    )
  }

  const body = (briefing.body ?? {}) as BriefingBody
  const sections = Array.isArray(body.sections) ? body.sections : []
  const changed = Array.isArray(body.changedAssets) ? body.changedAssets : []

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <BackLink />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <p style={{ color: muted, fontSize: 13, margin: 0 }}>
            {new Date(briefing.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {/* Closes a real gap: until this, reading a briefing gave no way to tell which Program
              wrote it, or click through to it. programId (the row id) is the URL's ?program=
              value — page.tsx matches ProgramInstance.id, not the Registry code; programTemplateId
              is only for the display name (programName). */}
          {briefing.executiveId && briefing.programId && programName(briefing.programTemplateId) && (
            <Link
              href={`/founder/executive/${briefing.executiveId}?program=${briefing.programId}`}
              style={{
                color: blue, fontSize: 12, textDecoration: 'none',
                border: `1px solid ${bdr}`, borderRadius: 6, padding: '2px 8px',
              }}
            >
              {programName(briefing.programTemplateId)}
            </Link>
          )}
        </div>
        <h1 style={{
          fontFamily: font.family.serif, fontSize: 26, fontWeight: 600, color: ink,
          margin: '4px 0 0', lineHeight: 1.3,
        }}>
          {briefing.verdict}
        </h1>

        {body.summary && (
          <p style={{ color: muted, fontSize: 15, marginTop: 16, lineHeight: 1.6 }}>{body.summary}</p>
        )}

        {sections.length > 0 && (
          <div style={{ marginTop: 32 }}>
            {sections.map((s, i) => (
              <div
                key={i}
                style={i === 0
                  ? {}
                  : { marginTop: 20, paddingTop: 20, borderTop: `1px solid ${bdr}` }}
              >
                <h2 style={{ color: ink, fontSize: 15, fontWeight: 600, margin: 0 }}>{s.heading}</h2>
                <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{s.detail}</p>
              </div>
            ))}
          </div>
        )}

        {changed.length > 0 && (
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${bdr}` }}>
            <p style={{ color: muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 10px' }}>
              Documents this touched
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {changed.map(a => (
                <Link
                  key={a.assetId}
                  href={`/founder/assets/${a.assetId}`}
                  style={{
                    color: blue, fontSize: 12, textDecoration: 'none',
                    border: `1px solid ${bdr}`, borderRadius: 6, padding: '2px 8px',
                  }}
                >
                  {a.name ?? a.assetId}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/founder/executive/documents"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: muted, textDecoration: 'none',
      }}
    >
      <ArrowLeft size={14} /> Back to your documents
    </Link>
  )
}
