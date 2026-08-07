'use client'

/**
 * F09 artifact organization, Stage 3 — the Documents Hub. Directly answers the gap: a founder
 * could only ever see a flat, unlabeled grid of documents (AssetsPanel, Command View only) with
 * no indication of which executive made what, no link to the briefing that explains a change,
 * and no doorway to that executive's own page. This groups by executive (all 5, fixed order,
 * always shown — matching ExecutiveRoster's "where did Operations go? nowhere" philosophy) and
 * gives each group a "Latest briefing" and "View program" link — a de facto Program view without
 * inventing a third concept.
 *
 * Reached via AssetsPanel's "View all" link, never a sidebar item (PRD §3: "one front door, hide
 * the machinery") — nested three levels under the existing "Executive Team" item. ExecutiveTabBar
 * mounted here orients for free: its active-route logic already falls through to highlighting
 * the CEO tab for any /founder/executive/* path outside the 5 known tab routes.
 *
 * No new API route — composes three existing reads (/api/executives, /api/assets, /api/briefings),
 * the same client-side-join pattern ExecutiveRoster already uses for small fetched lists.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { bg, bdr, ink, muted, blue } from '@/lib/constants/colors'
import { font, space } from '@/features/shared/tokens'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { PageContainer } from '@/features/shared/components/PageContainer'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { PageSpinner } from '@/features/shared/components/Spinner'
import { ExecutiveTabBar } from '@/features/executive/components/ExecutiveTabBar'
import { ArtifactCard, type ArtifactCardData } from '@/features/executive/components/ArtifactCard'
import { SHORT_LABEL, EXECUTIVE_BADGE_VARIANT } from '@/features/executive/lib/executiveLabels'
import { Badge } from '@/features/shared/components/Badge'
import type { ExecutiveSummary } from '@/features/executive/types/executive.types'

interface Briefing { id: string; executiveId: string | null; verdict: string }

export default function DocumentsHubPage() {
  const [executives, setExecutives] = useState<ExecutiveSummary[] | null>(null)
  const [assets, setAssets] = useState<ArtifactCardData[]>([])
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const [execRes, assetsRes, briefRes] = await Promise.all([
          fetch('/api/executives'),
          fetch('/api/assets'),
          fetch('/api/briefings'),
        ])
        if (!live) return
        const execs: ExecutiveSummary[] = execRes.ok ? (await execRes.json()).executives ?? [] : []
        const assetList: ArtifactCardData[] = assetsRes.ok ? (await assetsRes.json()).assets ?? [] : []
        const briefList: Briefing[] = briefRes.ok ? (await briefRes.json()).briefings ?? [] : []
        if (!live) return
        setExecutives(execs)
        setAssets(assetList)
        setBriefings(briefList)
        // Default: collapsed only for an executive with no documents at all — never hidden,
        // just quiet, matching ExecutiveCard's idle treatment.
        setCollapsed(new Set(execs.filter(e => !assetList.some(a => a.executiveId === e.id)).map(e => e.id)))
      } catch {
        if (live) setExecutives([])
      }
    })()
    return () => { live = false }
  }, [])

  if (executives === null) return <PageSpinner label="Loading your documents…" />

  const toggle = (id: string) => setCollapsed(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <PageContainer>
        <PageHeader
          title="Your documents"
          subtitle="Organized by who made them"
          back={{ label: 'Back to your executive team', href: '/founder/executive' }}
        />
        <ExecutiveTabBar />

        {assets.length === 0 ? (
          <EmptyState
            title="Nothing generated yet"
            body="Once your mandate is confirmed and your team's first cycle runs, their documents will show up here, organized by who made them."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: space[6] }}>
            {executives.map(e => (
              <ExecutiveGroup
                key={e.id}
                executive={e}
                assets={assets.filter(a => a.executiveId === e.id)}
                latestBriefing={briefings.find(b => b.executiveId === e.id) ?? null}
                collapsed={collapsed.has(e.id)}
                onToggle={() => toggle(e.id)}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  )
}

function ExecutiveGroup({
  executive, assets, latestBriefing, collapsed, onToggle,
}: {
  executive: ExecutiveSummary
  assets: ArtifactCardData[]
  latestBriefing: Briefing | null
  collapsed: boolean
  onToggle: () => void
}) {
  const variant = EXECUTIVE_BADGE_VARIANT[executive.id] ?? 'neutral'
  const programHref = executive.id === 'ceo' ? '/founder/executive' : `/founder/executive/${executive.id}`

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        flexWrap: 'wrap', paddingBottom: 10, borderBottom: `1px solid ${bdr}`,
      }}>
        <button
          onClick={onToggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, fontFamily: 'inherit',
          }}
        >
          <span style={{ fontFamily: font.family.serif, fontSize: 17, fontWeight: 500, color: ink }}>
            {executive.name}
          </span>
          <Badge variant={variant} dot>{SHORT_LABEL[executive.id] ?? executive.id.toUpperCase()}</Badge>
          <span style={{ color: muted, fontSize: 13 }}>
            {assets.length === 0 ? 'No documents yet' : `${assets.length} document${assets.length === 1 ? '' : 's'}`}
          </span>
          <ChevronDown
            size={14} color={muted}
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {latestBriefing && (
            <Link href={`/founder/briefings/${latestBriefing.id}`} style={linkStyle}>
              Latest briefing: {truncate(latestBriefing.verdict, 40)} <ArrowRight size={12} />
            </Link>
          )}
          <Link href={programHref} style={linkStyle}>
            View program <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {!collapsed && (
        assets.length === 0 ? (
          <p style={{ color: muted, fontSize: 13, marginTop: 10 }}>
            No documents yet — assigned when a Program is added to the Registry.
          </p>
        ) : (
          <div style={{
            marginTop: 12, display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10,
          }}>
            {assets.map(a => <ArtifactCard key={a.id} data={a} />)}
          </div>
        )
      )}
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  color: blue, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
