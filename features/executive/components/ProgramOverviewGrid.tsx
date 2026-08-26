'use client'

/**
 * "Overview" — the default tab on a multi-Program executive's page. One small card per Program:
 * name, latest briefing verdict, document count, pending action count. Click → that Program's
 * own tab. Mirrors ExecutiveCard's "summary card, click to go deeper" visual language one level
 * down (a Program instead of an Executive), reusing this page's own existing master-detail
 * precedent (`?asset=`) rather than inventing a new one.
 *
 * Self-fetches /api/assets and /api/briefings (same pattern as BriefingsPanel/ProgramAssetsPanel);
 * pending actions come from the shared ExecutiveWorkspaceProvider instead of a third fetch of its
 * own. Only rendered alongside ProgramTabBar, i.e. only when an executive owns more than one
 * Program (page.tsx's own call), so this never appears for today's other four executives.
 */

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { ink, muted, bdr, bg, alpha, amber } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { Badge } from '@/features/shared/components/Badge'
import { programName } from '../lib/programLabel'
import { groupByProgram } from '../lib/groupByProgram'
import { useExecutiveWorkspace } from '../hooks/useExecutiveWorkspace'
import type { ProgramInstance } from '../types/executive.types'

interface BriefingSummary { programTemplateId: string | null; verdict: string }

export function ProgramOverviewGrid({
  executiveId, programs, onSelect,
}: {
  executiveId: string
  programs: ProgramInstance[]
  onSelect: (programId: string) => void
}) {
  // Documents come from the shared workspace — one copy, refreshed as a cycle writes them.
  // Briefings keep their own fetch; nothing else on this page reads them.
  const { actions: { pending }, assets } = useExecutiveWorkspace()
  const [latestBriefings, setLatestBriefings] = useState<BriefingSummary[]>([])

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const briefingsRes = await fetch('/api/briefings')
        if (!live) return
        if (briefingsRes.ok) setLatestBriefings(((await briefingsRes.json()).latest ?? []) as BriefingSummary[])
      } catch {
        if (live) setLatestBriefings([])
      }
    })()
    return () => { live = false }
  }, [executiveId])

  const assetsByProgram = groupByProgram(assets.filter(a => a.executiveId === executiveId))
  const pendingByProgram = groupByProgram(
    pending
      .filter(a => a.executiveId === executiveId)
      .map(a => ({ ...a, programTemplateId: a.programTemplateId ?? null })),
  )
  const briefingByProgram = new Map(latestBriefings.map(b => [b.programTemplateId, b]))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
      {programs.map(p => {
        const name = programName(p.templateId) ?? p.templateId
        const docCount = assetsByProgram.get(p.templateId)?.length ?? 0
        const pendingCount = pendingByProgram.get(p.templateId)?.length ?? 0
        const verdict = briefingByProgram.get(p.templateId)?.verdict ?? null
        const needsFounder = pendingCount > 0

        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              display: 'block', textAlign: 'left', textDecoration: 'none', cursor: 'pointer',
              background: bg,
              border: `1px solid ${needsFounder ? amber : bdr}`,
              borderRadius: radius.lg,
              padding: '18px 20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.04)',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: ink, margin: 0 }}>{name}</h4>
              {needsFounder && (
                <Badge variant="amber">
                  {pendingCount === 1 ? 'Needs you' : `Needs you · ${pendingCount}`}
                </Badge>
              )}
            </div>

            <p style={{ color: muted, fontSize: 13, margin: '6px 0 0' }}>
              {docCount} {docCount === 1 ? 'document' : 'documents'}
            </p>

            {verdict && (
              <p style={{
                color: muted, fontSize: 13, margin: '8px 0 0', lineHeight: 1.5,
                overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                borderTop: `1px solid ${alpha(bdr, 0.8)}`, paddingTop: 8,
              }}>
                {verdict}
              </p>
            )}

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
              color: muted, fontSize: 12, fontWeight: 500,
            }}>
              View <ArrowRight size={11} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
