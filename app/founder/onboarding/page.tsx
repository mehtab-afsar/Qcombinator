'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronRight } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

// ── option data ───────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { value: 'medtech-biotech',  label: 'Medtech / Biotech'    },
  { value: 'ai-software',      label: 'AI & Software'         },
  { value: 'robotics-hardware',label: 'Robotics & Hardware'   },
  { value: 'agri-foodtech',    label: 'Agri- & Foodtech'      },
  { value: 'clean-tech',       label: 'Clean Tech'            },
]

const STAGES = [
  { value: 'product-development', label: 'Product Development', sub: 'Building or validating the product' },
  { value: 'commercial',          label: 'Commercial',           sub: 'Early customers or pilots underway'  },
  { value: 'growth-scaling',      label: 'Growth / Scaling',     sub: 'Scaling revenue and team'            },
]

const REVENUE = [
  { value: 'pre-revenue',  label: 'Pre-revenue',                    sub: 'No paying customers yet'      },
  { value: 'early-revenue',label: 'Early revenue (pilots)',         sub: 'First paying customers'        },
  { value: 'recurring',    label: 'Recurring revenues',             sub: 'Signed contracts or SaaS MRR'  },
]

const TEAM = [
  { value: '1-5',  label: '1–5'   },
  { value: '5-10', label: '5–10'  },
  { value: '10+',  label: '10+'   },
]

const FUNDING = [
  { value: 'bootstrapped',    label: 'Bootstrapped'      },
  { value: 'friends-family',  label: 'Friends & family'  },
  { value: 'angel',           label: 'Angel investors'   },
  { value: 'vc',              label: 'VC'                },
]

// ── animation ─────────────────────────────────────────────────────────────────
const slide = {
  enter: (dir: number) => ({ x: dir * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -32, opacity: 0 }),
}

// ── shared components ─────────────────────────────────────────────────────────
function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 700, color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
      {children}
      {optional && <span style={{ fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0, color: muted, fontSize: 11 }}>optional</span>}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', autoFocus = false }: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; autoFocus?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoComplete={type === 'email' ? 'email' : type === 'password' ? 'new-password' : 'off'}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: 8,
        border: `1.5px solid ${bdr}`, background: bg,
        fontSize: 14, color: ink, outline: 'none', fontFamily: 'inherit',
        boxSizing: 'border-box', transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = blue }}
      onBlur={e => { e.currentTarget.style.borderColor = bdr }}
    />
  )
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: 7, cursor: 'pointer',
        border: `1.5px solid ${active ? blue : bdr}`,
        background: active ? `${blue}12` : surf,
        fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? blue : ink, fontFamily: 'inherit',
        transition: 'all 0.14s',
      }}
    >{label}</button>
  )
}

function OptionCard({ label, sub, active, onClick }: {
  label: string; sub?: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 9, cursor: 'pointer',
        border: `1.5px solid ${active ? blue : bdr}`,
        background: active ? `${blue}0D` : surf,
        fontFamily: 'inherit', textAlign: 'left', width: '100%',
        transition: 'all 0.14s',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? blue : ink, lineHeight: 1.3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${active ? blue : bdr}`,
        background: active ? blue : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.14s',
      }}>
        {active && <Check size={10} color="#fff" strokeWidth={3} />}
      </div>
    </button>
  )
}

// ── form state ────────────────────────────────────────────────────────────────
interface FormData {
  companyName: string; website: string; industry: string; stage: string
  revenueStatus: string; fundingStatus: string; teamSize: string
  founderName: string; email: string; password: string
}

const EMPTY: FormData = {
  companyName: '', website: '', industry: '', stage: '',
  revenueStatus: '', fundingStatus: '', teamSize: '',
  founderName: '', email: '', password: '',
}

const STEP_LABELS = ['Your Startup', 'Account']

// ── main ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [page, setPage]     = useState(1)
  const [dir, setDir]       = useState(1)
  const [form, setForm]     = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const set = (key: keyof FormData) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }))

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => { if (data.session) router.replace('/founder/dashboard') })
  }, [router])

  const canNext1 = form.companyName.trim() && form.industry && form.stage
  const canSubmit = form.revenueStatus && form.fundingStatus && form.teamSize &&
    form.founderName.trim() && form.email.trim() && form.password.length >= 8

  function go(next: number) { setDir(next > page ? 1 : -1); setPage(next); setError('') }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(), password: form.password, fullName: form.founderName.trim(),
          companyName: form.companyName, website: form.website, industry: form.industry,
          stage: form.stage, revenueStatus: form.revenueStatus,
          fundingStatus: form.fundingStatus, teamSize: form.teamSize,
          founderName: form.founderName,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Sign up failed.'); setLoading(false); return }
      const sb = createClient()
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (signInErr) { setError('Account created but sign-in failed. Please log in.'); setLoading(false); return }
      // Keep loading=true — the overlay stays visible during the navigation to profile-builder
      router.push('/founder/profile-builder')
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  // Full-screen loading overlay shown while account is being created / navigating
  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: bg, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: `3px solid #E2DDD5`, borderTopColor: '#2563EB',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#18160F', marginBottom: 6 }}>
            Setting up your profile…
          </div>
          <div style={{ fontSize: 13, color: '#8A867C' }}>
            This takes a few seconds
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 16px 64px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Logo */}
      <div style={{ fontSize: 15, fontWeight: 700, color: ink, letterSpacing: '-0.3px', marginBottom: 40 }}>
        Edge Alpha
      </div>

      {/* Step rail */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1
          const done = n < page; const active = n === page
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: done ? blue : active ? ink : bdr,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.25s',
                }}>
                  {done
                    ? <Check size={11} color="#fff" strokeWidth={2.5} />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : muted }}>{n}</span>
                  }
                </div>
                <span style={{ fontSize: 11, color: active ? ink : muted, fontWeight: active ? 600 : 400 }}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{ width: 52, height: 1, background: n < page ? blue : bdr, margin: '-11px 10px 0', transition: 'background 0.3s' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 560,
        background: surf, borderRadius: 14,
        border: `1px solid ${bdr}`,
        overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={page}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ padding: '32px 32px 0' }}
          >
            {/* Page title */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 19, fontWeight: 700, color: ink, margin: 0, letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                {page === 1 && 'Tell us about your startup'}
                {page === 2 && 'Create your account'}
              </h1>
              <p style={{ fontSize: 13, color: muted, margin: '5px 0 0', lineHeight: 1.5 }}>
                {page === 1 && 'This calibrates your IQ Score accurately from day one.'}
                {page === 2 && 'Honest answers give you a more useful baseline — no judgment.'}
              </p>
            </div>

            {/* ── PAGE 1 — Startup ── */}
            {page === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <Label>Company name</Label>
                  <TextInput value={form.companyName} onChange={set('companyName')} placeholder="e.g. Acme Inc." autoFocus />
                </div>

                <div>
                  <Label>Industry / Sector</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {INDUSTRIES.map(o => (
                      <OptionCard
                        key={o.value}
                        label={o.label}
                        active={form.industry === o.value}
                        onClick={() => set('industry')(o.value)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label optional>Website</Label>
                  <TextInput value={form.website} onChange={set('website')} placeholder="https://" />
                </div>

                <div>
                  <Label>Stage</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {STAGES.map(o => (
                      <OptionCard
                        key={o.value}
                        label={o.label}
                        sub={o.sub}
                        active={form.stage === o.value}
                        onClick={() => set('stage')(o.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PAGE 2 — Account ── */}
            {page === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <Label>Revenue</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {REVENUE.map(o => (
                      <OptionCard
                        key={o.value}
                        label={o.label}
                        sub={o.sub}
                        active={form.revenueStatus === o.value}
                        onClick={() => set('revenueStatus')(o.value)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Team size</Label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {TEAM.map(o => (
                      <Pill
                        key={o.value}
                        label={o.label}
                        active={form.teamSize === o.value}
                        onClick={() => set('teamSize')(o.value)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Funding status</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {FUNDING.map(o => (
                      <Pill
                        key={o.value}
                        label={o.label}
                        active={form.fundingStatus === o.value}
                        onClick={() => set('fundingStatus')(o.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                  <span style={{ fontSize: 11, color: muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Create account</span>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                </div>

                <div>
                  <Label>Full name</Label>
                  <TextInput value={form.founderName} onChange={set('founderName')} placeholder="Jane Smith" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <Label>Work email</Label>
                    <TextInput value={form.email} onChange={set('email')} placeholder="you@company.com" type="email" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <TextInput value={form.password} onChange={set('password')} placeholder="Min. 8 characters" type="password" />
                  </div>
                </div>

                {error && (
                  <div style={{ padding: '11px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
                    {error}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav footer */}
        <div style={{ padding: '24px 32px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {page > 1 ? (
            <button
              onClick={() => go(page - 1)}
              style={{
                padding: '9px 18px', borderRadius: 8, border: `1.5px solid ${bdr}`,
                background: 'transparent', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >← Back</button>
          ) : (
            <a href="/login" style={{ fontSize: 13, color: muted, textDecoration: 'none' }}>
              Already have an account?
            </a>
          )}

          {page < 2 ? (
            <button
              onClick={() => go(page + 1)}
              disabled={!canNext1}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: !canNext1 ? bdr : blue,
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: !canNext1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'opacity 0.15s',
                opacity: !canNext1 ? 0.45 : 1,
              }}
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 22px', borderRadius: 8, border: 'none',
                background: (!canSubmit || loading) ? bdr : blue,
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', opacity: (!canSubmit || loading) ? 0.45 : 1,
              }}
            >
              {loading ? 'Creating account…' : <><span>Create account</span><ChevronRight size={14} /></>}
            </button>
          )}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: muted, marginTop: 20 }}>
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
