'use client'

/**
 * One lead in the founder's pipeline. Split out of app/founder/leads/page.tsx to keep that file
 * under CLAUDE.md's ~300-line ceiling once enrichment and promotion landed; pure presentation
 * plus callbacks, no fetching of its own.
 *
 * ⚠️ The "Add to contacts" control is only ever rendered for a VERIFIED email. That is not a UI
 * nicety — founder_contacts is the sole recipient source for a Gmail send, and promoting an
 * unverified address would put a guessed email in front of the outreach path. The server refuses
 * it too (app/api/leads/[id]/promote/route.ts); this is the same rule stated where the founder
 * can see it.
 */

import { Trash2, Check } from 'lucide-react'
import { surf, bdr, ink, muted, blue, green, amber, alpha } from '@/lib/constants/colors'

export interface Lead {
  id: string
  company: string
  title: string | null
  contact_name: string | null
  email: string | null
  email_status: 'none' | 'found' | 'verified'
  score: number | null
  rationale: string | null
  status: 'researched' | 'contacted' | 'replied' | 'qualified' | 'dead'
  source: 'ai_research' | 'founder' | 'enrichment'
  notes: string | null
  promoted_at: string | null
  created_at: string
}

export const LEAD_STATUSES: Lead['status'][] = ['researched', 'contacted', 'replied', 'qualified', 'dead']

const STATUS_COLOR: Record<Lead['status'], string> = {
  researched: muted,
  contacted: blue,
  replied: amber,
  qualified: green,
  dead: muted,
}

export function LeadRow({
  lead, selected, busy, onToggle, onSetStatus, onPromote, onRemove,
}: {
  lead: Lead
  selected: boolean
  busy: boolean
  onToggle: () => void
  onSetStatus: (status: Lead['status']) => void
  onPromote: () => void
  onRemove: () => void
}) {
  const needsEmail = lead.email_status === 'none'
  const verified = lead.email_status === 'verified' && Boolean(lead.email)

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px',
        borderTop: `1px solid ${bdr}`, opacity: lead.status === 'dead' ? 0.55 : 1,
      }}
    >
      {needsEmail && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${lead.company} for email lookup`}
          style={{ marginTop: 4, flexShrink: 0, cursor: 'pointer' }}
        />
      )}

      {lead.score !== null && (
        <div
          title="Fit score from this cycle's ranking"
          style={{
            flexShrink: 0, minWidth: 34, textAlign: 'center', padding: '3px 0',
            borderRadius: 6, background: alpha(blue, 0.08), color: blue,
            fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
          }}
        >
          {lead.score}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: ink, fontSize: 14, fontWeight: 600 }}>
          {lead.company}
          {lead.title && <span style={{ color: muted, fontWeight: 400 }}> · {lead.title}</span>}
        </div>

        {/* The whole point of enrichment: a real person, not a role. */}
        {verified && (
          <div style={{ color: green, fontSize: 12.5, marginTop: 3, fontWeight: 500 }}>
            {lead.contact_name ? `${lead.contact_name} · ` : ''}{lead.email}
          </div>
        )}

        {lead.rationale && (
          <div style={{ color: muted, fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>
            {lead.rationale}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <select
            value={lead.status}
            disabled={busy}
            onChange={e => onSetStatus(e.target.value as Lead['status'])}
            aria-label={`Status for ${lead.company}`}
            style={{
              padding: '2px 6px', borderRadius: 5, border: `1px solid ${bdr}`,
              background: surf, color: STATUS_COLOR[lead.status], fontSize: 11.5,
              fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize',
            }}
          >
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {lead.source === 'ai_research' && (
            <span style={{ color: muted, fontSize: 11 }}>found by Patel</span>
          )}

          {/* Promotion — the one bridge from research to something the AI SDR may actually
              email. Only ever offered on a verified address (see this file's header). */}
          {verified && (
            lead.promoted_at ? (
              <span style={{ color: green, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Check size={11} /> in contacts
              </span>
            ) : (
              <button
                onClick={onPromote}
                disabled={busy}
                style={{
                  background: 'none', border: `1px solid ${bdr}`, borderRadius: 5,
                  padding: '2px 8px', cursor: 'pointer', color: blue, fontSize: 11.5,
                  fontWeight: 500, fontFamily: 'inherit', opacity: busy ? 0.5 : 1,
                }}
              >
                Add to contacts
              </button>
            )
          )}
        </div>
      </div>

      <button
        onClick={onRemove}
        disabled={busy}
        aria-label={`Remove ${lead.company}`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
          color: muted, opacity: busy ? 0.5 : 1, flexShrink: 0,
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
