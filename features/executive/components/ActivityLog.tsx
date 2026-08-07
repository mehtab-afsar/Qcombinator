'use client'

/**
 * CANVAS_SPEC §4.5 — Activity Log: "everything the executive has done. A plain feed: documents
 * written, actions prepared/taken, cycles run, founder edits used. The complete operating
 * record." Self-fetches /api/activity (lib/activity/log.ts does the actual merge/read).
 */

import { useEffect, useState } from 'react'
import { FileText, Send, MessageSquare } from 'lucide-react'
import { ink, muted, bdr, bg } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { SectionCard } from '@/features/shared/components/SectionCard'

type ActivityKind = 'asset' | 'action' | 'briefing'

interface ActivityEntry {
  id: string
  kind: ActivityKind
  label: string
  detail: string | null
  createdAt: string
}

export function ActivityLog({ executiveId }: { executiveId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch(`/api/activity?executiveId=${encodeURIComponent(executiveId)}`)
        if (!live) return
        if (res.ok) setEntries((await res.json()).activity ?? [])
        else setEntries([])
      } catch {
        if (live) setEntries([])
      }
    })()
    return () => { live = false }
  }, [executiveId])

  if (entries === null || entries.length === 0) return null

  return (
    <SectionCard title="Activity">
      <div style={{ display: 'grid', gap: 8 }}>
        {entries.map(e => <ActivityRow key={e.id} entry={e} />)}
      </div>
    </SectionCard>
  )
}

function kindIcon(kind: ActivityKind) {
  if (kind === 'briefing') return MessageSquare
  if (kind === 'action') return Send
  return FileText
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const Icon = kindIcon(entry.kind)
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13,
      background: bg, border: `1px solid ${bdr}`, borderRadius: radius.md, padding: '10px 12px',
    }}>
      <Icon size={13} color={muted} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: ink, fontWeight: 500 }}>{entry.label}</span>
          <span style={{ color: muted, fontSize: 11, flexShrink: 0 }}>
            {new Date(entry.createdAt).toLocaleDateString()}
          </span>
        </div>
        {entry.detail && (
          <p style={{ color: muted, fontSize: 12, margin: '2px 0 0' }}>{entry.detail}</p>
        )}
      </div>
    </div>
  )
}
