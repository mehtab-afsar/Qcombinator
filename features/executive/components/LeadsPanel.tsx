'use client'

/**
 * The AI SDR's researched leads, on the Program page where the founder is already standing.
 *
 * ⚠️ THIS IS THE DOOR (docs/AGI_ACTIONS_PRD.md, spine slice 1). `/founder/leads` has no sidebar
 * entry — the sidebar is deliberately five items ("one front door, hide the machinery"). The
 * lesson this panel is built from: `/founder/contacts` shipped with exactly one reference to it
 * anywhere in the repo, a static banner behind a program-panel condition, and nothing tested that
 * the link existed at all. A panel showing REAL rows is a stronger door than a banner telling you
 * a page exists, because it earns the click by showing what's behind it.
 *
 * Renders nothing when the founder has no leads AND nothing has run yet — an empty panel on a
 * Program that has never produced a lead is noise. Once a cycle has produced any, it stays.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Crosshair, ArrowRight } from 'lucide-react'
import { ink, muted, bdr, blue, alpha } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'

/** Mirrors GET /api/leads — the fields this glance actually needs, nothing more. */
interface Lead {
  id: string
  company: string
  title: string | null
  score: number | null
  status: string
}

/** How many to show inline before deferring to the full page. A glance, not the list. */
const PREVIEW = 5

export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[] | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/leads')
        if (res.ok && live) setLeads((await res.json()).leads ?? [])
      } catch {
        /* a secondary surface on a page that already has plenty — stay quiet */
      }
    })()
    return () => { live = false }
  }, [])

  if (leads === null || leads.length === 0) return null

  return (
    <SectionCard
      title="Leads found"
      action={
        <Link
          href="/founder/leads"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, color: blue,
            fontSize: 12.5, fontWeight: 500, textDecoration: 'none',
          }}
        >
          View all {leads.length} <ArrowRight size={12} />
        </Link>
      }
    >
      <p style={{ color: muted, fontSize: 13, margin: '0 0 12px', lineHeight: 1.5, maxWidth: 560 }}>
        Accounts your team researched and ranked. Outreach still only emails people on your
        contacts list — these are leads to work, not addresses.
      </p>

      <div style={{ display: 'grid', gap: 8 }}>
        {leads.slice(0, PREVIEW).map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
            {l.score !== null ? (
              <span style={{
                minWidth: 30, textAlign: 'center', padding: '2px 0', borderRadius: 5,
                background: alpha(blue, 0.08), color: blue, fontSize: 12, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}>
                {l.score}
              </span>
            ) : (
              <Crosshair size={13} color={muted} style={{ flexShrink: 0 }} />
            )}
            <span style={{ color: ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.company}
              {l.title && <span style={{ color: muted }}> · {l.title}</span>}
            </span>
            <span style={{ color: muted, fontSize: 11.5, textTransform: 'capitalize', flexShrink: 0 }}>
              {l.status}
            </span>
          </div>
        ))}
      </div>

      {leads.length > PREVIEW && (
        <p style={{ color: muted, fontSize: 12, margin: '12px 0 0', paddingTop: 10, borderTop: `1px solid ${bdr}` }}>
          {leads.length - PREVIEW} more on the full list.
        </p>
      )}
    </SectionCard>
  )
}
