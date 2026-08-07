'use client'

/**
 * F11 / CANVAS_SPEC §5 — the founder's Asset workspace, Read-first (D3). All actual content —
 * Read/Versions/Edit/Direct-the-AI — lives in AssetWorkspaceBody, shared with the cockpit's
 * AssetWorkspacePanel slide-over so a direct visit here and an in-cockpit open look and behave
 * identically. This file is just the full-page frame around it.
 */

import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { bg, ink, muted } from '@/lib/constants/colors'
import { useAssetWorkspace } from '@/features/executive/hooks/useAssetWorkspace'
import { AssetWorkspaceBody } from '@/features/executive/components/AssetWorkspaceBody'

export default function AssetPage() {
  const assetId = String(useParams().id ?? '')
  const workspace = useAssetWorkspace(assetId)

  if (workspace.loading) {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 size={20} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <p style={{ color: muted, fontSize: 13, margin: 0 }}>{assetId}</p>
        <h1 style={{ color: ink, fontSize: 26, fontWeight: 600, margin: '4px 0 0' }}>
          {workspace.def?.name ?? 'Asset'}
        </h1>
        <div style={{ marginTop: 16 }}>
          <AssetWorkspaceBody workspace={workspace} />
        </div>
      </div>
    </div>
  )
}
