'use client'

/**
 * One document, as a card — F09 artifact organization. Generalizes what was AssetsPanel's
 * inline AssetTile into its own file so it can be shared between the compact Command View grid
 * and the new Documents Hub (Stage 3), rather than maintained twice.
 *
 * Deliberately keeps the SAME flat, compact container the original tile used — this treatment is
 * already correct at the scale this app has today (a handful of documents per program); it does
 * not adopt ExecutiveCard's bolder ink border for "active," because that reads as emphasis at 5
 * cards on screen and would just be noise across dozens of documents.
 */

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { bg, bdr, ink, muted, blue } from '@/lib/constants/colors'
import { Badge } from '@/features/shared/components/Badge'
import { SHORT_LABEL, EXECUTIVE_BADGE_VARIANT } from '../lib/executiveLabels'

export interface ArtifactCardVersion {
  version: number
  createdAt: string
  updateReason: string | null
}

export interface ArtifactCardData {
  id: string
  name: string
  /** The Registry executive that owns this document's Program — null only if unresolvable. */
  executiveId: string | null
  asset: ArtifactCardVersion | null
}

/** @param showOwner render the owner badge — off inside an already-grouped-by-executive section
 *  (the Documents Hub), where repeating it on every card would be redundant. */
export function ArtifactCard({ data, showOwner = false }: { data: ArtifactCardData; showOwner?: boolean }) {
  const { id, name, executiveId, asset: version } = data

  return (
    <Link
      href={`/founder/assets/${id}`}
      style={{
        display: 'block', background: bg, border: `1px solid ${bdr}`, borderRadius: 10,
        padding: '14px 16px', textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <FileText size={15} color={version ? blue : muted} style={{ flexShrink: 0 }} />
          <span style={{
            color: ink, fontSize: 14, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
        </div>
        {showOwner && executiveId && (
          <Badge variant={EXECUTIVE_BADGE_VARIANT[executiveId] ?? 'neutral'} dot style={{ flexShrink: 0 }}>
            {SHORT_LABEL[executiveId] ?? executiveId.toUpperCase()}
          </Badge>
        )}
      </div>

      <p style={{ color: muted, fontSize: 12.5, marginTop: 6 }}>
        {version
          ? <>v{version.version} · {new Date(version.createdAt).toLocaleDateString()}</>
          : 'Not generated yet'}
      </p>

      {version?.updateReason && (
        <p
          title={version.updateReason}
          style={{
            color: muted, fontSize: 11.5, marginTop: 2, lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {version.updateReason}
        </p>
      )}
    </Link>
  )
}
