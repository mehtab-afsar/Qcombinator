'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Check, ChevronRight, Building2, TrendingUp, Lightbulb,
  UserCheck, Camera, Eye, EyeOff, ArrowLeft, Upload, X,
} from 'lucide-react'
import {
  bg, surf, bdr, ink, muted, blue,
  radius, space, font, shadow,
} from '@/features/shared/tokens'
import { PageSpinner } from '@/features/shared/components/Spinner'
import { Label } from '@/features/shared/components/Label'
import { TextInput } from '@/features/shared/components/TextInput'

// ── option data ───────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { value: 'medtech-biotech',   label: 'MedTech & Biotech',    icon: '🧬' },
  { value: 'ai-software',       label: 'AI & Software',         icon: '🤖' },
  { value: 'robotics-hardware', label: 'Robotics & Hardware',   icon: '⚙️' },
  { value: 'agri-foodtech',     label: 'Agri & Foodtech',       icon: '🌱' },
  { value: 'clean-tech',        label: 'Clean Tech',            icon: '⚡' },
]

const STAGES = [
  { value: 'product-development', label: 'Building',  sub: 'Product development & validation'  },
  { value: 'commercial',          label: 'Launching', sub: 'Early customers or pilots underway' },
  { value: 'growth-scaling',      label: 'Growing',   sub: 'Scaling revenue and team'           },
]

const REVENUE = [
  { value: 'pre-revenue',   label: 'Pre-revenue',     sub: 'No paying customers yet'     },
  { value: 'early-revenue', label: 'First revenue',   sub: 'Pilots and early customers'  },
  { value: 'recurring',     label: 'Growing revenue', sub: 'Recurring contracts or MRR'  },
]

const TEAM = [
  { value: '1-5',  label: 'Solo founder', sub: 'Just me'       },
  { value: '5-10', label: 'Small team',   sub: '2–5 people'    },
  { value: '10+',  label: 'Growing team', sub: '6+ people'     },
]

const FUNDING = [
  { value: 'bootstrapped',   label: 'Bootstrapped',      sub: 'Self-funded'            },
  { value: 'friends-family', label: 'Friends & family',  sub: 'Early personal network' },
  { value: 'angel',          label: 'Angel / Pre-seed',  sub: 'Angel investors'        },
  { value: 'vc',             label: 'VC-backed',         sub: 'Institutional capital'  },
]

// ── step config ───────────────────────────────────────────────────────────────
// New order: Account → Startup → Traction → Problem → Profile photo
const TOTAL_STEPS = 5

const STEP_CONFIGS = [
  { icon: UserCheck,  color: '#059669', title: 'Create your account',        sub: 'Join QCombinator — the platform for founder-investor intelligence.',       name: 'Account'  },
  { icon: Building2,  color: blue,      title: 'Your startup',               sub: 'This is the first thing investors see when they find your profile.',        name: 'Startup'  },
  { icon: TrendingUp, color: '#D97706', title: 'Your traction',              sub: 'Honest answers give investors a useful signal on your momentum.',           name: 'Traction' },
  { icon: Lightbulb,  color: '#7C3AED', title: 'Your problem & customer',    sub: 'The two questions every investor asks first. Be specific.',                 name: 'Problem'  },
  { icon: Camera,     color: '#0891B2', title: 'Add a face to your profile', sub: 'Optional — a photo makes your profile 3× more memorable to investors.',    name: 'Profile'  },
]

// ── animation ─────────────────────────────────────────────────────────────────
const slide = {
  enter: (dir: number) => ({ x: dir * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir * -32, opacity: 0 }),
}

// ── shared styles ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: font.size.sm,
  fontWeight: font.weight.semibold,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: muted,
  marginBottom: 6,
}

const sectionLabel: React.CSSProperties = {
  fontSize: font.size.xs,
  fontWeight: font.weight.semibold,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: muted,
  marginBottom: 8,
}

function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '12px 24px', borderRadius: radius.md, border: 'none',
    background: enabled ? ink : bdr, color: bg,
    fontSize: font.size.base, fontWeight: font.weight.semibold,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: font.family,
    boxShadow: enabled ? '0 2px 8px rgba(24,22,15,0.15)' : 'none',
    transition: 'all 0.12s',
    opacity: enabled ? 1 : 0.5,
  }
}

const backBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: radius.md,
  border: `1.5px solid ${bdr}`, background: 'transparent',
  fontSize: font.size.base, color: muted, cursor: 'pointer',
  fontFamily: font.family,
}

const ghostBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: radius.md,
  border: 'none', background: 'transparent',
  fontSize: font.size.base, color: muted, cursor: 'pointer',
  fontFamily: font.family, textDecoration: 'underline',
}

// ── sub-components ────────────────────────────────────────────────────────────
function StepProgress({ step, isMobile }: { step: number; isMobile: boolean }) {
  return (
    <div style={{ width: '100%', maxWidth: 640, margin: `0 auto ${space[5]}px` }}>
      {/* Step label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] }}>
        <span style={{ fontSize: font.size.sm, fontWeight: font.weight.semibold, color: ink }}>
          {STEP_CONFIGS[step - 1].name}
        </span>
        <span style={{ fontSize: font.size.sm, color: muted }}>
          {step} of {TOTAL_STEPS}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: bdr, borderRadius: radius.full, overflow: 'hidden', marginBottom: space[3] }}>
        <div style={{
          height: '100%',
          background: `linear-gradient(90deg, ${blue}, ${blue}CC)`,
          borderRadius: radius.full,
          width: `${(step / TOTAL_STEPS) * 100}%`,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>

      {/* Step dots with names */}
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {STEP_CONFIGS.map((cfg, i) => {
            const s = i + 1
            const done   = s < step
            const active = s === step
            return (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: done ? blue : active ? ink : surf,
                  border: `1.5px solid ${done ? blue : active ? ink : bdr}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {done
                    ? <Check size={11} color="#fff" strokeWidth={3} />
                    : <span style={{ fontSize: 10, fontWeight: 600, color: active ? bg : muted }}>{s}</span>
                  }
                </div>
                <span style={{
                  fontSize: 10, fontWeight: active ? font.weight.semibold : font.weight.normal,
                  color: active ? ink : muted,
                  whiteSpace: 'nowrap',
                }}>{cfg.name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length
  const near = len > max * 0.8
  const over = len >= max
  return (
    <span style={{ fontSize: font.size.sm, color: over ? '#DC2626' : near ? '#D97706' : muted }}>
      {len}/{max}
    </span>
  )
}

function TextArea({ value, onChange, placeholder, rows = 3, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={e => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: radius.sm,
          border: `1.5px solid ${bdr}`, background: bg,
          fontSize: font.size.md, color: ink, outline: 'none', fontFamily: font.family,
          boxSizing: 'border-box', transition: 'border-color 0.15s',
          resize: 'vertical', lineHeight: 1.6,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = blue }}
        onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
      />
      {maxLength && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <CharCount value={value} max={maxLength} />
        </div>
      )}
    </div>
  )
}

function OptionCard({ label, sub, active, onClick, icon }: {
  label: string; sub?: string; active: boolean; onClick: () => void; icon?: string
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: radius.sm + 2, cursor: 'pointer',
      border: `1.5px solid ${active ? blue : bdr}`,
      background: active ? `${blue}0D` : surf,
      fontFamily: font.family, textAlign: 'left', width: '100%',
      transition: 'all 0.12s',
      boxShadow: active ? `0 0 0 3px ${blue}18` : 'none',
    }}>
      {icon && <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: active ? blue : ink, lineHeight: 1.3 }}>{label}</div>
        {sub && <div style={{ fontSize: font.size.sm, color: muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${active ? blue : bdr}`,
        background: active ? blue : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}>
        {active && <Check size={10} color="#fff" strokeWidth={3} />}
      </div>
    </button>
  )
}

function IndustryGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {INDUSTRIES.map(o => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
              padding: '12px 14px', borderRadius: radius.sm + 2, cursor: 'pointer',
              border: `1.5px solid ${active ? blue : bdr}`,
              background: active ? `${blue}0D` : surf,
              fontFamily: font.family, textAlign: 'left',
              transition: 'all 0.12s',
              boxShadow: active ? `0 0 0 3px ${blue}18` : 'none',
              gridColumn: o.value === 'clean-tech' ? '1 / -1' : undefined,
            }}
          >
            <span style={{ fontSize: 20 }}>{o.icon}</span>
            <span style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: active ? blue : ink }}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ExampleHint({ text }: { text: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: radius.sm,
      background: `${blue}08`, border: `1px solid ${blue}20`,
      fontSize: font.size.sm, color: muted, lineHeight: 1.5,
      marginTop: 8,
    }}>
      <span style={{ fontWeight: font.weight.semibold, color: blue }}>Example: </span>
      {text}
    </div>
  )
}

// ── form state ────────────────────────────────────────────────────────────────
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

// ── Google SVG ────────────────────────────────────────────────────────────────
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

// ── main ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [page, setPage]         = useState(1)
  const [dir,  setDir]          = useState(1)
  const [form, setForm]         = useState<FormData>(EMPTY)
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Photo state — uploaded after account creation
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [logoFile,      setLogoFile]      = useState<File | null>(null)
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef   = useRef<HTMLInputElement>(null)

  const set = (key: keyof FormData) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }))

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => {
      if (data.session && !sessionStorage.getItem('ea_signup_pending')) {
        router.replace('/founder/dashboard')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Per-step validation
  const canNext1  = !!(form.founderName.trim() && form.email.trim() && form.password.length >= 8)
  const canNext2  = !!(form.companyName.trim() && form.tagline.trim() && form.industry && form.stage)
  const canNext3  = !!(form.revenueStatus && form.teamSize && form.fundingStatus)
  const canSubmit = !!(form.problemStatement.trim() && form.targetCustomer.trim())

  const canGoNext =
    page === 1 ? canNext1 :
    page === 2 ? canNext2 :
    page === 3 ? canNext3 :
    page === 4 ? canSubmit :
    true

  function go(next: number) { setDir(next > page ? 1 : -1); setPage(next); setError('') }

  function handleFileSelect(
    file: File,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    prevPreview: string | null,
  ) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return }
    setFile(file)
    if (prevPreview) URL.revokeObjectURL(prevPreview)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      // Upload avatar + logo (non-blocking — fail silently)
      await Promise.allSettled([
        avatarFile && (async () => {
          const fd = new FormData()
          fd.append('file', avatarFile)
          fd.append('imageType', 'founder-avatar')
          await fetch('/api/upload/image', { method: 'POST', body: fd })
        })(),
        logoFile && (async () => {
          const fd = new FormData()
          fd.append('file', logoFile)
          fd.append('imageType', 'company-logo')
          await fetch('/api/upload/image', { method: 'POST', body: fd })
        })(),
      ])

      sessionStorage.removeItem('ea_signup_pending')
      router.push('/founder/getting-started')
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  // Step 4 can go to 5, or submit directly — step 5 is optional so "finish" on step 4 also works
  async function handleStep4Next() {
    if (!canSubmit) return
    go(5)
  }

  async function handleFinalSubmit() {
    await handleSubmit()
  }

  if (loading) return <PageSpinner label="Setting up your workspace…" />

  const { icon: StepIcon, color: stepColor, title: stepTitle, sub: stepSub } = STEP_CONFIGS[page - 1]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: radius.sm,
    border: `1.5px solid ${bdr}`, background: surf, color: ink,
    fontSize: font.size.md, outline: 'none', boxSizing: 'border-box', fontFamily: font.family,
    transition: 'border-color 0.15s',
  }

  const initials = form.founderName.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase() || 'YO'

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: font.family, color: ink }}>

      {/* Top nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, background: bg,
        borderBottom: `1px solid ${bdr}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${space[4]}px ${space[6]}px`,
      }}>
        <span style={{ fontWeight: font.weight.bold, fontSize: font.size.md, letterSpacing: '-0.02em' }}>
          QCombinator
        </span>
        {page === 1 && (
          <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: font.size.base, color: muted, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Sign in
          </a>
        )}
        {page === 5 && (
          <a href="/investor/onboarding" style={{ fontSize: font.size.sm, color: muted, textDecoration: 'none' }}>
            Joining as an investor? →
          </a>
        )}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${space[8]}px ${isMobile ? space[3] : space[4]}px 80px` }}>

        <StepProgress step={page} isMobile={isMobile} />

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 640,
          background: surf, borderRadius: isMobile ? radius.md : radius.lg,
          border: `1px solid ${bdr}`,
          overflow: 'hidden',
          boxShadow: shadow.sm,
        }}>

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={page}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: isMobile ? `${space[5]}px ${space[4]}px 0` : `${space[8]}px ${space[8]}px 0` }}
            >

              {/* Step header */}
              <div style={{ textAlign: 'center', marginBottom: space[6] }}>
                <div style={{
                  width: 52, height: 52, borderRadius: radius.lg,
                  margin: `0 auto ${space[3]}px`,
                  background: `${stepColor}14`,
                  border: `1.5px solid ${stepColor}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <StepIcon size={22} color={stepColor} />
                </div>
                <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.bold, letterSpacing: '-0.03em', margin: `0 0 ${space[1]}px`, color: ink }}>{stepTitle}</h2>
                <p style={{ fontSize: font.size.base, color: muted, margin: 0, lineHeight: 1.6 }}>{stepSub}</p>
              </div>

              {/* ── STEP 1 — Account ── */}
              {page === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
                  {/* Google OAuth — primary */}
                  <button
                    type="button"
                    onClick={async () => {
                      const { createClient: create } = await import('@/lib/supabase/client')
                      const sb = create()
                      await sb.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: `${window.location.origin}/auth/callback` },
                      })
                    }}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: radius.sm,
                      border: `1.5px solid ${bdr}`, background: bg, color: ink,
                      fontSize: font.size.md, fontWeight: font.weight.semibold,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 10, fontFamily: font.family,
                      boxShadow: shadow.sm, transition: 'box-shadow 0.12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = shadow.md }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = shadow.sm }}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                    <div style={{ flex: 1, height: 1, background: bdr }} />
                    <span style={{ fontSize: font.size.xs, color: muted, whiteSpace: 'nowrap' }}>or sign up with email</span>
                    <div style={{ flex: 1, height: 1, background: bdr }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
                    <div>
                      <label style={labelStyle}>Full name</label>
                      <input style={inputStyle} type="text" value={form.founderName}
                        onChange={e => set('founderName')(e.target.value)}
                        placeholder="Jane Smith" autoFocus
                        onFocus={e => { e.currentTarget.style.borderColor = blue }}
                        onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Work email</label>
                      <input style={inputStyle} type="email" value={form.email}
                        onChange={e => set('email')(e.target.value)}
                        placeholder="you@company.com"
                        onFocus={e => { e.currentTarget.style.borderColor = blue }}
                        onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Password</label>
                      <div style={{ position: 'relative' }}>
                        <input style={{ ...inputStyle, paddingRight: 44 }}
                          type={showPwd ? 'text' : 'password'} value={form.password}
                          onChange={e => set('password')(e.target.value)}
                          placeholder="Min. 8 characters"
                          onFocus={e => { e.currentTarget.style.borderColor = blue }}
                          onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                        />
                        <button type="button" onClick={() => setShowPwd(v => !v)}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0 }}>
                          {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {form.password.length > 0 && form.password.length < 8 && (
                        <p style={{ fontSize: font.size.sm, color: '#D97706', marginTop: 4, margin: '4px 0 0' }}>
                          {8 - form.password.length} more characters needed
                        </p>
                      )}
                    </div>
                  </div>

                  {error && <p style={{ fontSize: font.size.base, color: '#DC2626', margin: 0 }}>{error}</p>}

                  <p style={{ fontSize: font.size.sm, color: muted, margin: `${space[2]}px 0 0`, textAlign: 'center' }}>
                    Joining as an investor?{' '}
                    <a href="/investor/onboarding" style={{ color: blue, textDecoration: 'none', fontWeight: font.weight.medium }}>
                      Sign up here →
                    </a>
                  </p>
                </div>
              )}

              {/* ── STEP 2 — Startup ── */}
              {page === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>
                  <div>
                    <label style={labelStyle}>Company name</label>
                    <input style={inputStyle} type="text" value={form.companyName}
                      onChange={e => set('companyName')(e.target.value)}
                      placeholder="e.g. Acme Inc." autoFocus
                      onFocus={e => { e.currentTarget.style.borderColor = blue }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>One-line pitch</label>
                      <CharCount value={form.tagline} max={140} />
                    </div>
                    <input
                      style={inputStyle}
                      type="text"
                      value={form.tagline}
                      onChange={e => set('tagline')(e.target.value.slice(0, 140))}
                      placeholder="We help [who] do [what] using [how]"
                      onFocus={e => { e.currentTarget.style.borderColor = blue }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                    />
                    <ExampleHint text='"We help hospital labs eliminate manual reporting using AI-powered result capture."' />
                  </div>

                  <div>
                    <label style={sectionLabel}>Industry / Sector</label>
                    <IndustryGrid value={form.industry} onChange={set('industry')} />
                  </div>

                  <div>
                    <label style={sectionLabel}>Stage</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {STAGES.map(o => (
                        <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.stage === o.value} onClick={() => set('stage')(o.value)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3 — Traction ── */}
              {page === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[6] }}>
                  <div>
                    <label style={sectionLabel}>Revenue</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {REVENUE.map(o => (
                        <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.revenueStatus === o.value} onClick={() => set('revenueStatus')(o.value)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={sectionLabel}>Team size</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {TEAM.map(o => (
                        <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.teamSize === o.value} onClick={() => set('teamSize')(o.value)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={sectionLabel}>Funding status</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {FUNDING.map(o => (
                        <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.fundingStatus === o.value} onClick={() => set('fundingStatus')(o.value)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 4 — Problem & Customer ── */}
              {page === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>
                  <div>
                    <label style={labelStyle}>What problem are you solving?</label>
                    <TextArea
                      value={form.problemStatement}
                      onChange={set('problemStatement')}
                      placeholder="Describe the specific pain point in 2–3 sentences. Be concrete."
                      rows={4}
                      maxLength={300}
                    />
                    <ExampleHint text='"Hospital labs lose 3–4 hours/day manually logging results across 5 disconnected systems, causing reporting delays and compliance risk."' />
                  </div>

                  <div>
                    <label style={labelStyle}>Who has this problem most acutely?</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...inputStyle, paddingRight: 70 }}
                        type="text"
                        value={form.targetCustomer}
                        onChange={e => set('targetCustomer')(e.target.value.slice(0, 200))}
                        placeholder="e.g. Head of Lab Operations at mid-size hospitals (100–500 beds)"
                        onFocus={e => { e.currentTarget.style.borderColor = blue }}
                        onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                      />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <CharCount value={form.targetCustomer} max={200} />
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        Location <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                      </label>
                    </div>
                    <input
                      style={inputStyle} type="text"
                      value={form.location}
                      onChange={e => set('location')(e.target.value)}
                      placeholder="e.g. London, UK"
                      onFocus={e => { e.currentTarget.style.borderColor = blue }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                    />
                    <p style={{ fontSize: font.size.sm, color: muted, marginTop: 4 }}>
                      Investors sometimes filter by region.
                    </p>
                  </div>

                  {error && (
                    <div style={{ padding: '11px 14px', borderRadius: radius.sm, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: font.size.base }}>
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 5 — Profile photo + company logo ── */}
              {page === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[6] }}>
                  {/* Profile photo */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space[3] }}>
                    <label style={sectionLabel}>Your photo</label>
                    <div style={{ position: 'relative' }}>
                      <label
                        htmlFor="founder-avatar-input"
                        style={{ display: 'block', cursor: 'pointer' }}
                      >
                        <div style={{
                          width: 96, height: 96, borderRadius: '50%',
                          border: `2px dashed ${avatarPreview ? blue : bdr}`,
                          background: avatarPreview ? 'transparent' : `${blue}08`,
                          overflow: 'hidden',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'border-color 0.15s',
                          position: 'relative',
                        }}>
                          {avatarPreview ? (
                            <Image src={avatarPreview} alt="Avatar preview" fill style={{ objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: 28, fontWeight: 700, color: blue, letterSpacing: '-0.02em' }}>{initials}</span>
                          )}
                          <div
                            style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.3)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'   }}
                          >
                            <Camera size={20} color="#fff" />
                          </div>
                        </div>
                      </label>
                      {avatarPreview && (
                        <button
                          onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                          style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        >
                          <X size={10} color="#fff" strokeWidth={3} />
                        </button>
                      )}
                    </div>
                    <input id="founder-avatar-input" ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, setAvatarFile, setAvatarPreview, avatarPreview); e.target.value = '' }}
                      style={{ display: 'none' }} />
                    <p style={{ fontSize: font.size.sm, color: avatarPreview ? '#059669' : muted, fontWeight: avatarPreview ? font.weight.medium : font.weight.normal, margin: 0, textAlign: 'center' }}>
                      {avatarPreview ? '✓ Photo selected' : 'Click to upload · JPG or PNG, max 5MB'}
                    </p>
                  </div>

                  <div style={{ height: 1, background: bdr }} />

                  {/* Company logo */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[3] }}>
                      <label style={{ ...sectionLabel, marginBottom: 0 }}>Company logo</label>
                      <span style={{ fontSize: font.size.sm, color: muted }}>optional</span>
                    </div>

                    {logoPreview ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: '12px 14px', borderRadius: radius.sm, border: `1.5px solid ${blue}`, background: `${blue}08` }}>
                        <div style={{ width: 40, height: 40, borderRadius: radius.sm, overflow: 'hidden', flexShrink: 0, border: `1px solid ${bdr}`, position: 'relative' }}>
                          <Image src={logoPreview} alt="Logo" fill style={{ objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: font.size.sm, fontWeight: font.weight.semibold, color: '#059669', margin: 0 }}>✓ Logo uploaded</p>
                          <p style={{ fontSize: font.size.sm, color: muted, margin: '2px 0 0' }}>{logoFile?.name}</p>
                        </div>
                        <button onClick={() => { setLogoFile(null); setLogoPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="founder-logo-input" style={{ display: 'block', cursor: 'pointer' }}>
                        <div style={{
                          padding: '20px 14px', borderRadius: radius.sm,
                          border: `1.5px dashed ${bdr}`, background: surf,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space[2],
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = blue; (e.currentTarget as HTMLDivElement).style.background = `${blue}06` }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = bdr;  (e.currentTarget as HTMLDivElement).style.background = surf }}
                        >
                          <Upload size={20} color={muted} />
                          <p style={{ fontSize: font.size.base, color: muted, margin: 0, textAlign: 'center' }}>
                            Drag & drop or <span style={{ color: blue, fontWeight: font.weight.medium }}>click to browse</span>
                          </p>
                          <p style={{ fontSize: font.size.sm, color: muted, margin: 0 }}>JPG, PNG · max 5MB</p>
                        </div>
                      </label>
                    )}
                    <input id="founder-logo-input" ref={logoInputRef} type="file" accept="image/jpeg,image/png"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, setLogoFile, setLogoPreview, logoPreview); e.target.value = '' }}
                      style={{ display: 'none' }} />
                  </div>

                  {error && (
                    <div style={{ padding: '11px 14px', borderRadius: radius.sm, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: font.size.base }}>
                      {error}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Nav footer */}
          <div style={{
            padding: isMobile ? `${space[4]}px ${space[4]}px ${space[4] + 4}px` : `${space[6]}px ${space[8]}px ${space[6] + 4}px`,
            display: 'flex',
            justifyContent: page === 1 ? 'flex-end' : 'space-between',
            alignItems: 'center',
          }}>
            {page > 1 && (
              <button onClick={() => go(page - 1)} style={backBtn}>← Back</button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
              {/* Step 5: skip option */}
              {page === 5 && (
                <button onClick={handleFinalSubmit} style={ghostBtn}>
                  Skip
                </button>
              )}

              {page < 4 ? (
                <button onClick={() => go(page + 1)} disabled={!canGoNext} style={primaryBtn(canGoNext)}>
                  Continue <ChevronRight size={14} />
                </button>
              ) : page === 4 ? (
                <button onClick={handleStep4Next} disabled={!canSubmit} style={primaryBtn(canSubmit)}>
                  Continue <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleFinalSubmit} style={primaryBtn(true)}>
                  Launch my profile <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: font.size.sm, color: muted, marginTop: space[5] }}>
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
