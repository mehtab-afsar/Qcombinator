'use client'

/**
 * GettingStartedCards — Stage Gate progress panel (YC-style).
 *
 * Shows the 3 sequential gates for the founder's current stage.
 * Replaces the old document-centric 5-card onboarding system.
 *
 * Each gate is a *behavior* the founder must do (not a document to generate).
 * The relevant agent is shown as the helper, not the deliverable.
 */

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Phone, ChevronRight, X } from 'lucide-react'
import {
  STAGE_GATES, normalizeStage, currentGateIndex,
} from '@/lib/constants/stage-gates'
import {
  bg, surf, bdr, ink, muted, blue, green, amber, alpha,
} from '@/lib/constants/colors'

interface GettingStartedCardsProps {
  qscoreOverall: number | null
  stage?: string
  gateProgress?: Record<string, boolean>
  customerCallsCount?: number
  onLogCall?: () => void
  // legacy props kept for backward compatibility
  subscriptionTier?: 'free' | 'premium'
  industry?: string
  investorMatchCount?: number
  qscores?: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number }
}

export function GettingStartedCards({
  stage,
  gateProgress = {},
  customerCallsCount = 0,
  onLogCall,
}: GettingStartedCardsProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const normalizedStage = normalizeStage(stage)
  const config = STAGE_GATES[normalizedStage]
  const gateIdx = currentGateIndex(normalizedStage, gateProgress)
  const allDone = gateIdx === 3

  return (
    <div style={{
      background: surf, borderRadius: 16, border: `1px solid ${bdr}`,
      padding: '20px 24px', marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, marginBottom: 4 }}>
            Stage progress
          </p>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: ink, margin: 0 }}>
            {config.label}
            {!allDone && (
              <span style={{ fontSize: 12, fontWeight: 500, color: muted, marginLeft: 8 }}>
                Gate {gateIdx + 1} of 3
              </span>
            )}
          </h2>
          <p style={{ fontSize: 12, color: muted, margin: '3px 0 0' }}>{config.subtitle}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, flexShrink: 0 }}
          aria-label="Dismiss"
        >
          <X style={{ height: 14, width: 14 }} />
        </button>
      </div>

      {/* Gates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {config.gates.map((gate, i) => {
          const done    = !!gateProgress[gate.id]
          const active  = !done && i === gateIdx
          const locked  = !done && i > gateIdx

          return (
            <div
              key={gate.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 0',
                borderBottom: i < 2 ? `1px solid ${bdr}` : 'none',
                opacity: locked ? 0.45 : 1,
              }}
            >
              {/* Status icon */}
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                {done ? (
                  <CheckCircle2 style={{ height: 18, width: 18, color: green }} />
                ) : active ? (
                  <div style={{
                    height: 18, width: 18, borderRadius: '50%',
                    border: `2px solid ${blue}`, background: alpha(blue, 0.08),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ height: 6, width: 6, borderRadius: '50%', background: blue }} />
                  </div>
                ) : (
                  <Circle style={{ height: 18, width: 18, color: bdr }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: active ? 700 : 600,
                  color: done ? muted : active ? ink : muted,
                  margin: 0, marginBottom: 2,
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {gate.label}
                  {gate.milestone && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, fontWeight: 700,
                      color: amber, background: alpha(amber, 0.1),
                      borderRadius: 4, padding: '1px 5px',
                    }}>
                      MILESTONE
                    </span>
                  )}
                </p>
                {active && (
                  <>
                    <p style={{ fontSize: 11, color: muted, margin: 0, marginBottom: 4, lineHeight: 1.5 }}>
                      {gate.behavior}
                    </p>
                    <p style={{ fontSize: 11, color: muted, margin: 0, fontStyle: 'italic' }}>
                      Evidence: {gate.evidence}
                    </p>
                  </>
                )}
              </div>

              {/* Agent CTA */}
              {active && gate.agentId && (
                <Link
                  href={`/founder/agents/${gate.agentId}`}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, color: blue,
                    background: alpha(blue, 0.07), borderRadius: 6,
                    padding: '4px 9px', textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {gate.agentName}
                  <ChevronRight style={{ height: 11, width: 11 }} />
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
        {/* Customer call quick action */}
        <button
          onClick={onLogCall}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, color: ink,
            background: bg, border: `1px solid ${bdr}`, borderRadius: 8,
            padding: '6px 12px', cursor: 'pointer',
          }}
        >
          <Phone style={{ height: 12, width: 12 }} />
          Log a customer call
          {customerCallsCount > 0 && (
            <span style={{ marginLeft: 2, color: muted, fontWeight: 400 }}>
              ({customerCallsCount} this week)
            </span>
          )}
        </button>

        {/* Milestone message */}
        {allDone ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: green }}>
            ✓ Stage cleared — advancing to next stage
          </span>
        ) : (
          <span style={{ fontSize: 11, color: muted }}>
            {gateIdx === 2 ? 'Complete this gate to unlock investor visibility' : `${3 - gateIdx} gate${3 - gateIdx !== 1 ? 's' : ''} remaining in this stage`}
          </span>
        )}
      </div>
    </div>
  )
}
