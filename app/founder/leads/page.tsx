'use client'

/**
 * The founder's lead pipeline — what Patel's AI SDR actually found, as records rather than
 * paragraphs buried in a document.
 *
 * ⚠️ Before this page, P005's research chain (find_target_companies → find_decision_makers →
 * research_account → score_and_prioritize_leads) produced real work that dead-ended inside
 * action_log as prose. score_and_prioritize_leads now declares `produces: 'lead'` and its ranking
 * is written to founder_leads by lib/entities/leads.ts. This is where that lands.
 *
 * ⚠️ A lead is NOT a contact. Outreach only ever addresses someone on /founder/contacts — a
 * founder-vouched list — never a row here. That separation is deliberate and load-bearing; see
 * the founder_leads migration header.
 */

import { useCallback, useEffect, useState } from 'react'
import { Crosshair, Trash2, Plus } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, amber, alpha } from '@/lib/constants/colors'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { PageContainer } from '@/features/shared/components/PageContainer'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { Skeleton } from '@/features/shared/components/Skeleton'
import { useToast } from '@/features/shared/hooks/useToast'

interface Lead {
  id: string
  company: string
  title: string | null
  contact_name: string | null
  email: string | null
  email_status: 'none' | 'found' | 'verified'
  score: number | null
  rationale: string | null
  status: 'researched' | 'contacted' | 'replied' | 'qualified' | 'dead'
  source: 'ai_research' | 'founder' | 'enrichment'
  notes: string | null
  created_at: string
}

const STATUSES: Lead['status'][] = ['researched', 'contacted', 'replied', 'qualified', 'dead']

const STATUS_COLOR: Record<Lead['status'], string> = {
  researched: muted,
  contacted: blue,
  replied: amber,
  qualified: green,
  dead: muted,
}

const emptyForm = { company: '', title: '' }

export default function LeadsPage() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to load leads'); return }
      setLeads(data.leads)
    } catch {
      toast.error('Could not reach the server.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable from context, not a real dep
  }, [])

  useEffect(() => { void load() }, [load])

  async function addLead(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: form.company.trim(),
          title: form.title.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Could not add that lead.'); return }
      setLeads(prev => [data.lead, ...(prev ?? [])])
      setForm(emptyForm)
      toast.success(`Added ${data.lead.company}`)
    } catch {
      toast.error('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(id: string, status: Lead['status']) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Could not update that lead.'); return }
      setLeads(prev => (prev ?? []).map(l => (l.id === id ? data.lead : l)))
    } catch {
      toast.error('Could not reach the server.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeLead(id: string, company: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Could not remove that lead.'); return }
      setLeads(prev => (prev ?? []).filter(l => l.id !== id))
      toast.success(`Removed ${company}`)
    } catch {
      toast.error('Could not reach the server.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <PageContainer>
        <PageHeader
          title="Your leads"
          subtitle="Accounts Patel's team researched and ranked, newest cycle first. These are researched hypotheses — outreach still only ever emails someone on your contacts list."
          back={{ label: 'Back to your executive team', href: '/founder/executive' }}
        />

        <div style={{ marginTop: 24, display: 'grid', gap: 20 }}>
          <SectionCard title="Add a lead">
            <form onSubmit={addLead} style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Company" required value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />
                <Field label="Role you'd target" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
              </div>
              <div>
                <Button type="submit" size="sm" loading={saving} icon={<Plus size={14} />}>
                  Add lead
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title={`Leads${leads ? ` (${leads.length})` : ''}`} noPadding>
            {leads === null ? (
              <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                <Skeleton height={48} /><Skeleton height={48} /><Skeleton height={48} />
              </div>
            ) : leads.length === 0 ? (
              <EmptyState
                icon={Crosshair}
                title="No leads yet"
                body="When Patel's next cycle runs, the accounts it researches and ranks land here. You can also add one above."
              />
            ) : (
              <div>
                {leads.map(l => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px',
                      borderTop: `1px solid ${bdr}`, opacity: l.status === 'dead' ? 0.55 : 1,
                    }}
                  >
                    {l.score !== null && (
                      <div
                        title="Fit score from this cycle's ranking"
                        style={{
                          flexShrink: 0, minWidth: 34, textAlign: 'center', padding: '3px 0',
                          borderRadius: 6, background: alpha(blue, 0.08), color: blue,
                          fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {l.score}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: ink, fontSize: 14, fontWeight: 600 }}>
                        {l.company}
                        {l.title && <span style={{ color: muted, fontWeight: 400 }}> · {l.title}</span>}
                      </div>
                      {l.rationale && (
                        <div style={{ color: muted, fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>
                          {l.rationale}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <select
                          value={l.status}
                          disabled={busyId === l.id}
                          onChange={e => void setStatus(l.id, e.target.value as Lead['status'])}
                          aria-label={`Status for ${l.company}`}
                          style={{
                            padding: '2px 6px', borderRadius: 5, border: `1px solid ${bdr}`,
                            background: surf, color: STATUS_COLOR[l.status], fontSize: 11.5,
                            fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize',
                          }}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {l.source === 'ai_research' && (
                          <span style={{ color: muted, fontSize: 11 }}>found by Patel</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => void removeLead(l.id, l.company)}
                      disabled={busyId === l.id}
                      aria-label={`Remove ${l.company}`}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                        color: muted, opacity: busyId === l.id ? 0.5 : 1, flexShrink: 0,
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </PageContainer>
    </div>
  )
}

function Field({
  label, value, onChange, required,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03 }}>
        {label}{required && ' *'}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '8px 10px', borderRadius: 6, border: `1px solid ${bdr}`,
          background: surf, color: ink, fontSize: 14, fontFamily: 'inherit',
        }}
      />
    </label>
  )
}
