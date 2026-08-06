'use client'

/**
 * F09 Stage 3 — "land in the work" (PRD §4). The five documents the team actually writes,
 * as the lead section of the Command View — open-able tiles, not a status card. Links to the
 * already-built app/founder/assets/[id]/page.tsx (read-first, editable, version history) —
 * that page is not rebuilt, just finally linked from a real home surface.
 *
 * Receives `assets` as a prop rather than self-fetching (the pattern every other panel here
 * uses) because CommandView also needs to know whether any Asset has real content yet, to
 * decide whether the mandate above this shrinks to its compact line — one fetch, one source of
 * truth for both.
 *
 * Stays a compact, un-grouped preview by design (artifact organization work) — the full,
 * grouped-by-executive browsing experience lives at /founder/executive/documents, one "View
 * all" link away, so this panel's own scope never grows past "land and go."
 */

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { blue } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { ArtifactCard } from './ArtifactCard'
import type { AssetSummary } from './CommandView'

export function AssetsPanel({ assets, loaded }: { assets: AssetSummary[]; loaded: boolean }) {
  if (!loaded) return null
  if (assets.length === 0) return null

  return (
    <SectionCard
      title="Your documents"
      subtitle="What your team is actually producing — open any of these to read, edit, or see its history."
      action={
        <Link href="/founder/executive/documents" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: blue, fontSize: 13, fontWeight: 500, textDecoration: 'none',
        }}>
          View all <ArrowRight size={13} />
        </Link>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {assets.map(a => <ArtifactCard key={a.id} data={a} />)}
      </div>
    </SectionCard>
  )
}
