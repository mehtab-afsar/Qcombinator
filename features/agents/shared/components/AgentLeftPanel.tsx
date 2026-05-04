'use client'

import Link from 'next/link'
import {
  ChevronLeft, CheckCircle2, Lock, Circle,
  MessageSquare, ListChecks,
} from 'lucide-react'
import { surf, bdr, ink, muted, green } from '../constants/colors'
import type { ArtifactRecord } from '../hooks/useAgentWorkspace'

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
  name:          string
  role:          string
  emoji:         string
  accent:        string
  badge:         string
  deliverables:  DeliverableConfig[]
  artifacts:     ArtifactRecord[]
  actionsCount:  number
  activeView:    string
  onViewChange:  (view: string) => void
  customPanel?:  CustomPanelConfig
}

export function AgentLeftPanel({
  name, role, emoji, accent, badge,
  deliverables, artifacts, actionsCount,
  activeView, onViewChange, customPanel,
}: Props) {
  const builtTypes = new Set(artifacts.map(a => a.type))

  function viewStatus(type: string, prereqs?: string[]): 'done' | 'locked' | 'available' {
    if (builtTypes.has(type)) return 'done'
    if (prereqs?.some(p => !builtTypes.has(p))) return 'locked'
    return 'available'
  }

  const activeArtifactId = activeView.startsWith('artifact:') ? activeView.slice(9) : null

  return (
    <div style={{
      width: 220, minWidth: 220, height: '100vh',
      background: surf, borderRight: `1px solid ${bdr}`,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* back */}
      <div style={{ padding: '16px 14px 10px', flexShrink: 0 }}>
        <Link href="/founder/agents" style={{
          display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none',
          color: muted, fontSize: 11, fontWeight: 500,
        }}>
          <ChevronLeft size={12} />
          CXO Suite
        </Link>
      </div>

      {/* agent identity */}
      <div style={{ padding: '0 14px 14px', borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${accent}15`, border: `1.5px solid ${accent}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}>
            {emoji}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, lineHeight: 1.25, margin: 0 }}>{name}</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role}</p>
          </div>
        </div>
        <span style={{
          display: 'inline-block',
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          padding: '2px 7px', borderRadius: 4,
          background: `${accent}12`, color: accent, border: `1px solid ${accent}28`,
        }}>
          {badge}
        </span>
      </div>

      {/* nav items */}
      <div style={{ padding: '8px 8px 0', flexShrink: 0 }}>
        <NavItem label="Chat" icon={MessageSquare} active={activeView === 'chat'} accent={accent}
          onClick={() => onViewChange('chat')} />
        {customPanel && (
          <NavItem label={customPanel.label} icon={customPanel.icon}
            active={activeView === 'custom'} accent={accent}
            badge={customPanel.badge} onClick={() => onViewChange('custom')} />
        )}
      </div>

      {/* deliverables */}
      <div style={{ padding: '14px 8px 0', flex: 1, minHeight: 0 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: muted, padding: '0 6px', marginBottom: 5 }}>
          Deliverables
        </p>
        {deliverables.map(d => {
          const status  = viewStatus(d.type, d.prerequisiteTypes)
          const built   = artifacts.filter(a => a.type === d.type)
          const latest  = built[built.length - 1]
          const isActive = !!activeArtifactId && built.some(a => a.id === activeArtifactId)

          return (
            <button
              key={d.type}
              onClick={() => {
                if (status === 'locked') return
                if (latest) onViewChange(`artifact:${latest.id}`)
                else onViewChange('chat')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '6px 8px', borderRadius: 7, border: 'none', textAlign: 'left',
                background: isActive ? `${accent}10` : 'transparent',
                cursor: status === 'locked' ? 'not-allowed' : 'pointer',
                transition: 'background .12s',
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
                color: status === 'locked' ? muted : isActive ? accent : status === 'done' ? ink : ink,
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

      {/* actions — pinned to bottom */}
      <div style={{ padding: '10px 8px 12px', borderTop: `1px solid ${bdr}`, flexShrink: 0 }}>
        <NavItem label="Actions" icon={ListChecks} active={activeView === 'actions'} accent={accent}
          badge={actionsCount || undefined} onClick={() => onViewChange('actions')} />
      </div>
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
        transition: 'background .12s',
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
