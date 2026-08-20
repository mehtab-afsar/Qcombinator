'use client'

/**
 * CANVAS_SPEC §5 — the node workspace's actual content: Read leads, Versions/Edit/Direct-the-AI
 * sit underneath, one open at a time, never all shown at once. Shared by the full-page asset
 * route (app/founder/assets/[id]/page.tsx) and the cockpit's slide-over (AssetWorkspacePanel.tsx)
 * — same body, two different frames around it, so the two surfaces can never visually drift
 * apart (CLAUDE.md "no duplicated logic").
 */

import { useState } from 'react'
import { ChevronDown, Download, Loader2 } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, red, white, alpha } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { type useAssetWorkspace, type AssetVersion, type AssetDefinition } from '../hooks/useAssetWorkspace'
import { ReportMarkdown } from './ReportMarkdown'

type Disclosure = 'versions' | 'edit' | 'direct' | null

/** A safe filename from the asset's own name — "ICP Profiles" -> "ICP-Profiles". */
function fileNameFor(def: AssetDefinition | null | undefined, version: number): string {
  const base = (def?.name ?? 'document').trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const ext = def?.outputSchema === 'json' ? 'json' : 'md'
  return `${base}-v${version}.${ext}`
}

/** Client-side only — the content is already loaded in the browser, no round-trip needed. */
function downloadAsset(def: AssetDefinition | null | undefined, current: AssetVersion): void {
  const text = typeof current.content === 'string' ? current.content : JSON.stringify(current.content, null, 2)
  const mime = def?.outputSchema === 'json' ? 'application/json' : 'text/markdown'
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileNameFor(def, current.version)
  a.click()
  URL.revokeObjectURL(url)
}

export function AssetWorkspaceBody({
  workspace, liveText,
}: {
  workspace: ReturnType<typeof useAssetWorkspace>
  /** Set only while this Asset is actively generating — see AssetWorkspacePanel's own prop
   *  comment. Renders in place of the settled Read view; Versions/Edit/Direct-the-AI all hide
   *  while live, since they'd otherwise operate on the version being replaced. */
  liveText?: string
}) {
  const { def, history, current, error } = workspace
  const [open, setOpen] = useState<Disclosure>(null)
  const isLive = liveText !== undefined

  return (
    <div>
      {current && !isLive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ color: muted, fontSize: 13, margin: 0 }}>
            Version {current.version}{current.updateReason && ` · ${current.updateReason}`}
          </p>
          <button
            onClick={() => downloadAsset(def, current)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none',
              border: `1px solid ${bdr}`, borderRadius: 6, padding: '5px 10px',
              color: muted, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            <Download size={13} />
            Download
          </button>
        </div>
      )}

      {error && (
        <div style={{ background: alpha(red, 0.06), border: `1px solid ${red}`, color: red,
          borderRadius: 8, padding: '12px 14px', marginTop: 12, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Read — the default and the front (D3). */}
      <div style={{ marginTop: 16 }}>
        {isLive ? (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              padding: '8px 12px', background: alpha(blue, 0.06), borderRadius: 8,
            }}>
              <Loader2 size={14} color={blue} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: blue, fontSize: 13, fontWeight: 600 }}>Writing this now…</span>
            </div>
            {liveText ? <ReportMarkdown content={liveText} /> : (
              <p style={{ color: muted, fontSize: 14 }}>Starting…</p>
            )}
          </div>
        ) : current ? (
          def?.outputSchema === 'markdown' ? (
            <ReportMarkdown content={typeof current.content === 'string' ? current.content : ''} />
          ) : (
            <pre style={{
              background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: 14,
              color: ink, fontSize: 13, lineHeight: 1.6, fontFamily: 'ui-monospace, monospace',
              overflowX: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {JSON.stringify(current.content, null, 2)}
            </pre>
          )
        ) : (
          <p style={{ color: muted, fontSize: 14 }}>This asset has no versions yet.</p>
        )}
      </div>

      {/* Versions/Edit/Direct-the-AI — quiet and available underneath, one at a time (§5).
          Hidden while live: they'd otherwise let a founder edit or restore a version that's
          about to be replaced by the one currently being written. */}
      {!isLive && (
        <>
          <div style={{ display: 'flex', gap: 6, marginTop: 24, paddingTop: 14, borderTop: `1px solid ${bdr}` }}>
            <DisclosureTab label="Versions" active={open === 'versions'} onClick={() => setOpen(o => o === 'versions' ? null : 'versions')} />
            <DisclosureTab label="Edit" active={open === 'edit'} onClick={() => setOpen(o => o === 'edit' ? null : 'edit')} />
            <DisclosureTab label="Direct the AI" active={open === 'direct'} onClick={() => setOpen(o => o === 'direct' ? null : 'direct')} />
          </div>

          {open === 'versions' && <VersionsSection history={history} onRestore={v => void workspace.restore(v)} busy={workspace.saving} />}
          {open === 'edit' && <EditSection workspace={workspace} />}
          {open === 'direct' && <DirectSection workspace={workspace} />}
        </>
      )}
    </div>
  )
}

function DisclosureTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, background: 'none',
        border: 'none', padding: '6px 10px', cursor: 'pointer',
        color: active ? ink : muted, fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: 'inherit',
      }}
    >
      {label}
      <ChevronDown size={12} style={{ transform: active ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
    </button>
  )
}

function VersionsSection({ history, onRestore, busy }: { history: AssetVersion[]; onRestore: (v: AssetVersion) => void; busy: boolean }) {
  if (history.length === 0) {
    return <p style={{ color: muted, fontSize: 13, marginTop: 12 }}>No versions yet.</p>
  }
  return (
    <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
      {history.map(h => (
        <div key={h.id} style={{
          background: surf, border: `1px solid ${bdr}`, borderRadius: radius.md,
          padding: '10px 12px', fontSize: 13, color: muted,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ color: ink, minWidth: 84 }}>
            v{h.version}{h.isCurrent && ' · current'}
          </span>
          <span style={{ minWidth: 72 }}>{h.authoredBy}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 60 }}>
            {h.updateReason ?? ''}
          </span>
          <span>{new Date(h.createdAt).toLocaleDateString()}</span>
          {!h.isCurrent && (
            <button
              onClick={() => onRestore(h)}
              disabled={busy}
              style={{
                background: 'none', border: `1px solid ${bdr}`, borderRadius: 6,
                padding: '4px 10px', color: blue, fontSize: 12,
                cursor: busy ? 'default' : 'pointer',
              }}
            >
              Restore
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function EditSection({ workspace }: { workspace: ReturnType<typeof useAssetWorkspace> }) {
  const { def, draft, setDraft, current, saving, note, save } = workspace
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ color: muted, fontSize: 13, lineHeight: 1.6 }}>
        Saving creates a new version, effective immediately — your executive team works from the
        current version. Nothing is ever overwritten.
      </p>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={14}
        spellCheck={def?.outputSchema === 'markdown'}
        placeholder={current ? '' : 'This asset has no versions yet.'}
        style={{
          width: '100%', marginTop: 10, background: bg, border: `1px solid ${bdr}`,
          borderRadius: 8, padding: 14, color: ink, fontSize: 14, lineHeight: 1.6,
          fontFamily: def?.outputSchema === 'json' ? 'ui-monospace, monospace' : 'inherit',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
        <button
          onClick={() => void save()}
          disabled={saving}
          style={{
            background: blue, color: white, border: 'none', borderRadius: 8,
            padding: '11px 22px', fontSize: 15, fontWeight: 500,
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save new version'}
        </button>
        {note && <span style={{ color: green, fontSize: 14 }}>{note}</span>}
      </div>
    </div>
  )
}

function DirectSection({ workspace }: { workspace: ReturnType<typeof useAssetWorkspace> }) {
  const { instruction, setInstruction, directing, direct, note } = workspace
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ color: muted, fontSize: 13, lineHeight: 1.6 }}>
        Tell your team what to change about this document. They rework it and save a new
        version — this doesn&rsquo;t start a conversation, and it can&rsquo;t send or spend anything.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <input
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder="e.g. Sharpen the ICP around companies with 50-200 employees"
          maxLength={2000}
          disabled={directing}
          style={{
            flex: 1, minWidth: 200, background: bg, border: `1px solid ${bdr}`, borderRadius: 8,
            padding: '10px 12px', color: ink, fontSize: 14,
          }}
        />
        <button
          onClick={() => void direct()}
          disabled={directing || !instruction.trim()}
          style={{
            background: blue, color: white, border: 'none', borderRadius: 8,
            padding: '10px 18px', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
            cursor: directing || !instruction.trim() ? 'default' : 'pointer',
            opacity: directing || !instruction.trim() ? 0.6 : 1,
          }}
        >
          {directing ? 'Reworking…' : 'Send'}
        </button>
      </div>
      {note && <p style={{ color: green, fontSize: 13, marginTop: 8 }}>{note}</p>}
    </div>
  )
}
