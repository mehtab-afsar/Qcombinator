'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'

// ── palette ───────────────────────────────────────────────────────────────────
const bg   = '#F9F7F2'
const bdr  = '#E2DDD5'
const ink  = '#18160F'
const muted = '#8A867C'
const blue = '#2563EB'

// ── data ──────────────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { value: 'saas',       label: 'SaaS / Software',      icon: '💻' },
  { value: 'fintech',    label: 'FinTech',               icon: '💳' },
  { value: 'healthtech', label: 'HealthTech',            icon: '🏥' },
  { value: 'edtech',     label: 'EdTech',                icon: '🎓' },
  { value: 'climate',    label: 'CleanTech / Climate',   icon: '🌱' },
  { value: 'ai',         label: 'Deep Tech / AI',        icon: '🤖' },
  { value: 'consumer',   label: 'Consumer',              icon: '🛍️' },
  { value: 'marketplace',label: 'Marketplace',           icon: '🔄' },
  { value: 'agritech',   label: 'AgriTech',              icon: '🌾' },
  { value: 'hardware',   label: 'Hardware / IoT',        icon: '⚙️' },
  { value: 'web3',       label: 'Web3 / Crypto',         icon: '🔗' },
  { value: 'other',      label: 'Other',                 icon: '✦'  },
]

const STAGES = [
  { value: 'pre-product', label: 'Pre-Product',  sub: 'Idea or research phase'        },
  { value: 'mvp',         label: 'MVP',           sub: 'Built, testing with users'     },
  { value: 'beta',        label: 'Beta',          sub: 'Limited release underway'      },
  { value: 'launched',    label: 'Launched',      sub: 'Public — early revenue'        },
  { value: 'growing',     label: 'Growing',       sub: 'Scaling revenue & team'        },
]

const REVENUE = [
  { value: 'pre-revenue',   label: 'Pre-revenue',              sub: 'No paying customers yet'    },
  { value: 'first-revenue', label: 'First revenue',            sub: 'Under $10K MRR'             },
  { value: '10k-100k',      label: '$10K – $100K MRR',         sub: ''                           },
  { value: '100k-plus',     label: '$100K+ MRR',               sub: 'Strong revenue traction'    },
]

const FUNDING = [
  { value: 'bootstrapped',       label: 'Bootstrapped'         },
  { value: 'friends-and-family', label: 'Friends & Family'     },
  { value: 'pre-seed',           label: 'Pre-Seed'             },
  { value: 'seed',               label: 'Seed'                 },
  { value: 'series-a-plus',      label: 'Series A+'            },
]

// Team size replaces both the old teamSize AND cofounderCount — no more duplicates
const TEAM = [
  { value: 'solo',   label: 'Solo',   sub: 'Just you'              },
  { value: '2',      label: '2',      sub: 'You + 1 co-founder'    },
  { value: '3-5',    label: '3–5',    sub: 'Small founding team'   },
  { value: '6-15',   label: '6–15',   sub: 'Growing team'          },
  { value: '16+',    label: '16+',    sub: 'Scaled up'             },
]

const PRIOR_EXP = [
  { value: 'first-time',      label: 'First-time founder',        sub: 'New to this journey'            },
  { value: 'founded-no-exit', label: 'Founded — didn\'t scale',   sub: 'Built something, moved on'      },
  { value: 'exited',          label: 'Founded and exited',        sub: 'Had a successful outcome'       },
  { value: 'serial',          label: 'Serial founder',            sub: '2+ companies built'             },
]

const YEARS = [
  { value: 'less-than-1', label: 'Under 1 year'  },
  { value: '1-2',         label: '1–2 years'     },
  { value: '3-5',         label: '3–5 years'     },
  { value: '5-plus',      label: '5+ years'      },
]

// ── animation variants ────────────────────────────────────────────────────────
const slide = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir * -40, opacity: 0 }),
}

// ── sub-components ────────────────────────────────────────────────────────────
function CardGrid<T extends { value: string; label: string; sub?: string; icon?: string }>({
  options, value, onChange, cols = 2,
}: {
  options: T[]
  value: string
  onChange: (v: string) => void
  cols?: number
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: opt.icon ? '14px 16px' : '12px 16px',
              borderRadius: 10, border: `1.5px solid ${active ? blue : bdr}`,
              background: active ? '#EFF6FF' : '#fff',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {opt.icon && (
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{opt.icon}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: active ? blue : ink,
                lineHeight: 1.3,
              }}>{opt.label}</div>
              {opt.sub && (
                <div style={{ fontSize: 11, color: muted, marginTop: 2, lineHeight: 1.3 }}>{opt.sub}</div>
              )}
            </div>
            {active && (
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder, type = 'text', autoFocus = false, hint,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
  hint?: string
}) {
  return (
    <div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={type === 'email' ? 'email' : type === 'password' ? 'new-password' : 'off'}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 10,
          border: `1.5px solid ${bdr}`, background: '#fff',
          fontSize: 15, color: ink, outline: 'none', fontFamily: 'inherit',
          boxSizing: 'border-box', transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = blue }}
        onBlur={e => { e.currentTarget.style.borderColor = bdr }}
      />
      {hint && <p style={{ fontSize: 12, color: muted, margin: '6px 0 0' }}>{hint}</p>}
    </div>
  )
}

// ── page data ─────────────────────────────────────────────────────────────────
interface FormData {
  // Page 1 — Company
  companyName: string
  website: string
  industry: string
  description: string
  // Page 2 — Journey
  stage: string
  revenueStatus: string
  fundingStatus: string
  teamSize: string          // covers team size + co-founder count in one field
  // Page 3 — You + Auth
  founderName: string
  linkedinUrl: string
  yearsOnProblem: string
  priorExperience: string
  email: string
  password: string
}

const EMPTY: FormData = {
  companyName: '', website: '', industry: '', description: '',
  stage: '', revenueStatus: '', fundingStatus: '', teamSize: '',
  founderName: '', linkedinUrl: '', yearsOnProblem: '', priorExperience: '',
  email: '', password: '',
}

const STEP_LABELS = ['Your company', 'Your journey', 'About you']

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

  // Redirect if already logged in
  useEffect(() => {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    sb.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/founder/dashboard')
    })
  }, [router])

  const canNext1 = form.companyName.trim() && form.industry && form.description.trim()
  const canNext2 = form.stage && form.revenueStatus && form.fundingStatus && form.teamSize
  const canSubmit = form.founderName.trim() && form.yearsOnProblem &&
                    form.priorExperience && form.email.trim() && form.password.length >= 8

  function go(next: number) {
    setDir(next > page ? 1 : -1)
    setPage(next)
    setError('')
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    // Derive cofounderCount from teamSize for DB compatibility
    const cofounderCount = form.teamSize === 'solo' ? 0
      : form.teamSize === '2' ? 1
      : form.teamSize === '3-5' ? 2
      : 3

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          fullName: form.founderName.trim(),
          companyName: form.companyName,
          website: form.website,
          industry: form.industry,
          description: form.description,
          stage: form.stage,
          revenueStatus: form.revenueStatus,
          fundingStatus: form.fundingStatus,
          teamSize: form.teamSize,
          founderName: form.founderName,
          linkedinUrl: form.linkedinUrl,
          cofounderCount,
          yearsOnProblem: form.yearsOnProblem,
          priorExperience: form.priorExperience,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Sign up failed.'); setLoading(false); return }

      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: signInErr } = await sb.auth.signInWithPassword({
        email: form.email.trim(), password: form.password,
      })
      if (signInErr) {
        setError('Account created but sign-in failed. Please log in.')
        setLoading(false)
        return
      }
      if (form.linkedinUrl) {
        const { data: sessionData } = await sb.auth.getSession()
        const tok = sessionData.session?.access_token
        if (tok) {
          fetch('/api/profile-builder/linkedin-enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ linkedinUrl: form.linkedinUrl }),
          }).catch(() => {})
        }
      }
      router.push('/founder/profile-builder')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: ink, letterSpacing: '-0.3px' }}>
          Edge Alpha
        </div>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1
          const done   = n < page
          const active = n === page
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: done ? blue : active ? ink : '#E2DDD5',
                  color: done || active ? '#fff' : muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  transition: 'all 0.3s',
                }}>
                  {done ? (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M1.5 5.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : n}
                </div>
                <span style={{
                  fontSize: 11, color: active ? ink : muted, fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{
                  width: 64, height: 1,
                  background: n < page ? blue : bdr,
                  margin: '-14px 8px 0',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 540,
        background: '#fff', borderRadius: 16,
        border: `1px solid ${bdr}`,
        boxShadow: '0 2px 16px rgba(24,22,15,0.06)',
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
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}
          >

            {/* Page heading */}
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: ink, margin: 0, letterSpacing: '-0.3px' }}>
                {page === 1 && 'Tell us about your company'}
                {page === 2 && 'Where are you in your journey?'}
                {page === 3 && 'Almost there — create your account'}
              </h1>
              <p style={{ fontSize: 14, color: muted, margin: '6px 0 0', lineHeight: 1.5 }}>
                {page === 1 && 'This helps us calibrate your Q-Score accurately from day one.'}
                {page === 2 && 'No judgment — honest answers give you a more useful baseline.'}
                {page === 3 && 'Your profile will be ready immediately after sign up.'}
              </p>
            </div>

            {/* ── PAGE 1 ── */}
            {page === 1 && (
              <>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                    Company name <span style={{ color: blue }}>*</span>
                  </label>
                  <TextInput
                    value={form.companyName}
                    onChange={set('companyName')}
                    placeholder="e.g. Acme Inc."
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                    Industry <span style={{ color: blue }}>*</span>
                  </label>
                  <CardGrid options={INDUSTRIES} value={form.industry} onChange={set('industry')} cols={3} />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 4 }}>
                    One-liner <span style={{ color: blue }}>*</span>
                  </label>
                  <p style={{ fontSize: 12, color: muted, margin: '0 0 8px' }}>
                    What you do in plain English — max 100 characters
                  </p>
                  <TextInput
                    value={form.description}
                    onChange={v => set('description')(v.slice(0, 100))}
                    placeholder="We help [who] do [what] without [pain]"
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: muted, marginTop: 4 }}>
                    {form.description.length}/100
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                    Website <span style={{ color: muted, fontWeight: 400 }}>(optional)</span>
                  </label>
                  <TextInput
                    value={form.website}
                    onChange={set('website')}
                    placeholder="https://"
                  />
                </div>
              </>
            )}

            {/* ── PAGE 2 ── */}
            {page === 2 && (
              <>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                    Current stage <span style={{ color: blue }}>*</span>
                  </label>
                  <CardGrid options={STAGES} value={form.stage} onChange={set('stage')} cols={1} />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                    Revenue status <span style={{ color: blue }}>*</span>
                  </label>
                  <CardGrid options={REVENUE} value={form.revenueStatus} onChange={set('revenueStatus')} cols={2} />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                    Funding status <span style={{ color: blue }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {FUNDING.map(opt => {
                      const active = form.fundingStatus === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => set('fundingStatus')(opt.value)}
                          style={{
                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                            border: `1.5px solid ${active ? blue : bdr}`,
                            background: active ? '#EFF6FF' : '#fff',
                            fontSize: 13, fontWeight: active ? 600 : 400,
                            color: active ? blue : ink, fontFamily: 'inherit',
                            transition: 'all 0.15s',
                          }}
                        >{opt.label}</button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 4 }}>
                    Team size <span style={{ color: blue }}>*</span>
                  </label>
                  <p style={{ fontSize: 12, color: muted, margin: '0 0 8px' }}>Including yourself</p>
                  <CardGrid options={TEAM} value={form.teamSize} onChange={set('teamSize')} cols={2} />
                </div>
              </>
            )}

            {/* ── PAGE 3 ── */}
            {page === 3 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                      Your full name <span style={{ color: blue }}>*</span>
                    </label>
                    <TextInput
                      value={form.founderName}
                      onChange={set('founderName')}
                      placeholder="Jane Smith"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                      LinkedIn <span style={{ color: muted, fontWeight: 400 }}>(optional)</span>
                    </label>
                    <TextInput
                      value={form.linkedinUrl}
                      onChange={set('linkedinUrl')}
                      placeholder="linkedin.com/in/…"
                      hint="Improves Q-Score accuracy"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                    How long have you been working on this problem? <span style={{ color: blue }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {YEARS.map(opt => {
                      const active = form.yearsOnProblem === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => set('yearsOnProblem')(opt.value)}
                          style={{
                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                            border: `1.5px solid ${active ? blue : bdr}`,
                            background: active ? '#EFF6FF' : '#fff',
                            fontSize: 13, fontWeight: active ? 600 : 400,
                            color: active ? blue : ink, fontFamily: 'inherit',
                            transition: 'all 0.15s',
                          }}
                        >{opt.label}</button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                    Prior startup experience <span style={{ color: blue }}>*</span>
                  </label>
                  <CardGrid options={PRIOR_EXP} value={form.priorExperience} onChange={set('priorExperience')} cols={2} />
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                  <span style={{ fontSize: 12, color: muted }}>Create your account</span>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                      Work email <span style={{ color: blue }}>*</span>
                    </label>
                    <TextInput
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@company.com"
                      type="email"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: ink, display: 'block', marginBottom: 8 }}>
                      Password <span style={{ color: blue }}>*</span>
                    </label>
                    <TextInput
                      value={form.password}
                      onChange={set('password')}
                      placeholder="Min. 8 characters"
                      type="password"
                    />
                  </div>
                </div>

                {error && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 8,
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    color: '#DC2626', fontSize: 13, lineHeight: 1.5,
                  }}>
                    {error}
                  </div>
                )}
              </>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Footer nav — outside animation so it doesn't slide */}
        <div style={{
          padding: '0 32px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {page > 1 ? (
            <button
              onClick={() => go(page - 1)}
              style={{
                padding: '10px 20px', borderRadius: 8,
                border: `1.5px solid ${bdr}`, background: 'transparent',
                fontSize: 13, color: ink, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Back
            </button>
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
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: ((page === 1 && !canNext1) || (page === 2 && !canNext2)) ? '#D1D5DB' : blue,
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
                opacity: ((page === 1 && !canNext1) || (page === 2 && !canNext2)) ? 0.5 : 1,
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                background: (!canSubmit || loading) ? '#D1D5DB' : blue,
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
                opacity: (!canSubmit || loading) ? 0.5 : 1,
              }}
            >
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          )}
        </div>
      </div>

      {/* Legal */}
      <p style={{ textAlign: 'center', fontSize: 12, color: muted, marginTop: 20, maxWidth: 360 }}>
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
