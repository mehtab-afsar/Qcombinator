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
 */

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { bg, bdr, ink, muted, blue } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import type { AssetSummary } from './CommandView'

export function AssetsPanel({ assets, loaded }: { assets: AssetSummary[]; loaded: boolean }) {
  if (!loaded) return null
  if (assets.length === 0) return null

  return (
    <SectionCard title="Your documents" subtitle="What your team is actually producing — open any of these to read, edit, or see its history.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {assets.map(a => <AssetTile key={a.id} asset={a} />)}
      </div>
    </SectionCard>
  )
}

function AssetTile({ asset }: { asset: AssetSummary }) {
  const { id, name, asset: version } = asset
  return (
    <Link
      href={`/founder/assets/${id}`}
      style={{
        display: 'block', background: bg, border: `1px solid ${bdr}`, borderRadius: 10,
        padding: '14px 16px', textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileText size={15} color={version ? blue : muted} />
        <span style={{ color: ink, fontSize: 14, fontWeight: 600 }}>{name}</span>
      </div>
      <p style={{ color: muted, fontSize: 12.5, marginTop: 6 }}>
        {version
          ? <>v{version.version} · {new Date(version.createdAt).toLocaleDateString()}</>
          : 'Not generated yet'}
      </p>
    </Link>
  )
}
