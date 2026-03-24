'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// ── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2'
const surf  = '#F0EDE6'
const bdr   = '#E2DDD5'
const ink   = '#18160F'
const muted = '#8A867C'
const blue  = '#2563EB'

// ── types ────────────────────────────────────────────────────────────────────
interface Page1 {
  companyName: string
  website: string
  foundedDate: string
  incorporationType: string
  industry: string
  description: string
}

interface Page2 {
  stage: string
  revenueStatus: string
  fundingStatus: string
  teamSize: string
}

interface Page3 {
  founderName: string
  linkedinUrl: string
  cofounderCount: string
  yearsOnProblem: string
  priorExperience: string
  email: string
  password: string
}

const INDUSTRIES = [
  'SaaS / Software', 'FinTech', 'HealthTech', 'EdTech', 'CleanTech / Climate',
  'AgriTech', 'Deep Tech / AI', 'Consumer', 'Marketplace', 'Web3 / Crypto',
  'Hardware / IoT', 'Other',
]

const STAGES = [
  { value: 'pre-product', label: 'Pre-Product', sub: 'Idea / research phase' },
  { value: 'mvp',         label: 'MVP',          sub: 'Built, testing with users' },
  { value: 'beta',        label: 'Beta',          sub: 'Limited release' },
  { value: 'launched',    label: 'Launched',      sub: 'Public product, early revenue' },
  { value: 'growing',     label: 'Growing',       sub: 'Scaling revenue' },
]

const REVENUE_STATUSES = [
  { value: 'pre-revenue',    label: 'Pre-revenue' },
  { value: 'first-revenue',  label: 'First revenue — under $10K MRR' },
  { value: '10k-100k',       label: '$10K – $100K MRR' },
  { value: '100k-plus',      label: '$100K+ MRR' },
]

const FUNDING_STATUSES = [
  { value: 'bootstrapped',       label: 'Bootstrapped' },
  { value: 'friends-and-family', label: 'Friends & family' },
  { value: 'pre-seed',           label: 'Pre-seed' },
  { value: 'seed',               label: 'Seed' },
  { value: 'series-a-plus',      label: 'Series A+' },
]

const TEAM_SIZES = [
  { value: '1-2',  label: '1–2' },
  { value: '3-5',  label: '3–5' },
  { value: '6-15', label: '6–15' },
  { value: '16+',  label: '16+' },
]

const PRIOR_EXP = [
  { value: 'first-time',  label: 'First-time founder' },
  { value: 'founded-no-exit', label: 'Founded — didn\'t scale' },
  { value: 'exited',      label: 'Founded and exited' },
  { value: 'serial',      label: 'Serial founder' },
]

// ── helpers ───────────────────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: ink }}>{label}</label>
      {hint && <span style={{ fontSize: 12, color: muted, marginTop: -4 }}>{hint}</span>}
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${bdr}`,
  background: '#fff', fontSize: 14, color: ink, outline: 'none',
  fontFamily: 'inherit',
}

function RadioGroup({ options, value, onChange }: {
  options: { value: string; label: string; sub?: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map(opt => (
        <div
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
            border: `1.5px solid ${value === opt.value ? blue : bdr}`,
            background: value === opt.value ? '#EFF6FF' : '#fff',
            transition: 'all 0.15s',
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: `2px solid ${value === opt.value ? blue : bdr}`,
            background: value === opt.value ? blue : 'transparent',
            flexShrink: 0,
          }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{opt.label}</div>
            {opt.sub && <div style={{ fontSize: 12, color: muted }}>{opt.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [p1, setP1] = useState<Page1>({
    companyName: '', website: '', foundedDate: '', incorporationType: '',
    industry: '', description: '',
  })
  const [p2, setP2] = useState<Page2>({
    stage: '', revenueStatus: '', fundingStatus: '', teamSize: '',
  })
  const [p3, setP3] = useState<Page3>({
    founderName: '', linkedinUrl: '', cofounderCount: '0',
    yearsOnProblem: '', priorExperience: '', email: '', password: '',
  })

  // Redirect already-authenticated founders
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/founder/dashboard')
    })
  }, [router])

  const progress = ((page - 1) / 3) * 100

  const canAdvancePage1 = p1.companyName.trim() && p1.industry && p1.description.trim()
  const canAdvancePage2 = p2.stage && p2.revenueStatus && p2.fundingStatus && p2.teamSize
  const canSubmitPage3  = p3.founderName.trim() && p3.cofounderCount !== '' &&
                          p3.yearsOnProblem && p3.priorExperience &&
                          p3.email.trim() && p3.password.length >= 8

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: p3.email.trim(),
          password: p3.password,
          fullName: p3.founderName.trim(),
          // Page 1
          companyName: p1.companyName,
          website: p1.website,
          foundedDate: p1.foundedDate,
          incorporationType: p1.incorporationType,
          industry: p1.industry,
          description: p1.description,
          // Page 2
          stage: p2.stage,
          revenueStatus: p2.revenueStatus,
          fundingStatus: p2.fundingStatus,
          teamSize: p2.teamSize,
          // Page 3
          founderName: p3.founderName,
          linkedinUrl: p3.linkedinUrl,
          cofounderCount: parseInt(p3.cofounderCount, 10),
          yearsOnProblem: p3.yearsOnProblem,
          priorExperience: p3.priorExperience,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Sign up failed. Please try again.')
        setLoading(false)
        return
      }

      // Sign in the user
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: p3.email.trim(),
        password: p3.password,
      })
      if (signInErr) {
        setError('Account created but sign-in failed. Please go to the login page.')
        setLoading(false)
        return
      }

      // Silent LinkedIn enrichment (fire-and-forget)
      if (p3.linkedinUrl) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
          fetch('/api/profile-builder/linkedin-enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ linkedinUrl: p3.linkedinUrl }),
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
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: ink, letterSpacing: -0.5 }}>Edge Alpha</div>
          <div style={{ fontSize: 14, color: muted, marginTop: 4 }}>
            {page === 1 && 'Tell us about your company'}
            {page === 2 && 'Where are you in your journey?'}
            {page === 3 && 'About you'}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: bdr, borderRadius: 4, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: blue, borderRadius: 4, transition: 'width 0.4s ease' }} />
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{
              width: n === page ? 24 : 8, height: 8, borderRadius: 4,
              background: n <= page ? blue : bdr, transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Card */}
        <div style={{ background: surf, borderRadius: 16, border: `1px solid ${bdr}`, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── PAGE 1 — Company Basics ── */}
          {page === 1 && (
            <>
              <Field label="Company name *">
                <input
                  style={inputStyle}
                  value={p1.companyName}
                  onChange={e => setP1(s => ({ ...s, companyName: e.target.value }))}
                  placeholder="e.g. Acme Inc."
                />
              </Field>
              <Field label="Website" hint="Optional — skippable">
                <input
                  style={inputStyle}
                  value={p1.website}
                  onChange={e => setP1(s => ({ ...s, website: e.target.value }))}
                  placeholder="https://"
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Founded">
                  <input
                    style={inputStyle}
                    type="month"
                    value={p1.foundedDate}
                    onChange={e => setP1(s => ({ ...s, foundedDate: e.target.value }))}
                  />
                </Field>
                <Field label="Incorporation type">
                  <select
                    style={inputStyle}
                    value={p1.incorporationType}
                    onChange={e => setP1(s => ({ ...s, incorporationType: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    <option value="delaware-c-corp">Delaware C-Corp</option>
                    <option value="llc">LLC</option>
                    <option value="other">Other</option>
                    <option value="not-yet">Not yet incorporated</option>
                  </select>
                </Field>
              </div>
              <Field label="Industry *">
                <select
                  style={inputStyle}
                  value={p1.industry}
                  onChange={e => setP1(s => ({ ...s, industry: e.target.value }))}
                >
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="One-line description *" hint="Max 100 characters — what you do in plain English">
                <input
                  style={inputStyle}
                  value={p1.description}
                  onChange={e => setP1(s => ({ ...s, description: e.target.value.slice(0, 100) }))}
                  placeholder="We help [who] do [what] without [pain]"
                />
                <span style={{ fontSize: 11, color: muted, textAlign: 'right' }}>{p1.description.length}/100</span>
              </Field>
            </>
          )}

          {/* ── PAGE 2 — Stage & Revenue ── */}
          {page === 2 && (
            <>
              <Field label="Current stage *">
                <RadioGroup
                  options={STAGES}
                  value={p2.stage}
                  onChange={v => setP2(s => ({ ...s, stage: v }))}
                />
              </Field>
              <Field label="Revenue status *">
                <RadioGroup
                  options={REVENUE_STATUSES}
                  value={p2.revenueStatus}
                  onChange={v => setP2(s => ({ ...s, revenueStatus: v }))}
                />
              </Field>
              <Field label="Funding status *">
                <RadioGroup
                  options={FUNDING_STATUSES}
                  value={p2.fundingStatus}
                  onChange={v => setP2(s => ({ ...s, fundingStatus: v }))}
                />
              </Field>
              <Field label="Team size *">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {TEAM_SIZES.map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => setP2(s => ({ ...s, teamSize: opt.value }))}
                      style={{
                        textAlign: 'center', padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${p2.teamSize === opt.value ? blue : bdr}`,
                        background: p2.teamSize === opt.value ? '#EFF6FF' : '#fff',
                        fontSize: 14, fontWeight: 600, color: p2.teamSize === opt.value ? blue : ink,
                        transition: 'all 0.15s',
                      }}
                    >{opt.label}</div>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── PAGE 3 — Founder Basics + Auth ── */}
          {page === 3 && (
            <>
              <Field label="Your full name *">
                <input
                  style={inputStyle}
                  value={p3.founderName}
                  onChange={e => setP3(s => ({ ...s, founderName: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </Field>
              <Field label="LinkedIn profile URL" hint="Optional — improves your Q-Score accuracy">
                <input
                  style={inputStyle}
                  value={p3.linkedinUrl}
                  onChange={e => setP3(s => ({ ...s, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourname"
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Co-founders *">
                  <select
                    style={inputStyle}
                    value={p3.cofounderCount}
                    onChange={e => setP3(s => ({ ...s, cofounderCount: e.target.value }))}
                  >
                    <option value="0">Solo founder</option>
                    <option value="1">1 co-founder</option>
                    <option value="2">2 co-founders</option>
                    <option value="3">3+ co-founders</option>
                  </select>
                </Field>
                <Field label="Years on this problem *">
                  <select
                    style={inputStyle}
                    value={p3.yearsOnProblem}
                    onChange={e => setP3(s => ({ ...s, yearsOnProblem: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    <option value="less-than-1">&lt;1 year</option>
                    <option value="1-2">1–2 years</option>
                    <option value="3-5">3–5 years</option>
                    <option value="5-plus">5+ years</option>
                  </select>
                </Field>
              </div>
              <Field label="Prior startup experience *">
                <RadioGroup
                  options={PRIOR_EXP}
                  value={p3.priorExperience}
                  onChange={v => setP3(s => ({ ...s, priorExperience: v }))}
                />
              </Field>

              <div style={{ height: 1, background: bdr, margin: '4px 0' }} />

              <Field label="Work email *">
                <input
                  style={inputStyle}
                  type="email"
                  value={p3.email}
                  onChange={e => setP3(s => ({ ...s, email: e.target.value }))}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Password *" hint="Minimum 8 characters">
                <input
                  style={inputStyle}
                  type="password"
                  value={p3.password}
                  onChange={e => setP3(s => ({ ...s, password: e.target.value }))}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
              </Field>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
                  {error}
                </div>
              )}
            </>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            {page > 1 ? (
              <button
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '10px 20px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: 'transparent', fontSize: 14, color: ink, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Back
              </button>
            ) : (
              <a href="/login" style={{ fontSize: 13, color: muted, textDecoration: 'none' }}>
                Already have an account? Log in
              </a>
            )}

            {page < 3 ? (
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page === 1 && !canAdvancePage1) || (page === 2 && !canAdvancePage2)}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: ((page === 1 && !canAdvancePage1) || (page === 2 && !canAdvancePage2)) ? bdr : blue,
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s',
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmitPage3 || loading}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: (!canSubmitPage3 || loading) ? bdr : blue,
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s',
                }}
              >
                {loading ? 'Creating account…' : 'Create account →'}
              </button>
            )}
          </div>
        </div>

        {/* Legal */}
        <p style={{ textAlign: 'center', fontSize: 12, color: muted, marginTop: 20 }}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
