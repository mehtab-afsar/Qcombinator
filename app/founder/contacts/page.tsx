'use client'

/**
 * The founder's own real prospect list — the recipient source generate_personalized_outreach
 * (P005) and interview_customers (P001) have never had. Neither Action can produce anything
 * approvable without a real, founder-provided contact somewhere in Company Context; this page
 * is where that data actually comes from. See lib/contacts/context.ts and
 * lib/rhythm/run.ts's founderContactsContextFor for how it's fed into the AI narrowly — only
 * for the two Actions that actually send email, nowhere else.
 *
 * Deliberately minimal: add one contact at a time, no CSV/bulk import (v1 scope — see the
 * founder_contacts migration's own header).
 */

import { useCallback, useEffect, useState } from 'react'
import { Users, Trash2, Plus } from 'lucide-react'
import { bg, surf, bdr, ink, muted } from '@/lib/constants/colors'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { PageContainer } from '@/features/shared/components/PageContainer'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { Skeleton } from '@/features/shared/components/Skeleton'
import { useToast } from '@/features/shared/hooks/useToast'

interface Contact {
  id: string
  name: string
  email: string
  company: string | null
  title: string | null
  notes: string | null
  created_at: string
}

const emptyForm = { name: '', email: '', company: '', title: '', notes: '' }

export default function ContactsPage() {
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts')
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to load contacts'); return }
      setContacts(data.contacts)
    } catch {
      toast.error('Could not reach the server.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable from context, not a real dep
  }, [])

  useEffect(() => { void load() }, [load])

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || undefined,
          title: form.title.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Could not add that contact.'); return }
      setContacts(prev => [data.contact, ...(prev ?? [])])
      setForm(emptyForm)
      toast.success(`Added ${data.contact.name}`)
    } catch {
      toast.error('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  async function removeContact(id: string, name: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Could not remove that contact.'); return }
      setContacts(prev => (prev ?? []).filter(c => c.id !== id))
      toast.success(`Removed ${name}`)
    } catch {
      toast.error('Could not reach the server.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <PageContainer>
        <PageHeader
          title="Your contacts"
          subtitle="Real people your team can actually reach out to. Patel's AI SDR and outreach only ever address someone on this list — never an invented name or email."
          back={{ label: 'Back to your executive team', href: '/founder/executive' }}
        />

        <div style={{ marginTop: 24, display: 'grid', gap: 20 }}>
          <SectionCard title="Add a contact">
            <form onSubmit={addContact} style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
                <Field label="Email" required type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Company" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />
                <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
              </div>
              <Field label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
              <div>
                <Button type="submit" size="sm" loading={saving} icon={<Plus size={14} />}>
                  Add contact
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title={`Contacts${contacts ? ` (${contacts.length})` : ''}`} noPadding>
            {contacts === null ? (
              <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                <Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} />
              </div>
            ) : contacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No contacts yet"
                body="Add someone real above — your team's outreach won't send to anyone until there's at least one."
              />
            ) : (
              <div>
                {contacts.map(c => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                      borderTop: `1px solid ${bdr}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: ink, fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ color: muted, fontSize: 12.5, marginTop: 2 }}>
                        {c.email}
                        {(c.title || c.company) && ` — ${[c.title, c.company].filter(Boolean).join(' at ')}`}
                      </div>
                    </div>
                    <button
                      onClick={() => void removeContact(c.id, c.name)}
                      disabled={deletingId === c.id}
                      aria-label={`Remove ${c.name}`}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                        color: muted, opacity: deletingId === c.id ? 0.5 : 1,
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
  label, value, onChange, required, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03 }}>
        {label}{required && ' *'}
      </span>
      <input
        type={type}
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
