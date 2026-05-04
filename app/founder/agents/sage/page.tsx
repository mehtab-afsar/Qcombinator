'use client'

import { useState, useEffect } from 'react'
import { Target, TrendingUp, AlertTriangle, BarChart3, Shield, DollarSign, Users, Zap, Globe } from 'lucide-react'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { surf, bdr, ink, muted } from '@/features/agents/shared/constants/colors'

const accent = '#6D28D9'

const SAGE_DELIVERABLES = [
  { type: 'strategic_plan',            icon: Target,        label: 'Strategic Plan',        description: '12-month vision, 3 bets, Q1 OKRs, risk register' },
  { type: 'investor_readiness_report', icon: TrendingUp,    label: 'Investor Readiness',    description: 'Score across 6 dimensions + gaps + pitch narrative' },
  { type: 'contradiction_report',      icon: AlertTriangle, label: 'Contradiction Report',  description: 'Conflicts between agent plans — severity + resolution' },
  { type: 'okr_health_report',         icon: BarChart3,     label: 'OKR Health Report',     description: 'KR progress: on-track / at-risk / off-track' },
  { type: 'crisis_playbook',           icon: Shield,        label: 'Crisis Playbook',       description: '48-hour actions, stabilisation, comms plan' },
]

const SUGGESTED = [
  "What's my investor readiness score right now?",
  'Are there any contradictions in my current plans?',
  'Build a 12-month strategic plan',
  'Run an OKR health check',
  'How do I prepare for a Series A?',
  "What's my single biggest strategic risk?",
]

const READINESS_DIMENSIONS = [
  { key: 'gtm',       label: 'Go-to-Market', icon: Target },
  { key: 'financial', label: 'Financial',     icon: DollarSign },
  { key: 'team',      label: 'Team',          icon: Users },
  { key: 'product',   label: 'Product/PMF',   icon: Zap },
  { key: 'market',    label: 'Market',        icon: Globe },
  { key: 'traction',  label: 'Traction',      icon: TrendingUp },
] as const

interface ReadinessScores {
  gtm: number; financial: number; team: number
  product: number; market: number; traction: number
  [key: string]: number
}

function scoreColor(s: number) { return s >= 75 ? '#16A34A' : s >= 50 ? '#D97706' : '#DC2626' }
function scoreLabel(s: number) { return s >= 75 ? 'Ready to Raise' : s >= 50 ? 'Getting Close' : 'Not Ready' }
function compositeScore(scores: ReadinessScores) {
  const vals = Object.values(scores)
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
}

function SageReadinessPanel({ onSend, accent: a }: { onSend: (text: string) => void; accent: string }) {
  const [scores, setScores] = useState<ReadinessScores>({ gtm: 0, financial: 0, team: 0, product: 0, market: 0, traction: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents/goals?agentId=sage').then(r => r.ok ? r.json() : null).then(d => {
      const snap = d?.state_snapshot?.scores as Record<string, number> | undefined
      if (snap) {
        setScores({ gtm: snap.gtm ?? 0, financial: snap.financial ?? 0, team: snap.team ?? 0, product: snap.product ?? 0, market: snap.market ?? 0, traction: snap.traction ?? 0 })
      }
    }).finally(() => setLoading(false))
  }, [])

  const composite = compositeScore(scores)
  const lowest = READINESS_DIMENSIONS.reduce((lo, d) => scores[d.key] < scores[lo.key] ? d : lo, READINESS_DIMENSIONS[0])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Investor Readiness</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Composite score across 6 dimensions</p>
          </div>
          <button onClick={() => onSend("What's my investor readiness score and what do I need to fix?")}
            style={{ padding: '7px 14px', borderRadius: 8, background: a, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Get Analysis
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: muted, fontSize: 13 }}>Loading readiness scores…</div>
        ) : (
          <>
            <div style={{ padding: '24px', borderRadius: 16, background: surf, border: `1px solid ${bdr}`, marginBottom: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Composite Score</p>
              <p style={{ fontSize: 48, fontWeight: 800, color: scoreColor(composite), lineHeight: 1, margin: 0 }}>{composite}</p>
              <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>/100</p>
              <span style={{ display: 'inline-block', marginTop: 12, fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: `${scoreColor(composite)}18`, color: scoreColor(composite), border: `1px solid ${scoreColor(composite)}30` }}>
                {scoreLabel(composite)}
              </span>
              {composite < 75 && (
                <p style={{ fontSize: 12, color: muted, marginTop: 12 }}>
                  Weakest dimension: <strong style={{ color: scoreColor(scores[lowest.key]) }}>{lowest.label} ({scores[lowest.key]}/100)</strong>
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {READINESS_DIMENSIONS.map(d => {
                const score = scores[d.key]
                const Icon = d.icon
                return (
                  <div key={d.key} style={{ padding: '14px 16px', borderRadius: 12, background: surf, border: `1px solid ${bdr}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Icon size={14} style={{ color: scoreColor(score), flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: ink }}>{d.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(score) }}>{score}</span>
                      <span style={{ fontSize: 11, color: muted }}>/100</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: bdr, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${score}%`, background: scoreColor(score), transition: 'width 0.5s ease' }} />
                    </div>
                    {score < 50 && (
                      <button onClick={() => onSend(`How do I improve my ${d.label} score for investor readiness?`)}
                        style={{ marginTop: 10, padding: '5px 12px', borderRadius: 6, background: `${a}12`, border: `1px solid ${a}30`, color: a, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Fix {d.label} →
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
              {[
                { label: 'Generate Readiness Report', prompt: 'Generate a full investor readiness report' },
                { label: 'Build Strategic Plan',      prompt: 'Build a 12-month strategic plan' },
                { label: 'Check for Contradictions',  prompt: 'Are there contradictions in my current plans?' },
                { label: 'Run OKR Health Check',      prompt: 'Run an OKR health check' },
              ].map(q => (
                <button key={q.label} onClick={() => onSend(q.prompt)}
                  style={{ padding: '12px 14px', borderRadius: 10, background: `${a}0D`, border: `1px solid ${a}30`, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: a }}>{q.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SageWorkspace() {
  return (
    <AgentWorkspace
      agentId="sage"
      name="Sage"
      role="CEO Advisor · Strategy"
      emoji="🧭"
      accent={accent}
      badge="STRATEGIC CORE"
      deliverables={SAGE_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'readiness',
        label: 'Readiness',
        icon: TrendingUp,
        render: ({ workspace, accent: a }) => <SageReadinessPanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
