'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Monitor, CreditCard, Heart, BookOpen, Leaf, Brain,
  ShoppingBag, ArrowLeftRight, Sprout, Cpu, Link2, Plus,
  Check, ChevronRight,
} from 'lucide-react'

// ── palette ───────────────────────────────────────────────────────────────────
const bg   = '#F9F7F2'
const surf = '#F0EDE6'
const bdr  = '#E2DDD5'
const ink  = '#18160F'
const muted = '#8A867C'
const blue = '#2563EB'

// ── industry data with Lucide icons ───────────────────────────────────────────
type IndustryOption = { value: string; label: string; Icon: React.ElementType }

const INDUSTRIES: IndustryOption[] = [
  { value: 'saas',        label: 'SaaS / Software',    Icon: Monitor       },
  { value: 'fintech',     label: 'FinTech',             Icon: CreditCard    },
  { value: 'healthtech',  label: 'HealthTech',          Icon: Heart         },
  { value: 'edtech',      label: 'EdTech',              Icon: BookOpen      },
  { value: 'climate',     label: 'CleanTech',           Icon: Leaf          },
  { value: 'ai',          label: 'Deep Tech / AI',      Icon: Brain         },
  { value: 'consumer',    label: 'Consumer',            Icon: ShoppingBag   },
  { value: 'marketplace', label: 'Marketplace',         Icon: ArrowLeftRight},
  { value: 'agritech',    label: 'AgriTech',            Icon: Sprout        },
  { value: 'hardware',    label: 'Hardware / IoT',      Icon: Cpu           },
  { value: 'web3',        label: 'Web3 / Crypto',       Icon: Link2         },
  { value: 'other',       label: 'Other',               Icon: Plus          },
]

const STAGES = [
  { value: 'pre-product', label: 'Pre-Product',  sub: 'Idea or research phase'      },
  { value: 'mvp',         label: 'MVP',           sub: 'Built, testing with users'   },
  { value: 'beta',        label: 'Beta',          sub: 'Limited release underway'    },
  { value: 'launched',    label: 'Launched',      sub: 'Public — early revenue'      },
  { value: 'growing',     label: 'Growing',       sub: 'Scaling revenue & team'      },
]

const REVENUE = [
  { value: 'pre-revenue',   label: 'Pre-revenue',        sub: 'No paying customers yet' },
  { value: 'first-revenue', label: 'First revenue',      sub: 'Under $10K MRR'          },
  { value: '10k-100k',      label: '$10K–$100K MRR',     sub: ''                        },
  { value: '100k-plus',     label: '$100K+ MRR',         sub: 'Strong traction'         },
]

const FUNDING = [
  { value: 'bootstrapped',       label: 'Bootstrapped'     },
  { value: 'friends-and-family', label: 'Friends & Family' },
  { value: 'pre-seed',           label: 'Pre-Seed'         },
  { value: 'seed',               label: 'Seed'             },
  { value: 'series-a-plus',      label: 'Series A+'        },
]

const TEAM = [
  { value: 'solo',  label: 'Solo',  sub: 'Just you'            },
  { value: '2',     label: '2',     sub: 'You + 1 co-founder'  },
  { value: '3-5',   label: '3–5',   sub: 'Small founding team' },
  { value: '6-15',  label: '6–15',  sub: 'Growing team'        },
  { value: '16+',   label: '16+',   sub: 'Scaled up'           },
]

const PRIOR_EXP = [
  { value: 'first-time',      label: 'First-time founder',       sub: 'New to this journey'       },
  { value: 'founded-no-exit', label: 'Founded — didn\'t scale',  sub: 'Built something, moved on' },
  { value: 'exited',          label: 'Founded and exited',       sub: 'Had a successful outcome'  },
  { value: 'serial',          label: 'Serial founder',           sub: '2+ companies built'        },
]

const YEARS = [
  { value: 'less-than-1', label: 'Under 1 year' },
  { value: '1-2',         label: '1–2 years'    },
  { value: '3-5',         label: '3–5 years'    },
  { value: '5-plus',      label: '5+ years'     },
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
        padding: '7px 15px', borderRadius: 7, cursor: 'pointer',
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
  companyName: string; website: string; industry: string; description: string
  stage: string; revenueStatus: string; fundingStatus: string; teamSize: string
  founderName: string; linkedinUrl: string; yearsOnProblem: string; priorExperience: string
  email: string; password: string
}

const EMPTY: FormData = {
  companyName: '', website: '', industry: '', description: '',
  stage: '', revenueStatus: '', fundingStatus: '', teamSize: '',
  founderName: '', linkedinUrl: '', yearsOnProblem: '', priorExperience: '',
  email: '', password: '',
}

const STEP_LABELS = ['Company', 'Journey', 'You']

// ── main ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [page, setPage]   = useState(1)
  const [dir, setDir]     = useState(1)
  const [form, setForm]   = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof FormData) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }))

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => { if (data.session) router.replace('/founder/dashboard') })
  }, [router])

  const canNext1 = form.companyName.trim() && form.industry && form.description.trim()
  const canNext2 = form.stage && form.revenueStatus && form.fundingStatus && form.teamSize
  const canSubmit = form.founderName.trim() && form.yearsOnProblem &&
    form.priorExperience && form.email.trim() && form.password.length >= 8

  function go(next: number) { setDir(next > page ? 1 : -1); setPage(next); setError('') }

  async function handleSubmit() {
    setLoading(true); setError('')
    const cofounderCount = form.teamSize === 'solo' ? 0 : form.teamSize === '2' ? 1 : form.teamSize === '3-5' ? 2 : 3
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(), password: form.password, fullName: form.founderName.trim(),
          companyName: form.companyName, website: form.website, industry: form.industry,
          description: form.description, stage: form.stage, revenueStatus: form.revenueStatus,
          fundingStatus: form.fundingStatus, teamSize: form.teamSize,
          founderName: form.founderName, linkedinUrl: form.linkedinUrl,
          cofounderCount, yearsOnProblem: form.yearsOnProblem, priorExperience: form.priorExperience,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Sign up failed.'); setLoading(false); return }
      const sb = createClient()
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (signInErr) { setError('Account created but sign-in failed. Please log in.'); setLoading(false); return }
      if (form.linkedinUrl) {
        const { data: sd } = await sb.auth.getSession()
        const tok = sd.session?.access_token
        if (tok) fetch('/api/profile-builder/linkedin-enrich', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ linkedinUrl: form.linkedinUrl }) }).catch(() => {})
      }
      router.push('/founder/profile-builder')
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
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
                {page === 1 && 'Tell us about your company'}
                {page === 2 && 'Where are you in your journey?'}
                {page === 3 && 'Create your account'}
              </h1>
              <p style={{ fontSize: 13, color: muted, margin: '5px 0 0', lineHeight: 1.5 }}>
                {page === 1 && 'This calibrates your Q-Score accurately from day one.'}
                {page === 2 && 'Honest answers give you a more useful baseline — no judgment.'}
                {page === 3 && 'Your profile will be ready immediately after sign up.'}
              </p>
            </div>

            {/* ── PAGE 1 ── */}
            {page === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <Label>Company name</Label>
                  <TextInput value={form.companyName} onChange={set('companyName')} placeholder="e.g. Acme Inc." autoFocus />
                </div>

                <div>
                  <Label>Industry</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {INDUSTRIES.map(({ value, label, Icon }) => {
                      const active = form.industry === value
                      return (
                        <button
                          key={value}
                          onClick={() => set('industry')(value)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 7, padding: '13px 8px', borderRadius: 9, cursor: 'pointer',
                            border: `1.5px solid ${active ? blue : bdr}`,
                            background: active ? `${blue}0D` : bg,
                            fontFamily: 'inherit', transition: 'all 0.14s',
                          }}
                        >
                          <Icon size={17} color={active ? blue : muted} strokeWidth={1.75} />
                          <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? blue : ink, lineHeight: 1.2, textAlign: 'center' }}>{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label>One-liner</Label>
                  <TextInput
                    value={form.description}
                    onChange={v => set('description')(v.slice(0, 100))}
                    placeholder="We help [who] do [what] without [pain]"
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: muted, marginTop: 5 }}>{form.description.length}/100</div>
                </div>

                <div>
                  <Label optional>Website</Label>
                  <TextInput value={form.website} onChange={set('website')} placeholder="https://" />
                </div>
              </div>
            )}

            {/* ── PAGE 2 ── */}
            {page === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <Label>Current stage</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {STAGES.map(o => <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.stage === o.value} onClick={() => set('stage')(o.value)} />)}
                  </div>
                </div>

                <div>
                  <Label>Revenue status</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {REVENUE.map(o => <OptionCard key={o.value} label={o.label} sub={o.sub || undefined} active={form.revenueStatus === o.value} onClick={() => set('revenueStatus')(o.value)} />)}
                  </div>
                </div>

                <div>
                  <Label>Funding status</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {FUNDING.map(o => <Pill key={o.value} label={o.label} active={form.fundingStatus === o.value} onClick={() => set('fundingStatus')(o.value)} />)}
                  </div>
                </div>

                <div>
                  <Label>Team size <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 4 }}>including yourself</span></Label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
                    {TEAM.map(o => {
                      const active = form.teamSize === o.value
                      return (
                        <button
                          key={o.value}
                          onClick={() => set('teamSize')(o.value)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: 4, padding: '11px 8px', borderRadius: 9, cursor: 'pointer',
                            border: `1.5px solid ${active ? blue : bdr}`,
                            background: active ? `${blue}0D` : bg,
                            fontFamily: 'inherit', transition: 'all 0.14s',
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, color: active ? blue : ink }}>{o.label}</span>
                          <span style={{ fontSize: 10, color: muted, lineHeight: 1.2, textAlign: 'center' }}>{o.sub}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── PAGE 3 ── */}
            {page === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <Label>Full name</Label>
                    <TextInput value={form.founderName} onChange={set('founderName')} placeholder="Jane Smith" autoFocus />
                  </div>
                  <div>
                    <Label optional>LinkedIn</Label>
                    <TextInput value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="linkedin.com/in/…" />
                  </div>
                </div>

                <div>
                  <Label>Time working on this problem</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {YEARS.map(o => <Pill key={o.value} label={o.label} active={form.yearsOnProblem === o.value} onClick={() => set('yearsOnProblem')(o.value)} />)}
                  </div>
                </div>

                <div>
                  <Label>Prior startup experience</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {PRIOR_EXP.map(o => <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.priorExperience === o.value} onClick={() => set('priorExperience')(o.value)} />)}
                  </div>
                </div>

                {/* divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                  <span style={{ fontSize: 11, color: muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Create account</span>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
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

          {page < 3 ? (
            <button
              onClick={() => go(page + 1)}
              disabled={(page === 1 && !canNext1) || (page === 2 && !canNext2)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: ((page === 1 && !canNext1) || (page === 2 && !canNext2)) ? bdr : blue,
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'opacity 0.15s',
                opacity: ((page === 1 && !canNext1) || (page === 2 && !canNext2)) ? 0.45 : 1,
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
