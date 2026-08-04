'use client'

/**
 * Shared "here's what we know about your company" card grid — the one presentational
 * component behind both the post-upload ("We pre-filled your profile") and post-Q&A
 * ("Your startup snapshot") moments in the fast profile-builder flow. Previously each
 * moment had its own ~250-line near-duplicate of this grid; splitting it out here is
 * what makes the founder-facing screens a net reduction in information density, not
 * just a reskin — mode only changes the header copy and one pill, everything else is
 * a single design.
 */

import { CheckCircle2, X as XIcon, AlertTriangle, BarChart } from 'lucide-react'
import { bg, bdr, ink, muted, blue, amber, green, red, surf, alpha } from '@/lib/constants/colors'

export interface SnapshotSnippet {
  label: string
  value: string
  fieldKey?: string
  confidence?: { label: 'High' | 'Med' | 'Low'; color: string } | null
}

export interface SnapshotCard {
  sectionKey: string
  label: string
  completionPct: number
  narrative: string | null
  snippets: SnapshotSnippet[]
  missing: string[]
  willAsk?: boolean
}

export interface ProfileSnapshotProps {
  mode: 'post-upload' | 'post-qa'
  cards: SnapshotCard[]
  overallPct: number
  docTruncationInfo?: { truncatedAt: number; totalLength: number } | null
  onDismissField: (sectionKey: string, fieldKey: string, label: string) => void
}

const barColor = (pct: number) => (pct >= 60 ? green : pct >= 30 ? amber : red)

const HEADER_COPY = {
  'post-upload': {
    badge: 'Document analysis complete',
    title: 'We pre-filled your profile',
    subtitle: 'Your documents gave us a head start. The fields we extracted directly raise your Q-Score — the more complete your profile, the higher your investor match rate.',
  },
  'post-qa': {
    badge: 'Your startup snapshot',
    title: "Here's everything we've captured",
    subtitle: 'Review what we extracted from your documents and answers before calculating your Q-Score.',
  },
} as const

function coverageMessage(overallPct: number, strongCount: number, weakCount: number, total: number): string {
  if (overallPct >= 60) return `Strong coverage — ${strongCount} of ${total} parameters are well-supported.`
  if (overallPct >= 35) return `Moderate coverage — ${weakCount} parameter${weakCount === 1 ? '' : 's'} still need${weakCount === 1 ? 's' : ''} more detail.`
  return 'Sparse coverage — most parameters need more detail below.'
}

export function ProfileSnapshot({ mode, cards, overallPct, docTruncationInfo, onDismissField }: ProfileSnapshotProps) {
  const copy = HEADER_COPY[mode]
  const strongCount = cards.filter(c => c.completionPct >= 60).length
  const weakCount = cards.length - strongCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700, color: blue,
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10,
          padding: '3px 10px', borderRadius: 20, background: alpha(blue, 0.08),
        }}>
          <BarChart size={12} strokeWidth={2} /> {copy.badge}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: ink, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          {copy.title}
        </h1>
        <p style={{ fontSize: 14, color: muted, margin: 0, lineHeight: 1.6 }}>{copy.subtitle}</p>
      </div>

      {/* Truncation warning */}
      {docTruncationInfo && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 16px', borderRadius: 10,
          background: alpha(amber, 0.08), border: `1px solid ${alpha(amber, 0.5)}`,
        }}>
          <AlertTriangle size={15} strokeWidth={2} style={{ color: amber, flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: amber, lineHeight: 1.5 }}>
            We read the first <strong>{docTruncationInfo.truncatedAt.toLocaleString()}</strong> of{' '}
            <strong>{docTruncationInfo.totalLength.toLocaleString()}</strong> characters in your document.
            {' '}Upload a shorter version or answer the follow-up questions to fill in any gaps.
          </p>
        </div>
      )}

      {/* One coverage summary — replaces the old competing hero-stats grid + separate bar */}
      <div style={{ padding: '16px 20px', borderRadius: 12, background: surf, border: `1px solid ${bdr}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>Overall profile coverage</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: barColor(overallPct) }}>{overallPct}%</span>
        </div>
        <div style={{ height: 8, background: bg, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${overallPct}%`, background: barColor(overallPct), borderRadius: 4, transition: 'width 0.6s ease' }} />
        </div>
        <p style={{ fontSize: 12, color: muted, margin: '8px 0 0' }}>
          {coverageMessage(overallPct, strongCount, weakCount, cards.length)}
        </p>
      </div>

      {/* Parameter cards — minmax(0, 1fr), not plain 1fr: a bare 1fr track won't clamp to
          the grid's available width when a child's content (e.g. a long unbroken value) has
          a larger intrinsic min-width, so the grid — and the whole page — grows sideways
          instead of the value truncating with ellipsis like it's supposed to. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
        {cards.map(card => {
          const visibleSnippets = card.snippets.slice(0, 3)
          const extraSnippets = card.snippets.length - visibleSnippets.length
          const visibleMissing = card.missing.slice(0, 3)
          const showWillAsk = mode === 'post-upload' && card.willAsk && card.completionPct < 60

          return (
            <div key={card.sectionKey} style={{
              padding: '16px 18px', borderRadius: 12, minWidth: 0,
              border: `1px solid ${card.completionPct >= 60 ? alpha(green, 0.4) : card.completionPct >= 30 ? alpha(amber, 0.4) : bdr}`,
              background: bg,
            }}>
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: ink, lineHeight: 1.3 }}>{card.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {showWillAsk && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: alpha(amber, 0.15), color: amber, letterSpacing: '0.03em',
                    }}>Will be asked</span>
                  )}
                  <span style={{
                    fontSize: 12, fontWeight: 800, color: barColor(card.completionPct),
                    background: alpha(barColor(card.completionPct), 0.1),
                    padding: '2px 8px', borderRadius: 20,
                  }}>{card.completionPct}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: bdr, borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${card.completionPct}%`, background: barColor(card.completionPct), borderRadius: 2 }} />
              </div>

              {/* Narrative — the primary read */}
              {card.narrative && (
                <p style={{ fontSize: 12.5, color: ink, lineHeight: 1.6, margin: '0 0 10px' }}>
                  {card.narrative}
                </p>
              )}

              {/* Extracted fields — detail underneath, not the headline */}
              {visibleSnippets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: (card.missing.length > 0 || extraSnippets > 0) ? 10 : 0 }}>
                  {visibleSnippets.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <CheckCircle2 size={12} color={green} strokeWidth={2} style={{ flexShrink: 0 }} />
                      <span style={{ color: muted, flexShrink: 0 }}>{s.label}:</span>
                      <span style={{ color: ink, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</span>
                      {s.confidence && (
                        <span
                          title={`${s.confidence.label} confidence`}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: s.confidence.color, flexShrink: 0 }}
                        />
                      )}
                      {s.fieldKey && (
                        <button
                          onClick={() => onDismissField(card.sectionKey, s.fieldKey!, s.label)}
                          title="Not right — remove this"
                          aria-label={`Remove ${s.label}`}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 14, height: 14, borderRadius: '50%', border: 'none',
                            background: 'transparent', color: muted, cursor: 'pointer',
                            padding: 0, flexShrink: 0, fontFamily: 'inherit',
                          }}
                        ><XIcon size={10} strokeWidth={2.5} /></button>
                      )}
                    </div>
                  ))}
                  {extraSnippets > 0 && (
                    <span style={{ fontSize: 11, color: muted, marginLeft: 18 }}>+{extraSnippets} more</span>
                  )}
                </div>
              )}

              {/* Missing fields */}
              {visibleMissing.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                  <XIcon size={11} color={red} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span style={{ color: muted }}>{m}</span>
                </div>
              ))}

              {card.snippets.length === 0 && card.missing.length === 0 && (
                <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>No data found for this parameter.</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
