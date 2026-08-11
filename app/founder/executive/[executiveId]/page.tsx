'use client'

/**
 * One Executive's own space — the "hierarchy" half of the Command View redesign.
 *
 * F09 IA restructuring: this tab follows the same beat vocabulary as the CEO tab (Read →
 * Mandate → Executive → Confirm), scoped to one executive. "The Direction" beat is deliberately
 * absent here — Direction (agree/nudge) is a whole-company concept the CEO tab owns; there is no
 * per-executive direction in the data model, and inventing one would duplicate Unveiling's own
 * layer for no real gain. "Confirm" is a read-only status line, never a button — see the comment
 * on ConfirmStatus below for why.
 *
 * Not a chat. Clicking through from the roster/tab bar does not open a conversation with Patel —
 * it opens a status page. See ExecutiveCard's docstring for why that distinction matters.
 *
 * Generic route, not one per executive (CLAUDE.md §0.1) — this file handles all 5 ids today and
 * will handle a 6th without modification if one is ever added.
 *
 * Thin: renders state, calls the API. No executive reasoning (CLAUDE.md §2).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Inbox, AlertCircle, Compass } from 'lucide-react'
import { bg, muted, ink } from '@/lib/constants/colors'
import { space, ease } from '@/features/shared/tokens'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { Breadcrumb } from '@/features/shared/components/Breadcrumb'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { PageIconLoader } from '@/features/shared/components/Spinner'
import { fetchWithTimeout, isTimeoutError } from '@/features/shared/lib/fetchWithTimeout'
import { RhythmPanel } from '@/features/executive/components/RhythmPanel'
import { BriefingsPanel } from '@/features/executive/components/BriefingsPanel'
import { ActionsPanel } from '@/features/executive/components/ActionsPanel'
import { ProgramAssetsPanel } from '@/features/executive/components/ProgramAssetsPanel'
import { ExecutiveAnchor } from '@/features/executive/components/ExecutiveAnchor'
import { BirdsEyeStats } from '@/features/executive/components/BirdsEyeStats'
import { ActivityLog } from '@/features/executive/components/ActivityLog'
import { ChatRail } from '@/features/executive/components/ChatRail'
import { AssetWorkspacePanel } from '@/features/executive/components/AssetWorkspacePanel'
import { ActivationScreen } from '@/features/executive/components/ActivationScreen'
import { useActivationCheck } from '@/features/executive/lib/useActivationCheck'
import { ExecutiveTabBar } from '@/features/executive/components/ExecutiveTabBar'
import { ExecutiveRead } from '@/features/executive/components/ExecutiveRead'
import { BeatHeading } from '@/features/executive/components/BeatHeading'
import type { Rect } from '@/features/executive/lib/panel-origin'
import type { Contract, ExecutiveSummary, ProgramInstance } from '@/features/executive/types/executive.types'

// Phase 1's entrance choreography, continued: the cockpit's sections stagger in on mount —
// same vocabulary as ExecutiveRoster's "team assembles" reveal, not a new one.
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
}

type LoadState = 'loading' | 'timeout' | 'not_found' | 'ready'

/**
 * "Confirm" — always a read-only status line, never a button, on every tab but the CEO's.
 *
 * There is exactly one confirm in this product (ADR-002 — no per-plan sign-off) and one
 * immutable, whole-contract mandate row (ADR-003). "Finance confirmed, Growth didn't" isn't a
 * state the data model can express, so nothing here should look clickable — a disabled button
 * implies an action merely blocked for now, which is the wrong signal when no such action
 * exists at all.
 */
function ConfirmStatus({ contract }: { contract: Contract | null }) {
  if (!contract || contract.status !== 'confirmed') return null
  return (
    <div>
      <BeatHeading>Confirm</BeatHeading>
      <p style={{ color: muted, fontSize: 13, margin: 0 }}>
        Confirmed as part of your mandate · epoch {contract.epoch}
        {contract.confirmedAt && <> · {new Date(contract.confirmedAt).toLocaleDateString()}</>}
      </p>
    </div>
  )
}

export default function ExecutiveDetailPage() {
  const executiveId = String(useParams().executiveId ?? '')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<LoadState>('loading')
  const [executive, setExecutive] = useState<ExecutiveSummary | null>(null)
  const [program, setProgram] = useState<ProgramInstance | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const live = useRef(true)

  // F09 Activation, brought to this page (PRD 2, Stage 1) — previously only reachable from the
  // CEO tab, so a founder landing here directly never saw their team actually start working,
  // regardless of cycle number. `contract` is null while loading; the hook handles that (settles
  // immediately, no fetch) rather than needing a conditional hook call, which Rules of Hooks
  // forbids.
  const [forceSettled, setForceSettled] = useState(false)
  const activationChecked = useActivationCheck(contract)
  const activationState = forceSettled ? 'settled' : activationChecked

  // CANVAS_SPEC §5 — the node workspace panel's open asset, mirrored into ?asset= so it's
  // linkable/refresh-safe without a full page navigation ("preserve the sense of place").
  const openAssetId = searchParams.get('asset')
  // PRD 2 Stage 3 — the clicked card's own rect, so the panel can visually grow out of it
  // (features/executive/lib/panel-origin.ts) instead of always sliding from the screen edge.
  // Kept OUTSIDE the URL on purpose (a DOMRect isn't a sensible query param) — null on a direct
  // load of a ?asset= link, which the panel already falls back to a plain slide-in for.
  const [openAssetOrigin, setOpenAssetOrigin] = useState<Rect | null>(null)
  const openAsset = useCallback((assetId: string, originRect: Rect) => {
    setOpenAssetOrigin(originRect)
    router.push(`?asset=${encodeURIComponent(assetId)}`, { scroll: false })
  }, [router])
  const closeAsset = useCallback(() => {
    setOpenAssetOrigin(null)
    router.push(window.location.pathname, { scroll: false })
  }, [router])

  const load = useCallback(async () => {
    setState('loading')
    try {
      const [execRes, contractRes] = await Promise.all([
        fetchWithTimeout('/api/executives'),
        fetchWithTimeout('/api/contracts'),
      ])
      if (!live.current) return
      if (!execRes.ok || !contractRes.ok) { setState('not_found'); return }

      const found: ExecutiveSummary | undefined =
        (await execRes.json()).executives?.find((e: ExecutiveSummary) => e.id === executiveId)
      if (!live.current) return
      if (!found) { setState('not_found'); return } // an unknown id — honest 404, not a crash

      const contractData = await contractRes.json()
      if (!live.current) return
      const programs: ProgramInstance[] = contractData.programs ?? []
      setContract(contractData.contract ?? null)
      setExecutive(found)
      setProgram(programs.find(p => p.owner === executiveId) ?? null)
      setState('ready')
    } catch (err) {
      if (live.current) setState(isTimeoutError(err) ? 'timeout' : 'not_found')
    }
  }, [executiveId])

  useEffect(() => {
    live.current = true
    void load()
    return () => { live.current = false }
  }, [load])

  if (state === 'loading') {
    return <PageIconLoader label="Loading…" />
  }

  if (state === 'timeout') {
    return (
      <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <EmptyState
            icon={AlertCircle}
            title="This is taking longer than expected"
            body="We couldn't load this executive in time."
            action={{ label: 'Try again', onClick: () => void load() }}
          />
        </div>
      </div>
    )
  }

  if (state === 'not_found' || !executive) {
    return (
      <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <PageHeader title="Executive team" back={{ label: 'Back to your executive team', href: '/founder/executive' }} />
          <ExecutiveTabBar />
          <p style={{ color: muted, fontSize: 16 }}>
            This executive isn&rsquo;t available.
          </p>
        </div>
      </div>
    )
  }

  const active = program !== null
  // The Mandate beat: this executive's slice of the ONE whole-company contract
  // (ExecutiveContract.responsibilities), the same join MandateCard already does.
  const mandateEntries = contract?.responsibilities.filter(r => r.executive === executiveId) ?? []

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* CANVAS_SPEC §3: "clearly 'inside' Patel (breadcrumb / back-to-team)" — orientation,
            not identity; ExecutiveAnchor below still owns identity (CANVAS_SPEC §4.1). */}
        <Breadcrumb items={[{ label: 'Your team', href: '/founder/executive' }, { label: executive.name }]} />
        <ExecutiveTabBar />

        {!contract ? (
          <div style={{ marginTop: 32 }}>
            <EmptyState
              icon={Compass}
              title="No mandate set yet"
              body="Your team works to a mandate you set on the CEO tab — nothing is assigned here until that exists."
              action={{ label: 'Go to the CEO tab', href: '/founder/executive' }}
            />
          </div>
        ) : contract.status !== 'confirmed' ? (
          <div style={{ marginTop: 32 }}>
            <EmptyState
              icon={Compass}
              title="Your mandate is still being set"
              body="Finish setting your direction on the CEO tab — every executive's work here starts once it's confirmed."
              action={{ label: 'Go to the CEO tab', href: '/founder/executive' }}
            />
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: space[5] }}
          >
            {/* 1. Anchor (CANVAS_SPEC §4.1) — identity + status, replaces the old bare title. */}
            <motion.div variants={sectionVariants}>
              <ExecutiveAnchor executive={executive} program={program} />
            </motion.div>

            <motion.div variants={sectionVariants}>
              <ExecutiveRead />
            </motion.div>

            <motion.div variants={sectionVariants}>
              <BeatHeading>The Mandate</BeatHeading>
              {mandateEntries.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, color: ink, fontSize: 14, lineHeight: 1.7 }}>
                  {mandateEntries.map((r, i) => <li key={i}>{r.mandate}</li>)}
                </ul>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="No active program yet"
                  body={`${executive.name} isn't assigned any work in your current mandate — this is honest, not a fault. New Programs are added to the Registry as the product grows.`}
                />
              )}
            </motion.div>

            {active && (
              <motion.div variants={sectionVariants}>
                <BeatHeading>The Executive</BeatHeading>
                {activationState === 'activation' ? (
                  // PRD 2, Stage 1 — a founder landing HERE during their team's just-triggered
                  // first cycle watches it happen, the same payoff the CEO tab already gave,
                  // scoped to just this executive's steps (ActivationScreen is whole-company
                  // when executiveId is omitted, which is correct on the CEO tab and wrong here).
                  <ActivationScreen executiveId={executiveId} onComplete={() => setForceSettled(true)} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
                    {/* 2. Bird's-eye stats (§4.2), then Rhythm as the detail behind it (§4.2's
                        "click-to-expand" read as: the glance leads, the running detail follows).
                        Anchored so the chat rail's "initiated" reply can point back up here. */}
                    <div id="rhythm-cycle" style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
                      <BirdsEyeStats executiveId={executiveId} />
                      <RhythmPanel executiveId={executiveId} />
                    </div>
                    {/* 3. Documents (§4.3) */}
                    <ProgramAssetsPanel executiveId={executiveId} onOpenAsset={openAsset} />
                    {/* 4. Actions (§4.4) */}
                    <ActionsPanel executiveId={executiveId} />
                    <BriefingsPanel executiveId={executiveId} />
                    {/* 5. Activity log (§4.5) — everything the executive has done, in one feed. */}
                    <ActivityLog executiveId={executiveId} />
                    {/* 6. Chat rail (§4.6) — the last cockpit section. Stateless, see ChatRail's
                        own docstring for why. */}
                    <ChatRail executiveId={executiveId} />
                  </div>
                )}
              </motion.div>
            )}

            <motion.div variants={sectionVariants}>
              <ConfirmStatus contract={contract} />
            </motion.div>
          </motion.div>
        )}
      </div>

      <AssetWorkspacePanel assetId={openAssetId} originRect={openAssetOrigin} onClose={closeAsset} />
    </div>
  )
}
