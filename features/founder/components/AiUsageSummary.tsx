'use client'

/**
 * A founder's own AI usage, all-time — reads GET /api/founder/usage (the AI Usage/Cost Ledger,
 * Phase 10 Part 1, previously admin-only). Framed explicitly as "work done for you," not a bill —
 * this is Innosphere's own operating cost, not a line item added to the founder's invoice.
 *
 * Self-fetching, and quiet about a FAILURE — but no longer quiet about being empty. Rendering
 * null on zero calls meant a founder who came looking for this (it is the only place in the app
 * that answers "what has the AI actually cost") found a page with nothing on it and no way to
 * tell whether the feature was missing, broken, or simply had nothing to report yet. An honest
 * empty state costs one paragraph and answers the question.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { ink, muted } from '@/lib/constants/colors'

interface Usage {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  since: string | null
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function AiUsageSummary() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loaded, setLoaded] = useState(false)
  // 404 means the Executive model is off for this deployment — genuinely nothing to show, and
  // distinct from "the request failed", which the founder should be told about rather than left
  // staring at an empty panel.
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/founder/usage')
        if (!live) return
        if (res.status === 404) { setUnavailable(true); return }
        if (!res.ok) { setError(true); return }
        setUsage((await res.json()).usage ?? null)
      } catch {
        if (live) setError(true)
      } finally {
        if (live) setLoaded(true)
      }
    })()
    return () => { live = false }
  }, [])

  if (!loaded || unavailable) return null

  if (error) {
    return (
      <Frame>
        <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.5, maxWidth: 480 }}>
          We couldn&rsquo;t load your AI usage just now. Refresh the page to try again.
        </p>
      </Frame>
    )
  }

  if (!usage || usage.totalCalls === 0) {
    return (
      <Frame>
        <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.5, maxWidth: 480 }}>
          Nothing yet. Once your executive team runs a cycle, the documents, briefings and actions
          it writes show up here — how many AI calls they took, and what they cost to run.
        </p>
      </Frame>
    )
  }

  return (
    <Frame>
      <p style={{ fontSize: 13, color: muted, marginBottom: 16, lineHeight: 1.5, maxWidth: 480 }}>
        Every document, briefing, and action your executive team writes costs a small amount to
        run — this is that work, not a bill.
        {usage.since && ` Tracked since ${new Date(usage.since).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`}
      </p>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <Stat label="AI calls" value={usage.totalCalls.toLocaleString()} />
        <Stat label="Tokens used" value={formatTokens(usage.totalInputTokens + usage.totalOutputTokens)} />
        <Stat label="Estimated cost" value={`$${usage.totalCostUsd.toFixed(2)}`} />
      </div>
    </Frame>
  )
}

/** The heading and spacing every state shares, so an empty panel still looks deliberate. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        AI usage
      </p>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 20, fontWeight: 500, color: ink, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12, color: muted, margin: '2px 0 0' }}>{label}</p>
    </div>
  )
}
