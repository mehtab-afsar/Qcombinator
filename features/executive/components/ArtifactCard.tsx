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
  /** Total versions this Asset has, including the current one — 0 if never generated. */
  versionCount?: number
}

/**
 * @param showOwner render the owner badge — off inside an already-grouped-by-executive section
 *  (the Documents Hub), where repeating it on every card would be redundant.
 * @param onOpen when supplied (the cockpit, CANVAS_SPEC §5), clicking opens the node workspace
 *  panel in place instead of navigating to /founder/assets/[id] — "preserve the sense of place."
 *  Omitted everywhere else, where a normal link is still correct (e.g. the Documents Hub).
 */
export function ArtifactCard({
  data, showOwner = false, onOpen,
}: {
  data: ArtifactCardData
  showOwner?: boolean
  onOpen?: (assetId: string) => void
}) {
  const { id, name, executiveId, asset: version, versionCount } = data

  const sharedStyle = {
    display: 'block', background: bg, border: `1px solid ${bdr}`, borderRadius: 10,
    padding: '14px 16px', textDecoration: 'none', width: '100%', textAlign: 'left' as const,
    font: 'inherit', cursor: 'pointer',
  }

  if (onOpen) {
    return (
      <button onClick={() => onOpen(id)} style={sharedStyle}>
        <ArtifactCardBody name={name} executiveId={executiveId} version={version} versionCount={versionCount} showOwner={showOwner} />
      </button>
    )
  }

  return (
    <Link href={`/founder/assets/${id}`} style={sharedStyle}>
      <ArtifactCardBody name={name} executiveId={executiveId} version={version} versionCount={versionCount} showOwner={showOwner} />
    </Link>
  )
}

function ArtifactCardBody({
  name, executiveId, version, versionCount, showOwner,
}: {
  name: string
  executiveId: string | null
  version: ArtifactCardVersion | null
  versionCount?: number
  showOwner: boolean
}) {
  return (
    <>
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
          ? <>
              v{version.version} · {new Date(version.createdAt).toLocaleDateString()}
              {typeof versionCount === 'number' && versionCount > 1 && ` · ${versionCount} versions`}
            </>
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
    </>
  )
}
