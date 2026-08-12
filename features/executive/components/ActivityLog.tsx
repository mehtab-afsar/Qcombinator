'use client'

/**
 * CANVAS_SPEC §4.5 — Activity Log: "everything the executive has done... The complete operating
 * record." Self-fetches /api/activity (lib/activity/log.ts does the actual merge/read).
 *
 * Shows the 5 most recent as a compact, single-line strip — not a full re-listing. The
 * Documents, Actions and Briefings sections above already show every document/action/briefing
 * in full, with their own real controls; repeating all of them again here, at the same visual
 * weight as everything above it, read as "the page dumps everything twice" (direct founder
 * feedback). "Show N more" reveals the complete record on demand — CANVAS_SPEC's own "complete
 * operating record" promise still holds, just not by default.
 */

import { useEffect, useState } from 'react'
import { FileText, Send, MessageSquare, ChevronDown } from 'lucide-react'
import { ink, muted, bdr } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'

type ActivityKind = 'asset' | 'action' | 'briefing'

interface ActivityEntry {
  id: string
  kind: ActivityKind
  label: string
  detail: string | null
  createdAt: string
}

/** More than this and the log itself starts to look like the "dump" it's meant to summarize. */
const COLLAPSED_COUNT = 5

export function ActivityLog({ executiveId }: { executiveId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null)
  const [expanded, setExpanded] = useState(false)

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

  const visible = expanded ? entries : entries.slice(0, COLLAPSED_COUNT)
  const hiddenCount = entries.length - visible.length

  return (
    <SectionCard title="Activity">
      <div style={{ display: 'grid' }}>
        {visible.map((e, i) => (
          <ActivityRow key={e.id} entry={e} last={i === visible.length - 1 && hiddenCount === 0} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            padding: '10px 0 0', cursor: 'pointer', color: muted, fontSize: 12, fontFamily: 'inherit',
          }}
        >
          Show {hiddenCount} more <ChevronDown size={12} />
        </button>
      )}
    </SectionCard>
  )
}

function kindIcon(kind: ActivityKind) {
  if (kind === 'briefing') return MessageSquare
  if (kind === 'action') return Send
  return FileText
}

/** One line, not a card — a log entry, not a repeat of the document/action listing above. */
function ActivityRow({ entry, last }: { entry: ActivityEntry; last: boolean }) {
  const Icon = kindIcon(entry.kind)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 0',
      borderBottom: last ? 'none' : `1px solid ${bdr}`,
    }}>
      <Icon size={12} color={muted} style={{ flexShrink: 0 }} />
      <span style={{
        color: ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {entry.label}
      </span>
      {entry.detail && (
        <span style={{
          color: muted, fontSize: 12, minWidth: 0, maxWidth: 220,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.detail}
        </span>
      )}
      <span style={{ color: muted, fontSize: 11, flexShrink: 0 }}>
        {new Date(entry.createdAt).toLocaleDateString()}
      </span>
    </div>
  )
}
