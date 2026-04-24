'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { blue, muted, green, amber, red, ink, bdr, surf } from '../../shared/constants/colors'
import { Lock, CheckCircle2 } from 'lucide-react'

interface P1Scores {
  overall: number
  icp_clarity: number
  customer_insight: number
  channel_focus: number
  message_clarity: number
}

interface DiagnosticData {
  p1: P1Scores
  d1: boolean
  d2: boolean
  d3: boolean
  d4: boolean
}

const scoreColor = (n: number) => n >= 70 ? green : n >= 40 ? amber : red

function SubScore({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: muted, lineHeight: 1.3 }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor(score) }}>{score}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: bdr, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: scoreColor(score), borderRadius: 2, transition: 'width .5s ease' }} />
      </div>
    </div>
  )
}

export function DiagnosticSidebar({ userId }: { userId: string }) {
  const [data, setData] = useState<DiagnosticData | null>(null)

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
      const iq = (scoreRes.data?.iq_breakdown ?? {}) as Record<string, unknown>
      const p1Overall        = Math.round(Number(iq.p1_overall ?? iq.marketReadiness ?? iq.p1 ?? 0))
      const p1_1             = Math.round(Number(iq.p1_1_icp_clarity ?? iq.icp_clarity ?? iq.p1_1 ?? 0))
      const p1_2             = Math.round(Number(iq.p1_2_customer_insight ?? iq.customer_insight ?? iq.p1_2 ?? 0))
      const p1_3             = Math.round(Number(iq.p1_3_channel_focus ?? iq.channel_focus ?? iq.p1_3 ?? 0))
      const p1_4             = Math.round(Number(iq.p1_4_message_clarity ?? iq.message_clarity ?? iq.p1_4 ?? 0))
      const types            = new Set((artifactsRes.data ?? []).map(a => a.artifact_type))

      setData({
        p1: { overall: p1Overall, icp_clarity: p1_1, customer_insight: p1_2, channel_focus: p1_3, message_clarity: p1_4 },
        d1: types.has('icp_document'),
        d2: types.has('pains_gains_triggers'),
        d3: types.has('buyer_journey'),
        d4: types.has('positioning_messaging'),
      })
    })
  }, [userId])

  const DELIVERABLES = [
    { key: 'd1', label: 'D1 · ICP',       done: data?.d1 ?? false, locked: false },
    { key: 'd2', label: 'D2 · Pains',     done: data?.d2 ?? false, locked: !(data?.d1) },
    { key: 'd3', label: 'D3 · Journey',   done: data?.d3 ?? false, locked: !(data?.d1) || !(data?.d2) },
    { key: 'd4', label: 'D4 · Messaging', done: data?.d4 ?? false, locked: !(data?.d1) || !(data?.d2) || !(data?.d3) },
  ]

  return (
    <div style={{
      width: 176, minWidth: 176,
      borderRight: `1px solid ${bdr}`,
      background: surf,
      overflowY: 'auto',
      padding: '20px 14px',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>

      {/* P1 Overall */}
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: muted, marginBottom: 8 }}>Market Readiness</p>
        {data ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 7 }}>
              <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: scoreColor(data.p1.overall) }}>{data.p1.overall}</span>
              <span style={{ fontSize: 11, color: muted }}>/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: bdr, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${data.p1.overall}%`, background: scoreColor(data.p1.overall), borderRadius: 3, transition: 'width .5s ease' }} />
            </div>
            <SubScore label="ICP Clarity"       score={data.p1.icp_clarity} />
            <SubScore label="Customer Insight"  score={data.p1.customer_insight} />
            <SubScore label="Channel Focus"     score={data.p1.channel_focus} />
            <SubScore label="Message Clarity"   score={data.p1.message_clarity} />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[80, 60, 55, 45, 70].map((w, i) => (
              <div key={i} style={{ height: i === 0 ? 16 : 8, borderRadius: 4, background: bdr, width: `${w}%`, opacity: 0.5 }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: bdr }} />

      {/* D1–D4 Deliverables */}
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: muted, marginBottom: 8 }}>Deliverables</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {DELIVERABLES.map(d => (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {d.done
                ? <CheckCircle2 size={12} style={{ color: green, flexShrink: 0 }} />
                : d.locked
                  ? <Lock size={12} style={{ color: muted, flexShrink: 0, opacity: 0.5 }} />
                  : <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${blue}`, flexShrink: 0 }} />
              }
              <span style={{
                fontSize: 11,
                color: d.locked ? muted : d.done ? green : ink,
                opacity: d.locked ? 0.6 : 1,
              }}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
