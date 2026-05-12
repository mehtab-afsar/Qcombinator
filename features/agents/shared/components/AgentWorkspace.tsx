'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, TrendingUp, CheckCircle2, RefreshCw, FileText, Copy, ChevronLeft } from 'lucide-react'
import { useAgentWorkspace }    from '../hooks/useAgentWorkspace'
import { AgentLeftPanel }       from './AgentLeftPanel'
import { renderArtifactContent } from '../utils/renderArtifactContent'
import { ARTIFACT_META }        from '../constants/artifact-meta'
import { bg, surf, bdr, ink, muted, green } from '../constants/colors'
import type { DeliverableConfig }   from './AgentLeftPanel'
import type { ArtifactRecord, AgentWorkspaceState, SourceItem } from '../hooks/useAgentWorkspace'

export type { DeliverableConfig }

// ─── markdown renderer ────────────────────────────────────────────────────────

function inlineMd(text: string): React.ReactNode {
  // inline code first, then bold, then italic
  const parts = text.split(/(`[^`]+`|\*\*[^*\n]+\*\*|\*(?!\*)[^*\n]+\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.88em', background: '#F0EDE6', padding: '1px 5px', borderRadius: 4, color: '#18160F' }}>{p.slice(1, -1)}</code>
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} style={{ fontWeight: 700, color: '#18160F' }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*'))
      return <em key={i}>{p.slice(1, -1)}</em>
    return p
  })
}

function renderMd(raw: string): React.ReactNode {
  const lines = raw.split('\n')
  const nodes: React.ReactNode[] = []
  let listBuffer: React.ReactNode[] = []
  let orderedBuffer: React.ReactNode[] = []
  let orderedCounter = 0

  function flushLists() {
    if (listBuffer.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} style={{ margin: '6px 0 8px', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {listBuffer}
        </ul>
      )
      listBuffer = []
    }
    if (orderedBuffer.length > 0) {
      nodes.push(
        <ol key={`ol-${nodes.length}`} style={{ margin: '6px 0 8px', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3, counterReset: 'none' }}>
          {orderedBuffer}
        </ol>
      )
      orderedBuffer = []
      orderedCounter = 0
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Blank line
    if (line.trim() === '') {
      flushLists()
      nodes.push(<div key={`sp-${i}`} style={{ height: 10 }} />)
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushLists()
      nodes.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #E2DDD5', margin: '12px 0' }} />)
      continue
    }

    // H1
    if (/^# /.test(line)) {
      flushLists()
      nodes.push(
        <div key={i} style={{ fontSize: 15, fontWeight: 700, color: '#18160F', marginTop: 18, marginBottom: 6, lineHeight: 1.4 }}>
          {inlineMd(line.replace(/^# /, ''))}
        </div>
      )
      continue
    }

    // H2
    if (/^## /.test(line)) {
      flushLists()
      nodes.push(
        <div key={i} style={{ fontSize: 14, fontWeight: 700, color: '#18160F', marginTop: 14, marginBottom: 5, lineHeight: 1.4 }}>
          {inlineMd(line.replace(/^## /, ''))}
        </div>
      )
      continue
    }

    // H3
    if (/^### /.test(line)) {
      flushLists()
      nodes.push(
        <div key={i} style={{ fontSize: 13, fontWeight: 700, color: '#3D3A35', marginTop: 12, marginBottom: 4, lineHeight: 1.4 }}>
          {inlineMd(line.replace(/^### /, ''))}
        </div>
      )
      continue
    }

    // Blockquote
    if (/^> /.test(line)) {
      flushLists()
      nodes.push(
        <div key={i} style={{ borderLeft: '3px solid #E2DDD5', paddingLeft: 12, marginLeft: 0, margin: '6px 0', color: '#8A867C', fontStyle: 'italic', fontSize: 13, lineHeight: 1.65 }}>
          {inlineMd(line.replace(/^> /, ''))}
        </div>
      )
      continue
    }

    // Unordered list
    if (/^\s*[-•*] /.test(line)) {
      if (orderedBuffer.length > 0) { flushLists() }
      const text = line.replace(/^\s*[-•*] /, '')
      listBuffer.push(
        <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 4, lineHeight: 1.65, fontSize: 13 }}>
          <span style={{ flexShrink: 0, marginTop: '0.35em', width: 5, height: 5, borderRadius: '50%', background: '#8A867C', display: 'inline-block' }} />
          <span>{inlineMd(text)}</span>
        </li>
      )
      continue
    }

    // Ordered list
    const ordMatch = line.match(/^\s*(\d+)\. (.+)/)
    if (ordMatch) {
      if (listBuffer.length > 0) { flushLists() }
      orderedCounter++
      orderedBuffer.push(
        <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 4, lineHeight: 1.65, fontSize: 13 }}>
          <span style={{ flexShrink: 0, minWidth: 18, fontWeight: 600, color: '#8A867C', fontSize: 12, marginTop: '0.1em', textAlign: 'right' }}>{orderedCounter}.</span>
          <span>{inlineMd(ordMatch[2])}</span>
        </li>
      )
      continue
    }

    // Normal paragraph
    flushLists()
    nodes.push(
      <div key={i} style={{ fontSize: 13, lineHeight: 1.75, color: '#18160F', marginBottom: 2 }}>
        {inlineMd(line)}
      </div>
    )
  }

  flushLists()
  return <div style={{ display: 'flex', flexDirection: 'column' }}>{nodes}</div>
}

// ─── typing phrase (replaces 3-dot indicator) ────────────────────────────────

function TypingPhrase({ accent }: { accent: string }) {
  const [idx,     setIdx]     = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % STARTUP_PHRASES.length); setVisible(true) }, 300)
    }, 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ paddingTop: 9, display: 'flex', alignItems: 'center', gap: 7 }}>
      <motion.span
        style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block', flexShrink: 0 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.1 }}
      />
      <span style={{ fontSize: 13, color: muted, opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
        {STARTUP_PHRASES[idx]}
      </span>
    </div>
  )
}

// ─── source citation chips ────────────────────────────────────────────────────

const SOURCE_ICONS: Record<SourceItem['type'], string> = {
  profile:     '📋',
  memory:      '💬',
  artifact:    '📄',
  cross_agent: '🔗',
}

function SourceChips({ sources }: { sources: SourceItem[] }) {
  if (!sources.length) return null
  return (
    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
      <span style={{ fontSize: 9, color: muted, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, flexShrink: 0 }}>
        Referenced from
      </span>
      {sources.map((src, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: muted,
          background: `${ink}07`, border: `1px solid ${bdr}`,
          borderRadius: 99, padding: '2px 8px', fontWeight: 500,
        }}>
          <span style={{ fontSize: 9 }}>{SOURCE_ICONS[src.type]}</span>
          {src.label}
        </span>
      ))}
    </div>
  )
}

// ─── premium input bar ────────────────────────────────────────────────────────

function InputBar({
  value, onChange, onKeyDown, onSend, disabled, placeholder, accent,
}: {
  value:       string
  onChange:    (v: string) => void
  onKeyDown:   (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend:      () => void
  disabled:    boolean
  placeholder: string
  accent:      string
}) {
  const [focused, setFocused] = React.useState(false)
  const hasText = value.trim().length > 0

  return (
    <div style={{ flexShrink: 0, padding: '10px 40px 20px', background: bg }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          padding: '12px 12px 12px 18px',
          background: '#fff',
          borderRadius: 18,
          boxShadow: focused
            ? `0 0 0 2px ${accent}35, 0 2px 12px rgba(0,0,0,0.08)`
            : `0 0 0 1.5px ${bdr}, 0 2px 8px rgba(0,0,0,0.05)`,
          transition: 'box-shadow 0.18s',
        }}>
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: ink, fontFamily: 'inherit',
              resize: 'none', lineHeight: 1.6, maxHeight: 140, overflowY: 'auto',
              paddingTop: 2, paddingBottom: 2,
            }}
          />
          <button
            onClick={onSend}
            disabled={disabled}
            style={{
              height: 36, width: 36, borderRadius: '50%', flexShrink: 0,
              background: hasText ? accent : bdr,
              border: 'none',
              cursor: hasText ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, transform 0.1s',
              transform: hasText ? 'scale(1)' : 'scale(0.92)',
            }}
            onMouseEnter={e => { if (hasText) (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = hasText ? 'scale(1)' : 'scale(0.92)' }}
          >
            <Send size={14} style={{ color: hasText ? '#fff' : muted }} />
          </button>
        </div>
      </div>
    </div>
  )
}

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

// ─── startup loader ───────────────────────────────────────────────────────────

const STARTUP_PHRASES = [
  'Analyzing market signals…',
  'Building your GTM strategy…',
  'Mapping the competitive landscape…',
  'Stress-testing your ICP…',
  'Calculating unicorn potential…',
  'Reviewing your go-to-market fit…',
  'Synthesizing customer insights…',
  'Identifying your ideal buyer…',
  'Structuring your sales motion…',
  'Pressure-testing assumptions…',
  'Charting the billion-dollar path…',
  'Triangulating market signals…',
]

function StartupLoader({ accent }: { accent: string }) {
  const [phraseIdx, setPhraseIdx] = React.useState(0)
  const [visible, setVisible]     = React.useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % STARTUP_PHRASES.length)
        setVisible(true)
      }, 300)
    }, 1600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, gap: 16 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, opacity: 0.7 }} />
      <p style={{
        fontSize: 13, color: muted, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.01em',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.28s ease',
        minHeight: 20,
      }}>
        {STARTUP_PHRASES[phraseIdx]}
      </p>
    </div>
  )
}

// ─── action list ──────────────────────────────────────────────────────────────

function ActionsView({
  workspace,
}: { workspace: AgentWorkspaceState }) {
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
  agentId, name, role, emoji: _emoji, accent, badge,
  deliverables, suggestedPrompts, customPanel, extras,
}: AgentWorkspaceProps) {
  const searchParams = useSearchParams()
  const targetId     = searchParams.get('artifact')
  const convParam    = searchParams.get('conv')
  const isEmbed      = searchParams.get('_embed') === '1'
  const workspace    = useAgentWorkspace(agentId)
  const [activeView, setActiveView] = useState<string>('chat')

  // Switch to a specific conversation from URL param
  useEffect(() => {
    if (!convParam || workspace.loading) return
    workspace.switchConversation(convParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam, workspace.loading])

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
    return <StartupLoader accent={accent} />
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

      {/* left panel — hidden when embedded in CXO iframe */}
      {!isEmbed && (
        <AgentLeftPanel
          accent={accent}
          agentName={name}
          agentRole={role}
          deliverables={deliverables} artifacts={workspace.artifacts}
          actionsCount={pendingActionsCount}
          activeView={activeView} onViewChange={setActiveView}
          onBuildDeliverable={(label) => {
            setActiveView('chat')
            workspace.send(`Build ${label} for my startup`)
          }}
          conversations={workspace.conversations}
          activeConversationId={workspace.conversationId}
          onNewConversation={() => { workspace.newConversation(); setActiveView('chat') }}
          onSwitchConversation={(id) => { workspace.switchConversation(id); setActiveView('chat') }}
          customPanel={customPanel ? {
            id: customPanel.id, label: customPanel.label, icon: customPanel.icon,
            badge: customPanel.badge?.(workspace),
          } : undefined}
        />
      )}

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
            <p style={{ fontSize: 13, fontWeight: 500, color: muted }}>
              {activeView === 'actions'
                ? 'Actions'
                : activeView === 'custom' ? (customPanel?.label ?? 'Overview')
                : workspace.conversations.find(c => c.id === workspace.conversationId)?.title ?? 'Chat'}
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
              <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* suggested prompts (empty state) */}
                <AnimatePresence>
                  {workspace.showPrompts && (
                    <motion.div key="prompts" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <div style={{ height: 32, width: 32, borderRadius: 10, flexShrink: 0, marginTop: 2, background: `${accent}15`, border: `1.5px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: accent }}>
                          {name[0]}
                        </div>
                        <div style={{ paddingTop: 4, fontSize: 13, lineHeight: 1.7, color: ink, maxWidth: '82%' }}>
                          <span style={{ fontWeight: 600 }}>{name}</span> — ready when you are.
                        </div>
                      </div>
                      <div style={{ paddingLeft: 44, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {suggestedPrompts.map((p, i) => (
                          <button key={i} onClick={() => workspace.send(p)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                              padding: '9px 12px', borderRadius: 8, fontSize: 12,
                              background: 'transparent', border: `1px solid ${bdr}`,
                              color: muted, cursor: 'pointer', fontFamily: 'inherit',
                              textAlign: 'left', transition: 'all .15s',
                            }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${accent}60`; el.style.color = ink; el.style.background = `${accent}05` }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = bdr; el.style.color = muted; el.style.background = 'transparent' }}
                          >
                            <span style={{ flex: 1 }}>{p}</span>
                            <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>↗</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* messages */}
                {workspace.uiMessages.map((msg, idx) => {
                  if (msg.role === 'agent' && !msg.text && !msg.sources) return null
                  if (msg.role === 'artifact_card') {
                    return (
                      <motion.div key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{
                          border: `1px solid ${bdr}`, borderRadius: 12, padding: '14px 18px',
                          background: surf, display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F5F0FF', border: '1.5px solid #C4B5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={15} style={{ color: '#7C3AED' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7C3AED', marginBottom: 2 }}>
                              Document ready
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.artifactTitle ?? 'Untitled document'}
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveView(`artifact:${msg.artifactId}`)}
                            style={{
                              padding: '7px 14px', borderRadius: 8, border: 'none',
                              background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                            }}
                          >
                            View document →
                          </button>
                        </div>
                      </motion.div>
                    )
                  }
                  return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
                  >
                    {msg.role !== 'user' && (
                      <div style={{ height: 34, width: 34, borderRadius: 10, flexShrink: 0, marginTop: 1, background: `${accent}15`, border: `1.5px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: accent }}>
                        {msg.role === 'tool' ? '⚡' : name[0]}
                      </div>
                    )}
                    {msg.role === 'tool' && msg.toolActivity ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 12, color: muted, maxWidth: '72%' }}>
                        {msg.toolActivity.status === 'running'
                          ? <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
                          : <CheckCircle2 size={11} style={{ color: green, flexShrink: 0 }} />
                        }
                        <span style={{ color: msg.toolActivity.status === 'running' ? ink : muted }}>
                          {msg.toolActivity.status === 'running' ? msg.toolActivity.label : (msg.toolActivity.summary ?? msg.toolActivity.label)}
                        </span>
                      </div>
                    ) : msg.role === 'user' ? (
                      <div style={{
                        background: `${accent}0D`,
                        border: `1px solid ${accent}25`,
                        borderRadius: 14,
                        padding: '11px 16px', fontSize: 13, lineHeight: 1.65,
                        maxWidth: '68%', wordBreak: 'break-word', color: ink,
                      }}>
                        {msg.text}
                      </div>
                    ) : (
                      <div style={{ maxWidth: '86%', wordBreak: 'break-word', paddingTop: 4 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.78, color: ink }}>
                          {renderMd(msg.text)}
                        </div>
                        {msg.sources && <SourceChips sources={msg.sources} />}
                      </div>
                    )}
                  </motion.div>
                  )
                })}

                {/* typing indicator */}
                {workspace.typing && workspace.uiMessages[workspace.uiMessages.length - 1]?.role !== 'agent' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ height: 34, width: 34, borderRadius: 10, flexShrink: 0, background: `${accent}15`, border: `1.5px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: accent }}>
                      {name[0]}
                    </div>
                    <TypingPhrase accent={accent} />
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
            <ActionsView workspace={workspace} />
          )}

          {/* persistent input bar */}
          <InputBar
            value={workspace.input}
            onChange={workspace.setInput}
            onKeyDown={workspace.handleKeyDown}
            onSend={() => { if (activeArtifact && workspace.input.trim()) setActiveView('chat'); workspace.send() }}
            disabled={!workspace.input.trim() || workspace.typing}
            placeholder={activeArtifact ? `Refine ${activeArtifact.title}…` : `Message ${name}…`}
            accent={accent}
          />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
