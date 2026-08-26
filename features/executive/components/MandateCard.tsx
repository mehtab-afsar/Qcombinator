'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { ink, muted, bdr, white } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { ease } from '@/features/shared/tokens'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { CompassDoodle } from '@/features/onboarding/components/doodles/CompassDoodle'
import { useExecutiveWorkspace } from '../hooks/useExecutiveWorkspace'
import type { Contract } from '../types/executive.types'

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } }
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
}

/**
 * The mandate itself — what the founder committed to.
 *
 * ⚠️ NOT A WALL OF JSON. This is the plain-language read of the contract a founder
 * sees before confirming (F08) — priorities, success metrics, and now who actually
 * takes each piece on, by name, not by the raw Registry id `generateMandate`'s JSON
 * tail stores ('growth', not 'Patel'). Self-fetches /api/executives for that name
 * lookup, the same established pattern as ExecutiveRoster/ActionsPanel/BriefingsPanel
 * — one Registry, read the same way everywhere, not a second hardcoded name list.
 *
 * "Who is OPERATING it" is still <ExecutiveRoster/>, rendered separately once a
 * mandate is confirmed. This shows who it's ASSIGNED to, before that's even true —
 * the founder should be able to read that off the draft, not just trust it happened.
 *
 * Sharp corners + serif headline to match ExecutiveCard/the detail page — one visual
 * language for the whole Command View, not the mandate looking like an older,
 * different product.
 *
 * Renders state. No executive reasoning lives here (CLAUDE.md §2).
 */
export function MandateCard({
  contract, directionSummary, showResponsibilities = true, animateResponsibilities = false, footer, compact = false, onChangeDirection, busy = false,
}: {
  contract: Contract
  /** The committed Strategy mission, shown as this card's subtitle — folds what used
   *  to be a separate bare `<p>Direction: …</p>` above the card into the one bordered
   *  surface instead of a second, differently-styled fragment. Ignored when compact. */
  directionSummary?: string
  /** false inside the unveiling's "mandate hardens" layer — Layer 4 shows who takes
   *  it on a beat later, with more ceremony; showing it twice in a row is redundant. */
  showResponsibilities?: boolean
  /** The unveiling's "team claims it" beat, folded into this card rather than a
   *  second component doing the same list a beat later (was TeamClaimsIt.tsx —
   *  same stagger variants, same serif executive name). Default false so every
   *  other caller (CommandView) keeps its plain, non-animated list. */
  animateResponsibilities?: boolean
  /** Rendered after the mandate content, inside the same card — e.g. CommandView's
   *  "Change direction" control. Kept as a prop rather than owned here so the copy
   *  explaining it stays physically in the file that calls for it. Ignored when compact. */
  footer?: React.ReactNode
  /** Stage 3: once real Assets exist to be the home's centre, the mandate steps back to "a
   *  line at the top with 'change direction'" (the plan's own words) rather than the full
   *  priorities/metrics card — CommandView passes this once it has assets to show instead. */
  compact?: boolean
  /** Compact mode's own change-direction control — a plain inline action, not the full
   *  card's button-plus-explanation footer (that explanation is what compact is dropping). */
  onChangeDirection?: () => void
  busy?: boolean
}) {
  const { executives } = useExecutiveWorkspace()
  const nameById = new Map(executives.map(e => [e.id, e.name]))
  const [expanded, setExpanded] = useState(false)

  // "View full mandate" opens as its own card — a centered overlay, same escape/backdrop-close
  // convention as AssetWorkspacePanel.tsx — not an inline accordion pushing the rest of the
  // compact bar's content down (the original treatment, founder feedback: it should open like
  // everything else in this app now does).
  useEffect(() => {
    if (!expanded) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded])

  // Rendered via a portal straight into <body> — `position: fixed` is only viewport-relative
  // when NO ancestor sets a transform/filter/perspective/will-change (CSS containing-block
  // rules). MandateCard sits nested inside several framer-motion wrappers up the tree, one of
  // which does exactly that, which is why this was landing pinned to a corner instead of
  // centered before. A portal sidesteps the whole class of bug rather than chasing which
  // ancestor is responsible today (and possibly again after some future layout change).
  // `mounted` guards `document` from ever being touched during SSR.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (compact) {
    return (
      <div style={{ padding: '2px 2px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* The real one-line mandate — was bookkeeping (epoch/date) standing in for it.
              contract.priorities is already the founder's own committed direction; no need to
              thread Strategy.mission through another two files to say the same thing. */}
          <span style={{ color: ink, fontSize: 14, fontWeight: 500 }}>
            {contract.priorities[0] ?? 'Your mandate'}
          </span>
          {onChangeDirection && (
            <button
              onClick={onChangeDirection}
              disabled={busy}
              // ADR-003, in the founder's language — the compact line stays quiet, so this
              // rides as a hover title rather than a permanent paragraph (that used to live in
              // a footer only the full, pre-documents card rendered; now compact is the only
              // mode, so the explanation needs a home that doesn't crowd the one-line mandate).
              title="This starts a new epoch. Your current mandate is kept exactly as it is — nothing is overwritten, and you can always see what you were operating under, and when."
              style={{
                background: 'none', border: 'none', padding: 0, color: muted, fontSize: 13,
                textDecoration: 'underline', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                flexShrink: 0,
              }}
            >
              Change direction
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
          <span style={{ color: muted, fontSize: 12 }}>
            Epoch {contract.epoch}
            {contract.confirmedAt && <> · confirmed {new Date(contract.confirmedAt).toLocaleDateString()}</>}
          </span>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: 'none', border: 'none', padding: 0, color: muted, fontSize: 12,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {expanded ? 'Hide full mandate' : 'View full mandate'}
          </button>
        </div>
        {mounted && createPortal(
          <AnimatePresence>
            {expanded && (
              <>
                <motion.div
                  key="mandate-backdrop"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setExpanded(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }}
                />
                <motion.div
                  key="mandate-card"
                  // Opacity only — NOT scale/y. framer-motion takes full ownership of the
                  // `transform` CSS property the instant any x/y/scale/rotate value appears in
                  // `animate`, silently overwriting the manual `translate(-50%, -50%)` below
                  // that's the only thing actually centering this card. That's what was still
                  // pinning it off-center even after the portal fix — the portal fixed the
                  // containing-block problem, this fixes the second, independent bug stacked on
                  // top of it. Same lesson AssetWorkspacePanel's panel-origin path already
                  // documents; missed it here the first time.
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    zIndex: 201, width: 'min(640px, 92vw)', maxHeight: '82vh', overflowY: 'auto',
                    background: white, border: `1px solid ${bdr}`, borderRadius: 16,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.16)', padding: '28px 32px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 20, height: 20, flexShrink: 0 }}>
                        <CompassDoodle color={ink} />
                      </span>
                      <h2 style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 500, color: ink, margin: 0 }}>
                        Your mandate
                      </h2>
                    </span>
                    <button
                      onClick={() => setExpanded(false)}
                      aria-label="Close"
                      style={{
                        width: 28, height: 28, borderRadius: 8, background: 'none', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted,
                        flexShrink: 0,
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <p style={{ color: muted, fontSize: 12, margin: '4px 0 0' }}>
                    Epoch {contract.epoch}
                    {contract.confirmedAt && <> · confirmed {new Date(contract.confirmedAt).toLocaleDateString()}</>}
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <MandateBody
                      contract={contract}
                      showResponsibilities={showResponsibilities}
                      animateResponsibilities={animateResponsibilities}
                      nameById={nameById}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
      </div>
    )
  }

  return (
    <SectionCard
      title={
        // The CEO drafts the mandate — the same doodle used for the CEO's own
        // identity elsewhere (features/executive/lib/executive-doodle.ts), a touch
        // of who this card is speaking as rather than a bare bordered box of lists.
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 22, height: 22, flexShrink: 0 }}>
            <CompassDoodle color={ink} />
          </span>
          Your mandate
        </span>
      }
      subtitle={directionSummary}
      action={
        <span style={{ color: muted, fontSize: 12 }}>
          {/* The epoch is the operating period — "what were we operating under, when"
              (ADR-003). It is the number that means something to a founder; the
              row version is bookkeeping (ADR-022), so it is not shown. */}
          Epoch {contract.epoch}
          {contract.status === 'confirmed' && contract.confirmedAt && (
            <> · confirmed {new Date(contract.confirmedAt).toLocaleDateString()}</>
          )}
        </span>
      }
    >
      <MandateBody
        contract={contract}
        showResponsibilities={showResponsibilities}
        animateResponsibilities={animateResponsibilities}
        nameById={nameById}
      />
      {footer}
    </SectionCard>
  )
}

/** Priorities/metrics/responsibilities — shared by the full card and the compact card's
 *  "View full mandate" expansion, so the two can never drift apart (CLAUDE.md "no duplicated logic"). */
function MandateBody({
  contract, showResponsibilities, animateResponsibilities, nameById,
}: {
  contract: Contract
  showResponsibilities: boolean
  animateResponsibilities: boolean
  nameById: Map<string, string>
}) {
  return (
    <>
      <Block label="Priorities" items={contract.priorities} />
      <Block label="Success metrics" items={contract.successMetrics} />

      {showResponsibilities && contract.responsibilities.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>
            Who takes this on
          </h3>
          {animateResponsibilities ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}
            >
              {contract.responsibilities.map((r, i) => (
                <motion.p key={i} variants={itemVariants} style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: ink }}>
                  <span style={{ fontFamily: FONT_SERIF, fontWeight: 500 }}>{nameById.get(r.executive) ?? r.executive}</span>
                  <span style={{ color: muted }}> takes on </span>
                  {r.mandate}
                </motion.p>
              ))}
            </motion.div>
          ) : (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: ink, fontSize: 14, lineHeight: 1.7, maxWidth: '70ch' }}>
              {contract.responsibilities.map((r, i) => (
                <li key={i}>
                  <strong>{nameById.get(r.executive) ?? r.executive}</strong> — {r.mandate}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}

function Block({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>
        {label}
      </h3>
      <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: ink, fontSize: 14, lineHeight: 1.7, maxWidth: '70ch' }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}
