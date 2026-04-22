'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Shield, Building2, Target, Sparkles, CheckCircle2,
  ArrowRight, TrendingUp, Users, DollarSign, Globe,
  Eye, EyeOff, Loader2, Check, Camera, Cpu, FileText, UploadCloud, X,
} from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green } from '@/lib/constants/colors'

// ─── design tokens ────────────────────────────────────────────────────────────

interface FormData {
  email: string; password: string
  firstName: string; lastName: string; phone: string; linkedin: string
  firmName: string; firmType: string; firmSize: string; aum: string
  website: string; location: string
  checkSize: string[]; stages: string[]; sectors: string[]; geography: string[]
  thesis: string; dealFlow: string; decisionProcess: string; timeline: string
}

const INITIAL: FormData = {
  email: '', password: '',
  firstName: '', lastName: '', phone: '', linkedin: '',
  firmName: '', firmType: '', firmSize: '', aum: '', website: '', location: '',
  checkSize: [], stages: [], sectors: [], geography: [],
  thesis: '', dealFlow: '', decisionProcess: '', timeline: '',
}

const STEP_LABELS = ['Account', 'Personal', 'Firm', 'Criteria', 'Thesis', 'Photo']
const STEP_ICONS  = [Shield, Users, Building2, Target, Sparkles, Camera]
const STEP_COLORS = [blue, green, '#7C3AED', '#D97706', '#DB2777', '#0891B2']

type Mode = 'choice' | 'signin' | 'signup'

export default function InvestorOnboarding() {
  const [mode, setMode]           = useState<Mode>('choice')
  const [step, setStep]           = useState(1)
  const [form, setForm]           = useState<FormData>(INITIAL)
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [processingStep, setProcessingStep] = useState(0)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [thesisUploading, setThesisUploading] = useState(false)
  const [thesisFileName, setThesisFileName] = useState<string | null>(null)
  const thesisInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const totalSteps = 6

  useEffect(() => {
    import('@/features/auth/services/auth.service')
      .then(({ getSession }) => getSession())
      .then(session => { if (session) router.replace('/investor/dashboard') })
      .catch(() => {})
  }, [router])

  const set = (field: keyof FormData, value: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggle = (field: keyof FormData, value: string) => {
    const arr = form[field] as string[]
    set(field, arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value])
  }

  const handleSignIn = async () => {
    if (!form.email || !form.password) { setError('Email and password are required'); return }
    setError(''); setLoading(true)
    try {
      const { signInWithPassword } = await import('@/features/auth/services/auth.service')
      await signInWithPassword(form.email, form.password)
      router.push('/investor/dashboard')
    } catch {
      setError('Invalid email or password')
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (!form.email || !form.password) { setError('Email and password are required'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
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
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const handleNext = () => {
    if (step === 2 && (!form.firstName.trim() || !form.lastName.trim())) {
      setError('First name and last name are required')
      return
    }
    setError('')
    setStep(s => Math.min(s + 1, totalSteps))
  }
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  async function handleThesisUpload(file: File) {
    setThesisUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/thesis', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.text) {
        set('thesis', data.text)
        setThesisFileName(file.name)
      }
    } finally {
      setThesisUploading(false)
    }
  }

  async function handleAvatarUpload(file: File) {
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('imageType', 'investor-avatar')
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) setAvatarUrl(data.url)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    let savedOk = false
    try {
      const res = await fetch('/api/investor/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        savedOk = true
      } else {
        const errBody = await res.json().catch(() => ({}))
        console.error('Investor onboarding save error:', errBody)
      }
    } catch (err) { console.error('Investor onboarding error:', err) }

    setStep(7); setLoading(false)

    // Animate processing steps
    const msgs = ['Saving investor profile', 'Analysing your investment thesis', 'Scoring founders against your criteria', 'Curating personalised deal flow']
    for (let i = 0; i < msgs.length; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? 400 : 900))
      setProcessingStep(i + 1)
    }

    // Only personalise if the profile was actually saved
    if (savedOk) {
      try { await fetch('/api/investor/personalize', { method: 'POST' }) } catch { /* non-blocking */ }
    }
    await new Promise(r => setTimeout(r, 600))
    router.push('/investor/dashboard')
  }

  // ─── shared styles ────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 9,
    border: `1.5px solid ${bdr}`, background: 'white', color: ink,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, marginBottom: 7,
  }
  const chipStyle = (selected: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
    border: `1.5px solid ${selected ? blue : bdr}`,
    background: selected ? '#EFF6FF' : 'white',
    color: selected ? blue : ink,
    fontWeight: selected ? 600 : 400,
    userSelect: 'none', transition: 'all 0.12s',
  })
  const btnPrimary: React.CSSProperties = {
    padding: '12px 24px', borderRadius: 10, border: 'none',
    background: ink, color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: '0 2px 8px rgba(24,22,15,0.15)',
    transition: 'opacity 0.15s',
  }
  const btnSecondary: React.CSSProperties = {
    padding: '12px 20px', borderRadius: 10,
    border: `1.5px solid ${bdr}`, background: 'white',
    color: ink, fontSize: 14, fontWeight: 500, cursor: 'pointer',
    transition: 'border-color 0.15s',
  }

  // ─── step progress ────────────────────────────────────────────────────────
  const renderProgress = () => (
    <div style={{ marginBottom: 44 }}>
      {/* progress bar */}
      <div style={{ height: 3, background: surf, borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: ink,
          width: `${((step - 1) / (totalSteps - 1)) * 100}%`,
          transition: 'width 0.4s ease', borderRadius: 3,
        }} />
      </div>
      {/* step dots + labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        {STEP_LABELS.map((label, i) => {
          const done    = i + 1 < step
          const current = i + 1 === step
          return (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? ink : current ? ink : surf,
                color: done || current ? '#fff' : muted,
                border: `1.5px solid ${done || current ? ink : bdr}`,
                transition: 'all 0.25s',
                boxShadow: current ? '0 0 0 4px rgba(24,22,15,0.08)' : 'none',
              }}>
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </div>
              <span style={{
                fontSize: 10, fontWeight: current ? 700 : 400,
                color: current ? ink : done ? muted : muted,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const sectionHeader = (stepIdx: number, title: string, sub: string) => {
    const Icon  = STEP_ICONS[stepIdx - 1] ?? Shield
    const color = STEP_COLORS[stepIdx - 1] ?? blue
    return (
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, margin: '0 auto 18px',
          background: `${color}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${color}28`,
        }}>
          <Icon size={26} color={color} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', color: ink }}>{title}</h2>
        <p style={{ fontSize: 14, color: muted, margin: 0, lineHeight: 1.6 }}>{sub}</p>
      </div>
    )
  }

  // ─── Choice screen ────────────────────────────────────────────────────────
  const renderChoice = () => {
    return (
      <div>
        {/* hero */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 999,
            background: '#EFF6FF', color: blue, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
          }}>Investor Platform</span>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 300,
            letterSpacing: '-0.04em', color: ink, margin: '0 0 14px', lineHeight: 1.1,
          }}>
            Deal flow that&apos;s<br />
            <span style={{ fontWeight: 800 }}>already scored.</span>
          </h1>
          <p style={{ fontSize: 14, color: muted, lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
            Every founder is evaluated across 6 dimensions before reaching your pipeline.
            You review signal, not noise.
          </p>
        </div>

        {/* stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: bdr, borderRadius: 12, overflow: 'hidden', marginBottom: 24,
        }}>
          {[
            { value: '847', label: 'scored founders' },
            { value: '92%', label: 'match accuracy' },
            { value: '3 days', label: 'avg response' },
          ].map(s => (
            <div key={s.label} style={{ background: surf, padding: '14px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: ink, margin: '0 0 2px', letterSpacing: '-0.03em' }}>{s.value}</p>
              <p style={{ fontSize: 10, color: muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* platform features */}
        <div style={{ border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '9px 16px', background: surf, borderBottom: `1px solid ${bdr}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              What you get
            </span>
          </div>
          {[
            { icon: '⚡', title: 'Q-Score on every founder', desc: 'AI-evaluated across 6 dimensions — GTM, financials, team, product, traction, legal' },
            { icon: '🎯', title: 'Sector & stage filtering', desc: 'Only see founders that match your thesis, check size, and investment stage' },
            { icon: '📬', title: 'Direct connection requests', desc: 'Founders reach out with personalised messages and their Q-Score attached' },
          ].map((f, i, arr) => (
            <div key={f.title} style={{
              display: 'flex', gap: 14, padding: '13px 16px', alignItems: 'flex-start',
              borderBottom: i < arr.length - 1 ? `1px solid ${bdr}` : 'none',
              background: bg,
            }}>
              <span style={{ fontSize: 20, lineHeight: 1, marginTop: 1 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: '0 0 2px' }}>{f.title}</p>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── CTAs ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {/* Primary — create account */}
          <button
            onClick={() => { setMode('signup'); setStep(1) }}
            style={{
              padding: '18px 22px', borderRadius: 14, border: 'none',
              background: ink, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(24,22,15,0.20)',
              transition: 'transform 0.12s, box-shadow 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(24,22,15,0.26)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(24,22,15,0.20)'
            }}
          >
            <div>
              <div style={{ marginBottom: 4 }}>
                <span style={{
                  display: 'inline-block', padding: '2px 9px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.14)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)',
                }}>New investor</span>
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 3px', letterSpacing: '-0.01em' }}>
                Create your account
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, fontWeight: 400 }}>
                Free · 5-minute setup · Instant access
              </p>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ArrowRight size={18} color="#fff" />
            </div>
          </button>

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: bdr }} />
            <span style={{ fontSize: 11, color: muted, fontWeight: 500, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: bdr }} />
          </div>

          {/* Secondary — sign in */}
          <button
            onClick={() => setMode('signin')}
            style={{
              background: 'none', border: `1.5px solid ${bdr}`,
              borderRadius: 10, padding: '12px 20px',
              width: '100%', cursor: 'pointer', color: muted,
              fontSize: 13, textAlign: 'center', transition: 'border-color 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ink }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = bdr }}
          >
            Already have an account?{' '}
            <strong style={{ color: ink, fontWeight: 600 }}>Sign in</strong>
          </button>
        </div>

        {/* trust bar */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
          padding: '10px 0', borderTop: `1px solid ${bdr}`, borderBottom: `1px solid ${bdr}`,
        }}>
          {['Invite-only beta', '500+ founders scored', 'Seed & Series A funds'].map(t => (
            <span key={t} style={{ fontSize: 11, color: muted, fontWeight: 500 }}>· {t}</span>
          ))}
        </div>
      </div>
    )
  }

  // ─── Sign In ──────────────────────────────────────────────────────────────
  const renderSignIn = () => (
    <div>
      {sectionHeader(1, 'Welcome back', 'Sign in to your investor account')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Work Email</label>
          <input style={inputStyle} type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            onFocus={e => (e.target.style.borderColor = blue)}
            onBlur={e => (e.target.style.borderColor = bdr)}
            placeholder="you@fund.com"
            onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 44 }}
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              onFocus={e => (e.target.style.borderColor = blue)}
              onBlur={e => (e.target.style.borderColor = bdr)}
              placeholder="Your password"
              onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
            <button onClick={() => setShowPwd(v => !v)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0,
            }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}
        <button style={{ ...btnPrimary, justifyContent: 'center', width: '100%' }}
          onClick={handleSignIn} disabled={loading}>
          {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</> : <>Sign In <ArrowRight size={15} /></>}
        </button>
        <p style={{ fontSize: 13, color: muted, textAlign: 'center', margin: 0 }}>
          New to Edge Alpha?{' '}
          <span style={{ color: blue, cursor: 'pointer', fontWeight: 600 }}
            onClick={() => { setMode('signup'); setStep(1); setError('') }}>
            Create an account
          </span>
        </p>
      </div>
    </div>
  )

  // ─── Step 1: Account ──────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div>
      {sectionHeader(1, 'Create your account', 'Start your journey to smarter deal flow')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Work Email</label>
          <input style={inputStyle} type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            onFocus={e => (e.target.style.borderColor = blue)}
            onBlur={e => (e.target.style.borderColor = bdr)}
            placeholder="you@fund.com" />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 44 }}
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              onFocus={e => (e.target.style.borderColor = blue)}
              onBlur={e => (e.target.style.borderColor = bdr)}
              placeholder="At least 6 characters"
              onKeyDown={e => e.key === 'Enter' && handleCreateAccount()} />
            <button onClick={() => setShowPwd(v => !v)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0,
            }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.password.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 3,
                  background: form.password.length >= i * 3
                    ? (form.password.length < 6 ? '#D97706' : form.password.length < 10 ? blue : green)
                    : surf,
                  transition: 'background 0.2s',
                }} />
              ))}
              <span style={{ fontSize: 10, color: muted, alignSelf: 'center', marginLeft: 4, whiteSpace: 'nowrap' }}>
                {form.password.length < 6 ? 'Too short' : form.password.length < 10 ? 'Good' : 'Strong'}
              </span>
            </div>
          )}
        </div>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}
        <button style={{ ...btnPrimary, justifyContent: 'center', width: '100%' }}
          onClick={handleCreateAccount} disabled={loading}>
          {loading
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</>
            : <>Create Account <ArrowRight size={15} /></>}
        </button>
        <p style={{ fontSize: 13, color: muted, textAlign: 'center', margin: 0 }}>
          Already have an account?{' '}
          <span style={{ color: blue, cursor: 'pointer', fontWeight: 600 }}
            onClick={() => { setMode('signin'); setError('') }}>Sign in</span>
        </p>
      </div>
    </div>
  )

  // ─── Step 2: Personal Info ────────────────────────────────────────────────
  const renderStep2 = () => (
    <div>
      {sectionHeader(2, 'Personal Information', 'Tell us who you are')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input style={inputStyle} value={form.firstName}
              onChange={e => set('firstName', e.target.value)}
              onFocus={e => (e.target.style.borderColor = blue)}
              onBlur={e => (e.target.style.borderColor = bdr)}
              placeholder="Alex" />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input style={inputStyle} value={form.lastName}
              onChange={e => set('lastName', e.target.value)}
              onFocus={e => (e.target.style.borderColor = blue)}
              onBlur={e => (e.target.style.borderColor = bdr)}
              placeholder="Thompson" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>LinkedIn Profile</label>
          <input style={inputStyle} value={form.linkedin}
            onChange={e => set('linkedin', e.target.value)}
            onFocus={e => (e.target.style.borderColor = blue)}
            onBlur={e => (e.target.style.borderColor = bdr)}
            placeholder="https://linkedin.com/in/yourprofile" />
        </div>
        <div>
          <label style={labelStyle}>Phone <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <input style={inputStyle} type="tel" value={form.phone}
            onChange={e => set('phone', e.target.value)}
            onFocus={e => (e.target.style.borderColor = blue)}
            onBlur={e => (e.target.style.borderColor = bdr)}
            placeholder="+1 555 000 0000" />
        </div>
        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button style={btnSecondary} onClick={handleBack}
            onMouseEnter={e => (e.currentTarget.style.borderColor = ink)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}>← Back</button>
          <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }} onClick={handleNext}>
            Continue <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Step 3: Firm Info ────────────────────────────────────────────────────
  const renderStep3 = () => {
    const firmTypes = [
      ['vc', 'Venture Capital'], ['pe', 'Private Equity'], ['angel', 'Angel Group'],
      ['family-office', 'Family Office'], ['corporate', 'Corporate VC'], ['accelerator', 'Accelerator'],
    ]
    const aumRanges = ['<10m', '10-50m', '50-100m', '100-500m', '500m-1b', '>1b']
    const aumLabels: Record<string, string> = {
      '<10m': 'Under $10M', '10-50m': '$10–$50M', '50-100m': '$50–$100M',
      '100-500m': '$100–$500M', '500m-1b': '$500M–$1B', '>1b': '$1B+',
    }
    return (
      <div>
        {sectionHeader(3, 'Firm Information', 'Tell us about where you invest from')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <label style={labelStyle}>Firm Name</label>
            <input style={inputStyle} value={form.firmName}
              onChange={e => set('firmName', e.target.value)}
              onFocus={e => (e.target.style.borderColor = blue)}
              onBlur={e => (e.target.style.borderColor = bdr)}
              placeholder="Apex Ventures" />
          </div>
          <div>
            <label style={labelStyle}>Firm Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {firmTypes.map(([val, label]) => (
                <span key={val} style={chipStyle(form.firmType === val)} onClick={() => set('firmType', val)}>
                  {form.firmType === val && <Check size={12} strokeWidth={3} />}
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Assets Under Management</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {aumRanges.map(val => (
                <span key={val} style={chipStyle(form.aum === val)} onClick={() => set('aum', val)}>
                  {form.aum === val && <Check size={12} strokeWidth={3} />}
                  {aumLabels[val]}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Website <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input style={inputStyle} value={form.website}
                onChange={e => set('website', e.target.value)}
                onFocus={e => (e.target.style.borderColor = blue)}
                onBlur={e => (e.target.style.borderColor = bdr)}
                placeholder="apexventures.com" />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={form.location}
                onChange={e => set('location', e.target.value)}
                onFocus={e => (e.target.style.borderColor = blue)}
                onBlur={e => (e.target.style.borderColor = bdr)}
                placeholder="San Francisco, CA" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button style={btnSecondary} onClick={handleBack}
              onMouseEnter={e => (e.currentTarget.style.borderColor = ink)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}>← Back</button>
            <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }} onClick={handleNext}>
              Continue <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 4: Investment Criteria ──────────────────────────────────────────
  const renderStep4 = () => {
    const checks  = ['$25K–$100K', '$100K–$500K', '$500K–$1M', '$1M–$5M', '$5M–$25M', '$25M+']
    const stages  = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth']
    const sectors = ['AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Marketplace', 'DeepTech', 'Consumer', 'Enterprise', 'Climate', 'Crypto/Web3', 'EdTech']
    const geos    = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Global']

    const cardStyle = (selected: boolean): React.CSSProperties => ({
      padding: '10px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
      border: `1.5px solid ${selected ? blue : bdr}`,
      background: selected ? '#EFF6FF' : 'white',
      fontSize: 12, fontWeight: selected ? 600 : 400,
      color: selected ? blue : ink, transition: 'all 0.13s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      minHeight: 44, userSelect: 'none',
    })

    const group = (title: string, Icon: React.ElementType, items: string[], field: keyof FormData, cols: number) => (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Icon size={13} color={muted} />
          <label style={{ ...labelStyle, margin: 0 }}>{title}</label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 7 }}>
          {items.map(item => {
            const selected = (form[field] as string[]).includes(item)
            return (
              <div key={item} style={cardStyle(selected)} onClick={() => toggle(field, item)}>
                {selected && <Check size={11} strokeWidth={3} />}
                {item}
              </div>
            )
          })}
        </div>
      </div>
    )

    return (
      <div>
        {sectionHeader(4, 'Investment Criteria', 'Define what you look for in deals')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* AI hint banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 9, background: `${blue}0A`, border: `1px solid ${blue}20` }}>
            <Sparkles size={13} color={blue} />
            <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>
              Our AI reads these signals to rank founders by fit, not recency.
            </p>
          </div>
          {group('Typical Check Size', DollarSign, checks, 'checkSize', 3)}
          <div style={{ height: 1, background: bdr }} />
          {group('Investment Stages', TrendingUp, stages, 'stages', 2)}
          <div style={{ height: 1, background: bdr }} />
          {group('Preferred Sectors', Cpu, sectors, 'sectors', 3)}
          <div style={{ height: 1, background: bdr }} />
          {group('Geographic Focus', Globe, geos, 'geography', 2)}
          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button style={btnSecondary} onClick={handleBack}
              onMouseEnter={e => (e.currentTarget.style.borderColor = ink)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}>← Back</button>
            <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }} onClick={handleNext}>
              Continue <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 5: Thesis ───────────────────────────────────────────────────────
  const renderStep5 = () => (
    <div>
      {sectionHeader(5, 'Investment Thesis', 'Help our AI surface the right founders')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Your Investment Thesis</label>
          <p style={{ fontSize: 12, color: muted, margin: '0 0 10px' }}>
            Upload a document or type directly below.
          </p>

          {/* Upload zone */}
          <label
            htmlFor="thesis-doc-input"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 10, marginBottom: 12,
              border: `1.5px dashed ${thesisFileName ? green : bdr}`,
              background: thesisFileName ? `${green}08` : surf,
              cursor: thesisUploading ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {thesisUploading ? (
              <Loader2 size={18} color={muted} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            ) : thesisFileName ? (
              <FileText size={18} color={green} style={{ flexShrink: 0 }} />
            ) : (
              <UploadCloud size={18} color={muted} style={{ flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: thesisFileName ? green : ink, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {thesisUploading ? 'Extracting text…' : thesisFileName ?? 'Upload PDF, Word, or .txt file'}
              </p>
              {!thesisUploading && !thesisFileName && (
                <p style={{ fontSize: 11, color: muted, margin: 0, marginTop: 2 }}>
                  Text will be extracted and pre-filled below
                </p>
              )}
              {thesisFileName && !thesisUploading && (
                <p style={{ fontSize: 11, color: green, margin: 0, marginTop: 2 }}>Extracted · edit below if needed</p>
              )}
            </div>
            {thesisFileName && !thesisUploading && (
              <button
                onClick={e => { e.preventDefault(); setThesisFileName(null); set('thesis', '') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            )}
            <input
              id="thesis-doc-input"
              ref={thesisInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              disabled={thesisUploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleThesisUpload(f); e.target.value = '' }}
              style={{ display: 'none' }}
            />
          </label>

          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: bdr }} />
            <span style={{ fontSize: 10, color: muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>or type directly</span>
            <div style={{ flex: 1, height: 1, background: bdr }} />
          </div>

          <textarea
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 } as React.CSSProperties}
            value={form.thesis}
            onChange={e => set('thesis', e.target.value)}
            onFocus={e => (e.target.style.borderColor = blue)}
            onBlur={e => (e.target.style.borderColor = bdr)}
            placeholder="We back early-stage B2B SaaS founders solving complex enterprise workflows using AI…"
          />
        </div>
        <div>
          <label style={labelStyle}>Deal Sourcing Strategy</label>
          <textarea
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 } as React.CSSProperties}
            value={form.dealFlow}
            onChange={e => set('dealFlow', e.target.value)}
            onFocus={e => (e.target.style.borderColor = blue)}
            onBlur={e => (e.target.style.borderColor = bdr)}
            placeholder="Portfolio referrals, university networks, co-investment with other VCs…"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Decision Timeline</label>
            <select
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' } as React.CSSProperties}
              value={form.decisionProcess}
              onChange={e => set('decisionProcess', e.target.value)}
              onFocus={e => (e.target.style.borderColor = blue)}
              onBlur={e => (e.target.style.borderColor = bdr)}>
              <option value="">Select…</option>
              <option value="1-2weeks">1–2 weeks</option>
              <option value="2-4weeks">2–4 weeks</option>
              <option value="1-2months">1–2 months</option>
              <option value="2-3months">2–3 months</option>
              <option value="3+months">3+ months</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Deals Reviewed / Month</label>
            <select
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' } as React.CSSProperties}
              value={form.timeline}
              onChange={e => set('timeline', e.target.value)}
              onFocus={e => (e.target.style.borderColor = blue)}
              onBlur={e => (e.target.style.borderColor = bdr)}>
              <option value="">Select…</option>
              <option value="1-5">1–5 deals</option>
              <option value="6-15">6–15 deals</option>
              <option value="16-30">16–30 deals</option>
              <option value="30+">30+ deals</option>
            </select>
          </div>
        </div>

        {/* AI matching info */}
        <div style={{ padding: '16px 18px', borderRadius: 12, background: '#EFF6FF', border: `1px solid #BFDBFE` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={15} color={blue} />
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: ink }}>AI-Powered Matching</p>
          </div>
          <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.6 }}>
            After setup, our AI reads your thesis and scores every founder on the platform against it — so your deal flow is ranked by fit, not recency.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button style={btnSecondary} onClick={handleBack}
            onMouseEnter={e => (e.currentTarget.style.borderColor = ink)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}>← Back</button>
          <button
            style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
            onClick={handleNext}>
            Continue <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Step 6: Profile Photo ─────────────────────────────────────────────────
  const renderStep6 = () => {
    const initials = form.firstName
      ? `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase()
      : 'YO'
    return (
      <div>
        {sectionHeader(6, 'Add your photo', 'A profile photo helps founders recognise you. Completely optional.')}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Label wraps the input — works in all browsers without ref.click() */}
          <label htmlFor="investor-avatar-input" style={{ cursor: avatarUploading ? 'default' : 'pointer', display: 'inline-block', position: 'relative' }}>
            <div style={{
              width: 108, height: 108, borderRadius: '50%',
              border: `2.5px dashed ${avatarUrl ? green : bdr}`,
              background: surf, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s', position: 'relative',
            }}>
              {avatarUploading ? (
                <Loader2 size={24} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
              ) : avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 30, fontWeight: 700, color: muted }}>{initials}</span>
              )}
              {!avatarUploading && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
                  <Camera size={20} color="#fff" style={{ opacity: 0.9 }} />
                </div>
              )}
            </div>
            <input
              id="investor-avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={avatarUploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = '' }}
              style={{ display: 'none' }}
            />
          </label>

          <p style={{ fontSize: 13, color: avatarUrl ? '#059669' : muted, fontWeight: avatarUrl ? 500 : 400, margin: 0 }}>
            {avatarUploading ? 'Uploading…' : avatarUrl ? 'Photo uploaded! Looking good.' : 'Click the circle to choose a photo.'}
          </p>

          <div style={{ display: 'flex', gap: 12, paddingTop: 8, width: '100%' }}>
            <button style={btnSecondary} onClick={() => handleSubmit()}
              onMouseEnter={e => (e.currentTarget.style.borderColor = ink)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}>Skip for now</button>
            <button
              style={{ ...btnPrimary, flex: 1, justifyContent: 'center', background: green, boxShadow: '0 2px 12px rgba(22,163,74,0.22)', opacity: avatarUploading ? 0.55 : 1, cursor: avatarUploading ? 'not-allowed' : 'pointer' }}
              onClick={() => handleSubmit()} disabled={avatarUploading || loading}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                : avatarUploading ? 'Uploading…'
                : <><CheckCircle2 size={15} /> Complete Setup</>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Processing ───────────────────────────────────────────────────────────
  const renderProcessing = () => {
    const steps = [
      { label: 'Saving investor profile',             done: processingStep >= 1 },
      { label: 'Analysing your investment thesis',    done: processingStep >= 2 },
      { label: 'Scoring founders against your criteria', done: processingStep >= 3 },
      { label: 'Curating personalised deal flow',     done: processingStep >= 4 },
    ]
    return (
      <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>

        {/* spinner ring */}
        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 28px' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `3px solid ${surf}`,
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `3px solid transparent`,
            borderTopColor: blue,
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 6, borderRadius: '50%',
            background: surf, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={22} color={blue} />
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', color: ink }}>
          Setting up your dashboard
        </h2>
        <p style={{ fontSize: 14, color: muted, margin: '0 0 44px', lineHeight: 1.6 }}>
          Personalising your deal flow — this takes a moment
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 340, margin: '0 auto' }}>
          {steps.map((s, i) => (
            <div
              key={s.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 0',
                borderBottom: i < steps.length - 1 ? `1px solid ${bdr}` : 'none',
                opacity: processingStep >= i ? 1 : 0.3,
                transition: 'opacity 0.4s ease',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: s.done ? green : processingStep === i ? '#EFF6FF' : surf,
                border: `1.5px solid ${s.done ? green : processingStep === i ? blue : bdr}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s',
              }}>
                {s.done
                  ? <Check size={13} color="#fff" strokeWidth={3} />
                  : processingStep === i
                  ? <Loader2 size={13} color={blue} style={{ animation: 'spin 1s linear infinite' }} />
                  : null}
              </div>
              <span style={{ fontSize: 14, color: s.done ? ink : muted, textAlign: 'left', fontWeight: s.done ? 500 : 400 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── layout ───────────────────────────────────────────────────────────────
  const isProcessing = mode === 'signup' && step === 7
  const isChoice     = mode === 'choice'
  const showProgress = mode === 'signup' && step >= 1 && step <= 6

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: 'inherit' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* nav — minimal floating bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 300, fontSize: 13, letterSpacing: '-0.02em', color: ink }}>Edge Alpha</span>
          <span style={{ color: bdr }}>·</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: blue, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Investor</span>
        </div>
        {showProgress && (
          <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>Step {step} of {totalSteps}</span>
        )}
        {(mode === 'signin' || (mode === 'signup' && step > 1)) && (
          <button
            onClick={() => {
              if (mode === 'signin') { setMode('choice'); setError('') }
              else if (step > 1) handleBack()
            }}
            style={{ fontSize: 12, color: muted, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            ← Back
          </button>
        )}
        {isChoice && (
          <button
            onClick={() => setMode('signin')}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${bdr}`, background: 'white', color: ink, cursor: 'pointer',
            }}>
            Sign in
          </button>
        )}
      </div>

      {/* body */}
      <div style={{ maxWidth: isChoice ? 560 : 640, margin: '0 auto', padding: '48px 24px 80px' }}>
        {isChoice && renderChoice()}
        {mode === 'signin' && renderSignIn()}
        {mode === 'signup' && step === 1 && renderStep1()}
        {mode === 'signup' && step === 2 && renderStep2()}
        {mode === 'signup' && step === 3 && renderStep3()}
        {mode === 'signup' && step === 4 && renderStep4()}
        {mode === 'signup' && step === 5 && renderStep5()}
        {mode === 'signup' && step === 6 && renderStep6()}
        {isProcessing && renderProcessing()}

        {/* Step progress — bottom of content */}
        {showProgress && (
          <div style={{ marginTop: 32 }}>
            {renderProgress()}
          </div>
        )}
      </div>
    </div>
  )
}
