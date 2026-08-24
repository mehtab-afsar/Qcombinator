'use client'

/**
 * A founder's own AI usage, all-time — reads GET /api/founder/usage (the AI Usage/Cost Ledger,
 * Phase 10 Part 1, previously admin-only). Framed explicitly as "work done for you," not a bill —
 * this is Innosphere's own operating cost, not a line item added to the founder's invoice.
 *
 * Self-fetching, quiet on failure/empty — a secondary surface on the billing page, not the
 * reason it loaded.
 */

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/founder/usage')
        if (res.ok && live) setUsage((await res.json()).usage ?? null)
      } catch {
        /* a secondary surface — stay quiet on failure */
      } finally {
        if (live) setLoaded(true)
      }
    })()
    return () => { live = false }
  }, [])

  if (!loaded || !usage || usage.totalCalls === 0) return null

  return (
    <div style={{ marginBottom: 48 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        AI work done for you
      </p>
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
