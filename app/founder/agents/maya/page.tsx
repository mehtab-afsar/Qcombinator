'use client'

import { useState, useEffect } from 'react'
import { Palette, Calendar, Search, Newspaper, Rss, TrendingUp, Zap } from 'lucide-react'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { bg, bdr, ink, muted } from '@/features/agents/shared/constants/colors'

const accent = '#EC4899'

const MAYA_DELIVERABLES = [
  { type: 'brand_messaging',     icon: Palette,    label: 'Brand Messaging',     description: 'Positioning, value prop, taglines, hero copy' },
  { type: 'content_calendar',    icon: Calendar,   label: 'Content Calendar',    description: '4-week multi-channel plan with sample posts' },
  { type: 'seo_audit',           icon: Search,     label: 'SEO Audit',           description: 'Keyword gaps, ranking opportunities, content briefs' },
  { type: 'press_kit',           icon: Newspaper,  label: 'Press Kit',           description: 'Company overview, founder bio, story angles' },
  { type: 'newsletter_issue',    icon: Rss,        label: 'Newsletter Issue',    description: 'Subject lines, hook, insight, CTA — ready to send' },
  { type: 'brand_health_report', icon: TrendingUp, label: 'Brand Health Report', description: 'Mentions, share of voice, top content this month' },
]

const SUGGESTED = [
  'Help me nail my one-line positioning statement',
  'Build a 4-week content calendar for LinkedIn',
  'Run an SEO audit and find our top keyword gaps',
  'Draft a newsletter issue for this week',
  'Create a press kit for upcoming PR outreach',
  'What content angle will resonate with our ICP?',
]

const CHANNELS = [
  { id: 'linkedin',   label: 'LinkedIn',   icon: '💼', color: '#0A66C2' },
  { id: 'twitter',    label: 'Twitter/X',  icon: '𝕏',  color: '#000000' },
  { id: 'newsletter', label: 'Newsletter', icon: '📧',  color: '#D97706' },
  { id: 'blog',       label: 'Blog/SEO',   icon: '✍️',  color: '#7C3AED' },
] as const

type ChannelId = typeof CHANNELS[number]['id']

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'] as const

interface ContentItem {
  id: string; channel: ChannelId; week: number; topic: string
  angle?: string; status: 'idea' | 'draft' | 'scheduled' | 'published'
}

const STATUS_META: Record<ContentItem['status'], { label: string; color: string }> = {
  idea:      { label: 'Idea',      color: muted },
  draft:     { label: 'Draft',     color: '#D97706' },
  scheduled: { label: 'Scheduled', color: '#2563EB' },
  published: { label: 'Published', color: '#16A34A' },
}

function ContentCard({ item, onStatusChange, onDelete }: {
  item: ContentItem
  onStatusChange: (id: string, s: ContentItem['status']) => void
  onDelete: (id: string) => void
}) {
  const ch = CHANNELS.find(c => c.id === item.channel)!
  const statuses: ContentItem['status'][] = ['idea', 'draft', 'scheduled', 'published']
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: bg, border: `1px solid ${bdr}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{ch.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0, lineHeight: 1.3 }}>{item.topic}</p>
          {item.angle && <p style={{ fontSize: 11, color: muted, margin: '3px 0 0', lineHeight: 1.3 }}>{item.angle}</p>}
        </div>
        <button onClick={() => onDelete(item.id)} style={{ fontSize: 14, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => onStatusChange(item.id, s)}
            style={{ flex: 1, padding: '3px 0', borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: item.status === s ? `${STATUS_META[s].color}22` : 'transparent',
              border: `1px solid ${item.status === s ? STATUS_META[s].color : bdr}`,
              color: item.status === s ? STATUS_META[s].color : muted, cursor: 'pointer' }}>
            {STATUS_META[s].label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MayaContentPanel({ onSend, accent: a }: { onSend: (text: string) => void; accent: string }) {
  const [contentItems, setContentItems]     = useState<ContentItem[]>([])
  const [activeChannels, setActiveChannels] = useState<Set<ChannelId>>(new Set(['linkedin', 'newsletter']))
  const [addingTo, setAddingTo]             = useState<{ week: number; channel: ChannelId } | null>(null)
  const [newTopic, setNewTopic]             = useState('')
  const [newAngle, setNewAngle]             = useState('')
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    fetch('/api/agents/content-calendar').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.items) {
        setContentItems(d.items.map((i: Record<string, unknown>) => ({
          id: i.id, channel: i.channel, week: i.week, topic: i.topic,
          angle: i.angle, status: (i.status ?? 'idea') as ContentItem['status'],
        })))
      }
    }).finally(() => setLoading(false))
  }, [])

  async function addItem() {
    if (!newTopic.trim() || !addingTo) return
    const res = await fetch('/api/agents/content-calendar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: addingTo.channel, week: addingTo.week, topic: newTopic.trim(), angle: newAngle.trim() || undefined }),
    })
    if (res.ok) {
      const { item } = await res.json()
      setContentItems(p => [...p, { id: item.id, channel: addingTo.channel, week: addingTo.week, topic: newTopic.trim(), angle: newAngle.trim() || undefined, status: 'idea' }])
    }
    setNewTopic(''); setNewAngle(''); setAddingTo(null)
  }

  async function updateStatus(id: string, status: ContentItem['status']) {
    setContentItems(p => p.map(i => i.id === id ? { ...i, status } : i))
    await fetch(`/api/agents/content-calendar/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  }

  async function deleteItem(id: string) {
    setContentItems(p => p.filter(i => i.id !== id))
    await fetch(`/api/agents/content-calendar/${id}`, { method: 'DELETE' })
  }

  function toggleChannel(ch: ChannelId) {
    setActiveChannels(p => { const s = new Set(p); if (s.has(ch)) s.delete(ch); else s.add(ch); return s })
  }

  const visibleChannels = CHANNELS.filter(c => activeChannels.has(c.id))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: muted }}>CHANNELS</span>
        {CHANNELS.map(ch => (
          <button key={ch.id} onClick={() => toggleChannel(ch.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: activeChannels.has(ch.id) ? `${ch.color}18` : 'transparent',
              border: `1px solid ${activeChannels.has(ch.id) ? ch.color : bdr}`,
              color: activeChannels.has(ch.id) ? ch.color : muted }}>
            <span>{ch.icon}</span> {ch.label}
          </button>
        ))}
        <button onClick={() => onSend('Build a 4-week content calendar for my ICP')}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            borderRadius: 8, background: a, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          <Zap size={11} /> Generate with Maya
        </button>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontSize: 13 }}>Loading calendar…</div>
      ) : (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${visibleChannels.length}, 1fr)`, minWidth: 600, padding: '16px 20px', gap: 0 }}>
            <div />
            {visibleChannels.map(ch => (
              <div key={ch.id} style={{ padding: '6px 8px', textAlign: 'center' }}>
                <span style={{ fontSize: 13 }}>{ch.icon}</span>
                <p style={{ fontSize: 11, fontWeight: 700, color: ch.color, margin: '2px 0 0' }}>{ch.label}</p>
              </div>
            ))}
            {WEEKS.map((week, wi) => (
              <>
                <div key={`wl-${wi}`} style={{ padding: '12px 8px 12px 0', display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: muted }}>{week}</span>
                </div>
                {visibleChannels.map(ch => {
                  const cellItems = contentItems.filter(i => i.week === wi + 1 && i.channel === ch.id)
                  const isAdding  = addingTo?.week === wi + 1 && addingTo?.channel === ch.id
                  return (
                    <div key={`cell-${wi}-${ch.id}`} style={{ padding: '8px', minHeight: 100, borderLeft: `1px solid ${bdr}`, borderTop: wi === 0 ? `1px solid ${bdr}` : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {cellItems.map(item => (
                          <ContentCard key={item.id} item={item} onStatusChange={updateStatus} onDelete={deleteItem} />
                        ))}
                        {isAdding ? (
                          <div style={{ padding: '8px', borderRadius: 8, background: `${a}0D`, border: `1px dashed ${a}` }}>
                            <input autoFocus value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Topic…"
                              style={{ width: '100%', fontSize: 11, background: 'transparent', border: 'none', outline: 'none', color: ink, fontFamily: 'inherit', marginBottom: 4, boxSizing: 'border-box' }} />
                            <input value={newAngle} onChange={e => setNewAngle(e.target.value)} placeholder="Angle (optional)"
                              style={{ width: '100%', fontSize: 11, background: 'transparent', border: 'none', outline: 'none', color: muted, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                              <button onClick={addItem} style={{ flex: 1, padding: '3px 0', borderRadius: 4, background: a, border: 'none', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                              <button onClick={() => { setAddingTo(null); setNewTopic(''); setNewAngle('') }} style={{ flex: 1, padding: '3px 0', borderRadius: 4, background: 'transparent', border: `1px solid ${bdr}`, color: muted, fontSize: 10, cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setAddingTo({ week: wi + 1, channel: ch.id })}
                            style={{ width: '100%', padding: '4px 0', borderRadius: 6, background: 'transparent', border: `1px dashed ${bdr}`, color: muted, fontSize: 11, cursor: 'pointer' }}>
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MayaWorkspace() {
  return (
    <AgentWorkspace
      agentId="maya"
      name="Maya"
      role="Brand Director · Content & SEO"
      emoji="🎨"
      accent={accent}
      badge="CONTENT ENGINE"
      deliverables={MAYA_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'content',
        label: 'Content',
        icon: Calendar,
        render: ({ workspace, accent: a }) => <MayaContentPanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
