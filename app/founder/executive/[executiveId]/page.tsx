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

import { useCallback, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Inbox, Compass } from 'lucide-react'
import { bg, muted, ink } from '@/lib/constants/colors'
import { space, ease } from '@/features/shared/tokens'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { PageContainer } from '@/features/shared/components/PageContainer'
import { Breadcrumb } from '@/features/shared/components/Breadcrumb'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { PageIconLoader } from '@/features/shared/components/Spinner'
import { RhythmPanel } from '@/features/executive/components/RhythmPanel'
import { BriefingsPanel } from '@/features/executive/components/BriefingsPanel'
import { ActionsPanel } from '@/features/executive/components/ActionsPanel'
import { ProgramAssetsPanel } from '@/features/executive/components/ProgramAssetsPanel'
import { ContactsPrompt } from '@/features/executive/components/ContactsPrompt'
import { ExecutiveAnchor } from '@/features/executive/components/ExecutiveAnchor'
import { BirdsEyeStats } from '@/features/executive/components/BirdsEyeStats'
import { ActivityLog } from '@/features/executive/components/ActivityLog'
import { ChatRail } from '@/features/executive/components/ChatRail'
import { AssetWorkspacePanel } from '@/features/executive/components/AssetWorkspacePanel'
import { ExecutiveTabBar } from '@/features/executive/components/ExecutiveTabBar'
import { ExecutiveRead } from '@/features/executive/components/ExecutiveRead'
import { BeatHeading } from '@/features/executive/components/BeatHeading'
import { ProgramTabBar } from '@/features/executive/components/ProgramTabBar'
import { ProgramOverviewGrid } from '@/features/executive/components/ProgramOverviewGrid'
import { useProgramTabs } from '@/features/executive/hooks/useProgramTabs'
import { useRhythmProgress } from '@/features/executive/hooks/useRhythmProgress'
import { useAutoOpenLiveAsset } from '@/features/executive/hooks/useAutoOpenLiveAsset'
import { useExecutiveWorkspace } from '@/features/executive/hooks/useExecutiveWorkspace'
import type { Rect } from '@/features/executive/lib/panel-origin'
import type { Contract } from '@/features/executive/types/executive.types'

// Phase 1's entrance choreography, continued: the cockpit's sections stagger in on mount —
// same vocabulary as ExecutiveRoster's "team assembles" reveal, not a new one.
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
}

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
  // Executives, the contract and its Programs come from the shared ExecutiveWorkspaceProvider
  // (mounted in app/founder/layout.tsx) — already loaded by the time this page mounts on a tab
  // switch, so switching executives no longer re-fetches or blanks the screen. Was a singular
  // `program: ProgramInstance | null` via `.find()` — silently kept only the FIRST of this
  // executive's Programs and discarded the rest. An executive can own several (Growth now owns
  // 8) — every one of them needs to be known, not just one.
  const { executives, contract, programs: allPrograms, loaded } = useExecutiveWorkspace()
  const executive = executives.find(e => e.id === executiveId) ?? null
  const programs = allPrograms.filter(p => p.owner === executiveId)

  // Sub-navigation between this executive's own Programs — see useProgramTabs's own docstring.
  const { activeProgramId, selectProgram, activeProgram, showOverviewGrid, panelProgramTemplateId } =
    useProgramTabs(programs, searchParams)

  // Called ONCE here — shared with RhythmPanel below AND with the auto-opening document panel,
  // rather than each fetching/subscribing independently. See useRhythmProgress's own docstring.
  const rhythm = useRhythmProgress()

  // CANVAS_SPEC §5 — the node workspace panel's open asset, mirrored into ?asset= so it's
  // linkable/refresh-safe without a full page navigation ("preserve the sense of place").
  const openAssetId = searchParams.get('asset')
  // PRD 2 Stage 3 — the clicked card's own rect, so the panel can visually grow out of it
  // (features/executive/lib/panel-origin.ts) instead of always sliding from the screen edge.
  // Kept OUTSIDE the URL on purpose (a DOMRect isn't a sensible query param) — null on a direct
  // load of a ?asset= link, or on the auto-open below, both of which the panel already falls
  // back to a plain slide-in for.
  const [openAssetOrigin, setOpenAssetOrigin] = useState<Rect | null>(null)
  const openAsset = useCallback((assetId: string, originRect: Rect | null) => {
    setOpenAssetOrigin(originRect)
    router.push(`?asset=${encodeURIComponent(assetId)}`, { scroll: false })
  }, [router])
  // Watch a document write itself, live — see useAutoOpenLiveAsset's own docstring.
  const { openAssetLiveText, activeAssetId, recordDismissal } = useAutoOpenLiveAsset({
    executiveId, rhythm, openAssetId, openAsset,
  })
  const closeAsset = useCallback(() => {
    recordDismissal()
    setOpenAssetOrigin(null)
    router.push(window.location.pathname, { scroll: false })
  }, [router, recordDismissal])

  if (!loaded) {
    return <PageIconLoader label="Loading…" />
  }

  if (!executive) {
    return (
      <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
        <PageContainer>
          <PageHeader title="Executive team" back={{ label: 'Back to your executive team', href: '/founder/executive' }} />
          <ExecutiveTabBar />
          <p style={{ color: muted, fontSize: 16 }}>
            This executive isn&rsquo;t available.
          </p>
        </PageContainer>
      </div>
    )
  }

  const active = programs.length > 0
  // The Mandate beat: this executive's slice of the ONE whole-company contract
  // (ExecutiveContract.responsibilities), the same join MandateCard already does.
  const mandateEntries = contract?.responsibilities.filter(r => r.executive === executiveId) ?? []

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <PageContainer>
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
              <ExecutiveAnchor executive={executive} program={activeProgram} />
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

            {active ? (
              <motion.div variants={sectionVariants}>
                <BeatHeading>The Executive</BeatHeading>
                {/* Sub-navigation between this executive's own Programs — only renders (and only
                    changes anything below) once an executive owns more than one; every
                    single-Program executive sees exactly what rendered here before this. */}
                <ProgramTabBar programs={programs} activeProgramId={activeProgramId} onChange={selectProgram} />
                {showOverviewGrid ? (
                  <ProgramOverviewGrid executiveId={executiveId} programs={programs} onSelect={selectProgram} />
                ) : (
                  /* One interface, always — no separate "watch the first cycle" takeover screen
                     (CANVAS_SPEC D1, "never two UIs"; direct founder feedback that a takeover
                     fought this). RhythmPanel shows live status/streaming for whatever's running,
                     regardless of how the cycle started — see its own docstring. */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
                    {/* 2. Bird's-eye stats (§4.2), then Rhythm as the detail behind it (§4.2's
                        "click-to-expand" read as: the glance leads, the running detail follows).
                        Anchored so the chat rail's "initiated" reply can point back up here. */}
                    <div id="rhythm-cycle" style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
                      <BirdsEyeStats executiveId={executiveId} rhythm={rhythm} />
                      <RhythmPanel progressState={rhythm} executiveId={executiveId} programTemplateId={panelProgramTemplateId} />
                    </div>
                    {/* Only P005's outreach needs this — see ContactsPrompt's own docstring. */}
                    {panelProgramTemplateId === 'P005' && <ContactsPrompt />}
                    {/* 3. Documents (§4.3) */}
                    <ProgramAssetsPanel
                      executiveId={executiveId} onOpenAsset={openAsset} programTemplateId={panelProgramTemplateId}
                      activeAssetId={activeAssetId}
                    />
                    {/* 4. Actions (§4.4) */}
                    <ActionsPanel executiveId={executiveId} programTemplateId={panelProgramTemplateId} />
                    <BriefingsPanel executiveId={executiveId} programTemplateId={panelProgramTemplateId} />
                    {/* 5. Activity log (§4.5) — everything the executive has done, in one feed. */}
                    <ActivityLog executiveId={executiveId} />
                    {/* 6. Chat rail (§4.6) — the last cockpit section. Stateless, see ChatRail's
                        own docstring for why. */}
                    <ChatRail executiveId={executiveId} />
                  </div>
                )}
              </motion.div>
            ) : (
              // The gap this fixes: a mandate can name this executive's responsibility
              // (mandateEntries above) without also switching on a Program for them — nothing
              // upstream cross-checked the two. Before this, that drift rendered nothing at all
              // here — a mandate bullet, then a silent void. Say so plainly instead.
              <motion.div variants={sectionVariants}>
                <BeatHeading>The Executive</BeatHeading>
                <EmptyState
                  icon={Inbox}
                  title="Not active yet"
                  body={
                    mandateEntries.length > 0
                      ? `${executive.name} is named in your mandate, but no Program has been switched on for them yet — this can happen when a mandate assigns responsibility without activating matching work. Use "Change direction" on the CEO tab to refresh your mandate.`
                      : `${executive.name} isn't operating any Program right now.`
                  }
                />
              </motion.div>
            )}

            <motion.div variants={sectionVariants}>
              <ConfirmStatus contract={contract} />
            </motion.div>
          </motion.div>
        )}
      </PageContainer>

      <AssetWorkspacePanel
        assetId={openAssetId} originRect={openAssetOrigin} onClose={closeAsset} liveText={openAssetLiveText}
      />
    </div>
  )
}
