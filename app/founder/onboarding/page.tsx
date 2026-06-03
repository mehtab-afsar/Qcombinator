'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Check, ChevronRight, Building2, TrendingUp, Lightbulb,
  UserCheck, Camera, Eye, EyeOff, ArrowLeft,
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
  { value: 'medtech-biotech',   label: 'Medtech / Biotech'  },
  { value: 'ai-software',       label: 'AI & Software'       },
  { value: 'robotics-hardware', label: 'Robotics & Hardware' },
  { value: 'agri-foodtech',     label: 'Agri- & Foodtech'    },
  { value: 'clean-tech',        label: 'Clean Tech'          },
]

const STAGES = [
  { value: 'product-development', label: 'Product Development', sub: 'Building or validating the product' },
  { value: 'commercial',          label: 'Commercial',          sub: 'Early customers or pilots underway'  },
  { value: 'growth-scaling',      label: 'Growth / Scaling',    sub: 'Scaling revenue and team'            },
]

const REVENUE = [
  { value: 'pre-revenue',   label: 'Pre-revenue',            sub: 'No paying customers yet'      },
  { value: 'early-revenue', label: 'Early revenue (pilots)', sub: 'First paying customers'        },
  { value: 'recurring',     label: 'Recurring revenues',     sub: 'Signed contracts or SaaS MRR'  },
]

const TEAM = [
  { value: '1-5',  label: '1–5'  },
  { value: '5-10', label: '5–10' },
  { value: '10+',  label: '10+'  },
]

const FUNDING = [
  { value: 'bootstrapped',   label: 'Bootstrapped'     },
  { value: 'friends-family', label: 'Friends & family' },
  { value: 'angel',          label: 'Angel investors'  },
  { value: 'vc',             label: 'VC'               },
]

// ── step config ───────────────────────────────────────────────────────────────
const TOTAL_STEPS = 5

const STEP_CONFIGS = [
  { icon: UserCheck,  color: '#059669', title: 'Tell us about yourself',   sub: 'Create your Edge Alpha account in 30 seconds.'                 },
  { icon: Camera,     color: '#0891B2', title: 'Add your photo',           sub: 'A face makes your profile 3× more memorable. Optional.'        },
  { icon: Building2,  color: blue,      title: 'Your startup',             sub: 'This calibrates your Q-Score from day one.'                    },
  { icon: TrendingUp, color: '#D97706', title: 'Traction & team',          sub: 'Honest answers give you a more useful baseline.'               },
  { icon: Lightbulb,  color: '#7C3AED', title: 'The problem you\'re solving', sub: "Help investors understand exactly who you're building for." },
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

// ── sub-components ────────────────────────────────────────────────────────────
function ProgressDots({ step }: { step: number }) {
  return (
    <div style={{ width: '100%', maxWidth: 640, margin: `0 auto ${space[5]}px` }}>
      <div style={{ height: 3, background: bdr, borderRadius: radius.full, overflow: 'hidden', marginBottom: space[3] }}>
        <div style={{
          height: '100%', background: blue, borderRadius: radius.full,
          width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`,
          transition: 'width 0.25s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const s = i + 1
          const done   = s < step
          const active = s === step
          return (
            <div key={s} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: done ? blue : active ? ink : surf,
              border: `1.5px solid ${done ? blue : active ? ink : bdr}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {done
                ? <Check size={12} color="#fff" strokeWidth={3} />
                : <span style={{ fontSize: 11, fontWeight: 600, color: active ? bg : muted }}>{s}</span>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: radius.sm,
        border: `1.5px solid ${bdr}`, background: bg,
        fontSize: font.size.md, color: ink, outline: 'none', fontFamily: font.family,
        boxSizing: 'border-box', transition: 'border-color 0.15s',
        resize: 'vertical', lineHeight: 1.5,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = blue }}
      onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
    />
  )
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: radius.sm, cursor: 'pointer',
      border: `1.5px solid ${active ? blue : bdr}`,
      background: active ? `${blue}12` : surf,
      fontSize: font.size.base, fontWeight: active ? font.weight.semibold : font.weight.normal,
      color: active ? blue : ink, fontFamily: font.family,
      transition: 'all 0.12s',
    }}>{label}</button>
  )
}

function OptionCard({ label, sub, active, onClick }: {
  label: string; sub?: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px', borderRadius: radius.sm + 3, cursor: 'pointer',
      border: `1.5px solid ${active ? blue : bdr}`,
      background: active ? `${blue}0D` : surf,
      fontFamily: font.family, textAlign: 'left', width: '100%',
      transition: 'all 0.12s',
    }}>
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

// ── form state ────────────────────────────────────────────────────────────────
interface FormData {
  founderName: string; email: string; password: string
  companyName: string; website: string; industry: string; stage: string
  revenueStatus: string; fundingStatus: string; teamSize: string
  problemStatement: string; targetCustomer: string; location: string; tagline: string
}

const EMPTY: FormData = {
  founderName: '', email: '', password: '',
  companyName: '', website: '', industry: '', stage: '',
  revenueStatus: '', fundingStatus: '', teamSize: '',
  problemStatement: '', targetCustomer: '', location: '', tagline: '',
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
  // Photo: store File + local preview — actual upload happens in handleSubmit
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

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
  const canNext3  = !!(form.companyName.trim() && form.industry && form.stage)
  const canNext4  = !!(form.revenueStatus && form.fundingStatus && form.teamSize)
  const canSubmit = !!(form.problemStatement.trim() && form.targetCustomer.trim())

  const canGoNext =
    page === 1 ? canNext1 :
    page === 2 ? true      :
    page === 3 ? canNext3  :
    page === 4 ? canNext4  : false

  function go(next: number) { setDir(next > page ? 1 : -1); setPage(next); setError('') }

  function handleAvatarSelect(file: File) {
    setAvatarFile(file)
    const prev = avatarPreview
    if (prev) URL.revokeObjectURL(prev)
    setAvatarPreview(URL.createObjectURL(file))
  }

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

      // Upload avatar now that we have an authenticated session
      if (avatarFile) {
        try {
          const fd = new FormData()
          fd.append('file', avatarFile)
          fd.append('imageType', 'founder-avatar')
          await fetch('/api/upload/image', { method: 'POST', body: fd })
        } catch { /* non-fatal */ }
      }

      sessionStorage.removeItem('ea_signup_pending')
      router.push('/founder/profile-builder')
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  if (loading) return <PageSpinner label="Setting up your profile…" />

  const { icon: StepIcon, color: stepColor, title: stepTitle, sub: stepSub } = STEP_CONFIGS[page - 1]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: radius.sm,
    border: `1px solid ${bdr}`, background: surf, color: ink,
    fontSize: font.size.md, outline: 'none', boxSizing: 'border-box', fontFamily: font.family,
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
        <span style={{ fontWeight: font.weight.semibold, fontSize: font.size.md, letterSpacing: '-0.01em' }}>
          Edge Alpha
        </span>
        {page === 1 && (
          <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: font.size.base, color: muted, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Sign in
          </a>
        )}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${space[8]}px ${isMobile ? space[3] : space[4]}px 64px` }}>

        <ProgressDots step={page} />

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
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: isMobile ? `${space[5]}px ${space[4]}px 0` : `${space[8]}px ${space[8]}px 0` }}
            >

              {/* Step header */}
              <div style={{ textAlign: 'center', marginBottom: space[6] }}>
                <div style={{
                  width: 56, height: 56, borderRadius: radius.lg,
                  margin: `0 auto ${space[4]}px`,
                  background: `${stepColor}14`,
                  border: `1.5px solid ${stepColor}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <StepIcon size={24} color={stepColor} />
                </div>
                <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.bold, letterSpacing: '-0.03em', margin: `0 0 ${space[1]}px`, color: ink }}>{stepTitle}</h2>
                <p style={{ fontSize: font.size.base, color: muted, margin: 0, lineHeight: 1.6 }}>{stepSub}</p>
              </div>

              {/* ── PAGE 1 — Account ── */}
              {page === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>
                  <div>
                    <label style={labelStyle}>Full name</label>
                    <input style={inputStyle} type="text" value={form.founderName}
                      onChange={e => set('founderName')(e.target.value)}
                      placeholder="Jane Smith" autoFocus />
                  </div>
                  <div>
                    <label style={labelStyle}>Work email</label>
                    <input style={inputStyle} type="email" value={form.email}
                      onChange={e => set('email')(e.target.value)}
                      placeholder="you@company.com" />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input style={{ ...inputStyle, paddingRight: 44 }}
                        type={showPwd ? 'text' : 'password'} value={form.password}
                        onChange={e => set('password')(e.target.value)}
                        placeholder="Min. 8 characters" />
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0 }}>
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && <p style={{ fontSize: font.size.base, color: '#DC2626', margin: 0 }}>{error}</p>}

                  {/* Divider + Google OAuth */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                    <div style={{ flex: 1, height: 1, background: bdr }} />
                    <span style={{ fontSize: font.size.xs, color: muted }}>or</span>
                    <div style={{ flex: 1, height: 1, background: bdr }} />
                  </div>
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
                      width: '100%', padding: '11px 14px', borderRadius: radius.sm,
                      border: `1px solid ${bdr}`, background: bg, color: ink,
                      fontSize: font.size.md, fontWeight: font.weight.medium,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 10, fontFamily: font.family,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              )}

              {/* ── PAGE 2 — Photo (local select only; upload happens on final submit) ── */}
              {page === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space[4] }}>
                  <label
                    htmlFor="founder-avatar-input"
                    style={{ display: 'inline-block', cursor: 'pointer', position: 'relative' }}
                  >
                    <div style={{
                      width: 108, height: 108, borderRadius: '50%',
                      border: `2.5px dashed ${avatarPreview ? blue : bdr}`,
                      background: surf, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.15s', position: 'relative',
                    }}>
                      {avatarPreview ? (
                        <Image src={avatarPreview} alt="Avatar preview" fill style={{ objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 30, fontWeight: 700, color: muted }}>{initials}</span>
                      )}
                      <div
                        style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                      >
                        <Camera size={20} color="#fff" style={{ opacity: 0.85 }} />
                      </div>
                    </div>
                    <input
                      id="founder-avatar-input"
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarSelect(f); e.target.value = '' }}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <p style={{ fontSize: font.size.base, color: avatarPreview ? '#059669' : muted, fontWeight: avatarPreview ? font.weight.medium : font.weight.normal, margin: 0 }}>
                    {avatarPreview ? 'Photo selected — looking good!' : 'Click the circle to choose a photo'}
                  </p>
                </div>
              )}

              {/* ── PAGE 3 — Startup ── */}
              {page === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>
                  <div>
                    <Label>Company name</Label>
                    <TextInput value={form.companyName} onChange={set('companyName')} placeholder="e.g. Acme Inc." autoFocus />
                  </div>
                  <div>
                    <label style={labelStyle}>Industry / Sector</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {INDUSTRIES.map(o => (
                        <OptionCard key={o.value} label={o.label} active={form.industry === o.value} onClick={() => set('industry')(o.value)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label optional>Website</Label>
                    <TextInput value={form.website} onChange={set('website')} placeholder="https://" />
                  </div>
                  <div>
                    <label style={labelStyle}>Stage</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {STAGES.map(o => (
                        <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.stage === o.value} onClick={() => set('stage')(o.value)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PAGE 4 — Traction ── */}
              {page === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>
                  <div>
                    <label style={labelStyle}>Revenue</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {REVENUE.map(o => (
                        <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.revenueStatus === o.value} onClick={() => set('revenueStatus')(o.value)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Team size</label>
                    <div style={{ display: 'flex', gap: space[2] }}>
                      {TEAM.map(o => (
                        <Pill key={o.value} label={o.label} active={form.teamSize === o.value} onClick={() => set('teamSize')(o.value)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Funding status</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {FUNDING.map(o => (
                        <Pill key={o.value} label={o.label} active={form.fundingStatus === o.value} onClick={() => set('fundingStatus')(o.value)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PAGE 5 — Problem ── */}
              {page === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>
                  <div>
                    <label style={labelStyle}>What problem are you solving?</label>
                    <TextArea
                      value={form.problemStatement}
                      onChange={set('problemStatement')}
                      placeholder="Describe the pain point your customers face today…"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Who is your ideal customer?</Label>
                    <TextInput
                      value={form.targetCustomer}
                      onChange={set('targetCustomer')}
                      placeholder="e.g. Mid-market SaaS companies with 50–500 employees"
                    />
                  </div>
                  <div>
                    <Label optional>One-liner / tagline</Label>
                    <TextInput
                      value={form.tagline}
                      onChange={set('tagline')}
                      placeholder="e.g. The operating system for clinical trials"
                      maxLength={140}
                    />
                    {form.tagline && (
                      <p style={{ fontSize: font.size.sm, color: muted, marginTop: 4, textAlign: 'right' }}>{form.tagline.length}/140</p>
                    )}
                  </div>
                  <div>
                    <Label optional>Location</Label>
                    <TextInput value={form.location} onChange={set('location')} placeholder="e.g. London, UK" />
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
          <div style={{ padding: isMobile ? `${space[4]}px ${space[4]}px ${space[4] + 4}px` : `${space[6]}px ${space[8]}px ${space[6] + 4}px`, display: 'flex', justifyContent: page === 1 ? 'flex-end' : 'space-between', alignItems: 'center' }}>
            {page > 1 && (
              <button onClick={() => go(page - 1)} style={backBtn}>← Back</button>
            )}

            {page < TOTAL_STEPS ? (
              <button
                onClick={() => go(page + 1)}
                disabled={!canGoNext}
                style={primaryBtn(canGoNext)}
              >
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={primaryBtn(canSubmit)}
              >
                <span>Launch my profile</span><ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: font.size.sm, color: muted, marginTop: space[5] }}>
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
