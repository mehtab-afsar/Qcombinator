'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Check, ChevronRight, ArrowLeft, Camera, Eye, EyeOff, Upload, X,
} from 'lucide-react'
import { ink, muted, blue } from '@/lib/constants/colors'
import { Loader2 } from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const PAGE_BG      = '#F9F7F2'
const CARD_BG      = '#ffffff'
const CARD_BORDER  = 'rgba(0,0,0,0.09)'
const CARD_SHADOW  = '0 12px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.05)'
const INPUT_BORDER = 'rgba(0,0,0,0.13)'
const SEP          = 'rgba(0,0,0,0.07)'
const LABEL_COLOR  = '#6B6560'
const f            = { family: 'system-ui, -apple-system, sans-serif' }

// ── Option data ───────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { value: 'medtech-biotech',   label: 'MedTech & Biotech',   sub: 'Pharma, diagnostics, life science' },
  { value: 'ai-software',       label: 'AI & Software',        sub: 'Enterprise SaaS, AI-native products' },
  { value: 'robotics-hardware', label: 'Robotics & Hardware',  sub: 'Physical systems, industrial tech'  },
  { value: 'agri-foodtech',     label: 'Agri & Foodtech',      sub: 'Food systems, supply chain, biotech' },
  { value: 'clean-tech',        label: 'Clean Tech',           sub: 'Climate, energy, sustainability'    },
]

const STAGES = [
  { value: 'product-development', label: 'Building',  sub: 'Product development & validation'  },
  { value: 'commercial',          label: 'Launching', sub: 'Early customers or pilots underway' },
  { value: 'growth-scaling',      label: 'Growing',   sub: 'Scaling revenue and team'           },
]

const REVENUE = [
  { value: 'pre-revenue',   label: 'Pre-revenue',     sub: 'No paying customers yet'   },
  { value: 'early-revenue', label: 'First revenue',   sub: 'Pilots and early customers' },
  { value: 'recurring',     label: 'Growing revenue', sub: 'Recurring contracts or MRR' },
]

const TEAM = [
  { value: '1-5',  label: 'Solo founder', sub: 'Just me'    },
  { value: '5-10', label: 'Small team',   sub: '2–5 people' },
  { value: '10+',  label: 'Growing team', sub: '6+ people'  },
]

const FUNDING = [
  { value: 'bootstrapped',   label: 'Bootstrapped',     sub: 'Self-funded'            },
  { value: 'friends-family', label: 'Friends & family', sub: 'Early personal network' },
  { value: 'angel',          label: 'Angel / Pre-seed', sub: 'Angel investors'        },
  { value: 'vc',             label: 'VC-backed',        sub: 'Institutional capital'  },
]

const STEPS = [
  { name: 'Account',  title: 'Create your account',      sub: 'Join QCombinator — the platform for founder-investor intelligence.'  },
  { name: 'Startup',  title: 'Your startup',             sub: 'This is the first thing investors see on your profile.'              },
  { name: 'Traction', title: 'Your traction',            sub: 'Honest answers give investors a useful signal on your momentum.'      },
  { name: 'Problem',  title: 'Your problem & customer',  sub: 'The two questions every investor asks first. Be specific.'           },
  { name: 'Profile',  title: 'Add a face to your profile', sub: 'Optional — a photo makes your profile 3× more memorable.'         },
]
const TOTAL = STEPS.length

// ── Slide animation ───────────────────────────────────────────────────────────
const slide = {
  enter: (d: number) => ({ x: d * 20, opacity: 0, scale: 0.99 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit:   (d: number) => ({ x: d * -20, opacity: 0, scale: 0.99 }),
}

// ── Form state ────────────────────────────────────────────────────────────────
interface FormData {
  founderName: string; email: string; password: string
  companyName: string; tagline: string; industry: string; stage: string
  revenueStatus: string; teamSize: string; fundingStatus: string
  problemStatement: string; targetCustomer: string; location: string
}
const EMPTY: FormData = {
  founderName: '', email: '', password: '',
  companyName: '', tagline: '', industry: '', stage: '',
  revenueStatus: '', teamSize: '', fundingStatus: '',
  problemStatement: '', targetCustomer: '', location: '',
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: LABEL_COLOR, marginBottom: 6, fontFamily: f.family }}>
      {children}
      {optional && <span style={{ fontWeight: 400, color: muted, marginLeft: 4 }}>(optional)</span>}
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, fontFamily: f.family }}>
      {children}
    </p>
  )
}

function Input({ value, onChange, type = 'text', placeholder, autoFocus, maxLength, right }: {
  value: string; onChange: (v: string) => void; type?: string
  placeholder?: string; autoFocus?: boolean; maxLength?: number; right?: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: '100%', height: 42, padding: right ? '0 44px 0 14px' : '0 14px',
          border: `1px solid ${INPUT_BORDER}`, borderRadius: 8,
          fontSize: 14, color: ink, outline: 'none', background: CARD_BG,
          boxSizing: 'border-box', fontFamily: f.family,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = ink
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,22,15,0.08)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = INPUT_BORDER
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {right && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          {right}
        </div>
      )}
    </div>
  )
}

function TextArea({ value, onChange, placeholder, rows = 4, maxLength }: {
  value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number; maxLength?: number
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={e => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', padding: '10px 14px',
          border: `1px solid ${INPUT_BORDER}`, borderRadius: 8,
          fontSize: 14, color: ink, outline: 'none', background: CARD_BG,
          boxSizing: 'border-box', fontFamily: f.family, resize: 'vertical', lineHeight: 1.6,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = ink
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,22,15,0.08)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = INPUT_BORDER
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {maxLength && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: value.length > maxLength * 0.8 ? '#D97706' : muted }}>
            {value.length}/{maxLength}
          </span>
        </div>
      )}
    </div>
  )
}

function SelectCard({ label, sub, active, onClick, icon }: {
  label: string; sub?: string; active: boolean; onClick: () => void; icon?: string
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 16px', width: '100%',
      border: `1.5px solid ${active ? ink : 'rgba(0,0,0,0.1)'}`,
      borderRadius: 10, cursor: 'pointer', textAlign: 'left',
      background: active ? 'rgba(24,22,15,0.03)' : CARD_BG,
      boxShadow: active ? '0 0 0 3px rgba(24,22,15,0.06)' : 'none',
      fontFamily: f.family, transition: 'all 0.12s',
    }}>
      {icon && <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${active ? ink : 'rgba(0,0,0,0.2)'}`,
        background: active ? ink : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}>
        {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
      </div>
    </button>
  )
}

function Hint({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: '#F5F3F0', border: '1px solid rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
        <strong style={{ color: LABEL_COLOR, fontWeight: 600 }}>Example:</strong>{' '}{text}
      </span>
    </div>
  )
}

// ── Step progress (outside card) ──────────────────────────────────────────────
function StepProgress({ step }: { step: number }) {
  return (
    <div style={{ maxWidth: 580, margin: '0 auto 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {STEPS.map((cfg, i) => {
          const s = i + 1
          const done   = s < step
          const active = s === step
          return (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: s < TOTAL ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: done ? ink : active ? ink : CARD_BG,
                  border: `2px solid ${done || active ? ink : 'rgba(0,0,0,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: active ? '0 0 0 4px rgba(24,22,15,0.1)' : 'none',
                }}>
                  {done
                    ? <Check size={12} color="#fff" strokeWidth={3} />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : muted }}>{s}</span>
                  }
                </div>
                {s < TOTAL && (
                  <div style={{ flex: 1, height: 1.5, background: done ? ink : 'rgba(0,0,0,0.1)', transition: 'background 0.3s' }} />
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? ink : muted, marginTop: 6, whiteSpace: 'nowrap' }}>
                {cfg.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [page,      setPage]      = useState(1)
  const [dir,       setDir]       = useState(1)
  const [form,      setForm]      = useState<FormData>(EMPTY)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [isMobile,  setIsMobile]  = useState(false)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [logoFile,      setLogoFile]      = useState<File | null>(null)
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const logoRef   = useRef<HTMLInputElement>(null)

  const set = (k: keyof FormData) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => {
      if (data.session && !sessionStorage.getItem('ea_signup_pending'))
        router.replace('/founder/dashboard')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const canNext1  = !!(form.founderName.trim() && form.email.trim() && form.password.length >= 8)
  const canNext2  = !!(form.companyName.trim() && form.tagline.trim() && form.industry && form.stage)
  const canNext3  = !!(form.revenueStatus && form.teamSize && form.fundingStatus)
  const canSubmit = !!(form.problemStatement.trim() && form.targetCustomer.trim())
  const canGoNext = page === 1 ? canNext1 : page === 2 ? canNext2 : page === 3 ? canNext3 : page === 4 ? canSubmit : true

  function go(n: number) { setDir(n > page ? 1 : -1); setPage(n); setError('') }

  function pickFile(file: File, setF: (f: File | null) => void, setPrev: (s: string | null) => void, prev: string | null) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return }
    setF(file); if (prev) URL.revokeObjectURL(prev); setPrev(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(), password: form.password, fullName: form.founderName.trim(),
          companyName: form.companyName, industry: form.industry, stage: form.stage,
          revenueStatus: form.revenueStatus, fundingStatus: form.fundingStatus,
          teamSize: form.teamSize, founderName: form.founderName,
          problemStatement: form.problemStatement, targetCustomer: form.targetCustomer,
          location: form.location, tagline: form.tagline,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Sign up failed.'); setLoading(false); return }
      sessionStorage.setItem('ea_signup_pending', '1')
      const sb = createClient()
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (signInErr) { setError('Account created but sign-in failed. Please log in.'); setLoading(false); return }
      await Promise.allSettled([
        avatarFile && (async () => { const fd = new FormData(); fd.append('file', avatarFile); fd.append('imageType', 'founder-avatar'); await fetch('/api/upload/image', { method: 'POST', body: fd }) })(),
        logoFile   && (async () => { const fd = new FormData(); fd.append('file', logoFile);   fd.append('imageType', 'company-logo');   await fetch('/api/upload/image', { method: 'POST', body: fd }) })(),
      ])
      sessionStorage.removeItem('ea_signup_pending')
      router.push('/founder/getting-started')
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  async function handleStep4Next() { if (canSubmit) go(5) }
  async function handleFinalSubmit() { await handleSubmit() }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, fontFamily: f.family }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2.5px solid ${ink}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      </div>
      <p style={{ fontSize: 14, color: muted, margin: 0 }}>Setting up your workspace…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const px = isMobile ? 20 : 32

  const initials = form.founderName.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase() || 'YO'

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: f.family, color: ink }}>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, background: PAGE_BG,
        borderBottom: `1px solid ${SEP}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `14px ${isMobile ? 20 : 32}px`,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, background: ink, color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em' }}>
          QCombinator
        </div>
        <div style={{ display: 'inline-flex', gap: 8, padding: 4, background: '#f0ede7', borderRadius: 8 }}>
          <button style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#fff', color: ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: f.family }}>Founder</button>
          <button onClick={() => router.push('/investor/onboarding')} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'transparent', color: muted, fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: f.family, transition: 'all .2s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ink; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = muted; }}>Investor</button>
        </div>
        {page === 1 && (
          <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: muted, textDecoration: 'none' }}>
            <ArrowLeft size={13} /> Sign in
          </a>
        )}
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `40px ${isMobile ? 16 : 24}px 80px` }}>

        <StepProgress step={page} />

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 560,
          background: CARD_BG, borderRadius: 16,
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: CARD_SHADOW,
        }}>

          {/* Step header */}
          <div style={{ padding: `28px ${px}px 24px`, borderBottom: `1px solid ${SEP}`, textAlign: 'center' }}>
            <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em', color: ink, margin: '0 0 6px' }}>
              {STEPS[page - 1].title}
            </h2>
            <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.6 }}>
              {STEPS[page - 1].sub}
            </p>
          </div>

          {/* Form body */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={page}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: `24px ${px}px 0`, display: 'flex', flexDirection: 'column', gap: 18 }}
            >

              {/* ── STEP 1 — Account ── */}
              {page === 1 && (<>
                {/* Google OAuth */}
                <button
                  onClick={async () => {
                    const { createClient: c } = await import('@/lib/supabase/client')
                    await c().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
                  }}
                  style={{
                    width: '100%', height: 44, borderRadius: 10,
                    border: `1px solid ${INPUT_BORDER}`, background: CARD_BG, color: ink,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontFamily: f.family, transition: 'background 0.12s, box-shadow 0.12s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fafafa'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = CARD_BG;   (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <GoogleIcon /> Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: SEP }} />
                  <span style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>or sign up with email</span>
                  <div style={{ flex: 1, height: 1, background: SEP }} />
                </div>

                <div>
                  <Label>Full name</Label>
                  <Input value={form.founderName} onChange={set('founderName')} placeholder="Jane Smith" autoFocus />
                </div>
                <div>
                  <Label>Work email</Label>
                  <Input value={form.email} onChange={set('email')} type="email" placeholder="you@company.com" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    value={form.password} onChange={set('password')}
                    type={showPwd ? 'text' : 'password'} placeholder="Min. 8 characters"
                    right={
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, display: 'flex' }}>
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />
                  {form.password.length > 0 && form.password.length < 8 && (
                    <p style={{ fontSize: 12, color: '#D97706', marginTop: 5 }}>
                      {8 - form.password.length} more characters needed
                    </p>
                  )}
                </div>

                {error && <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>}

              </>)}

              {/* ── STEP 2 — Startup ── */}
              {page === 2 && (<>
                <div>
                  <Label>Company name</Label>
                  <Input value={form.companyName} onChange={set('companyName')} placeholder="e.g. Acme Inc." autoFocus />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <Label>One-line pitch</Label>
                    <span style={{ fontSize: 11, color: form.tagline.length > 112 ? '#D97706' : muted }}>{form.tagline.length}/140</span>
                  </div>
                  <Input value={form.tagline} onChange={set('tagline')} placeholder="We help [who] do [what] using [how]" maxLength={140} />
                  <Hint text='"We help hospital labs eliminate manual reporting using AI-powered result capture."' />
                </div>
                <div>
                  <SectionTitle>Industry</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {INDUSTRIES.map(o => (
                      <SelectCard key={o.value} label={o.label} sub={o.sub} active={form.industry === o.value} onClick={() => set('industry')(o.value)} />
                    ))}
                  </div>
                </div>
                <div>
                  <SectionTitle>Stage</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {STAGES.map(o => (
                      <SelectCard key={o.value} label={o.label} sub={o.sub} active={form.stage === o.value} onClick={() => set('stage')(o.value)} />
                    ))}
                  </div>
                </div>
              </>)}

              {/* ── STEP 3 — Traction ── */}
              {page === 3 && (<>
                <div>
                  <SectionTitle>Revenue</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {REVENUE.map(o => (
                      <SelectCard key={o.value} label={o.label} sub={o.sub} active={form.revenueStatus === o.value} onClick={() => set('revenueStatus')(o.value)} />
                    ))}
                  </div>
                </div>
                <div>
                  <SectionTitle>Team size</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {TEAM.map(o => (
                      <SelectCard key={o.value} label={o.label} sub={o.sub} active={form.teamSize === o.value} onClick={() => set('teamSize')(o.value)} />
                    ))}
                  </div>
                </div>
                <div>
                  <SectionTitle>Funding status</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {FUNDING.map(o => (
                      <SelectCard key={o.value} label={o.label} sub={o.sub} active={form.fundingStatus === o.value} onClick={() => set('fundingStatus')(o.value)} />
                    ))}
                  </div>
                </div>
              </>)}

              {/* ── STEP 4 — Problem ── */}
              {page === 4 && (<>
                <div>
                  <Label>What problem are you solving?</Label>
                  <TextArea
                    value={form.problemStatement} onChange={set('problemStatement')}
                    placeholder="Describe the specific pain point in 2–3 sentences. Be concrete." rows={4} maxLength={300}
                  />
                  <Hint text='"Hospital labs lose 3–4 hours/day manually logging results across 5 disconnected systems, causing reporting delays and compliance risk."' />
                </div>
                <div>
                  <Label>Who has this problem most acutely?</Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      value={form.targetCustomer} onChange={set('targetCustomer')}
                      placeholder="e.g. Head of Lab Operations at mid-size hospitals (100–500 beds)"
                      maxLength={200}
                    />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: form.targetCustomer.length > 160 ? '#D97706' : muted, pointerEvents: 'none' }}>
                      {form.targetCustomer.length}/200
                    </span>
                  </div>
                </div>
                <div>
                  <Label optional>Location</Label>
                  <Input value={form.location} onChange={set('location')} placeholder="e.g. London, UK" />
                  <p style={{ fontSize: 11, color: muted, marginTop: 5 }}>Investors sometimes filter by region.</p>
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
                    {error}
                  </div>
                )}
              </>)}

              {/* ── STEP 5 — Profile ── */}
              {page === 5 && (<>
                {/* Avatar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Label>Profile photo</Label>
                  <div style={{ position: 'relative' }}>
                    <label htmlFor="av-input" style={{ display: 'block', cursor: 'pointer' }}>
                      <div style={{
                        width: 88, height: 88, borderRadius: '50%',
                        border: `2px dashed ${avatarPreview ? ink : 'rgba(0,0,0,0.2)'}`,
                        background: avatarPreview ? 'transparent' : '#F5F3F0',
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', transition: 'border-color 0.15s',
                      }}>
                        {avatarPreview
                          ? <Image src={avatarPreview} alt="Avatar" fill style={{ objectFit: 'cover' }} />
                          : <span style={{ fontSize: 26, fontWeight: 700, color: muted, letterSpacing: '-0.02em' }}>{initials}</span>
                        }
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.28)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)' }}
                        >
                          <Camera size={18} color="#fff" />
                        </div>
                      </div>
                    </label>
                    {avatarPreview && (
                      <button onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                        style={{ position: 'absolute', top: -3, right: -3, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                        <X size={10} color="#fff" strokeWidth={3} />
                      </button>
                    )}
                    <input id="av-input" ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f, setAvatarFile, setAvatarPreview, avatarPreview); e.target.value = '' }} />
                  </div>
                  <p style={{ fontSize: 12, color: avatarPreview ? '#059669' : muted, fontWeight: avatarPreview ? 600 : 400 }}>
                    {avatarPreview ? '✓ Photo selected' : 'Click to upload · JPG or PNG, max 5MB'}
                  </p>
                </div>

                <div style={{ height: 1, background: SEP }} />

                {/* Logo */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Label>Company logo</Label>
                    <span style={{ fontSize: 11, color: muted }}>optional</span>
                  </div>
                  {logoPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${ink}`, background: 'rgba(24,22,15,0.03)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${SEP}`, position: 'relative' }}>
                        <Image src={logoPreview} alt="Logo" fill style={{ objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', margin: 0 }}>✓ Logo uploaded</p>
                        <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>{logoFile?.name}</p>
                      </div>
                      <button onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="logo-input" style={{ display: 'block', cursor: 'pointer' }}>
                      <div style={{ padding: '20px 14px', borderRadius: 10, border: `1.5px dashed rgba(0,0,0,0.15)`, background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.3)'; (e.currentTarget as HTMLDivElement).style.background = '#F5F3F0' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.15)'; (e.currentTarget as HTMLDivElement).style.background = '#FAFAF8' }}
                      >
                        <Upload size={18} color={muted} />
                        <p style={{ fontSize: 13, color: muted, margin: 0 }}>
                          Drag & drop or <span style={{ color: ink, fontWeight: 600 }}>click to browse</span>
                        </p>
                        <p style={{ fontSize: 11, color: muted, margin: 0 }}>JPG, PNG · max 5MB</p>
                      </div>
                    </label>
                  )}
                  <input id="logo-input" ref={logoRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f, setLogoFile, setLogoPreview, logoPreview); e.target.value = '' }} />
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
                    {error}
                  </div>
                )}
              </>)}

            </motion.div>
          </AnimatePresence>

          {/* Footer nav */}
          <div style={{ padding: `20px ${px}px 28px`, marginTop: 20 }}>
            {/* Back link */}
            {page > 1 && (
              <button onClick={() => go(page - 1)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, padding: 0, fontFamily: f.family }}>
                <ArrowLeft size={13} /> Back to {STEPS[page - 2].name}
              </button>
            )}

            {/* Primary action */}
            {page === 1 && (
              <button onClick={() => canNext1 && go(2)} disabled={!canNext1} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: canNext1 ? ink : 'rgba(0,0,0,0.18)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: canNext1 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em', transition: 'background 0.15s',
              }}>
                Continue <ChevronRight size={15} />
              </button>
            )}
            {page === 2 && (
              <button onClick={() => canNext2 && go(3)} disabled={!canNext2} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: canNext2 ? ink : 'rgba(0,0,0,0.18)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: canNext2 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em', transition: 'background 0.15s',
              }}>
                Continue <ChevronRight size={15} />
              </button>
            )}
            {page === 3 && (
              <button onClick={() => canNext3 && go(4)} disabled={!canNext3} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: canNext3 ? ink : 'rgba(0,0,0,0.18)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: canNext3 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em', transition: 'background 0.15s',
              }}>
                Continue <ChevronRight size={15} />
              </button>
            )}
            {page === 4 && (
              <button onClick={handleStep4Next} disabled={!canSubmit} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: canSubmit ? ink : 'rgba(0,0,0,0.18)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em', transition: 'background 0.15s',
              }}>
                Continue <ChevronRight size={15} />
              </button>
            )}
            {page === 5 && (
              <button onClick={handleFinalSubmit} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: ink, color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em',
              }}>
                Launch my profile
              </button>
            )}

            {page === 5 && (
              <button onClick={handleFinalSubmit} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', fontSize: 13, color: muted, cursor: 'pointer', textDecoration: 'underline', fontFamily: f.family }}>
                Skip for now
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: muted, marginTop: 20 }}>
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
