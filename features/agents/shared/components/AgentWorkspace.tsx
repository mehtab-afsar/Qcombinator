'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, TrendingUp, CheckCircle2, RefreshCw, FileText, Copy, Share2, ChevronLeft } from 'lucide-react'
import { useAgentWorkspace }    from '../hooks/useAgentWorkspace'
import { AgentLeftPanel }       from './AgentLeftPanel'
import { renderArtifactContent } from '../utils/renderArtifactContent'
import { ARTIFACT_META }        from '../constants/artifact-meta'
import { bg, surf, bdr, ink, muted, green, amber } from '../constants/colors'
import type { DeliverableConfig }   from './AgentLeftPanel'
import type { ArtifactRecord, AgentWorkspaceState } from '../hooks/useAgentWorkspace'

export type { DeliverableConfig }

export interface CustomPanel {
  id:     string
  label:  string
  icon:   React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  badge?: (state: AgentWorkspaceState) => number | undefined
  render: (args: { workspace: AgentWorkspaceState; accent: string }) => React.ReactNode
}

export interface AgentWorkspaceProps {
  agentId:         string
  name:            string
  role:            string
  emoji:           string
  accent:          string
  badge:           string
  deliverables:    DeliverableConfig[]
  suggestedPrompts: string[]
  customPanel?:    CustomPanel
  extras?:         (args: { workspace: AgentWorkspaceState }) => React.ReactNode
}

// ─── action list ──────────────────────────────────────────────────────────────

function ActionsView({
  workspace, accent,
}: { workspace: AgentWorkspaceState; accent: string }) {
  const pending = workspace.actions.filter(a => a.status !== 'done')
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>Actions</h2>
            <p style={{ fontSize: 12, color: muted }}>
              {pending.length} pending · {workspace.actions.length - pending.length} done
            </p>
          </div>
          <button
            onClick={workspace.extractActions}
            disabled={workspace.extracting || workspace.apiMessages.length < 4}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: `1px solid ${bdr}`, background: bg,
              color: workspace.extracting ? muted : ink, cursor: workspace.extracting || workspace.apiMessages.length < 4 ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={11} style={{ animation: workspace.extracting ? 'spin 1s linear infinite' : 'none' }} />
            {workspace.extracting ? 'Extracting…' : 'Extract from chat'}
          </button>
        </div>

        {workspace.actions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ fontSize: 14, color: muted, marginBottom: 8 }}>No actions yet</p>
            <p style={{ fontSize: 12, color: muted }}>Chat first, then extract actionable next steps.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workspace.actions.map(item => {
              const pColor = item.priority === 'high' ? '#DC2626' : item.priority === 'medium' ? '#D97706' : muted
              const sBg   = item.status === 'done' ? '#F0FDF4' : bg
              const sBdr  = item.status === 'done' ? '#86EFAC' : bdr
              return (
                <div key={item.id} style={{ padding: '12px 14px', borderRadius: 10, background: sBg, border: `1px solid ${sBdr}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <button
                    onClick={() => workspace.toggleAction(item.id, item.status)}
                    style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                      border: `1.5px solid ${item.status === 'done' ? green : bdr}`,
                      background: item.status === 'done' ? green : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {item.status === 'done' && <CheckCircle2 size={11} style={{ color: '#fff' }} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: item.status === 'done' ? muted : ink, textDecoration: item.status === 'done' ? 'line-through' : 'none', marginBottom: 4 }}>
                      {item.action_text}
                    </p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: pColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {item.priority}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── artifact full-width view ──────────────────────────────────────────────────

function ArtifactView({
  artifact, accent, userId,
}: { artifact: ArtifactRecord; accent: string; userId: string | null }) {
  const meta = ARTIFACT_META[artifact.type]
  const Icon = meta?.icon ?? FileText

  const copyText = () => {
    const text = JSON.stringify(artifact.content, null, 2)
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* artifact header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${meta?.color ?? accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} style={{ color: meta?.color ?? accent }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: ink, lineHeight: 1.2 }}>{artifact.title}</p>
              <p style={{ fontSize: 11, color: muted }}>{meta?.label ?? artifact.type}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={copyText} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1px solid ${bdr}`, background: bg, color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
              <Copy size={11} /> Copy
            </button>
          </div>
        </div>

        {/* content */}
        <div style={{ background: bg, borderRadius: 12, border: `1px solid ${bdr}`, padding: '20px 24px' }}>
          {renderArtifactContent(artifact, userId)}
        </div>
      </div>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

export function AgentWorkspace({
  agentId, name, role, emoji, accent, badge,
  deliverables, suggestedPrompts, customPanel, extras,
}: AgentWorkspaceProps) {
  const searchParams = useSearchParams()
  const targetId     = searchParams.get('artifact')
  const workspace    = useAgentWorkspace(agentId)
  const [activeView, setActiveView] = useState<string>('chat')

  // Open artifact from URL param
  useEffect(() => {
    if (!targetId || workspace.loading) return
    const found = workspace.artifacts.find(a => a.id === targetId)
    if (found) setActiveView(`artifact:${found.id}`)
  }, [targetId, workspace.artifacts, workspace.loading])

  // Auto-open freshly built artifact
  useEffect(() => {
    if (workspace.latestArtifact) setActiveView(`artifact:${workspace.latestArtifact.id}`)
  }, [workspace.latestArtifact])

  const activeArtifact = activeView.startsWith('artifact:')
    ? workspace.artifacts.find(a => a.id === activeView.slice(9)) ?? null
    : null

  if (workspace.loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: muted }}
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }} />
          ))}
        </div>
      </div>
    )
  }

  const pendingActionsCount = workspace.actions.filter(a => a.status !== 'done').length

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', background: bg, color: ink }}>

      {/* score boost toast */}
      <AnimatePresence>
        {workspace.scoreBoost && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: '#052e16', color: '#bbf7d0', borderRadius: 12,
              padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              pointerEvents: 'none',
            }}
          >
            <TrendingUp size={15} style={{ color: '#4ade80' }} />
            Q-Score +{workspace.scoreBoost.points} pts · {workspace.scoreBoost.dimension} boosted
          </motion.div>
        )}
      </AnimatePresence>

      {/* left panel */}
      <AgentLeftPanel
        name={name} role={role} emoji={emoji} accent={accent} badge={badge}
        deliverables={deliverables} artifacts={workspace.artifacts}
        actionsCount={pendingActionsCount}
        activeView={activeView} onViewChange={setActiveView}
        customPanel={customPanel ? {
          id: customPanel.id, label: customPanel.label, icon: customPanel.icon,
          badge: customPanel.badge?.(workspace),
        } : undefined}
      />

      {/* main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* top bar */}
        <div style={{
          flexShrink: 0, height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', borderBottom: `1px solid ${bdr}`, background: bg,
        }}>
          {activeArtifact ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setActiveView('chat')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: muted, fontSize: 11, fontWeight: 500, padding: 0,
                }}
              >
                <ChevronLeft size={13} /> Chat
              </button>
              <span style={{ color: bdr, fontSize: 13 }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>{activeArtifact.title}</span>
            </div>
          ) : (
            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>
              {activeView === 'actions'
                ? 'Actions'
                : activeView === 'custom' ? (customPanel?.label ?? 'Overview')
                : `${name} · ${role}`}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 10, color: muted, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} />
            {badge}
          </div>
        </div>

        {/* content area + input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* CHAT */}
          {activeView === 'chat' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* suggested prompts (empty state) */}
                <AnimatePresence>
                  {workspace.showPrompts && (
                    <motion.div key="prompts" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                        <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2, background: surf, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: accent }}>
                          {name[0]}
                        </div>
                        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: '12px 16px', fontSize: 13, lineHeight: 1.65, color: ink, maxWidth: '82%' }}>
                          I&apos;m {name}, your {role}. How can I help you today?
                        </div>
                      </div>
                      <div style={{ paddingLeft: 38, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {suggestedPrompts.map((p, i) => (
                          <button key={i} onClick={() => workspace.send(p)}
                            style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12, background: bg, border: `1px solid ${bdr}`, color: muted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = ink; (e.currentTarget as HTMLElement).style.color = ink }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = bdr; (e.currentTarget as HTMLElement).style.color = muted }}
                          >{p}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* messages */}
                {workspace.uiMessages.map((msg, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
                  >
                    {msg.role !== 'user' && (
                      <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2, background: surf, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: accent }}>
                        {msg.role === 'tool' ? '⚡' : name[0]}
                      </div>
                    )}
                    {msg.role === 'tool' && msg.toolActivity ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10, fontSize: 12, color: muted, maxWidth: '72%' }}>
                        {msg.toolActivity.status === 'running'
                          ? <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
                          : <CheckCircle2 size={12} style={{ color: green, flexShrink: 0 }} />
                        }
                        <span style={{ color: msg.toolActivity.status === 'running' ? ink : muted }}>
                          {msg.toolActivity.status === 'running' ? msg.toolActivity.label : (msg.toolActivity.summary ?? msg.toolActivity.label)}
                        </span>
                      </div>
                    ) : (
                      <div style={{
                        background: msg.role === 'user' ? ink : surf,
                        color:      msg.role === 'user' ? bg  : ink,
                        border:     msg.role === 'user' ? 'none' : `1px solid ${bdr}`,
                        borderRadius: 14,
                        borderTopLeftRadius:  msg.role === 'agent' ? 4 : 14,
                        borderTopRightRadius: msg.role === 'user'  ? 4 : 14,
                        padding: '10px 14px', fontSize: 13, lineHeight: 1.65,
                        maxWidth: '78%', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {msg.text}
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* typing indicator */}
                {workspace.typing && workspace.uiMessages[workspace.uiMessages.length - 1]?.role !== 'agent' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, background: surf, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: accent }}>
                      {name[0]}
                    </div>
                    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(j => (
                        <motion.span key={j} style={{ height: 5, width: 5, borderRadius: '50%', background: muted, display: 'inline-block' }}
                          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: j * 0.2 }} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* per-agent extras (e.g. ClosingRecommendationCard for Patel) */}
                {!workspace.typing && workspace.uiMessages.length > 0 && extras?.({ workspace })}

                <div ref={workspace.bottomRef} />
              </div>
            </div>
          )}

          {/* ARTIFACT VIEW */}
          {activeArtifact && (
            <ArtifactView artifact={activeArtifact} accent={accent} userId={workspace.userId} />
          )}

          {/* CUSTOM PANEL */}
          {activeView === 'custom' && customPanel && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {customPanel.render({ workspace, accent })}
            </div>
          )}

          {/* ACTIONS */}
          {activeView === 'actions' && (
            <ActionsView workspace={workspace} accent={accent} />
          )}

          {/* persistent input bar — always visible */}
          <div style={{ flexShrink: 0, padding: '10px 20px 16px', borderTop: `1px solid ${bdr}`, background: bg }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 14px', background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                <textarea
                  value={workspace.input}
                  onChange={e => workspace.setInput(e.target.value)}
                  onKeyDown={workspace.handleKeyDown}
                  placeholder={activeArtifact ? `Refine ${activeArtifact.title}…` : `Ask ${name}…`}
                  rows={1}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: ink, fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}
                />
                <button
                  onClick={() => { if (activeArtifact && workspace.input.trim()) setActiveView('chat'); workspace.send() }}
                  disabled={!workspace.input.trim() || workspace.typing}
                  style={{ height: 32, width: 32, borderRadius: 8, flexShrink: 0, background: !workspace.input.trim() || workspace.typing ? bdr : ink, border: 'none', cursor: !workspace.input.trim() || workspace.typing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
                >
                  <Send size={14} style={{ color: !workspace.input.trim() || workspace.typing ? muted : bg }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
