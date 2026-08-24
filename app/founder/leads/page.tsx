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
import Link from 'next/link'
import { Crosshair, Plus, Search, ArrowRight } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { PageContainer } from '@/features/shared/components/PageContainer'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { Skeleton } from '@/features/shared/components/Skeleton'
import { useToast } from '@/features/shared/hooks/useToast'
import { LeadRow, type Lead } from '@/features/executive/components/LeadRow'

/** Matches MAX_PER_REQUEST in app/api/leads/enrich/route.ts — the server is the real limit. */
const MAX_ENRICH = 25
/** Roughly one company resolution + one email reveal. Shown before spending, never after. */
const CREDITS_PER_LEAD = 2

const emptyForm = { company: '', title: '' }

export default function LeadsPage() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [enriching, setEnriching] = useState(false)
  const [apolloConnected, setApolloConnected] = useState<boolean | null>(null)

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

  // Whether Apollo is connected decides between the "Find emails" button and the connect prompt.
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/connectors')
        if (!res.ok || !live) return
        const data = await res.json()
        const grants: Array<{ provider: string; status: string }> = data.grants ?? []
        setApolloConnected(grants.some(g => g.provider === 'apollo' && g.status === 'active'))
      } catch {
        if (live) setApolloConnected(false)
      }
    })()
    return () => { live = false }
  }, [])

  const enrichable = (leads ?? []).filter(l => l.email_status === 'none')
  const selectedEnrichable = enrichable.filter(l => selected.has(l.id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function enrichSelected() {
    if (selectedEnrichable.length === 0) return
    setEnriching(true)
    try {
      const res = await fetch('/api/leads/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedEnrichable.slice(0, MAX_ENRICH).map(l => l.id) }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Enrichment failed.'); return }
      setSelected(new Set())
      await load()
      toast.success(
        data.enriched > 0
          ? `Found ${data.enriched} email${data.enriched === 1 ? '' : 's'} of ${data.attempted} tried`
          : `No emails found across ${data.attempted} lead${data.attempted === 1 ? '' : 's'}`,
      )
    } catch {
      toast.error('Could not reach the server.')
    } finally {
      setEnriching(false)
    }
  }

  async function promote(id: string, company: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/leads/${id}/promote`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Could not add to contacts.'); return }
      await load()
      toast.success(`${company} added to your contacts`)
    } catch {
      toast.error('Could not reach the server.')
    } finally {
      setBusyId(null)
    }
  }

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

          {/* The enrichment bar — only once there is something to enrich. Doubles as the door to
              connecting Apollo, the same contextual-prompt pattern ContactsPrompt uses. */}
          {enrichable.length > 0 && apolloConnected !== null && (
            <SectionCard title="Find their emails">
              {apolloConnected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <p style={{ color: muted, fontSize: 13, margin: 0, flex: 1, minWidth: 240, lineHeight: 1.5 }}>
                    {selectedEnrichable.length === 0
                      ? `Select leads below to look up a real person and work email at each. ${enrichable.length} still need one.`
                      : `${selectedEnrichable.length} selected — about ${selectedEnrichable.length * CREDITS_PER_LEAD} Apollo credits.`}
                  </p>
                  <Button
                    size="sm"
                    loading={enriching}
                    disabled={selectedEnrichable.length === 0}
                    onClick={() => void enrichSelected()}
                    icon={<Search size={14} />}
                  >
                    Find emails
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <p style={{ color: muted, fontSize: 13, margin: 0, flex: 1, minWidth: 240, lineHeight: 1.5 }}>
                    Connect your Apollo account to turn these roles into real people with work
                    emails. It runs on your own Apollo credits.
                  </p>
                  <Link
                    href="/founder/executive"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, color: blue,
                      fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    Connect Apollo <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </SectionCard>
          )}

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
                  <LeadRow
                    key={l.id}
                    lead={l}
                    selected={selected.has(l.id)}
                    busy={busyId === l.id}
                    onToggle={() => toggle(l.id)}
                    onSetStatus={s => void setStatus(l.id, s)}
                    onPromote={() => void promote(l.id, l.company)}
                    onRemove={() => void removeLead(l.id, l.company)}
                  />
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
