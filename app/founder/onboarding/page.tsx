'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronRight, Building2, TrendingUp, Lightbulb, UserCheck, Camera, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'
import { PageSpinner } from '@/features/shared/components/Spinner'
import { Label } from '@/features/shared/components/Label'
import { TextInput } from '@/features/shared/components/TextInput'

// ── option data ───────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { value: 'medtech-biotech',   label: 'Medtech / Biotech'   },
  { value: 'ai-software',       label: 'AI & Software'        },
  { value: 'robotics-hardware', label: 'Robotics & Hardware'  },
  { value: 'agri-foodtech',     label: 'Agri- & Foodtech'     },
  { value: 'clean-tech',        label: 'Clean Tech'           },
]

const STAGES = [
  { value: 'product-development', label: 'Product Development', sub: 'Building or validating the product' },
  { value: 'commercial',          label: 'Commercial',           sub: 'Early customers or pilots underway'  },
  { value: 'growth-scaling',      label: 'Growth / Scaling',     sub: 'Scaling revenue and team'            },
]

const REVENUE = [
  { value: 'pre-revenue',   label: 'Pre-revenue',            sub: 'No paying customers yet'     },
  { value: 'early-revenue', label: 'Early revenue (pilots)', sub: 'First paying customers'       },
  { value: 'recurring',     label: 'Recurring revenues',     sub: 'Signed contracts or SaaS MRR' },
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

// ── animation ─────────────────────────────────────────────────────────────────
const slide = {
  enter: (dir: number) => ({ x: dir * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -32, opacity: 0 }),
}

// ── step config (page 1 = account, then startup, traction, problem) ───────────
const STEP_CONFIGS = [
  { icon: UserCheck,  color: '#059669', title: 'Create account',   sub: 'Secure your profile — takes 30 seconds.'                            },
  { icon: Building2,  color: blue,      title: 'Your startup',     sub: 'This calibrates your IQ Score from day one.'                        },
  { icon: TrendingUp, color: '#D97706', title: 'Traction & team',  sub: 'Honest answers give you a more useful baseline.'                    },
  { icon: Lightbulb,  color: '#7C3AED', title: 'The problem',      sub: "Describe what you're building and who it's for."                    },
]

const STEP_LABELS = ['Create Account', 'Your Startup', 'Traction', 'Your Problem']

// ── local components ──────────────────────────────────────────────────────────
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
        width: '100%', padding: '11px 14px', borderRadius: 8,
        border: `1.5px solid ${bdr}`, background: bg,
        fontSize: 14, color: ink, outline: 'none', fontFamily: 'inherit',
        boxSizing: 'border-box', transition: 'border-color 0.15s',
        resize: 'vertical', lineHeight: 1.5,
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
  const [dir, setDir]           = useState(1)
  const [form, setForm]         = useState<FormData>(EMPTY)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof FormData) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }))

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => { if (data.session) router.replace('/founder/dashboard') })
  }, [router])

  // Per-page validation
  const canNext1 = form.founderName.trim() && form.email.trim() && form.password.length >= 8
  const canNext2 = form.companyName.trim() && form.industry && form.stage
  const canNext3 = form.revenueStatus && form.fundingStatus && form.teamSize
  const canSubmit = form.problemStatement.trim() && form.targetCustomer.trim()

  function go(next: number) { setDir(next > page ? 1 : -1); setPage(next); setError('') }

  const canGoNext = page === 2 ? canNext2 : page === 3 ? canNext3 : false

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
      const sb = createClient()
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (signInErr) { setError('Account created but sign-in failed. Please log in.'); setLoading(false); return }
      setLoading(false)
      go(5)
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  async function handleAvatarFile(file: File) {
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('imageType', 'founder-avatar')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) setAvatarUrl(data.url)
    } finally {
      setAvatarUploading(false)
    }
  }

  if (loading) return <PageSpinner label="Setting up your profile…" />

  // ── Page 1 — Clean sign-up form (styled like the login page) ──────────────
  if (page === 1) {
    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '11px 14px', borderRadius: 8,
      border: `1px solid ${bdr}`, background: surf, color: ink,
      fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    }
    return (
      <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: `1px solid ${bdr}` }}>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>Edge Alpha</span>
          <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: muted, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Sign in
          </a>
        </div>

        {/* body */}
        <div style={{ maxWidth: 400, margin: '0 auto', padding: '64px 24px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-0.03em', marginBottom: 8, color: ink }}>
            Create your account.
          </h1>
          <p style={{ fontSize: 14, color: muted, marginBottom: 40 }}>
            Sign up for your Edge Alpha account.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: muted, marginBottom: 6 }}>
                Full name
              </label>
              <input style={inputStyle} type="text" value={form.founderName}
                onChange={e => set('founderName')(e.target.value)}
                placeholder="Jane Smith" autoFocus />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: muted, marginBottom: 6 }}>
                Work email
              </label>
              <input style={inputStyle} type="email" value={form.email}
                onChange={e => set('email')(e.target.value)}
                placeholder="you@company.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: muted, marginBottom: 6 }}>
                Password
              </label>
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

            {error && <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>}

            <button
              onClick={() => go(2)}
              disabled={!canNext1}
              style={{
                padding: '12px', borderRadius: 999, border: 'none',
                background: canNext1 ? ink : bdr, color: bg,
                fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                cursor: canNext1 ? 'pointer' : 'not-allowed',
                opacity: canNext1 ? 1 : 0.5,
              }}
            >
              Continue →
            </button>

            {/* divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: bdr }} />
              <span style={{ fontSize: 12, color: muted }}>or</span>
              <div style={{ flex: 1, height: 1, background: bdr }} />
            </div>

            {/* Google OAuth */}
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
              style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div style={{ height: 1, background: bdr, margin: '32px 0' }} />

          <p style={{ fontSize: 13, color: muted, textAlign: 'center' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: ink, fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
          </p>
        </div>
      </div>
    )
  }

  // ── Photo step (page 5) — rendered outside AnimatePresence for reliable file picker ──
  if (page === 5) {
    const initials = form.founderName.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase() || 'YO'
    return (
      <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 480, background: surf, borderRadius: 14, border: `1px solid ${bdr}`, padding: '40px 36px', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 18px', background: '#0891B214', border: '1.5px solid #0891B228', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={24} color="#0891B2" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px', color: ink }}>Add your photo</h2>
          <p style={{ fontSize: 13, color: muted, margin: '0 0 28px', lineHeight: 1.6 }}>
            A profile photo helps investors recognise you. Completely optional.
          </p>

          {/* Avatar circle — label wraps input for reliable file picker in all browsers */}
          <label
            htmlFor="founder-avatar-input"
            style={{
              display: 'inline-block', cursor: avatarUploading ? 'default' : 'pointer',
              margin: '0 auto 16px', position: 'relative',
            }}
          >
            <div style={{
              width: 108, height: 108, borderRadius: '50%',
              border: `2.5px dashed ${avatarUrl ? blue : bdr}`,
              background: surf, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s',
              position: 'relative',
            }}>
              {avatarUploading ? (
                <Loader2 size={24} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
              ) : avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 30, fontWeight: 700, color: muted }}>{initials}</span>
              )}
              {/* hover overlay hint */}
              {!avatarUploading && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.0)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                >
                  <Camera size={20} color="#fff" style={{ opacity: 0.85 }} />
                </div>
              )}
            </div>
            <input
              id="founder-avatar-input"
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={avatarUploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = '' }}
              style={{ display: 'none' }}
            />
          </label>

          <p style={{ fontSize: 13, margin: '0 0 28px', color: avatarUrl ? '#059669' : muted, fontWeight: avatarUrl ? 500 : 400 }}>
            {avatarUploading ? 'Uploading…' : avatarUrl ? 'Photo uploaded! Looking good.' : 'Click the circle to choose a photo'}
          </p>

          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push('/founder/profile-builder')}
              style={{ padding: '10px 18px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: 'transparent', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: 'inherit' }}
            >Skip for now</button>
            <button
              onClick={() => router.push('/founder/profile-builder')}
              disabled={avatarUploading}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 22px', borderRadius: 8, border: 'none',
                background: avatarUploading ? bdr : blue,
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: avatarUploading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: avatarUploading ? 0.55 : 1,
              }}
            >
              Continue <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Pages 1-4 ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Sticky full-width header — bg covers card when scrolling */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, background: bg,
        borderBottom: `1px solid ${bdr}`,
        display: 'flex', justifyContent: 'center', padding: '11px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 300, color: ink, letterSpacing: '-0.02em' }}>Edge Alpha</span>
          <span style={{ color: bdr }}>·</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: muted, padding: '3px 12px', borderRadius: 999, background: surf, border: `1px solid ${bdr}` }}>
            {STEP_LABELS[page - 1]} · Step {page - 1} of {STEP_LABELS.length - 1}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px 64px' }}>

        {/* Card */}
        <div style={{ width: '100%', maxWidth: 640, background: surf, borderRadius: 14, border: `1px solid ${bdr}`, overflow: 'hidden' }}>

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
              {/* Section header */}
              {(() => {
                const { icon: Icon, color, title, sub } = STEP_CONFIGS[page - 1]
                return (
                  <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 16, margin: '0 auto 16px', background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${color}28` }}>
                      <Icon size={26} color={color} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px', color: ink }}>{title}</h2>
                    <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.6 }}>{sub}</p>
                  </div>
                )
              })()}

              {/* ── PAGE 2 — Startup ── */}
              {page === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <Label>Company name</Label>
                    <TextInput value={form.companyName} onChange={set('companyName')} placeholder="e.g. Acme Inc." autoFocus />
                  </div>
                  <div>
                    <Label>Industry / Sector</Label>
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
                    <Label>Stage</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {STAGES.map(o => (
                        <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.stage === o.value} onClick={() => set('stage')(o.value)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PAGE 3 — Traction ── */}
              {page === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <Label>Revenue</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {REVENUE.map(o => (
                        <OptionCard key={o.value} label={o.label} sub={o.sub} active={form.revenueStatus === o.value} onClick={() => set('revenueStatus')(o.value)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Team size</Label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {TEAM.map(o => (
                        <Pill key={o.value} label={o.label} active={form.teamSize === o.value} onClick={() => set('teamSize')(o.value)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Funding status</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {FUNDING.map(o => (
                        <Pill key={o.value} label={o.label} active={form.fundingStatus === o.value} onClick={() => set('fundingStatus')(o.value)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PAGE 4 — Problem & ICP ── */}
              {page === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <Label>What problem are you solving?</Label>
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
                      <p style={{ fontSize: 11, color: muted, marginTop: 4, textAlign: 'right' }}>{form.tagline.length}/140</p>
                    )}
                  </div>
                  <div>
                    <Label optional>Location</Label>
                    <TextInput value={form.location} onChange={set('location')} placeholder="e.g. London, UK" />
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
            <button
              onClick={() => go(page - 1)}
              style={{ padding: '9px 18px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: 'transparent', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: 'inherit' }}
            >← Back</button>

            {page < 4 ? (
              <button
                onClick={() => go(page + 1)}
                disabled={!canGoNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 20px', borderRadius: 8, border: 'none',
                  background: !canGoNext ? bdr : blue,
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: !canGoNext ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                  opacity: !canGoNext ? 0.45 : 1,
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
                {loading ? 'Creating account…' : <><span>Launch my profile</span><ChevronRight size={14} /></>}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: muted, marginTop: 20 }}>
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
