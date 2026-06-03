'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Shield, Building2, Target, Sparkles, Camera,
  Eye, EyeOff, Check, Upload, X, FileText, Loader2,
  ChevronRight, ArrowLeft,
} from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

// ─── design tokens ─────────────────────────────────────────────────────────────
const radius = { sm: 9, md: 10, lg: 14, full: 9999 }
const font = {
  family: 'system-ui, -apple-system, sans-serif',
  size: { xs: 10, sm: 11, base: 13, md: 14, lg: 16, xl: 18, '2xl': 22, '3xl': 28 },
  weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
}
const space: Record<number, number> = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 }
const shadow = { sm: '0 1px 4px rgba(0,0,0,0.08)', md: '0 4px 16px rgba(0,0,0,0.1)' }

// ─── step config ───────────────────────────────────────────────────────────────
// New order: Account → Profile → Criteria → Thesis → Photo  (was 6 steps, now 5)
const STEPS = [
  { icon: Shield,    color: blue,      name: 'Account',  title: 'Join as an Investor',          sub: 'Access curated deal flow, matched to your thesis.'           },
  { icon: Building2, color: '#7C3AED', name: 'Profile',  title: 'Who are you?',                 sub: 'Founders see this when you request a connection.'             },
  { icon: Target,    color: '#D97706', name: 'Criteria', title: 'What are you looking for?',    sub: 'We use this to match you with the right founders.'            },
  { icon: Sparkles,  color: '#DB2777', name: 'Thesis',   title: 'Your investment thesis',       sub: 'We surface founders aligned with your worldview.'            },
  { icon: Camera,    color: '#0891B2', name: 'Photo',    title: 'Put a face to your profile',   sub: 'Optional — founders connect better with a photo.'            },
]
const TOTAL_STEPS = STEPS.length

// ─── option data ───────────────────────────────────────────────────────────────
const STAGES_OPTIONS = [
  { value: 'pre-seed', label: 'Pre-seed' },
  { value: 'seed',     label: 'Seed'     },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'growth',   label: 'Growth'   },
]

const SECTORS_OPTIONS = [
  { value: 'ai-ml',      label: 'AI & ML'    },
  { value: 'saas',       label: 'SaaS'       },
  { value: 'fintech',    label: 'FinTech'    },
  { value: 'healthtech', label: 'HealthTech' },
  { value: 'cleantech',  label: 'CleanTech'  },
  { value: 'deeptech',   label: 'DeepTech'   },
  { value: 'biotech',    label: 'BioTech'    },
  { value: 'agritech',   label: 'AgriTech'   },
  { value: 'edtech',     label: 'EdTech'     },
  { value: 'hardtech',   label: 'HardTech'   },
  { value: 'web3',       label: 'Web3'       },
  { value: 'other',      label: 'Other'      },
]

const CHECK_SIZES = [
  { value: '25k-100k',  label: '$25K–$100K'  },
  { value: '100k-500k', label: '$100K–$500K' },
  { value: '500k-2m',   label: '$500K–$2M'   },
  { value: '2m-10m',    label: '$2M–$10M'    },
  { value: '10m+',      label: '$10M+'       },
]

const TITLES = [
  'Managing Partner', 'General Partner', 'Principal', 'Associate',
  'Venture Partner', 'Angel Investor', 'Other',
]

// ─── match count estimation ────────────────────────────────────────────────────
function estimateMatches(sectors: string[], stages: string[], checkSizes: string[]): number {
  if (!sectors.length && !stages.length && !checkSizes.length) return 0
  const base    = 40
  const bySect  = Math.min(sectors.length   * 18, 90)
  const byStage = Math.min(stages.length    * 22, 80)
  const byCheck = Math.min(checkSizes.length * 12, 50)
  return Math.round((base + bySect + byStage + byCheck) / 10) * 10
}

// ─── form state ────────────────────────────────────────────────────────────────
interface FormData {
  email: string; password: string
  firstName: string; lastName: string; title: string
  firmName: string; isSoloGP: boolean; location: string
  checkSize: string[]; stages: string[]; sectors: string[]
  thesis: string
}

const EMPTY: FormData = {
  email: '', password: '',
  firstName: '', lastName: '', title: '', firmName: '', isSoloGP: false, location: '',
  checkSize: [], stages: [], sectors: [],
  thesis: '',
}

// ─── shared styles ─────────────────────────────────────────────────────────────
function primaryBtn(enabled = true): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '12px 24px', borderRadius: radius.md, border: 'none',
    background: enabled ? ink : bdr, color: '#fff',
    fontSize: font.size.md, fontWeight: font.weight.semibold,
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
  fontSize: font.size.md, color: muted, cursor: 'pointer',
  fontFamily: font.family,
}

const ghostBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: radius.md,
  border: 'none', background: 'transparent',
  fontSize: font.size.md, color: muted, cursor: 'pointer',
  fontFamily: font.family, textDecoration: 'underline',
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: radius.sm,
  border: `1.5px solid ${bdr}`, background: 'white', color: ink,
  fontSize: font.size.md, outline: 'none', boxSizing: 'border-box',
  fontFamily: font.family, transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: font.size.sm, fontWeight: font.weight.semibold,
  letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, marginBottom: 6,
}

// ─── sub-components ────────────────────────────────────────────────────────────
function StepProgress({ step, isMobile }: { step: number; isMobile: boolean }) {
  return (
    <div style={{ width: '100%', maxWidth: 640, margin: `0 auto ${space[5]}px` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] }}>
        <span style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: ink }}>
          {STEPS[step - 1].name}
        </span>
        <span style={{ fontSize: font.size.base, color: muted }}>{step} of {TOTAL_STEPS}</span>
      </div>
      <div style={{ height: 4, background: bdr, borderRadius: radius.full, overflow: 'hidden', marginBottom: isMobile ? 0 : space[3] }}>
        <div style={{
          height: '100%',
          background: `linear-gradient(90deg, ${blue}, ${blue}CC)`,
          borderRadius: radius.full,
          width: `${(step / TOTAL_STEPS) * 100}%`,
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {STEPS.map((cfg, i) => {
            const s = i + 1; const done = s < step; const active = s === step
            return (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: done ? blue : active ? ink : surf,
                  border: `1.5px solid ${done ? blue : active ? ink : bdr}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {done
                    ? <Check size={11} color="#fff" strokeWidth={3} />
                    : <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#fff' : muted }}>{s}</span>
                  }
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? font.weight.semibold : font.weight.normal, color: active ? ink : muted, whiteSpace: 'nowrap' }}>
                  {cfg.name}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '8px 14px', borderRadius: radius.full, cursor: 'pointer',
      border: `1.5px solid ${selected ? blue : bdr}`,
      background: selected ? '#EFF6FF' : 'white',
      color: selected ? blue : ink,
      fontSize: font.size.base, fontWeight: selected ? font.weight.semibold : font.weight.normal,
      fontFamily: font.family, transition: 'all 0.12s',
      boxShadow: selected ? `0 0 0 3px ${blue}18` : 'none',
    }}>
      {selected && <Check size={11} strokeWidth={3} />}
      {label}
    </button>
  )
}

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

// ─── processing screen ─────────────────────────────────────────────────────────
function ProcessingScreen({ step }: { step: number }) {
  const msgs = [
    'Saving your investor profile',
    'Analysing your investment thesis',
    'Scoring founders against your criteria',
    'Curating your personalised deal flow',
  ]
  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: space[6], fontFamily: font.family }}>
      <div style={{ textAlign: 'center', marginBottom: space[4] }}>
        <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.bold, letterSpacing: '-0.03em', color: ink, margin: `0 0 ${space[2]}px` }}>
          Personalizing your deal flow
        </h2>
        <p style={{ fontSize: font.size.md, color: muted, margin: 0 }}>This takes just a moment…</p>
      </div>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: space[3] }}>
        {msgs.map((msg, i) => {
          const done    = i + 1 < step
          const active  = i + 1 === step
          const pending = i + 1 > step
          return (
            <div key={msg} style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: '14px 16px', borderRadius: radius.md, background: surf, border: `1px solid ${done ? blue + '30' : bdr}`, transition: 'all 0.3s' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? blue : active ? `${blue}14` : `${bdr}`, border: `1.5px solid ${done ? blue : active ? blue : bdr}`, transition: 'all 0.3s' }}>
                {done
                  ? <Check size={12} color="#fff" strokeWidth={3} />
                  : active
                    ? <Loader2 size={12} color={blue} style={{ animation: 'spin 1s linear infinite' }} />
                    : <span style={{ fontSize: 10, color: muted }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: font.size.md, color: pending ? muted : ink, fontWeight: done || active ? font.weight.medium : font.weight.normal, transition: 'color 0.3s' }}>{msg}</span>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── main ──────────────────────────────────────────────────────────────────────
export default function InvestorOnboarding() {
  const router = useRouter()
  const [step, setStep]         = useState(1)
  const [form, setForm]         = useState<FormData>(EMPTY)
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [processing, setProcessing]     = useState(false)
  const [processingStep, setProcessingStep] = useState(0)

  // Thesis
  const [thesisUploading, setThesisUploading]   = useState(false)
  const [thesisFileName, setThesisFileName]     = useState<string | null>(null)
  const thesisInputRef = useRef<HTMLInputElement>(null)

  // Avatar + firm logo
  const [avatarFile,      setAvatarFile]      = useState<File | null>(null)
  const [avatarPreview,   setAvatarPreview]   = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [logoFile,        setLogoFile]        = useState<File | null>(null)
  const [logoPreview,     setLogoPreview]     = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef   = useRef<HTMLInputElement>(null)

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const toggle = (field: 'stages' | 'sectors' | 'checkSize', val: string) =>
    setForm(f => {
      const arr = f[field] as string[]
      return { ...f, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
    })

  useEffect(() => {
    import('@/features/auth/services/auth.service')
      .then(({ getSession }) => getSession())
      .then(session => { if (session) router.replace('/investor/dashboard') })
      .catch(() => {})
  }, [router])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Per-step validation
  const canStep1  = !!(form.email.trim() && form.password.length >= 8)
  const canStep2  = !!(form.firstName.trim() && form.lastName.trim() && (form.isSoloGP || form.firmName.trim()) && form.location.trim())
  const canStep3  = form.stages.length > 0 && form.sectors.length > 0 && form.checkSize.length > 0

  const canGoNext =
    step === 1 ? canStep1 :
    step === 2 ? canStep2 :
    step === 3 ? canStep3 :
    true // step 4 (thesis) and step 5 (photo) are optional, always allow continue

  function go(n: number) { setStep(n); setError('') }

  // ── Step 1: create account ────────────────────────────────────────────────
  async function handleCreateAccount() {
    if (!canStep1) return
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/investor-signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create account'); setLoading(false); return }
      const { signInWithPassword } = await import('@/features/auth/services/auth.service')
      await signInWithPassword(form.email, form.password)
      go(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  // ── Thesis PDF upload ─────────────────────────────────────────────────────
  async function handleThesisUpload(file: File) {
    setThesisUploading(true); setThesisFileName(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/thesis', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.text) { set('thesis', data.text); setThesisFileName(file.name) }
    } finally { setThesisUploading(false) }
  }

  // ── Final submit ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true)

    // Upload images first (non-blocking on failure)
    await Promise.allSettled([
      avatarFile && (async () => {
        setAvatarUploading(true)
        const fd = new FormData()
        fd.append('file', avatarFile)
        fd.append('imageType', 'investor-avatar')
        await fetch('/api/upload/image', { method: 'POST', body: fd })
        setAvatarUploading(false)
      })(),
      logoFile && (async () => {
        const fd = new FormData()
        fd.append('file', logoFile)
        fd.append('imageType', 'investor-logo')
        await fetch('/api/upload/image', { method: 'POST', body: fd })
      })(),
    ])

    let savedOk = false
    try {
      const res = await fetch('/api/investor/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Core fields we collect
          firstName: form.firstName, lastName: form.lastName,
          firmName: form.isSoloGP ? 'Solo GP' : form.firmName,
          location: form.location, thesis: form.thesis,
          checkSize: form.checkSize, stages: form.stages, sectors: form.sectors,
          // Fields removed from UI — send safe defaults for API compatibility
          email: form.email, phone: '', linkedin: '',
          firmType: form.isSoloGP ? 'angel' : 'vc',
          firmSize: '', aum: '', website: '',
          geography: [], dealFlow: '', decisionProcess: '', timeline: '',
        }),
      })
      if (res.ok) savedOk = true
      else {
        const errBody = await res.json().catch(() => ({}))
        console.error('Investor onboarding save error:', errBody)
      }
    } catch (err) { console.error('Investor onboarding error:', err) }

    setLoading(false)
    setProcessing(true)

    // Animate processing steps
    for (let i = 1; i <= 4; i++) {
      await new Promise(r => setTimeout(r, i === 1 ? 400 : 900))
      setProcessingStep(i)
    }
    if (savedOk) {
      try { await fetch('/api/investor/personalize', { method: 'POST' }) } catch { /* non-blocking */ }
    }
    await new Promise(r => setTimeout(r, 600))
    router.push('/investor/getting-started')
  }

  if (processing) return <ProcessingScreen step={processingStep} />

  const cfg = STEPS[step - 1]
  const StepIcon = cfg.icon
  const p = isMobile ? `${space[5]}px ${space[4]}px 0` : `${space[8]}px ${space[8]}px 0`
  const fp = isMobile ? `${space[4]}px ${space[4]}px ${space[4] + 4}px` : `${space[6]}px ${space[8]}px ${space[6] + 4}px`

  const matchCount = estimateMatches(form.sectors, form.stages, form.checkSize)
  const hasAnyCriteria = form.sectors.length + form.stages.length + form.checkSize.length > 0

  const initials = `${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`.toUpperCase() || 'YO'

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
        {step === 1 && (
          <a href="/founder/onboarding" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: font.size.base, color: muted, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Joining as a founder?
          </a>
        )}
      </div>

      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${space[8]}px ${isMobile ? space[3] : space[4]}px 80px` }}>

        <StepProgress step={step} isMobile={isMobile} />

        <div style={{
          width: '100%', maxWidth: 640,
          background: surf, borderRadius: isMobile ? radius.md : radius.lg,
          border: `1px solid ${bdr}`, overflow: 'hidden',
          boxShadow: shadow.sm,
        }}>

          <div style={{ padding: p }}>

            {/* Step header */}
            <div style={{ textAlign: 'center', marginBottom: space[6] }}>
              <div style={{
                width: 52, height: 52, borderRadius: radius.lg,
                margin: `0 auto ${space[3]}px`,
                background: `${cfg.color}14`, border: `1.5px solid ${cfg.color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <StepIcon size={22} color={cfg.color} />
              </div>
              <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.bold, letterSpacing: '-0.03em', margin: `0 0 ${space[1]}px`, color: ink }}>{cfg.title}</h2>
              <p style={{ fontSize: font.size.md, color: muted, margin: 0, lineHeight: 1.6 }}>{cfg.sub}</p>
            </div>

            {/* ── STEP 1 — Account ── */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
                {/* Google OAuth — primary */}
                <button
                  onClick={async () => {
                    const { createClient } = await import('@/lib/supabase/client')
                    const sb = createClient()
                    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
                  }}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: radius.sm,
                    border: `1.5px solid ${bdr}`, background: 'white', color: ink,
                    fontSize: font.size.md, fontWeight: font.weight.semibold,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 10, fontFamily: font.family,
                    boxShadow: shadow.sm, transition: 'box-shadow 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = shadow.md }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = shadow.sm }}
                >
                  <GoogleIcon /> Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                  <span style={{ fontSize: font.size.sm, color: muted, whiteSpace: 'nowrap' }}>or sign up with email</span>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      style={inputBase} type="email" value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="you@fund.com" autoFocus
                      onFocus={e => { e.currentTarget.style.borderColor = blue }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...inputBase, paddingRight: 44 }}
                        type={showPwd ? 'text' : 'password'} value={form.password}
                        onChange={e => set('password', e.target.value)}
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
                      <p style={{ fontSize: font.size.sm, color: '#D97706', margin: '4px 0 0' }}>
                        {8 - form.password.length} more characters needed
                      </p>
                    )}
                  </div>
                </div>

                {error && <p style={{ fontSize: font.size.md, color: '#DC2626', margin: 0 }}>{error}</p>}

                <p style={{ fontSize: font.size.sm, color: muted, margin: `${space[2]}px 0 0`, textAlign: 'center' }}>
                  Already have an account?{' '}
                  <a href="/login" style={{ color: blue, textDecoration: 'none', fontWeight: font.weight.medium }}>Sign in →</a>
                </p>
              </div>
            )}

            {/* ── STEP 2 — Profile ── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space[3] }}>
                  <div>
                    <label style={labelStyle}>First name</label>
                    <input style={inputBase} type="text" value={form.firstName}
                      onChange={e => set('firstName', e.target.value)} placeholder="Jane" autoFocus
                      onFocus={e => { e.currentTarget.style.borderColor = blue }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last name</label>
                    <input style={inputBase} type="text" value={form.lastName}
                      onChange={e => set('lastName', e.target.value)} placeholder="Smith"
                      onFocus={e => { e.currentTarget.style.borderColor = blue }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Your title</label>
                  <select
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    style={{ ...inputBase, cursor: 'pointer' }}
                    onFocus={e => { e.currentTarget.style.borderColor = blue }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                  >
                    <option value="">Select your title…</option>
                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Firm / Fund name</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: font.size.base, color: muted }}>
                      <input
                        type="checkbox"
                        checked={form.isSoloGP}
                        onChange={e => set('isSoloGP', e.target.checked)}
                        style={{ width: 14, height: 14, accentColor: blue }}
                      />
                      I invest solo (Angel / GP)
                    </label>
                  </div>
                  {!form.isSoloGP && (
                    <input
                      style={inputBase} type="text" value={form.firmName}
                      onChange={e => set('firmName', e.target.value)}
                      placeholder="e.g. Sequoia Capital, Andreessen Horowitz…"
                      onFocus={e => { e.currentTarget.style.borderColor = blue }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                    />
                  )}
                  {form.isSoloGP && (
                    <div style={{ padding: '11px 14px', borderRadius: radius.sm, background: `${blue}08`, border: `1.5px solid ${blue}20`, fontSize: font.size.base, color: blue }}>
                      You&apos;ll appear as an independent investor on founder profiles.
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Location</label>
                  <input style={inputBase} type="text" value={form.location}
                    onChange={e => set('location', e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                    onFocus={e => { e.currentTarget.style.borderColor = blue }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                  />
                  <p style={{ fontSize: font.size.sm, color: muted, margin: '4px 0 0' }}>
                    Founders see your location when they view your investor card.
                  </p>
                </div>

                {error && <p style={{ fontSize: font.size.md, color: '#DC2626', margin: 0 }}>{error}</p>}
              </div>
            )}

            {/* ── STEP 3 — Investment Criteria ── */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: space[6] }}>

                {/* Live match counter */}
                <div style={{
                  padding: '14px 16px', borderRadius: radius.md,
                  background: hasAnyCriteria ? `${blue}08` : surf,
                  border: `1.5px solid ${hasAnyCriteria ? blue + '30' : bdr}`,
                  transition: 'all 0.3s',
                }}>
                  {hasAnyCriteria ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: font.size.md, fontWeight: font.weight.semibold, color: ink }}>
                          {matchCount}+ founders match your criteria
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: font.size.sm, color: muted }}>
                          Refine further to find your best matches
                        </p>
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: '#fff' }}>
                          {Math.min(matchCount, 99)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: font.size.base, color: muted, textAlign: 'center' }}>
                      Select criteria below to see how many founders match you on day one.
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ ...labelStyle, marginBottom: space[3] }}>Investment stages *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[2] }}>
                    {STAGES_OPTIONS.map(o => (
                      <Chip key={o.value} label={o.label} selected={form.stages.includes(o.value)} onClick={() => toggle('stages', o.value)} />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ ...labelStyle, marginBottom: space[3] }}>Sectors *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[2] }}>
                    {SECTORS_OPTIONS.map(o => (
                      <Chip key={o.value} label={o.label} selected={form.sectors.includes(o.value)} onClick={() => toggle('sectors', o.value)} />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ ...labelStyle, marginBottom: space[3] }}>Typical check size *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: space[2] }}>
                    {CHECK_SIZES.map(o => (
                      <Chip key={o.value} label={o.label} selected={form.checkSize.includes(o.value)} onClick={() => toggle('checkSize', o.value)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4 — Thesis ── */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>

                {/* PDF upload — primary */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Upload thesis PDF</label>
                    <span style={{ fontSize: font.size.sm, color: muted }}>recommended</span>
                  </div>

                  {thesisFileName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: '12px 14px', borderRadius: radius.sm, border: `1.5px solid ${blue}`, background: `${blue}08` }}>
                      <FileText size={20} color={blue} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: font.size.base, fontWeight: font.weight.semibold, color: '#059669' }}>✓ Thesis extracted</p>
                        <p style={{ margin: '2px 0 0', fontSize: font.size.sm, color: muted }}>{thesisFileName}</p>
                      </div>
                      <button onClick={() => { setThesisFileName(null); set('thesis', '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : thesisUploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: space[2], padding: '20px 14px', borderRadius: radius.sm, border: `1.5px dashed ${blue}`, background: `${blue}06` }}>
                      <Loader2 size={18} color={blue} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: font.size.base, color: blue }}>Extracting thesis…</span>
                    </div>
                  ) : (
                    <label htmlFor="thesis-upload" style={{ display: 'block', cursor: 'pointer' }}>
                      <div
                        style={{ padding: '24px 14px', borderRadius: radius.sm, border: `1.5px dashed ${bdr}`, background: surf, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space[2], transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = blue; (e.currentTarget as HTMLDivElement).style.background = `${blue}06` }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = bdr;  (e.currentTarget as HTMLDivElement).style.background = surf }}
                      >
                        <Upload size={22} color={muted} />
                        <p style={{ margin: 0, fontSize: font.size.md, color: muted, textAlign: 'center' }}>
                          Drop your thesis PDF here, or{' '}
                          <span style={{ color: blue, fontWeight: font.weight.medium }}>click to browse</span>
                        </p>
                        <p style={{ margin: 0, fontSize: font.size.sm, color: muted }}>
                          AI will extract your focus areas automatically
                        </p>
                      </div>
                    </label>
                  )}
                  <input
                    id="thesis-upload" ref={thesisInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleThesisUpload(f); e.target.value = '' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                  <span style={{ fontSize: font.size.sm, color: muted, whiteSpace: 'nowrap' }}>or write it here</span>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Investment thesis</label>
                    <span style={{ fontSize: font.size.sm, color: muted }}>{form.thesis.length}/500</span>
                  </div>
                  <textarea
                    value={form.thesis}
                    onChange={e => set('thesis', e.target.value.slice(0, 500))}
                    rows={5}
                    placeholder='We back technical founders building in deep tech and climate. We focus on $500K–$2M checks at pre-seed and seed. We typically co-invest with other angels and institutional funds.'
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: radius.sm,
                      border: `1.5px solid ${bdr}`, background: 'white',
                      fontSize: font.size.md, color: ink, outline: 'none',
                      fontFamily: font.family, boxSizing: 'border-box',
                      resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = blue }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = bdr  }}
                  />
                  <p style={{ fontSize: font.size.sm, color: muted, margin: '6px 0 0' }}>
                    We use this to semantically match you with founders whose problem space aligns with your worldview.
                  </p>
                </div>

                {error && <p style={{ fontSize: font.size.md, color: '#DC2626', margin: 0 }}>{error}</p>}
              </div>
            )}

            {/* ── STEP 5 — Photo + Firm logo ── */}
            {step === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: space[6] }}>

                {/* Profile photo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space[3] }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Your photo</label>
                  <div style={{ position: 'relative' }}>
                    <label htmlFor="investor-avatar-input" style={{ display: 'block', cursor: 'pointer' }}>
                      <div style={{
                        width: 96, height: 96, borderRadius: '50%',
                        border: `2px dashed ${avatarPreview ? blue : bdr}`,
                        background: avatarPreview ? 'transparent' : `${blue}08`,
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', transition: 'border-color 0.15s',
                      }}>
                        {avatarPreview
                          ? <Image src={avatarPreview} alt="Avatar" fill style={{ objectFit: 'cover' }} />
                          : <span style={{ fontSize: 28, fontWeight: 700, color: blue, letterSpacing: '-0.02em' }}>{initials}</span>
                        }
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
                      <button onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                        style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                        <X size={10} color="#fff" strokeWidth={3} />
                      </button>
                    )}
                  </div>
                  <input id="investor-avatar-input" ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]; e.target.value = ''
                      if (!f) return
                      if (f.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return }
                      setAvatarFile(f)
                      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
                      setAvatarPreview(URL.createObjectURL(f))
                    }}
                  />
                  <p style={{ fontSize: font.size.sm, color: avatarPreview ? '#059669' : muted, fontWeight: avatarPreview ? font.weight.medium : font.weight.normal, margin: 0, textAlign: 'center' }}>
                    {avatarPreview ? '✓ Photo selected' : 'Click to upload · JPG or PNG, max 5MB'}
                  </p>
                </div>

                <div style={{ height: 1, background: bdr }} />

                {/* Firm logo */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[3] }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Fund / Firm logo</label>
                    <span style={{ fontSize: font.size.sm, color: muted }}>optional</span>
                  </div>
                  {logoPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: '12px 14px', borderRadius: radius.sm, border: `1.5px solid ${blue}`, background: `${blue}08` }}>
                      <div style={{ width: 40, height: 40, borderRadius: radius.sm, overflow: 'hidden', flexShrink: 0, border: `1px solid ${bdr}`, position: 'relative' }}>
                        <Image src={logoPreview} alt="Logo" fill style={{ objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: font.weight.semibold, color: '#059669' }}>✓ Logo uploaded</p>
                        <p style={{ margin: '2px 0 0', fontSize: font.size.sm, color: muted }}>{logoFile?.name}</p>
                      </div>
                      <button onClick={() => { setLogoFile(null); setLogoPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="investor-logo-input" style={{ display: 'block', cursor: 'pointer' }}>
                      <div style={{ padding: '20px 14px', borderRadius: radius.sm, border: `1.5px dashed ${bdr}`, background: surf, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space[2], transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = blue; (e.currentTarget as HTMLDivElement).style.background = `${blue}06` }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = bdr;  (e.currentTarget as HTMLDivElement).style.background = surf }}
                      >
                        <Upload size={20} color={muted} />
                        <p style={{ margin: 0, fontSize: font.size.md, color: muted }}>
                          Drag & drop or <span style={{ color: blue, fontWeight: font.weight.medium }}>click to browse</span>
                        </p>
                        <p style={{ margin: 0, fontSize: font.size.sm, color: muted }}>JPG, PNG · max 5MB</p>
                      </div>
                    </label>
                  )}
                  <input id="investor-logo-input" ref={logoInputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]; e.target.value = ''
                      if (!f) return
                      if (f.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return }
                      setLogoFile(f)
                      if (logoPreview) URL.revokeObjectURL(logoPreview)
                      setLogoPreview(URL.createObjectURL(f))
                    }}
                  />
                </div>

                {error && (
                  <div style={{ padding: '11px 14px', borderRadius: radius.sm, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: font.size.md }}>
                    {error}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Nav footer */}
          <div style={{ padding: fp, display: 'flex', justifyContent: step === 1 ? 'flex-end' : 'space-between', alignItems: 'center' }}>
            {step > 1 && step < 5 && (
              <button onClick={() => go(step - 1)} style={backBtn}>← Back</button>
            )}
            {step > 1 && step === 5 && (
              <button onClick={() => go(step - 1)} style={backBtn}>← Back</button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
              {/* Skip button for optional steps */}
              {(step === 4 || step === 5) && (
                <button
                  onClick={step === 4 ? () => go(5) : handleSubmit}
                  style={ghostBtn}
                >
                  {step === 5 ? 'Skip & finish' : 'Skip'}
                </button>
              )}

              {step === 1 ? (
                <button onClick={handleCreateAccount} disabled={!canStep1 || loading} style={primaryBtn(canStep1 && !loading)}>
                  {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {loading ? 'Creating account…' : 'Continue'} {!loading && <ChevronRight size={14} />}
                </button>
              ) : step < TOTAL_STEPS ? (
                <button onClick={() => go(step + 1)} disabled={!canGoNext} style={primaryBtn(canGoNext)}>
                  Continue <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading} style={primaryBtn(!loading)}>
                  {loading
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                    : <>Launch deal flow <ChevronRight size={14} /></>
                  }
                </button>
              )}
            </div>
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
