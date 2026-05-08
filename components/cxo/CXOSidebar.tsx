'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import type { CXOConfig } from '@/lib/cxo/cxo-config';

const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';

export interface AgentArtifact {
  id: string;
  agent_id: string;
  artifact_type: string;
  title: string;
  content: unknown;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  last_message_at: string | null;
}

interface CXOSidebarProps {
  config:              CXOConfig;
  agentId:             string;
  artifacts:           AgentArtifact[];
  conversations:       ConversationSummary[];
  activeConvId:        string | null;
  onSwitchConversation:(id: string) => void;
  onNewConversation:   () => void;
  onRenameConversation:(id: string, title: string) => void;
  tab:                 'dashboard' | 'chat';
  onTabChange:         (tab: 'dashboard' | 'chat') => void;
}

const SIDEBAR_W = 260;

function convDateLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7)  return d.toLocaleDateString('en', { weekday: 'short' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function ConvRow({
  conv, isActive, accent, onSelect, onRename,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  accent: string;
  onSelect: () => void;
  onRename: (title: string) => void;
}) {
  const [hovering,  setHovering]  = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState(conv.title ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(conv.title ?? '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== conv.title) onRename(trimmed);
  }

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {editing ? (
        <div style={{ padding: '4px 8px' }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setEditing(false); }}
            onBlur={commit}
            autoFocus
            style={{
              width: '100%', padding: '4px 8px', borderRadius: 6,
              border: `1.5px solid ${accent}60`, outline: 'none',
              fontSize: 11, color: ink, background: bg, fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      ) : (
        <button
          onClick={onSelect}
          style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            gap: 4, width: '100%', padding: '5px 8px', borderRadius: 7,
            border: 'none', textAlign: 'left', cursor: 'pointer',
            background: isActive ? `${accent}12` : hovering ? `${bdr}60` : 'transparent',
            fontFamily: 'inherit', transition: 'background 0.1s',
          }}
        >
          <span style={{
            fontSize: 11, color: isActive ? accent : ink,
            fontWeight: isActive ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
          }}>
            {conv.title ?? 'Untitled'}
          </span>
          {hovering && !isActive ? (
            <span
              role="button"
              onClick={startEdit}
              style={{ padding: '1px 3px', cursor: 'pointer', flexShrink: 0, color: muted, display: 'flex', alignItems: 'center' }}
              title="Rename"
            >
              <Pencil style={{ width: 10, height: 10 }} />
            </span>
          ) : (
            <span style={{ fontSize: 9, color: muted, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {convDateLabel(conv.last_message_at)}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export function CXOSidebar({
  config, agentId: _agentId, artifacts: _artifacts, conversations,
  activeConvId, onSwitchConversation, onNewConversation, onRenameConversation,
  tab, onTabChange,
}: CXOSidebarProps) {
  return (
    <nav style={{
      width: SIDEBAR_W, minWidth: SIDEBAR_W, height: '100vh',
      background: bg, borderRight: `1px solid ${bdr}`,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', flexShrink: 0,
    }}>

      {/* ── Header: back + agent name ─────────────────────────────────── */}
      <div style={{
        height: 52, flexShrink: 0,
        borderBottom: `1px solid ${bdr}`,
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 10,
      }}>
        <Link
          href="/founder/cxo"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, flexShrink: 0, borderRadius: 7,
            background: surf, border: `1px solid ${bdr}`,
            color: muted, textDecoration: 'none',
          }}
          title="Back to CXO Suite"
        >
          <ArrowLeft style={{ width: 13, height: 13 }} />
        </Link>
        <div style={{ overflow: 'hidden', minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, lineHeight: 1.2, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {config.name}
          </p>
          <p style={{ fontSize: 10, color: muted, margin: 0, whiteSpace: 'nowrap' }}>
            {config.role.split('—')[1]?.trim() ?? config.role}
          </p>
        </div>
      </div>

      {/* ── Tab toggle (controls main content area) ───────────────────── */}
      <div style={{
        display: 'flex', gap: 2, padding: '8px 10px', flexShrink: 0,
        borderBottom: `1px solid ${bdr}`,
      }}>
        {(['dashboard', 'chat'] as const).map(t => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 6, border: 'none',
              background: tab === t ? surf : 'transparent',
              color: tab === t ? ink : muted,
              fontSize: 11, fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: tab === t ? `2px solid ${config.colour}` : '2px solid transparent',
              transition: 'all 0.12s',
            }}
          >
            {t === 'dashboard' ? 'Dashboard' : 'Chat'}
          </button>
        ))}
      </div>

      {/* ── Conversation history (always visible, both tabs) ─────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 6px 8px' }}>

        <button
          onClick={onNewConversation}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            width: '100%', padding: '7px 10px', marginBottom: 6,
            borderRadius: 8, border: `1px dashed ${bdr}`,
            background: 'transparent', cursor: 'pointer',
            color: muted, fontSize: 11, fontFamily: 'inherit',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = ink; el.style.borderColor = `${config.colour}60`; el.style.background = `${config.colour}06` }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = muted; el.style.borderColor = bdr; el.style.background = 'transparent' }}
        >
          <Plus style={{ width: 11, height: 11, flexShrink: 0 }} />
          New conversation
        </button>

        {conversations.length === 0 ? (
          <p style={{ fontSize: 11, color: muted, padding: '8px 10px', opacity: 0.6 }}>
            No conversations yet
          </p>
        ) : (
          conversations.map(conv => (
            <ConvRow
              key={conv.id}
              conv={conv}
              isActive={conv.id === activeConvId}
              accent={config.colour}
              onSelect={() => onSwitchConversation(conv.id)}
              onRename={title => onRenameConversation(conv.id, title)}
            />
          ))
        )}

      </div>

    </nav>
  );
}
