'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Building2, Target, Sparkles, CheckCircle2,
  ArrowRight, TrendingUp, Users, DollarSign, Globe, Eye, EyeOff, Loader2
} from 'lucide-react'

// ─── design tokens ────────────────────────────────────────────────────────────
const bg    = '#F9F7F2'
const surf  = '#F0EDE6'
const bdr   = '#E2DDD5'
const ink   = '#18160F'
const muted = '#8A867C'
const blue  = '#2563EB'

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

type Mode = 'choice' | 'signin' | 'signup'

export default function InvestorOnboarding() {
  const [mode, setMode]           = useState<Mode>('choice')
  const [step, setStep]           = useState(1)   // 1=account, 2=personal, 3=firm, 4=criteria, 5=thesis, 6=processing
  const [form, setForm]           = useState<FormData>(INITIAL)
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [processingMsg, setProcessingMsg] = useState('Saving your profile…')
  const router = useRouter()

  // Redirect already-authenticated investors to dashboard
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace('/investor/dashboard')
      })
    })
  }, [router])

  const totalSteps = 5
  const set = (field: keyof FormData, value: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggle = (field: keyof FormData, value: string) => {
    const arr = form[field] as string[]
    set(field, arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value])
  }

  // ── Sign In ──────────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!form.email || !form.password) { setError('Email and password are required'); return }
    setError(''); setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      })
      if (signInErr) { setError('Invalid email or password'); setLoading(false); return }
      router.push('/investor/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // ── Step 1: Account creation ────────────────────────────────────────────────
  const handleCreateAccount = async () => {
    if (!form.email || !form.password) { setError('Email and password are required'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/investor-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create account'); setLoading(false); return }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      })
      if (signInErr) { setError(signInErr.message); setLoading(false); return }

      setStep(2)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  // ── Steps 2-4: advance ──────────────────────────────────────────────────────
  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  // ── Step 5: final submit → step 6: AI processing ───────────────────────────
  const handleSubmit = async () => {
    setLoading(true)
    // Save profile data
    try {
      const res = await fetch('/api/investor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Investor onboarding save error:', err)
      }
    } catch (err) {
      console.error('Investor onboarding error:', err)
    }

    // Move to AI processing step
    setStep(6)
    setLoading(false)

    // Run AI personalization in the background
    setProcessingMsg('Analysing your investment thesis…')
    await new Promise(r => setTimeout(r, 900))
    setProcessingMsg('Scanning founder deal flow for matches…')
    await new Promise(r => setTimeout(r, 1100))

    try {
      await fetch('/api/investor/personalize', { method: 'POST' })
    } catch {
      // non-blocking — dashboard will still load
    }

    setProcessingMsg('Curating your personalised dashboard…')
    await new Promise(r => setTimeout(r, 800))

    router.push('/investor/dashboard')
  }

  // ─── shared styles ───────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${bdr}`, background: surf, color: ink,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: muted,
    marginBottom: 6,
  }
  const chipStyle = (selected: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
    border: `1px solid ${selected ? blue : bdr}`,
    background: selected ? blue : 'transparent',
    color: selected ? '#fff' : ink,
    userSelect: 'none',
  })
  const btnPrimary: React.CSSProperties = {
    padding: '12px 28px', borderRadius: 999, border: 'none',
    background: ink, color: bg, fontSize: 14, fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    display: 'flex', alignItems: 'center', gap: 8,
  }
  const btnSecondary: React.CSSProperties = {
    padding: '12px 28px', borderRadius: 999,
    border: `1px solid ${bdr}`, background: 'transparent',
    color: ink, fontSize: 14, fontWeight: 500, cursor: 'pointer',
  }

  // ─── progress dots ────────────────────────────────────────────────────────
  const renderProgress = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: i + 1 <= step ? ink : surf,
          color: i + 1 <= step ? bg : muted,
          border: `1px solid ${i + 1 <= step ? ink : bdr}`,
          transition: 'all 0.2s',
        }}>
          {i + 1 < step ? <CheckCircle2 size={14} /> : i + 1}
        </div>
      ))}
    </div>
  )

  const sectionTitle = (title: string, sub: string, Icon: React.ElementType) => (
    <div style={{ textAlign: 'center', marginBottom: 36 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', background: surf,
        border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <Icon size={24} color={blue} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.03em', margin: '0 0 8px' }}>{title}</h2>
      <p style={{ fontSize: 14, color: muted, margin: 0 }}>{sub}</p>
    </div>
  )

  // ─── Choice screen ─────────────────────────────────────────────────────────
  const renderChoice = () => {
    const mockDeals = [
      { name: 'Kairo AI', sector: 'AI/ML', stage: 'Seed', q: 84, match: 96, momentum: '#F0FDF4', mColor: '#16A34A' },
      { name: 'Lendify', sector: 'Fintech', stage: 'Pre-Seed', q: 71, match: 88, momentum: '#FFFBEB', mColor: '#D97706' },
      { name: 'OpsNova', sector: 'SaaS', stage: 'Seed', q: 78, match: 82, momentum: '#EFF6FF', mColor: blue },
    ]
    return (
      <div>
        {/* hero ──────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 999,
            background: '#EFF6FF', color: blue, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18,
          }}>
            Investor Platform
          </span>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 300,
            letterSpacing: '-0.04em', color: ink, margin: '0 0 14px', lineHeight: 1.1,
          }}>
            Deal flow that&apos;s<br />
            <span style={{ fontWeight: 700 }}>already scored.</span>
          </h1>
          <p style={{ fontSize: 14, color: muted, lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
            Every founder on Edge Alpha is evaluated across 6 dimensions before appearing in your pipeline.
            You review signal, not noise.
          </p>
        </div>

        {/* stats row ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1, background: bdr, borderRadius: 12, overflow: 'hidden', marginBottom: 28,
        }}>
          {[
            { value: '847', label: 'scored founders' },
            { value: '92%', label: 'match accuracy' },
            { value: '3 days', label: 'avg response time' },
          ].map(s => (
            <div key={s.label} style={{ background: surf, padding: '16px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: ink, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* sample deal flow preview ─────────────────────────────────────── */}
        <div style={{
          border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden', marginBottom: 28,
        }}>
          <div style={{
            padding: '10px 16px', background: surf, borderBottom: `1px solid ${bdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: muted }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Sample deal flow
              </span>
            </div>
            <span style={{ fontSize: 11, color: muted, fontStyle: 'italic' }}>Example preview</span>
          </div>
          {mockDeals.map((d, i) => (
            <div key={d.name} style={{
              display: 'grid', gridTemplateColumns: '1fr 56px 72px',
              gap: 12, padding: '12px 16px', alignItems: 'center',
              borderBottom: i < mockDeals.length - 1 ? `1px solid ${bdr}` : 'none',
              background: bg,
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: '0 0 2px' }}>{d.name}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 10, color: muted }}>{d.sector}</span>
                  <span style={{ fontSize: 10, color: muted }}>·</span>
                  <span style={{ fontSize: 10, color: muted }}>{d.stage}</span>
                </div>
              </div>
              {/* Q-Score badge */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: `2px solid ${d.q >= 80 ? '#16A34A' : d.q >= 65 ? '#D97706' : '#DC2626'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ink }}>{d.q}</span>
                </div>
                <p style={{ fontSize: 9, color: muted, margin: '2px 0 0', textTransform: 'uppercase' }}>Q-Score</p>
              </div>
              {/* match score */}
              <div style={{ background: d.momentum, borderRadius: 8, padding: '5px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: d.mColor, margin: 0 }}>{d.match}%</p>
                <p style={{ fontSize: 9, color: d.mColor, margin: 0, opacity: 0.7, textTransform: 'uppercase' }}>match</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA buttons ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          <button
            onClick={() => { setMode('signup'); setStep(1) }}
            style={{
              padding: '15px 24px', borderRadius: 12, border: 'none',
              background: ink, color: bg, fontSize: 15, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', transition: 'opacity .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <span>
              <span style={{ display: 'block', fontSize: 11, opacity: 0.55, fontWeight: 400, marginBottom: 1 }}>New investor</span>
              Create your account
            </span>
            <ArrowRight size={17} />
          </button>
          <button
            onClick={() => setMode('signin')}
            style={{
              padding: '15px 24px', borderRadius: 12,
              border: `1px solid ${bdr}`, background: 'transparent',
              color: ink, fontSize: 15, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              <span style={{ display: 'block', fontSize: 11, color: muted, fontWeight: 400, marginBottom: 1 }}>Already have an account</span>
              Sign in
            </span>
            <ArrowRight size={17} color={muted} />
          </button>
        </div>

        {/* feature grid ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { icon: TrendingUp, title: 'Q-Scored pipeline', desc: '6-dimension founder scoring before they reach your inbox' },
            { icon: Sparkles,   title: 'Thesis matching',   desc: 'AI ranks every founder against your specific investment thesis' },
            { icon: Users,      title: 'Direct access',     desc: 'Message founders directly, no warm intro required' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              padding: '14px 12px', borderRadius: 10, background: surf,
              border: `1px solid ${bdr}`,
            }}>
              <Icon size={18} color={blue} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: '0 0 4px' }}>{title}</p>
              <p style={{ fontSize: 11, color: muted, margin: 0, lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Sign In screen ────────────────────────────────────────────────────────
  const renderSignIn = () => (
    <div>
      {sectionTitle('Welcome back', 'Sign in to your investor account', Shield)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="you@fund.com"
            onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, paddingRight: 44 }}
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Your password"
              onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
            <button
              onClick={() => setShowPwd(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: muted }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {error && <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>}
        <button style={{ ...btnPrimary, justifyContent: 'center' }}
          onClick={handleSignIn} disabled={loading}>
          {loading ? 'Signing in…' : <>Sign In <ArrowRight size={16} /></>}
        </button>
        <p style={{ fontSize: 12, color: muted, textAlign: 'center', margin: 0 }}>
          New to Edge Alpha?{' '}
          <span style={{ color: blue, cursor: 'pointer' }}
            onClick={() => { setMode('signup'); setStep(1); setError('') }}>
            Create an account
          </span>
        </p>
      </div>
    </div>
  )

  // ─── Step 1: Account creation ──────────────────────────────────────────────
  const renderStep1 = () => (
    <div>
      {sectionTitle('Create your account', 'Start your journey to smarter deal flow', Shield)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Work Email</label>
          <input style={inputStyle} type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="you@fund.com" />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, paddingRight: 44 }}
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="At least 6 characters"
              onKeyDown={e => e.key === 'Enter' && handleCreateAccount()} />
            <button
              onClick={() => setShowPwd(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: muted }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {error && <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>}
        <button style={{ ...btnPrimary, justifyContent: 'center' }}
          onClick={handleCreateAccount} disabled={loading}>
          {loading ? 'Creating account…' : <>Create Account <ArrowRight size={16} /></>}
        </button>
        <p style={{ fontSize: 12, color: muted, textAlign: 'center', margin: 0 }}>
          Already have an account?{' '}
          <span style={{ color: blue, cursor: 'pointer' }}
            onClick={() => { setMode('signin'); setError('') }}>Sign in</span>
        </p>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div>
      {sectionTitle('Personal Information', 'Tell us who you are', Shield)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input style={inputStyle} value={form.firstName}
              onChange={e => set('firstName', e.target.value)} placeholder="Alex" />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input style={inputStyle} value={form.lastName}
              onChange={e => set('lastName', e.target.value)} placeholder="Thompson" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>LinkedIn Profile</label>
          <input style={inputStyle} value={form.linkedin}
            onChange={e => set('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/alexthompson" />
        </div>
        <div>
          <label style={labelStyle}>Phone (optional)</label>
          <input style={inputStyle} type="tel" value={form.phone}
            onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={btnSecondary} onClick={handleBack}>Back</button>
          <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
            onClick={handleNext}>
            Continue <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => {
    const firmTypes = [
      ['vc', 'Venture Capital'], ['pe', 'Private Equity'], ['angel', 'Angel Group'],
      ['family-office', 'Family Office'], ['corporate', 'Corporate VC'], ['accelerator', 'Accelerator'],
    ]
    const aumRanges = ['<10m', '10-50m', '50-100m', '100-500m', '500m-1b', '>1b']
    const aumLabels: Record<string, string> = {
      '<10m': 'Under $10M', '10-50m': '$10M–$50M', '50-100m': '$50M–$100M',
      '100-500m': '$100M–$500M', '500m-1b': '$500M–$1B', '>1b': '$1B+',
    }
    return (
      <div>
        {sectionTitle('Firm Information', 'Tell us about where you invest from', Building2)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>Firm Name</label>
            <input style={inputStyle} value={form.firmName}
              onChange={e => set('firmName', e.target.value)} placeholder="Apex Ventures" />
          </div>
          <div>
            <label style={labelStyle}>Firm Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {firmTypes.map(([val, label]) => (
                <span key={val} style={chipStyle(form.firmType === val)}
                  onClick={() => set('firmType', val)}>{label}</span>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Assets Under Management</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {aumRanges.map(val => (
                <span key={val} style={chipStyle(form.aum === val)}
                  onClick={() => set('aum', val)}>{aumLabels[val]}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Website (optional)</label>
              <input style={inputStyle} value={form.website}
                onChange={e => set('website', e.target.value)} placeholder="apexventures.com" />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={form.location}
                onChange={e => set('location', e.target.value)} placeholder="San Francisco, CA" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={btnSecondary} onClick={handleBack}>Back</button>
            <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
              onClick={handleNext}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderStep4 = () => {
    const checks   = ['$25K–$100K', '$100K–$500K', '$500K–$1M', '$1M–$5M', '$5M–$25M', '$25M+']
    const stages   = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth']
    const sectors  = ['AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Marketplace', 'DeepTech', 'Consumer', 'Enterprise', 'Climate', 'Crypto/Web3', 'EdTech']
    const geos     = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Global']

    const group = (title: string, Icon: React.ElementType, items: string[], field: keyof FormData) => (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Icon size={14} color={muted} />
          <label style={{ ...labelStyle, margin: 0 }}>{title}</label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map(item => (
            <span key={item} style={chipStyle((form[field] as string[]).includes(item))}
              onClick={() => toggle(field, item)}>{item}</span>
          ))}
        </div>
      </div>
    )

    return (
      <div>
        {sectionTitle('Investment Criteria', 'Define what you look for in deals', Target)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {group('Typical Check Size', DollarSign, checks, 'checkSize')}
          <div style={{ height: 1, background: bdr }} />
          {group('Investment Stages', TrendingUp, stages, 'stages')}
          <div style={{ height: 1, background: bdr }} />
          {group('Preferred Sectors', Users, sectors, 'sectors')}
          <div style={{ height: 1, background: bdr }} />
          {group('Geographic Focus', Globe, geos, 'geography')}
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={btnSecondary} onClick={handleBack}>Back</button>
            <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
              onClick={handleNext}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderStep5 = () => (
    <div>
      {sectionTitle('Investment Thesis', 'Help our AI surface the right founders', Sparkles)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Your Investment Thesis</label>
          <p style={{ fontSize: 12, color: muted, marginBottom: 8 }}>What types of companies excite you? What&apos;s your edge as an investor?</p>
          <textarea
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' } as React.CSSProperties}
            value={form.thesis}
            onChange={e => set('thesis', e.target.value)}
            placeholder="We back early-stage B2B SaaS founders solving complex enterprise workflows using AI…"
          />
        </div>
        <div>
          <label style={labelStyle}>Deal Sourcing Strategy</label>
          <textarea
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' } as React.CSSProperties}
            value={form.dealFlow}
            onChange={e => set('dealFlow', e.target.value)}
            placeholder="Portfolio referrals, university networks, co-investment with other VCs…"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Decision Timeline</label>
            <select style={{ ...inputStyle, appearance: 'none' } as React.CSSProperties}
              value={form.decisionProcess}
              onChange={e => set('decisionProcess', e.target.value)}>
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
            <select style={{ ...inputStyle, appearance: 'none' } as React.CSSProperties}
              value={form.timeline}
              onChange={e => set('timeline', e.target.value)}>
              <option value="">Select…</option>
              <option value="1-5">1–5 deals</option>
              <option value="6-15">6–15 deals</option>
              <option value="16-30">16–30 deals</option>
              <option value="30+">30+ deals</option>
            </select>
          </div>
        </div>

        <div style={{ padding: 20, borderRadius: 12, background: surf, border: `1px solid ${bdr}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Sparkles size={14} color={blue} />
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: ink }}>AI-Powered Matching</p>
          </div>
          <p style={{ fontSize: 13, color: muted, margin: 0 }}>
            After you finish, our AI will read your thesis and score every founder on the platform against it — so your deal flow is ranked by fit, not recency.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button style={btnSecondary} onClick={handleBack}>Back</button>
          <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : <><CheckCircle2 size={16} /> Complete Setup</>}
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Step 6: AI Processing ─────────────────────────────────────────────────
  const renderProcessing = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', background: surf,
        border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 24px',
        animation: 'spin 1.5s linear infinite',
      }}>
        <Loader2 size={28} color={blue} />
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.03em', margin: '0 0 12px', color: ink }}>
        Setting up your dashboard
      </h2>
      <p style={{ fontSize: 14, color: muted, margin: '0 0 40px', lineHeight: 1.6 }}>
        {processingMsg}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
        {[
          'Saving investor profile',
          'Analysing your investment thesis',
          'Scoring founders against your criteria',
          'Curating personalised deal flow',
        ].map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} color={blue} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: i < 2 ? ink : muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ─── layout ───────────────────────────────────────────────────────────────
  const isProcessing = mode === 'signup' && step === 6
  const isChoice     = mode === 'choice'
  const showProgress = mode === 'signup' && step >= 1 && step <= 5

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: 'inherit' }}>
      {/* nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 28px', borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 32, width: 32, borderRadius: 8, background: blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 8 }}>EA</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>Edge Alpha</span>
        </div>
        {showProgress && (
          <span style={{ fontSize: 12, color: muted }}>Step {step} of {totalSteps}</span>
        )}
        {mode === 'signin' && (
          <button
            onClick={() => { setMode('choice'); setError('') }}
            style={{ fontSize: 12, color: muted, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Back
          </button>
        )}
      </div>

      {/* body */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
        {/* progress bar — only in signup flow */}
        {showProgress && (
          <>
            <div style={{ height: 2, background: surf, borderRadius: 2, marginBottom: 48, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: ink, width: `${(step / totalSteps) * 100}%`,
                transition: 'width 0.35s ease', borderRadius: 2 }} />
            </div>
            {renderProgress()}
          </>
        )}

        {isChoice && renderChoice()}
        {mode === 'signin' && renderSignIn()}
        {mode === 'signup' && step === 1 && renderStep1()}
        {mode === 'signup' && step === 2 && renderStep2()}
        {mode === 'signup' && step === 3 && renderStep3()}
        {mode === 'signup' && step === 4 && renderStep4()}
        {mode === 'signup' && step === 5 && renderStep5()}
        {isProcessing && renderProcessing()}
      </div>
    </div>
  )
}
