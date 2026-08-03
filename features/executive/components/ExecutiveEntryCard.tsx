'use client'

/**
 * The door into the Executive model — the dashboard's entry point to `/founder/executive`.
 *
 * ⚠️ WHY THIS EXISTS. It replaces `DashboardBriefingCard`, which rendered nothing until a briefing
 * existed. That made the new product **unreachable**: a briefing needs a cycle, a cycle needs a
 * confirmed mandate, and a mandate can only be set on the page this card is the only link to. You
 * had to already be inside to find the way in. Three Stories of finished work were invisible to
 * anyone who had not already used them.
 *
 * So the rule here is the opposite of the old one: **this card is visible whenever the flag is
 * on**, and what it says depends on how far the founder has got. It is a door first and a
 * briefing summary last.
 *
 * It stays self-gating on the FLAG (the APIs 404 when `FF_NEW_EXECUTIVE_MODEL` is off, and this
 * renders nothing), so the live product is untouched until the model is switched on.
 *
 * Read-only and thin: it renders state and links onward. No approve/dismiss control — the one
 * checkpoint lives at the Connector boundary, not here (ADR-002, ADR-007).
 */

import { useEffect, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { surf, bdr, ink, muted, blue, amber, alpha } from '@/lib/constants/colors'
import {
  resolveMandateState,
  type Contract,
  type MandateState,
  type Strategy,
} from '@/features/executive/types/executive.types'

interface Briefing { id: string; verdict: string; createdAt: string }

export interface DoorState {
  mandate: MandateState
  briefing: Briefing | null
  pendingCount: number
}

/**
 * What the card says at each stage.
 *
 * Written as data rather than nested JSX so the four states are readable side by side — the copy
 * is the actual product decision here, and it should be reviewable without reading layout code.
 */
export interface DoorContent { eyebrow: string; headline: string; cta: string; href: string }

export function contentFor(state: DoorState): DoorContent | null {
  // Something needs the founder personally. This outranks everything else the card could say —
  // it is the only thing in the whole system that is genuinely blocked on them.
  if (state.pendingCount > 0) {
    return {
      eyebrow: 'Needs you',
      headline: state.pendingCount === 1
        ? 'One action is waiting for your approval'
        : `${state.pendingCount} actions are waiting for your approval`,
      cta: 'Review',
      href: '/founder/executive',
    }
  }

  switch (state.mandate) {
    case 'no_strategy':
      return {
        eyebrow: 'Your executive team',
        headline: 'Set the direction once. Your team works to it from there.',
        cta: 'Set your direction',
        href: '/founder/strategy',
      }
    case 'no_contract':
      return {
        eyebrow: 'Your executive team',
        headline: 'Turn your direction into a mandate your team can work to.',
        cta: 'Draft my mandate',
        href: '/founder/executive',
      }
    case 'draft':
      return {
        eyebrow: 'Your executive team',
        headline: 'Your mandate is drafted and ready to confirm.',
        cta: 'Review and confirm',
        href: '/founder/executive',
      }
    case 'confirmed':
      return state.briefing
        ? {
            eyebrow: 'Latest briefing',
            headline: state.briefing.verdict,
            cta: 'View',
            href: '/founder/executive',
          }
        : {
            eyebrow: 'Your executive team',
            headline: 'Your team is operating to your mandate. The first briefing lands after this cycle.',
            cta: 'Open command view',
            href: '/founder/executive',
          }
    case 'disabled':
      // Unreachable in practice — the 404 check above returns before we get here — but the model
      // being switched off is a real state, and a door to a disabled product must not appear.
      return null
    default: {
      // A new MandateState must be given copy here, not silently fall through to a blank door.
      // `never` makes that a compile error rather than an empty card nobody notices. It has
      // already paid for itself once: it caught `disabled`, which this card would otherwise have
      // rendered as an empty box linking into a product that is not switched on.
      const unhandled: never = state.mandate
      throw new Error(`No entry-card copy for mandate state: ${String(unhandled)}`)
    }
  }
}

export function ExecutiveEntryCard() {
  const [state, setState] = useState<DoorState | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const [sRes, cRes] = await Promise.all([fetch('/api/strategy'), fetch('/api/contracts')])
        // 404 = the flag is off. Render nothing; the live dashboard is unaffected.
        if (sRes.status === 404 || cRes.status === 404) return

        const strategy: Strategy | null = sRes.ok ? (await sRes.json()).strategy ?? null : null
        const contract: Contract | null = cRes.ok ? (await cRes.json()).contract ?? null : null
        const mandate = resolveMandateState(strategy, contract)

        // Only worth asking once there is a mandate to have produced anything.
        let briefing: Briefing | null = null
        let pendingCount = 0
        if (mandate === 'confirmed') {
          const [bRes, aRes] = await Promise.all([fetch('/api/briefings'), fetch('/api/actions')])
          if (bRes.ok) {
            const data = await bRes.json()
            briefing = (data.latest ?? data.briefings ?? [])[0] ?? null
          }
          if (aRes.ok) pendingCount = ((await aRes.json()).pending ?? []).length
        }

        if (live) setState({ mandate, briefing, pendingCount })
      } catch {
        /* A secondary surface: stay hidden rather than break the dashboard. */
      }
    })()
    return () => { live = false }
  }, [])

  if (!state) return null

  const content = contentFor(state)
  if (!content) return null

  const { eyebrow, headline, cta, href } = content
  const urgent = state.pendingCount > 0

  return (
    <a href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        // Amber only when the founder is actually blocking something. Everything else is the
        // dashboard's normal surface — a door does not need to shout to be findable.
        background: urgent ? alpha(amber, 0.07) : surf,
        border: `1px solid ${urgent ? alpha(amber, 0.35) : bdr}`,
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: alpha(urgent ? amber : blue, 0.12),
            display: 'grid', placeItems: 'center',
          }}>
            <Sparkles size={16} color={urgent ? amber : blue} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ color: urgent ? amber : muted, fontSize: 12, fontWeight: 500 }}>{eyebrow}</span>
            <p style={{
              color: ink, fontSize: 14, fontWeight: 500, margin: '2px 0 0', lineHeight: 1.45,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {headline}
            </p>
          </div>
        </div>
        <span style={{
          color: urgent ? amber : blue, fontSize: 13, fontWeight: 500,
          whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {cta} <ArrowRight size={14} />
        </span>
      </div>
    </a>
  )
}
