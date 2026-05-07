'use client'

import Link from 'next/link'
import { CheckCircle2, Lock, Circle, ListChecks, Plus, MessageSquare } from 'lucide-react'
import { surf, bdr, ink, muted, green } from '../constants/colors'
import type { ArtifactRecord, ConversationSummary } from '../hooks/useAgentWorkspace'

export interface DeliverableConfig {
  type:             string
  label:            string
  description:      string
  icon:             React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  prerequisiteTypes?: string[]
}

export interface CustomPanelConfig {
  id:    string
  label: string
  icon:  React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  badge?: number
}

interface Props {
  accent:               string
  agentName:            string
  agentRole:            string
  deliverables:         DeliverableConfig[]
  artifacts:            ArtifactRecord[]
  actionsCount:         number
  activeView:           string
  onViewChange:         (view: string) => void
  onBuildDeliverable:   (label: string) => void
  conversations:        ConversationSummary[]
  activeConversationId: string | null
  onNewConversation:    () => void
  onSwitchConversation: (id: string) => void
  customPanel?:         CustomPanelConfig
}

function convDateLabel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en', { weekday: 'short' })
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export function AgentLeftPanel({
  accent,
  agentName, agentRole,
  deliverables, artifacts, actionsCount,
  activeView, onViewChange, onBuildDeliverable,
  conversations, activeConversationId,
  onNewConversation, onSwitchConversation,
  customPanel,
}: Props) {
  const builtTypes = new Set(artifacts.map(a => a.type))

  function viewStatus(type: string, prereqs?: string[]): 'done' | 'locked' | 'available' {
    if (builtTypes.has(type)) return 'done'
    if (prereqs?.some(p => !builtTypes.has(p))) return 'locked'
    return 'available'
  }

  const activeArtifactId = activeView.startsWith('artifact:') ? activeView.slice(9) : null
  const isChat = activeView === 'chat' && !activeArtifactId

  return (
    <div style={{
      width: 232, minWidth: 232, height: '100vh',
      background: surf, borderRight: `1px solid ${bdr}`,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
    }}>

      {/* top bar: back + new chat */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 12px 10px', flexShrink: 0,
        borderBottom: `1px solid ${bdr}`,
      }}>
        <Link href="/founder/agents" style={{
          display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none',
          color: muted, fontSize: 11, fontWeight: 500,
        }}>
          ← All agents
        </Link>
        <button
          onClick={onNewConversation}
          title="New conversation"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 6, border: `1px solid ${bdr}`,
            background: 'transparent', cursor: 'pointer', color: muted,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${bdr}80`; (e.currentTarget as HTMLElement).style.color = ink }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = muted }}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* agent identity */}
      <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `${accent}15`, border: `1.5px solid ${accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: accent,
          }}>
            {agentName[0]}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0, lineHeight: 1.2 }}>{agentName}</p>
            <p style={{ fontSize: 10, color: muted, margin: '2px 0 0', lineHeight: 1.2 }}>{agentRole}</p>
          </div>
        </div>
      </div>

      {/* conversations */}
      <div style={{ padding: '10px 8px 4px', flexShrink: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 500, color: muted, padding: '0 6px', marginBottom: 4 }}>
          Conversations
        </p>

        {conversations.length === 0 ? (
          <button
            onClick={onNewConversation}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, width: '100%',
              padding: '6px 8px', borderRadius: 7, border: 'none', textAlign: 'left',
              background: isChat ? `${accent}10` : 'transparent', cursor: 'pointer',
            }}
            onMouseEnter={e => { if (!isChat) (e.currentTarget as HTMLElement).style.background = `${bdr}60` }}
            onMouseLeave={e => { if (!isChat) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <MessageSquare size={12} style={{ color: isChat ? accent : muted, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: isChat ? accent : muted, fontWeight: isChat ? 600 : 400 }}>New conversation</span>
          </button>
        ) : (
          conversations.map(conv => {
            const isActive = conv.id === activeConversationId
            return (
              <button
                key={conv.id}
                onClick={() => onSwitchConversation(conv.id)}
                style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  gap: 6, width: '100%', padding: '5px 8px', borderRadius: 7,
                  border: 'none', textAlign: 'left', cursor: 'pointer',
                  background: isActive ? `${accent}10` : 'transparent',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = `${bdr}60` }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{
                  fontSize: 11, color: isActive ? accent : ink, fontWeight: isActive ? 600 : 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {conv.title ?? 'Untitled'}
                </span>
                <span style={{ fontSize: 9, color: muted, flexShrink: 0 }}>
                  {convDateLabel(conv.last_message_at)}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* deliverables */}
      <div style={{ padding: '10px 8px 4px', borderTop: `1px solid ${bdr}` }}>
        <p style={{ fontSize: 10, fontWeight: 500, color: muted, padding: '0 6px', marginBottom: 4 }}>
          Deliverables
        </p>
        {deliverables.map(d => {
          const status  = viewStatus(d.type, d.prerequisiteTypes)
          const built   = artifacts.filter(a => a.type === d.type)
          const latest  = built[built.length - 1]
          const isActive = !!activeArtifactId && built.some(a => a.id === activeArtifactId)

          const lockedTitle = status === 'locked'
            ? `Requires: ${(d.prerequisiteTypes ?? []).map(t => deliverables.find(x => x.type === t)?.label ?? t).join(', ')}`
            : undefined

          return (
            <button
              key={d.type}
              title={lockedTitle}
              onClick={() => {
                if (status === 'locked') return
                if (latest) onViewChange(`artifact:${latest.id}`)
                else onBuildDeliverable(d.label)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '5px 8px', borderRadius: 7, border: 'none', textAlign: 'left',
                background: isActive ? `${accent}10` : 'transparent',
                cursor: status === 'locked' ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (status !== 'locked' && !isActive) (e.currentTarget as HTMLElement).style.background = `${bdr}60` }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {status === 'done'
                ? <CheckCircle2 size={12} style={{ color: green, flexShrink: 0 }} />
                : status === 'locked'
                  ? <Lock size={11} style={{ color: muted, flexShrink: 0, opacity: 0.4 }} />
                  : <Circle size={11} style={{ color: isActive ? accent : muted, flexShrink: 0 }} />
              }
              <span style={{
                fontSize: 11, lineHeight: 1.3, flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: status === 'locked' ? muted : isActive ? accent : ink,
                fontWeight: isActive ? 600 : 400,
                opacity: status === 'locked' ? 0.5 : 1,
              }}>
                {d.label}
              </span>
              {built.length > 1 && (
                <span style={{ fontSize: 9, color: muted, flexShrink: 0 }}>v{built.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* bottom: custom panel + actions (only shown when relevant) */}
      {(customPanel || actionsCount > 0) && (
        <div style={{ padding: '8px 8px 12px', borderTop: `1px solid ${bdr}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}>
          {customPanel && (
            <NavItem
              label={customPanel.label} icon={customPanel.icon}
              active={activeView === 'custom'} accent={accent}
              badge={customPanel.badge}
              onClick={() => onViewChange('custom')}
            />
          )}
          {actionsCount > 0 && (
            <NavItem
              label="Actions" icon={ListChecks}
              active={activeView === 'actions'} accent={accent}
              badge={actionsCount}
              onClick={() => onViewChange('actions')}
            />
          )}
        </div>
      )}
    </div>
  )
}

function NavItem({
  label, icon: Icon, active, accent, badge, onClick,
}: {
  label:   string
  icon:    React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  active:  boolean
  accent:  string
  badge?:  number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '6px 8px', borderRadius: 7, border: 'none', textAlign: 'left',
        cursor: 'pointer', background: active ? `${accent}12` : 'transparent',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = `${bdr}60` }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <Icon size={13} style={{ color: active ? accent : muted, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: active ? accent : ink, fontWeight: active ? 600 : 400, flex: 1 }}>
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span style={{
          minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
          background: active ? accent : muted,
          color: '#fff', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}
