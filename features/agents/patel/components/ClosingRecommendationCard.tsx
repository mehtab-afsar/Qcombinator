'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { blue, green, ink, muted } from '../../shared/constants/colors'
import { Target, ChevronRight, Zap } from 'lucide-react'

const DELIVERABLE_LABEL: Record<string, string> = {
  icp_document:          'D1 · ICP Definition',
  pains_gains_triggers:  'D2 · Pains & Gains',
  buyer_journey:         'D3 · Buyer Journey',
  positioning_messaging: 'D4 · Positioning',
}

interface P1 { icp_clarity: number; customer_insight: number; channel_focus: number; message_clarity: number }
interface DiagState { p1: P1; d1: boolean; d2: boolean; d3: boolean; d4: boolean }

function deriveRec(p1: P1, d1: boolean, d2: boolean, d3: boolean, d4: boolean) {
  if (!d1) return {
    bottleneck:      `ICP score at ${p1.icp_clarity}/100 — customer definition too broad to build GTM around`,
    nextDeliverable: 'icp_document',
    why:             `P1.1 ICP Clarity at ${p1.icp_clarity}/100 is the upstream constraint for all GTM activity`,
    unlocks:         'D2 Pain Map + Apollo lead targeting via the outbound agent',
  }
  if (!d2) return {
    bottleneck:      `Customer insight at ${p1.customer_insight}/100 — pain triggers not yet mapped`,
    nextDeliverable: 'pains_gains_triggers',
    why:             `P1.2 at ${p1.customer_insight}/100 — messaging and outreach need verified pain signals to resonate`,
    unlocks:         'D3 Buyer Journey + message validation for the content agent',
  }
  if (!d3) return {
    bottleneck:      `Channel focus at ${p1.channel_focus}/100 — no clear GTM motion through the buyer journey`,
    nextDeliverable: 'buyer_journey',
    why:             `P1.3 at ${p1.channel_focus}/100 — execution agents need stage-by-stage touchpoints`,
    unlocks:         'D4 Positioning + outbound sequence personalisation',
  }
  if (!d4) return {
    bottleneck:      `Message clarity at ${p1.message_clarity}/100 — ICP and pain captured but not packaged for market`,
    nextDeliverable: 'positioning_messaging',
    why:             `P1.4 at ${p1.message_clarity}/100 — without positioning, all channel execution lacks a consistent hook`,
    unlocks:         'Full P1 score activation + structured positioning for outbound and content agents',
  }
  return {
    bottleneck:      'P1 Market Readiness fully documented',
    nextDeliverable: '',
    why:             'All four GTM deliverables complete',
    unlocks:         'Patel now hands structured GTM objects to outbound, content, and CRM agents',
  }
}

export function ClosingRecommendationCard({
  userId,
  onAction,
}: {
  userId: string
  onAction?: (deliverable: string) => void
}) {
  const [diag, setDiag] = useState<DiagState | null>(null)

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    Promise.all([
      supabase
        .from('qscore_history')
        .select('iq_breakdown')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('agent_artifacts')
        .select('artifact_type')
        .eq('user_id', userId)
        .in('artifact_type', ['icp_document', 'pains_gains_triggers', 'buyer_journey', 'positioning_messaging']),
    ]).then(([scoreRes, artifactsRes]) => {
      const iq  = (scoreRes.data?.iq_breakdown ?? {}) as Record<string, unknown>
      const p1_1 = Math.round(Number(iq.p1_1_icp_clarity   ?? iq.icp_clarity      ?? iq.p1_1 ?? 0))
      const p1_2 = Math.round(Number(iq.p1_2_customer_insight ?? iq.customer_insight ?? iq.p1_2 ?? 0))
      const p1_3 = Math.round(Number(iq.p1_3_channel_focus  ?? iq.channel_focus    ?? iq.p1_3 ?? 0))
      const p1_4 = Math.round(Number(iq.p1_4_message_clarity ?? iq.message_clarity  ?? iq.p1_4 ?? 0))
      const types = new Set((artifactsRes.data ?? []).map(a => a.artifact_type))
      setDiag({
        p1: { icp_clarity: p1_1, customer_insight: p1_2, channel_focus: p1_3, message_clarity: p1_4 },
        d1: types.has('icp_document'),
        d2: types.has('pains_gains_triggers'),
        d3: types.has('buyer_journey'),
        d4: types.has('positioning_messaging'),
      })
    })
  }, [userId])

  if (!diag) return null

  const rec     = deriveRec(diag.p1, diag.d1, diag.d2, diag.d3, diag.d4)
  const allDone = !rec.nextDeliverable

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12, marginTop: 4,
      background: allDone ? `${green}08` : `${blue}08`,
      border:     `1px solid ${allDone ? green : blue}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Target size={12} style={{ color: allDone ? green : blue, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: allDone ? green : blue }}>
          {allDone ? 'GTM Complete' : 'Bottleneck'}
        </span>
      </div>

      <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: allDone ? 6 : 10 }}>{rec.bottleneck}</p>

      {!allDone && (
        <>
          <button
            onClick={() => onAction?.(rec.nextDeliverable)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              padding: '8px 12px', borderRadius: 8, marginBottom: 10,
              background: blue, color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            <Zap size={11} />
            {DELIVERABLE_LABEL[rec.nextDeliverable]}
            <ChevronRight size={11} style={{ marginLeft: 'auto' }} />
          </button>
          <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: ink }}>Why: </span>{rec.why}
          </p>
          <p style={{ fontSize: 11, color: green, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600 }}>Unlocks: </span>{rec.unlocks}
          </p>
        </>
      )}

      {allDone && (
        <p style={{ fontSize: 11, color: green, lineHeight: 1.5 }}>{rec.unlocks}</p>
      )}
    </div>
  )
}
