'use client'

/**
 * One Executive, as a visible entity — the centerpiece of the Command View redesign.
 *
 * ⚠️ WHY THIS EXISTS. Patel (the Growth Executive) was never deleted — he's fully present in the
 * Registry (`lib/registry/executives/growth.ts`, name "Patel (Chief Growth Officer)") — but
 * nothing in the UI ever showed any of the 5 executives' names anywhere. The whole Command View
 * read as one undifferentiated mandate box because the people running it were invisible. This
 * card is where they reappear.
 *
 * Deliberately NOT a chat entry point. The old product's Patel was someone you talked to; this
 * Patel is someone whose work you read. Clicking through goes to a status page
 * (`/founder/executive/[executiveId]`), never a conversation.
 *
 * Two honest states, same shape: active (a Program is running) and idle (none is, today true for
 * 4 of 5 executives). Idle is shown quieter, never hidden and never faked busy.
 */

import { ArrowRight } from 'lucide-react'
import { ink, muted, bdr, alpha, amber } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import type { ExecutiveSummary } from '../types/executive.types'

export interface ExecutiveCardData {
  executive: ExecutiveSummary
  /** The active Program this executive owns in the current mandate, or null — genuinely idle. */
  programName: string | null
  latestBriefingVerdict: string | null
  pendingActionCount: number
}

export function ExecutiveCard({ data }: { data: ExecutiveCardData }) {
  const { executive, programName, latestBriefingVerdict, pendingActionCount } = data
  const active = programName !== null
  const needsFounder = pendingActionCount > 0

  return (
    <a
      href={`/founder/executive/${executive.id}`}
      style={{
        display: 'block', textDecoration: 'none',
        background: '#fff',
        border: `1px solid ${needsFounder ? amber : active ? ink : bdr}`,
        borderRadius: 4, // sharp corners — an executive suite, not a wizard
        padding: '20px 22px',
        opacity: active ? 1 : 0.72, // idle: quieter, never hidden
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{
          fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em',
          color: ink, margin: 0,
        }}>
          {executive.name}
        </h3>
        {needsFounder && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: amber, whiteSpace: 'nowrap',
            border: `1px solid ${amber}`, borderRadius: 999, padding: '2px 8px',
          }}>
            {pendingActionCount === 1 ? 'Needs you' : `Needs you · ${pendingActionCount}`}
          </span>
        )}
      </div>

      <p style={{ color: muted, fontSize: 13, fontStyle: 'italic', margin: '4px 0 0' }}>
        &ldquo;{executive.motto}&rdquo;
      </p>

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${alpha(bdr, 0.8)}` }}>
        {active ? (
          <>
            <p style={{ color: ink, fontSize: 13, fontWeight: 600, margin: 0 }}>{programName}</p>
            {latestBriefingVerdict && (
              <p style={{
                color: muted, fontSize: 13, margin: '4px 0 0', lineHeight: 1.5,
                overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {latestBriefingVerdict}
              </p>
            )}
          </>
        ) : (
          <p style={{ color: muted, fontSize: 13, margin: 0 }}>No active program yet</p>
        )}
      </div>

      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14,
        color: muted, fontSize: 12, fontWeight: 500,
      }}>
        View <ArrowRight size={11} />
      </span>
    </a>
  )
}
