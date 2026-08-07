'use client'

/**
 * CANVAS_SPEC §5 — the node workspace's actual content: Read leads, Versions/Edit/Direct-the-AI
 * sit underneath, one open at a time, never all shown at once. Shared by the full-page asset
 * route (app/founder/assets/[id]/page.tsx) and the cockpit's slide-over (AssetWorkspacePanel.tsx)
 * — same body, two different frames around it, so the two surfaces can never visually drift
 * apart (CLAUDE.md "no duplicated logic").
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { bg, surf, bdr, ink, muted, blue, green, red, white, alpha } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { type useAssetWorkspace, type AssetVersion } from '../hooks/useAssetWorkspace'

type Disclosure = 'versions' | 'edit' | 'direct' | null

export function AssetWorkspaceBody({ workspace }: { workspace: ReturnType<typeof useAssetWorkspace> }) {
  const { def, history, current, error } = workspace
  const [open, setOpen] = useState<Disclosure>(null)

  return (
    <div>
      {current && (
        <p style={{ color: muted, fontSize: 13, margin: 0 }}>
          Version {current.version}{current.updateReason && ` · ${current.updateReason}`}
        </p>
      )}

      {error && (
        <div style={{ background: alpha(red, 0.06), border: `1px solid ${red}`, color: red,
          borderRadius: 8, padding: '12px 14px', marginTop: 12, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Read — the default and the front (D3). */}
      <div style={{ marginTop: 16 }}>
        {current ? (
          def?.outputSchema === 'markdown' ? (
            <div style={{ fontFamily: FONT_SERIF, color: ink, fontSize: 15, lineHeight: 1.7 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {typeof current.content === 'string' ? current.content : ''}
              </ReactMarkdown>
            </div>
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

      {/* Versions/Edit/Direct-the-AI — quiet and available underneath, one at a time (§5). */}
      <div style={{ display: 'flex', gap: 6, marginTop: 24, paddingTop: 14, borderTop: `1px solid ${bdr}` }}>
        <DisclosureTab label="Versions" active={open === 'versions'} onClick={() => setOpen(o => o === 'versions' ? null : 'versions')} />
        <DisclosureTab label="Edit" active={open === 'edit'} onClick={() => setOpen(o => o === 'edit' ? null : 'edit')} />
        <DisclosureTab label="Direct the AI" active={open === 'direct'} onClick={() => setOpen(o => o === 'direct' ? null : 'direct')} />
      </div>

      {open === 'versions' && <VersionsSection history={history} onRestore={v => void workspace.restore(v)} busy={workspace.saving} />}
      {open === 'edit' && <EditSection workspace={workspace} />}
      {open === 'direct' && <DirectSection workspace={workspace} />}
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
