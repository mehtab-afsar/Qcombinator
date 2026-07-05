'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Check, ChevronRight, ArrowLeft, Camera, Upload, X, FileText, Loader2, Eye, EyeOff,
} from 'lucide-react'
import { ink, muted, blue } from '@/lib/constants/colors'

// ── Design tokens ─────────────────────────────────────────────────────────────
const PAGE_BG      = '#F9F7F2'
const CARD_BG      = '#ffffff'
const CARD_BORDER  = 'rgba(0,0,0,0.09)'
const CARD_SHADOW  = '0 12px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.05)'
const INPUT_BORDER = 'rgba(0,0,0,0.13)'
const SEP          = 'rgba(0,0,0,0.07)'
const LABEL_COLOR  = '#6B6560'
const f            = { family: 'system-ui, -apple-system, sans-serif' }

// ── Step config ───────────────────────────────────────────────────────────────
const STEPS = [
  { name: 'Account',  title: 'Join as an Investor',           sub: 'Access curated deal flow matched to your thesis.'          },
  { name: 'Profile',  title: 'Who are you?',                  sub: 'Founders see this when you request a connection.'          },
  { name: 'Criteria', title: 'What are you looking for?',     sub: 'We use this to match you with the right founders.'         },
  { name: 'Thesis',   title: 'Your investment thesis',        sub: 'We use this to surface founders aligned with your worldview.'},
  { name: 'Photo',    title: 'Put a face to your profile',    sub: 'Optional — founders connect better with a photo.'         },
]
const TOTAL = STEPS.length

// ── Option data ───────────────────────────────────────────────────────────────
const STAGES_OPTIONS = [
  { value: 'pre-seed', label: 'Pre-seed' }, { value: 'seed',     label: 'Seed'     },
  { value: 'series-a', label: 'Series A' }, { value: 'series-b', label: 'Series B' },
  { value: 'growth',   label: 'Growth'   },
]
const SECTORS_OPTIONS = [
  { value: 'ai-ml',      label: 'AI & ML'    }, { value: 'saas',       label: 'SaaS'       },
  { value: 'fintech',    label: 'FinTech'    }, { value: 'healthtech', label: 'HealthTech' },
  { value: 'cleantech',  label: 'CleanTech'  }, { value: 'deeptech',   label: 'DeepTech'   },
  { value: 'biotech',    label: 'BioTech'    }, { value: 'agritech',   label: 'AgriTech'   },
  { value: 'edtech',     label: 'EdTech'     }, { value: 'hardtech',   label: 'HardTech'   },
  { value: 'web3',       label: 'Web3'       }, { value: 'other',      label: 'Other'       },
]
const CHECK_SIZES = [
  { value: '25k-100k',  label: '$25K–$100K'  }, { value: '100k-500k', label: '$100K–$500K' },
  { value: '500k-2m',   label: '$500K–$2M'   }, { value: '2m-10m',    label: '$2M–$10M'    },
  { value: '10m+',      label: '$10M+'       },
]
const TITLES = ['Managing Partner', 'General Partner', 'Principal', 'Associate', 'Venture Partner', 'Angel Investor', 'Other']

function estimateMatches(sectors: string[], stages: string[], checkSizes: string[]): number {
  if (!sectors.length && !stages.length && !checkSizes.length) return 0
  const base = 40 + Math.min(sectors.length * 18, 90) + Math.min(stages.length * 22, 80) + Math.min(checkSizes.length * 12, 50)
  return Math.round(base / 10) * 10
}

// ── Form state ────────────────────────────────────────────────────────────────
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
  checkSize: [], stages: [], sectors: [], thesis: '',
}

// ── Shared components ─────────────────────────────────────────────────────────
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

function InputField({ value, onChange, type = 'text', placeholder, autoFocus, right }: {
  value: string; onChange: (v: string) => void; type?: string
  placeholder?: string; autoFocus?: boolean; right?: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type} value={value} autoFocus={autoFocus} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', height: 42, padding: right ? '0 44px 0 14px' : '0 14px',
          border: `1px solid ${INPUT_BORDER}`, borderRadius: 8,
          fontSize: 14, color: ink, outline: 'none', background: CARD_BG,
          boxSizing: 'border-box', fontFamily: f.family,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,22,15,0.08)' }}
        onBlur={e =>  { e.currentTarget.style.borderColor = INPUT_BORDER; e.currentTarget.style.boxShadow = 'none' }}
      />
      {right && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{right}</div>}
    </div>
  )
}

function SelectEl({ value, onChange, placeholder, children }: {
  value: string; onChange: (v: string) => void; placeholder?: string; children: React.ReactNode
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: '100%', height: 42, padding: '0 14px',
      border: `1px solid ${INPUT_BORDER}`, borderRadius: 8,
      fontSize: 14, color: value ? ink : muted, background: CARD_BG,
      outline: 'none', boxSizing: 'border-box', fontFamily: f.family,
      cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      onFocus={e => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,22,15,0.08)' }}
      onBlur={e =>  { e.currentTarget.style.borderColor = INPUT_BORDER; e.currentTarget.style.boxShadow = 'none' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  )
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
      border: `1.5px solid ${selected ? ink : 'rgba(0,0,0,0.12)'}`,
      background: selected ? 'rgba(24,22,15,0.05)' : CARD_BG,
      color: selected ? ink : '#4A4640',
      fontSize: 13, fontWeight: selected ? 600 : 400,
      fontFamily: f.family, transition: 'all 0.12s',
      boxShadow: selected ? '0 0 0 3px rgba(24,22,15,0.06)' : 'none',
    }}>
      {selected && <Check size={11} strokeWidth={3} />}
      {label}
    </button>
  )
}

// ── Step progress ─────────────────────────────────────────────────────────────
function StepProgress({ step }: { step: number }) {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {STEPS.map((cfg, i) => {
          const s = i + 1; const done = s < step; const active = s === step
          return (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: s < TOTAL ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: done || active ? ink : CARD_BG,
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
                {s < TOTAL && <div style={{ flex: 1, height: 1.5, background: done ? ink : 'rgba(0,0,0,0.1)', transition: 'background 0.3s' }} />}
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

// ── Processing screen ─────────────────────────────────────────────────────────
function ProcessingScreen({ step }: { step: number }) {
  const msgs = ['Saving your investor profile', 'Analysing your investment thesis', 'Scoring founders against your criteria', 'Curating your personalised deal flow']
  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, fontFamily: f.family }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: ink, margin: '0 0 8px' }}>Personalizing your deal flow</h2>
        <p style={{ fontSize: 14, color: muted, margin: 0 }}>This takes just a moment…</p>
      </div>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((msg, i) => {
          const done = i + 1 < step; const active = i + 1 === step
          return (
            <div key={msg} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: CARD_BG, border: `1px solid ${done ? 'rgba(0,0,0,0.12)' : SEP}`, transition: 'all 0.3s' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? ink : active ? 'rgba(24,22,15,0.06)' : 'rgba(0,0,0,0.04)', border: `1.5px solid ${done ? ink : active ? ink : 'rgba(0,0,0,0.12)'}`, transition: 'all 0.3s' }}>
                {done
                  ? <Check size={12} color="#fff" strokeWidth={3} />
                  : active
                    ? <Loader2 size={12} color={ink} style={{ animation: 'spin 1s linear infinite' }} />
                    : <span style={{ fontSize: 10, color: muted }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: 14, color: done || active ? ink : muted, fontWeight: done || active ? 500 : 400, transition: 'color 0.3s' }}>{msg}</span>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function InvestorLanding({ onStart }: { onStart: () => void }) {
  const STATS = [
    { value: '847+', label: 'Scored founders' },
    { value: '94%',  label: 'Criteria match rate' },
    { value: '60s',  label: 'To request a connection' },
  ]
  const QUOTES = [
    { text: 'The deal flow quality is unlike anything I\'ve seen. Every founder has a real score — not just a pitch deck.', name: 'Priya V.', role: 'GP, Seed-stage VC' },
    { text: 'I replaced three sourcing tools with Edge Alpha. The thesis matching actually works.', name: 'James K.', role: 'Angel, 40+ investments' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: f.family, display: 'flex', flexDirection: 'column' }}>
      {/* Floating dark pill nav */}
      <div style={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', padding: '0 24px', pointerEvents: 'none' }}>
        <div style={{
          pointerEvents: 'auto',
          width: '100%', maxWidth: 780,
          padding: '11px 20px',
          background: 'rgba(15,14,12,0.90)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 999,
          boxShadow: '0 4px 28px rgba(0,0,0,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Edge Alpha</span>
          <a href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>Sign in</a>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', maxWidth: 1100, margin: '0 auto', width: '100%', padding: '96px 24px 60px', gap: 48, alignItems: 'center' }}>

        {/* Left — dark branding panel */}
        <div style={{ flex: 1, background: ink, borderRadius: 20, padding: '48px 40px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
              Investor platform
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1, color: '#fff' }}>
              Deal flow.<br />
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>Already scored.</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '16px 0 0', lineHeight: 1.7, maxWidth: 380 }}>
              Every founder in your deal flow has been scored across 6 dimensions — before you ever see their name. No more cold pitch decks.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24 }}>
            {STATS.map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quotes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {QUOTES.map(q => (
              <div key={q.name} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 10px', lineHeight: 1.6 }}>&ldquo;{q.text}&rdquo;</p>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{q.name}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>· {q.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — sign up card */}
        <div style={{ width: 380, flexShrink: 0 }}>
          <div style={{ background: CARD_BG, borderRadius: 16, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW, padding: '36px 32px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: ink, margin: '0 0 6px' }}>Join as an investor</h2>
            <p style={{ fontSize: 13, color: muted, margin: '0 0 24px', lineHeight: 1.5 }}>
              Access curated deal flow matched to your thesis and check size.
            </p>

            {/* Google OAuth */}
            <button
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client')
                await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
              }}
              style={{
                width: '100%', height: 44, borderRadius: 10,
                border: `1px solid ${INPUT_BORDER}`, background: CARD_BG, color: ink,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: f.family, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fafafa' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = CARD_BG }}
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: SEP }} />
              <span style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>or sign up with email</span>
              <div style={{ flex: 1, height: 1, background: SEP }} />
            </div>

            <button
              onClick={onStart}
              style={{
                width: '100%', height: 44, borderRadius: 10,
                background: ink, color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em',
              }}
            >
              Sign up with email <ChevronRight size={15} />
            </button>

            <p style={{ fontSize: 12, color: muted, textAlign: 'center', margin: '16px 0 0' }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: blue, textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
            </p>
            <p style={{ fontSize: 12, color: muted, textAlign: 'center', margin: '8px 0 0' }}>
              Joining as a founder?{' '}
              <a href="/founder/onboarding" style={{ color: muted, textDecoration: 'underline' }}>Founder sign-up →</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InvestorOnboarding() {
  const router = useRouter()
  const [showLanding, setShowLanding] = useState(true)
  const [step, setStep]         = useState(1)
  const [form, setForm]         = useState<FormData>(EMPTY)
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [processing, setProcessing]       = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [thesisUploading, setThesisUploading] = useState(false)
  const [thesisFileName, setThesisFileName]   = useState<string | null>(null)
  const [avatarFile, setAvatarFile]   = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile]     = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const thesisRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const logoRef   = useRef<HTMLInputElement>(null)

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(f => ({ ...f, [k]: v }))
  const toggle = (field: 'stages' | 'sectors' | 'checkSize', val: string) =>
    setForm(f => { const arr = f[field] as string[]; return { ...f, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] } })

  useEffect(() => {
    import('@/features/auth/services/auth.service')
      .then(({ getSession }) => getSession())
      .then(async (s) => {
        if (!s) return
        // Only skip onboarding if an investor profile already exists —
        // otherwise a profile-less session would bounce right back here
        // from the dashboard role-redirect, and could loop.
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: ip } = await sb
          .from('investor_profiles')
          .select('user_id')
          .eq('user_id', s.user.id)
          .maybeSingle()
        if (ip) router.replace('/investor/dashboard')
      })
      .catch(() => {})
  }, [router])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const canStep1 = !!(form.email.trim() && form.password.length >= 8)
  const canStep2 = !!(form.firstName.trim() && form.lastName.trim() && (form.isSoloGP || form.firmName.trim()) && form.location.trim())
  const canStep3 = form.stages.length > 0 && form.sectors.length > 0 && form.checkSize.length > 0
  const _canGoNext = step === 1 ? canStep1 : step === 2 ? canStep2 : step === 3 ? canStep3 : true

  function go(n: number) { setStep(n); setError('') }

  async function handleCreateAccount() {
    if (!canStep1) return
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/investor-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, password: form.password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create account'); setLoading(false); return }
      const { signInWithPassword } = await import('@/features/auth/services/auth.service')
      await signInWithPassword(form.email, form.password)
      go(2)
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.') }
    setLoading(false)
  }

  async function handleThesisUpload(file: File) {
    setThesisUploading(true); setThesisFileName(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload/thesis', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.text) { set('thesis', data.text); setThesisFileName(file.name) }
    } finally { setThesisUploading(false) }
  }

  async function handleSubmit() {
    setLoading(true)
    await Promise.allSettled([
      avatarFile && (async () => { const fd = new FormData(); fd.append('file', avatarFile); fd.append('imageType', 'investor-avatar'); await fetch('/api/upload/image', { method: 'POST', body: fd }) })(),
      logoFile   && (async () => { const fd = new FormData(); fd.append('file', logoFile);   fd.append('imageType', 'investor-logo');   await fetch('/api/upload/image', { method: 'POST', body: fd }) })(),
    ])
    let savedOk = false
    try {
      const res = await fetch('/api/investor/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName,
          firmName: form.isSoloGP ? 'Solo GP' : form.firmName,
          location: form.location, thesis: form.thesis,
          checkSize: form.checkSize, stages: form.stages, sectors: form.sectors,
          email: form.email, phone: '', linkedin: '',
          firmType: form.isSoloGP ? 'angel' : 'vc',
          firmSize: '', aum: '', website: '',
          geography: [], dealFlow: '', decisionProcess: '', timeline: '',
        }),
      })
      if (res.ok) savedOk = true
    } catch (err) { console.error('Investor onboarding error:', err) }
    setLoading(false); setProcessing(true)
    for (let i = 1; i <= 4; i++) { await new Promise(r => setTimeout(r, i === 1 ? 400 : 900)); setProcessingStep(i) }
    if (savedOk) { try { await fetch('/api/investor/personalize', { method: 'POST' }) } catch { /* non-blocking */ } }
    await new Promise(r => setTimeout(r, 600))
    router.push('/investor/getting-started')
  }

  function pickFile(file: File, setF: (f: File | null) => void, setPrev: (s: string | null) => void, prev: string | null) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return }
    setF(file); if (prev) URL.revokeObjectURL(prev); setPrev(URL.createObjectURL(file))
  }

  if (processing) return <ProcessingScreen step={processingStep} />
  if (showLanding) return <InvestorLanding onStart={() => setShowLanding(false)} />

  const px = isMobile ? 20 : 32
  const initials = `${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`.toUpperCase() || 'YO'
  const matchCount = estimateMatches(form.sectors, form.stages, form.checkSize)
  const hasAnyCriteria = form.sectors.length + form.stages.length + form.checkSize.length > 0

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: f.family, color: ink }}>

      {/* Floating dark pill nav */}
      <div style={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', padding: '0 24px', pointerEvents: 'none' }}>
        <div style={{
          pointerEvents: 'auto',
          width: '100%', maxWidth: 780,
          padding: '11px 20px',
          background: 'rgba(15,14,12,0.90)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 999,
          boxShadow: '0 4px 28px rgba(0,0,0,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Edge Alpha</span>
          <a href="/founder/onboarding" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', opacity: step === 1 ? 1 : 0, pointerEvents: step === 1 ? 'auto' : 'none', transition: 'color .2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
            <ArrowLeft size={13} /> Joining as a founder?
          </a>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `80px ${isMobile ? 16 : 24}px 80px` }}>

        <StepProgress step={step} />

        {/* Card */}
        <div style={{ width: '100%', maxWidth: 520, background: CARD_BG, borderRadius: 16, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>

          {/* Step header */}
          <div style={{ padding: `28px ${px}px 24px`, borderBottom: `1px solid ${SEP}`, textAlign: 'center' }}>
            <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em', color: ink, margin: '0 0 6px' }}>
              {STEPS[step - 1].title}
            </h2>
            <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.6 }}>
              {STEPS[step - 1].sub}
            </p>
          </div>

          {/* Form body */}
          <div style={{ padding: `24px ${px}px 0`, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ── STEP 1 — Account ── */}
            {step === 1 && (<>
              <button
                onClick={async () => {
                  const { createClient } = await import('@/lib/supabase/client')
                  await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
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
                <Label>Email</Label>
                <InputField value={form.email} onChange={v => set('email', v)} type="email" placeholder="you@fund.com" autoFocus />
              </div>
              <div>
                <Label>Password</Label>
                <InputField
                  value={form.password} onChange={v => set('password', v)}
                  type={showPwd ? 'text' : 'password'} placeholder="Min. 8 characters"
                  right={
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, display: 'flex' }}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
                {form.password.length > 0 && form.password.length < 8 && (
                  <p style={{ fontSize: 12, color: '#D97706', marginTop: 5 }}>{8 - form.password.length} more characters needed</p>
                )}
              </div>
              {error && <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>}
              <p style={{ fontSize: 12, color: muted, textAlign: 'center', margin: 0 }}>
                Already have an account?{' '}
                <a href="/login" style={{ color: blue, textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
              </p>
            </>)}

            {/* ── STEP 2 — Profile ── */}
            {step === 2 && (<>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Label>First name</Label>
                  <InputField value={form.firstName} onChange={v => set('firstName', v)} placeholder="Jane" autoFocus />
                </div>
                <div>
                  <Label>Last name</Label>
                  <InputField value={form.lastName} onChange={v => set('lastName', v)} placeholder="Smith" />
                </div>
              </div>
              <div>
                <Label>Your title</Label>
                <SelectEl value={form.title} onChange={v => set('title', v)} placeholder="Select your title…">
                  {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </SelectEl>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Label>Firm / Fund name</Label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: muted, fontFamily: f.family }}>
                    <input type="checkbox" checked={form.isSoloGP} onChange={e => set('isSoloGP', e.target.checked)}
                      style={{ width: 13, height: 13, accentColor: ink }} />
                    I invest solo
                  </label>
                </div>
                {!form.isSoloGP
                  ? <InputField value={form.firmName} onChange={v => set('firmName', v)} placeholder="e.g. Sequoia Capital, Andreessen Horowitz…" />
                  : <div style={{ padding: '10px 14px', borderRadius: 8, background: '#F5F3F0', border: '1px solid rgba(0,0,0,0.08)', fontSize: 13, color: muted }}>
                      You&apos;ll appear as an independent investor on founder profiles.
                    </div>
                }
              </div>
              <div>
                <Label>Location</Label>
                <InputField value={form.location} onChange={v => set('location', v)} placeholder="e.g. San Francisco, CA" />
                <p style={{ fontSize: 11, color: muted, marginTop: 5 }}>Founders see your location on your investor card.</p>
              </div>
              {error && <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>}
            </>)}

            {/* ── STEP 3 — Criteria ── */}
            {step === 3 && (<>
              {/* Live match counter */}
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: hasAnyCriteria ? 'rgba(24,22,15,0.03)' : '#FAFAF8',
                border: `1px solid ${hasAnyCriteria ? 'rgba(0,0,0,0.14)' : SEP}`,
                transition: 'all 0.3s',
              }}>
                {hasAnyCriteria ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: ink, margin: 0 }}>{matchCount}+ founders match your criteria</p>
                      <p style={{ fontSize: 12, color: muted, margin: '2px 0 0' }}>Refine further to find your best matches</p>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{Math.min(matchCount, 99)}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: muted, textAlign: 'center', margin: 0 }}>
                    Select criteria below to see how many founders match you on day one.
                  </p>
                )}
              </div>

              <div>
                <SectionTitle>Investment stages <span style={{ color: '#DC2626' }}>*</span></SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STAGES_OPTIONS.map(o => <Chip key={o.value} label={o.label} selected={form.stages.includes(o.value)} onClick={() => toggle('stages', o.value)} />)}
                </div>
              </div>
              <div>
                <SectionTitle>Sectors <span style={{ color: '#DC2626' }}>*</span></SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SECTORS_OPTIONS.map(o => <Chip key={o.value} label={o.label} selected={form.sectors.includes(o.value)} onClick={() => toggle('sectors', o.value)} />)}
                </div>
              </div>
              <div>
                <SectionTitle>Typical check size <span style={{ color: '#DC2626' }}>*</span></SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CHECK_SIZES.map(o => <Chip key={o.value} label={o.label} selected={form.checkSize.includes(o.value)} onClick={() => toggle('checkSize', o.value)} />)}
                </div>
              </div>
            </>)}

            {/* ── STEP 4 — Thesis ── */}
            {step === 4 && (<>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Label>Upload thesis PDF</Label>
                  <span style={{ fontSize: 11, color: muted }}>recommended</span>
                </div>

                {thesisFileName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${ink}`, background: 'rgba(24,22,15,0.03)' }}>
                    <FileText size={18} color={ink} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#059669' }}>✓ Thesis extracted</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>{thesisFileName}</p>
                    </div>
                    <button onClick={() => { setThesisFileName(null); set('thesis', '') }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}>
                      <X size={15} />
                    </button>
                  </div>
                ) : thesisUploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 14px', borderRadius: 10, border: `1.5px dashed ${ink}`, background: 'rgba(24,22,15,0.03)' }}>
                    <Loader2 size={16} color={ink} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13, color: ink }}>Extracting thesis…</span>
                  </div>
                ) : (
                  <label htmlFor="thesis-upload" style={{ display: 'block', cursor: 'pointer' }}>
                    <div style={{ padding: '22px 14px', borderRadius: 10, border: `1.5px dashed rgba(0,0,0,0.16)`, background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.3)'; (e.currentTarget as HTMLDivElement).style.background = '#F5F3F0' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.16)'; (e.currentTarget as HTMLDivElement).style.background = '#FAFAF8' }}
                    >
                      <Upload size={20} color={muted} />
                      <p style={{ margin: 0, fontSize: 13, color: muted }}>
                        Drop your thesis PDF, or <span style={{ color: ink, fontWeight: 600 }}>click to browse</span>
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: muted }}>AI will extract your focus areas automatically</p>
                    </div>
                  </label>
                )}
                <input id="thesis-upload" ref={thesisRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                  onChange={e => { const file = e.target.files?.[0]; if (file) handleThesisUpload(file); e.target.value = '' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: SEP }} />
                <span style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>or write it here</span>
                <div style={{ flex: 1, height: 1, background: SEP }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <Label optional>Investment thesis</Label>
                  <span style={{ fontSize: 11, color: muted }}>{form.thesis.length}/500</span>
                </div>
                <textarea
                  value={form.thesis} onChange={e => set('thesis', e.target.value.slice(0, 500))} rows={5}
                  placeholder="We back technical founders building in deep tech and climate. We focus on $500K–$2M checks at pre-seed and seed. We typically co-invest with other angels and institutional funds."
                  style={{
                    width: '100%', padding: '10px 14px', border: `1px solid ${INPUT_BORDER}`, borderRadius: 8,
                    fontSize: 14, color: ink, outline: 'none', background: CARD_BG,
                    fontFamily: f.family, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,22,15,0.08)' }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = INPUT_BORDER; e.currentTarget.style.boxShadow = 'none' }}
                />
                <p style={{ fontSize: 11, color: muted, marginTop: 5 }}>
                  We use this for semantic matching — surfacing founders aligned with your worldview.
                </p>
              </div>
              {error && <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>}
            </>)}

            {/* ── STEP 5 — Photo ── */}
            {step === 5 && (<>
              {/* Profile photo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <Label>Your photo</Label>
                <div style={{ position: 'relative' }}>
                  <label htmlFor="inv-avatar" style={{ display: 'block', cursor: 'pointer' }}>
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
                  <input id="inv-avatar" ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                    onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) pickFile(file, setAvatarFile, setAvatarPreview, avatarPreview) }} />
                </div>
                <p style={{ fontSize: 12, color: avatarPreview ? '#059669' : muted, fontWeight: avatarPreview ? 600 : 400 }}>
                  {avatarPreview ? '✓ Photo selected' : 'Click to upload · JPG or PNG, max 5MB'}
                </p>
              </div>

              <div style={{ height: 1, background: SEP }} />

              {/* Firm logo */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Label>Fund / Firm logo</Label>
                  <span style={{ fontSize: 11, color: muted }}>optional</span>
                </div>
                {logoPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${ink}`, background: 'rgba(24,22,15,0.03)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${SEP}`, position: 'relative' }}>
                      <Image src={logoPreview} alt="Logo" fill style={{ objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#059669' }}>✓ Logo uploaded</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>{logoFile?.name}</p>
                    </div>
                    <button onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="inv-logo" style={{ display: 'block', cursor: 'pointer' }}>
                    <div style={{ padding: '20px 14px', borderRadius: 10, border: `1.5px dashed rgba(0,0,0,0.16)`, background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.3)'; (e.currentTarget as HTMLDivElement).style.background = '#F5F3F0' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.16)'; (e.currentTarget as HTMLDivElement).style.background = '#FAFAF8' }}
                    >
                      <Upload size={18} color={muted} />
                      <p style={{ margin: 0, fontSize: 13, color: muted }}>Drag & drop or <span style={{ color: ink, fontWeight: 600 }}>click to browse</span></p>
                      <p style={{ margin: 0, fontSize: 11, color: muted }}>JPG, PNG · max 5MB</p>
                    </div>
                  </label>
                )}
                <input id="inv-logo" ref={logoRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }}
                  onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) pickFile(file, setLogoFile, setLogoPreview, logoPreview) }} />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
                  {error}
                </div>
              )}
            </>)}

          </div>

          {/* Footer nav */}
          <div style={{ padding: `20px ${px}px 28px`, marginTop: 20 }}>
            {/* Back link */}
            {step > 1 && step <= 5 && (
              <button onClick={() => go(step - 1)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, padding: 0, fontFamily: f.family }}>
                <ArrowLeft size={13} /> Back to {STEPS[step - 2].name}
              </button>
            )}

            {/* Primary */}
            {step === 1 && (
              <button onClick={handleCreateAccount} disabled={!canStep1 || loading} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: canStep1 && !loading ? ink : 'rgba(0,0,0,0.18)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: canStep1 && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: f.family, letterSpacing: '-0.01em',
              }}>
                {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</> : <>Continue <ChevronRight size={15} /></>}
              </button>
            )}
            {step === 2 && (
              <button onClick={() => canStep2 && go(3)} disabled={!canStep2} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: canStep2 ? ink : 'rgba(0,0,0,0.18)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: canStep2 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em',
              }}>
                Continue <ChevronRight size={15} />
              </button>
            )}
            {step === 3 && (
              <button onClick={() => canStep3 && go(4)} disabled={!canStep3} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: canStep3 ? ink : 'rgba(0,0,0,0.18)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: canStep3 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em',
              }}>
                Continue <ChevronRight size={15} />
              </button>
            )}
            {step === 4 && (<>
              <button onClick={() => go(5)} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: ink, color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: f.family, letterSpacing: '-0.01em',
              }}>
                Continue <ChevronRight size={15} />
              </button>
              <button onClick={() => go(5)} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', fontSize: 13, color: muted, cursor: 'pointer', textDecoration: 'underline', fontFamily: f.family }}>
                Skip
              </button>
            </>)}
            {step === 5 && (<>
              <button onClick={handleSubmit} disabled={loading} style={{
                width: '100%', height: 44, borderRadius: 10,
                background: loading ? 'rgba(0,0,0,0.18)' : ink, color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: f.family, letterSpacing: '-0.01em',
              }}>
                {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <>Launch deal flow <ChevronRight size={15} /></>}
              </button>
              <button onClick={handleSubmit} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', fontSize: 13, color: muted, cursor: 'pointer', textDecoration: 'underline', fontFamily: f.family }}>
                Skip & finish
              </button>
            </>)}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: muted, marginTop: 20 }}>
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
