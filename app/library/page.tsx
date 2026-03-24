'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// ── palette ───────────────────────────────────────────────────────────────────
const bg     = '#F9F7F2'
const surf   = '#F0EDE6'
const bdr    = '#E2DDD5'
const ink    = '#18160F'
const muted  = '#8A867C'
const blue   = '#2563EB'

// ── types ─────────────────────────────────────────────────────────────────────
interface Resource {
  id: string
  title: string
  type: string
  source: string
  author: string | null
  function_owner: string
  topic_cluster: string
  stage_relevance: string[]
  format: string
  access_level: string
  url: string | null
  summary: string
  tags: string[]
}

// ── constants ─────────────────────────────────────────────────────────────────
const FUNCTION_LABELS: Record<string, string> = {
  patel:  'CMO — Marketing & GTM',
  susi:   'CRO — Sales & Revenue',
  maya:   'Brand Director — Brand & Content',
  felix:  'CFO — Finance & Fundraising',
  leo:    'General Counsel — Legal',
  harper: 'CPO — Hiring & People',
  nova:   'CPO — Product & PMF',
  atlas:  'CSO — Strategy & Competitive',
  sage:   'CEO Advisor — Leadership',
}

const FUNCTION_COLORS: Record<string, string> = {
  patel:  '#2563EB',
  susi:   '#16A34A',
  maya:   '#9333EA',
  felix:  '#D97706',
  leo:    '#DC2626',
  harper: '#0891B2',
  nova:   '#DB2777',
  atlas:  '#059669',
  sage:   '#7C3AED',
}

const TYPE_ICONS: Record<string, string> = {
  framework:  '⚙️',
  playbook:   '📋',
  guide:      '📖',
  case_study: '🔬',
  template:   '📄',
  checklist:  '✅',
  benchmark:  '📊',
}

const FORMAT_ICONS: Record<string, string> = {
  article:   '📰',
  pdf:       '📑',
  template:  '📄',
  video:     '🎬',
  tool:      '🔧',
  checklist: '☑️',
}

const STAGES = ['idea', 'mvp', 'seed', 'series-a']
const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea', mvp: 'MVP', seed: 'Seed', 'series-a': 'Series A',
}

function LibraryContent() {
  const searchParams = useSearchParams()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(() => searchParams.get('type'))
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/library')
        const json = await res.json()
        setResources(json.resources ?? [])
      } catch {
        setResources([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let list = resources
    if (selectedFunction) list = list.filter(r => r.function_owner === selectedFunction)
    if (selectedStage) list = list.filter(r => r.stage_relevance.includes(selectedStage))
    if (selectedType) list = list.filter(r => r.type === selectedType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.tags.some(t => t.includes(q))
      )
    }
    return list
  }, [resources, selectedFunction, selectedStage, selectedType, search])

  // Group by function_owner for display
  const grouped = useMemo(() => {
    const map = new Map<string, Resource[]>()
    for (const r of filtered) {
      if (!map.has(r.function_owner)) map.set(r.function_owner, [])
      map.get(r.function_owner)!.push(r)
    }
    return map
  }, [filtered])

  const allTypes = useMemo(() => [...new Set(resources.map(r => r.type))].sort(), [resources])

  const filterActive = selectedFunction || selectedStage || selectedType || search.trim()

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, sans-serif' }}>
      {/* ── header ── */}
      <div style={{ background: ink, color: '#fff', padding: '48px 40px 40px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontSize: 13, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Edge Alpha · Knowledge Library
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            Startup Playbooks & Frameworks
          </h1>
          <p style={{ fontSize: 16, color: '#9CA3AF', margin: 0, maxWidth: 600 }}>
            Curated resources from YC, a16z, Bessemer, HBR, and others — surfaced by your CXO team
            when you need them most.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 24, fontSize: 14, color: '#9CA3AF' }}>
            <span><strong style={{ color: '#fff' }}>{resources.length}</strong> resources</span>
            <span><strong style={{ color: '#fff' }}>9</strong> CXO functions</span>
            <span><strong style={{ color: '#fff' }}>4</strong> startup stages</span>
          </div>
        </div>
      </div>

      {/* ── search + filters ── */}
      <div style={{ background: surf, borderBottom: `1px solid ${bdr}`, padding: '20px 40px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search frameworks, playbooks, authors…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: '1 1 260px', minWidth: 200, padding: '9px 14px', border: `1px solid ${bdr}`,
              borderRadius: 8, background: '#fff', fontSize: 14, color: ink, outline: 'none',
            }}
          />
          {/* Function filter */}
          <select
            value={selectedFunction ?? ''}
            onChange={e => setSelectedFunction(e.target.value || null)}
            style={{ padding: '9px 12px', border: `1px solid ${bdr}`, borderRadius: 8, background: '#fff', fontSize: 14, color: ink, cursor: 'pointer' }}
          >
            <option value="">All Functions</option>
            {Object.entries(FUNCTION_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          {/* Stage filter */}
          <select
            value={selectedStage ?? ''}
            onChange={e => setSelectedStage(e.target.value || null)}
            style={{ padding: '9px 12px', border: `1px solid ${bdr}`, borderRadius: 8, background: '#fff', fontSize: 14, color: ink, cursor: 'pointer' }}
          >
            <option value="">All Stages</option>
            {STAGES.map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
          {/* Type filter */}
          <select
            value={selectedType ?? ''}
            onChange={e => setSelectedType(e.target.value || null)}
            style={{ padding: '9px 12px', border: `1px solid ${bdr}`, borderRadius: 8, background: '#fff', fontSize: 14, color: ink, cursor: 'pointer' }}
          >
            <option value="">All Types</option>
            {allTypes.map(t => (
              <option key={t} value={t}>{TYPE_ICONS[t] ?? ''} {t.replace('_', ' ')}</option>
            ))}
          </select>
          {filterActive && (
            <button
              onClick={() => { setSearch(''); setSelectedFunction(null); setSelectedStage(null); setSelectedType(null) }}
              style={{ padding: '9px 14px', border: `1px solid ${bdr}`, borderRadius: 8, background: '#fff', fontSize: 13, color: muted, cursor: 'pointer' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── main content ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 40px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: muted }}>Loading library…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: muted }}>
            No resources match your filters.
          </div>
        ) : (
          <div>
            {/* Flat list when filtered, grouped otherwise */}
            {filterActive || selectedFunction ? (
              <ResourceList resources={filtered} expandedId={expandedId} setExpandedId={setExpandedId} />
            ) : (
              Array.from(grouped.entries()).map(([owner, items]) => (
                <div key={owner} style={{ marginBottom: 48 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: FUNCTION_COLORS[owner] ?? muted,
                    }} />
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: ink }}>
                      {FUNCTION_LABELS[owner] ?? owner}
                    </h2>
                    <span style={{ fontSize: 13, color: muted, marginLeft: 4 }}>{items.length} resources</span>
                  </div>
                  <ResourceList resources={items} expandedId={expandedId} setExpandedId={setExpandedId} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A867C' }}>Loading…</div>}>
      <LibraryContent />
    </Suspense>
  )
}

// ── Resource list ─────────────────────────────────────────────────────────────
function ResourceList({
  resources,
  expandedId,
  setExpandedId,
}: {
  resources: Resource[]
  expandedId: string | null
  setExpandedId: (id: string | null) => void
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {resources.map(r => (
        <ResourceCard
          key={r.id}
          resource={r}
          expanded={expandedId === r.id}
          onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
        />
      ))}
    </div>
  )
}

// ── Resource card ─────────────────────────────────────────────────────────────
function ResourceCard({
  resource: r,
  expanded,
  onToggle,
}: {
  resource: Resource
  expanded: boolean
  onToggle: () => void
}) {
  const fnColor = FUNCTION_COLORS[r.function_owner] ?? muted

  return (
    <div
      style={{
        border: `1px solid ${expanded ? fnColor : bdr}`,
        borderRadius: 10,
        background: '#fff',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* card header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', padding: '16px 20px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}
      >
        {/* type icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${fnColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {TYPE_ICONS[r.type] ?? '📌'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{r.title}</span>
            <span style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>
              {r.source}{r.author ? ` · ${r.author}` : ''}
            </span>
          </div>
          {!expanded && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: muted, lineClamp: 2,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
              {r.summary}
            </p>
          )}
        </div>

        {/* metadata chips */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Chip label={r.type.replace('_', ' ')} color={fnColor} />
          {r.format !== 'article' && <Chip label={`${FORMAT_ICONS[r.format] ?? ''} ${r.format}`} color={muted} />}
          <span style={{ fontSize: 18, color: muted, marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* expanded content */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${bdr}` }}>
          <p style={{ margin: '16px 0 12px', fontSize: 14, color: ink, lineHeight: 1.6 }}>
            {r.summary}
          </p>

          {/* stage tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {r.stage_relevance.map(s => (
              <span key={s} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: surf, color: muted, border: `1px solid ${bdr}`,
              }}>
                {STAGE_LABELS[s] ?? s}
              </span>
            ))}
            {r.tags.slice(0, 5).map(t => (
              <span key={t} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: `${fnColor}12`, color: fnColor,
                border: `1px solid ${fnColor}30`,
              }}>
                #{t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          {/* actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13, padding: '7px 14px', borderRadius: 7,
                  background: blue, color: '#fff', textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Read resource →
              </a>
            )}
            <a
              href={`/founder/agents/${r.function_owner}?challenge=${r.topic_cluster}`}
              style={{
                fontSize: 13, padding: '7px 14px', borderRadius: 7,
                background: surf, color: ink, textDecoration: 'none',
                border: `1px solid ${bdr}`, fontWeight: 500,
              }}
            >
              Work on this with {FUNCTION_LABELS[r.function_owner]?.split(' — ')[0] ?? 'agent'} →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 8px', borderRadius: 4,
      background: `${color}15`, color,
      border: `1px solid ${color}30`, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
