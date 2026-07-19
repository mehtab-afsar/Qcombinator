'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, ChevronRight, ArrowLeft } from 'lucide-react'
import { IndustrySelector } from '@/components/onboarding/IndustrySelector'
import { FounderBackgroundSelector } from '@/components/onboarding/FounderBackgroundSelector'
import type { FounderBackground } from '@/components/onboarding/FounderBackgroundSelector'
import { O, FONT_SERIF, ACCENTS } from '@/features/onboarding/theme'
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell'
import { Label, SectionTitle, Input, TextArea, Hint } from '@/features/onboarding/components/ui/Input'
import { SelectCard } from '@/features/onboarding/components/ui/SelectCard'
import { SunDoodle } from '@/features/onboarding/components/doodles/SunDoodle'
import { RocketDoodle } from '@/features/onboarding/components/doodles/RocketDoodle'
import { ChartDoodle } from '@/features/onboarding/components/doodles/ChartDoodle'
import { CompassDoodle } from '@/features/onboarding/components/doodles/CompassDoodle'
import { LightbulbDoodle } from '@/features/onboarding/components/doodles/LightbulbDoodle'

const ACCENT = ACCENTS.founder

// ── Option data ───────────────────────────────────────────────────────────────
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

const STEP_NAMES = ['Account', 'Startup', 'Traction', 'Strategy', 'Problem']

const STEP_PANE = [
  { eyebrow: 'Welcome',  title: "Let's build something fundable.", body: 'Six dimensions, one honest score, and nine AI advisers who help you move it.', Doodle: SunDoodle },
  { eyebrow: 'Your startup', title: 'First impressions count.', body: 'This is exactly what investors see first on your profile.', Doodle: RocketDoodle },
  { eyebrow: 'Momentum', title: 'Where you stand today.', body: 'Revenue, team, and funding — the fastest way we calibrate your Q-Score.', Doodle: ChartDoodle },
  { eyebrow: 'Strategy', title: 'A little more context.', body: 'Optional, but it sharpens your Q-Score and the advice you get.', Doodle: CompassDoodle },
  { eyebrow: 'The problem', title: 'What are you solving?', body: 'The two questions every investor asks first. Be concrete.', Doodle: LightbulbDoodle },
]

// ── Form state ────────────────────────────────────────────────────────────────
interface FormData {
  founderName: string; email: string; password: string
  companyName: string; tagline: string; industry: string; stage: string
  revenueStatus: string; teamSize: string; fundingStatus: string
  problemStatement: string; targetCustomer: string; location: string
  marketSizeEstimate: string; gtmStrategy: string; founderBackground: FounderBackground[]
}
const EMPTY: FormData = {
  founderName: '', email: '', password: '',
  companyName: '', tagline: '', industry: '', stage: '',
  revenueStatus: '', teamSize: '', fundingStatus: '',
  problemStatement: '', targetCustomer: '', location: '',
  marketSizeEstimate: '', gtmStrategy: '', founderBackground: [],
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

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 46, borderRadius: 12,
      background: disabled ? O.alpha(O.ink, 0.16) : ACCENT, color: '#fff', border: 'none',
      fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      letterSpacing: '-0.01em', transition: 'background 0.15s',
    }}>
      {children}
    </button>
  )
}

export default function FounderOnboardingPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [dir, setDir] = useState(1)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [avatarFile] = useState<File | null>(null)
  const [logoFile] = useState<File | null>(null)
  const _avatarRef = useRef<HTMLInputElement>(null)
  const _logoRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof FormData) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session || sessionStorage.getItem('ea_signup_pending')) return
      const { data: fp } = await sb.from('founder_profiles').select('user_id').eq('user_id', data.session.user.id).maybeSingle()
      if (fp) router.replace('/founder/dashboard')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canNext1 = !!(form.founderName.trim() && form.email.trim() && form.password.length >= 8)
  const canNext2 = !!(form.companyName.trim() && form.tagline.trim() && form.industry && form.stage)
  const canNext3 = !!(form.revenueStatus && form.teamSize && form.fundingStatus)
  const canNext4 = true // Strategy step is fully optional
  const canSubmit = !!(form.problemStatement.trim() && form.targetCustomer.trim())

  function go(n: number) { setDir(n > page ? 1 : -1); setPage(n); setError('') }

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
          marketSizeEstimate: form.marketSizeEstimate, gtmStrategy: form.gtmStrategy, founderBackground: form.founderBackground,
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
        logoFile && (async () => { const fd = new FormData(); fd.append('file', logoFile); fd.append('imageType', 'company-logo'); await fetch('/api/upload/image', { method: 'POST', body: fd }) })(),
      ])
      sessionStorage.removeItem('ea_signup_pending')
      router.push('/founder/getting-started')
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: O.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ width: 100, height: 100 }}><RocketDoodle color={ACCENT} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2.5px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ fontSize: 14, color: O.muted, margin: 0 }}>Setting up your workspace…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const pane = STEP_PANE[page - 1]

  return (
    <OnboardingShell
      accent={ACCENT}
      backHref="/login"
      backLabel="Sign in"
      backVisible={page === 1}
      stepNames={STEP_NAMES}
      step={page}
      doodle={<pane.Doodle key={page} color={ACCENT} />}
      doodleEyebrow={pane.eyebrow}
      doodleTitle={pane.title}
      doodleBody={pane.body}
      dir={dir}
      stepKey={page}
      footer={
        <>
          {page > 1 && (
            <button onClick={() => go(page - 1)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: O.muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14, padding: 0 }}>
              <ArrowLeft size={13} /> Back to {STEP_NAMES[page - 2]}
            </button>
          )}
          {page === 1 && <PrimaryButton onClick={() => canNext1 && go(2)} disabled={!canNext1}>Continue <ChevronRight size={15} /></PrimaryButton>}
          {page === 2 && <PrimaryButton onClick={() => canNext2 && go(3)} disabled={!canNext2}>Continue <ChevronRight size={15} /></PrimaryButton>}
          {page === 3 && <PrimaryButton onClick={() => canNext3 && go(4)} disabled={!canNext3}>Continue <ChevronRight size={15} /></PrimaryButton>}
          {page === 4 && <PrimaryButton onClick={() => canNext4 && go(5)} disabled={!canNext4}>Continue <ChevronRight size={15} /></PrimaryButton>}
          {page === 5 && <PrimaryButton onClick={handleSubmit} disabled={!canSubmit}>Create account <ChevronRight size={15} /></PrimaryButton>}
        </>
      }
    >
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 480, letterSpacing: '-0.02em', color: O.ink, margin: '0 0 6px' }}>
          {page === 1 && 'Create your account'}
          {page === 2 && 'Your startup'}
          {page === 3 && 'Your traction'}
          {page === 4 && 'Strategy & background'}
          {page === 5 && 'Your problem & customer'}
        </h2>
      </div>

      {/* ── STEP 1 — Account ── */}
      {page === 1 && (<>
        <button
          onClick={async () => {
            const { createClient: c } = await import('@/lib/supabase/client')
            await c().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
          }}
          style={{
            width: '100%', height: 46, borderRadius: 12,
            border: `1.5px solid ${O.bdr}`, background: O.card, color: O.ink,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background 0.12s, box-shadow 0.12s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <GoogleIcon /> Continue with Google
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: O.bdr }} />
          <span style={{ fontSize: 11, color: O.muted, whiteSpace: 'nowrap' }}>or sign up with email</span>
          <div style={{ flex: 1, height: 1, background: O.bdr }} />
        </div>
        <div>
          <Label>Full name</Label>
          <Input value={form.founderName} onChange={set('founderName')} placeholder="Jane Smith" autoFocus accent={ACCENT} />
        </div>
        <div>
          <Label>Work email</Label>
          <Input value={form.email} onChange={set('email')} type="email" placeholder="you@company.com" accent={ACCENT} />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            value={form.password} onChange={set('password')}
            type={showPwd ? 'text' : 'password'} placeholder="Min. 8 characters" accent={ACCENT}
            right={<button type="button" onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: O.muted, padding: 0, display: 'flex' }}>{showPwd ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
          />
          {form.password.length > 0 && form.password.length < 8 && (
            <p style={{ fontSize: 12, color: O.amber, marginTop: 6 }}>{8 - form.password.length} more characters needed</p>
          )}
        </div>
        {error && <p style={{ fontSize: 13, color: O.red }}>{error}</p>}
      </>)}

      {/* ── STEP 2 — Startup ── */}
      {page === 2 && (<>
        <div>
          <Label>Company name</Label>
          <Input value={form.companyName} onChange={set('companyName')} placeholder="e.g. Acme Inc." autoFocus accent={ACCENT} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <Label>One-line pitch</Label>
            <span style={{ fontSize: 11, color: form.tagline.length > 112 ? O.amber : O.muted }}>{form.tagline.length}/140</span>
          </div>
          <Input value={form.tagline} onChange={set('tagline')} placeholder="We help [who] do [what] using [how]" maxLength={140} accent={ACCENT} />
          <Hint text='"We help hospital labs skip manual reporting — AI captures every result the moment it happens."' />
        </div>
        <div>
          <Label>Industry</Label>
          <IndustrySelector value={form.industry} onChange={v => set('industry')(Array.isArray(v) ? v[0] : v)} placeholder="Search industries..." />
        </div>
        <div>
          <SectionTitle>Stage</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {STAGES.map(o => <SelectCard key={o.value} compact label={o.label} sub={o.sub} active={form.stage === o.value} onClick={() => set('stage')(o.value)} accent={ACCENT} />)}
          </div>
        </div>
      </>)}

      {/* ── STEP 3 — Traction ── */}
      {page === 3 && (<>
        <div>
          <SectionTitle>Revenue</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {REVENUE.map(o => <SelectCard key={o.value} compact label={o.label} sub={o.sub} active={form.revenueStatus === o.value} onClick={() => set('revenueStatus')(o.value)} accent={ACCENT} />)}
          </div>
        </div>
        <div>
          <SectionTitle>Team size</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {TEAM.map(o => <SelectCard key={o.value} compact label={o.label} sub={o.sub} active={form.teamSize === o.value} onClick={() => set('teamSize')(o.value)} accent={ACCENT} />)}
          </div>
        </div>
        <div>
          <SectionTitle>Funding status</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {FUNDING.map(o => <SelectCard key={o.value} compact label={o.label} sub={o.sub} active={form.fundingStatus === o.value} onClick={() => set('fundingStatus')(o.value)} accent={ACCENT} />)}
          </div>
        </div>
      </>)}

      {/* ── STEP 4 — Strategy (optional) ── */}
      {page === 4 && (<>
        <div>
          <Label optional>Market size estimate</Label>
          <Input value={form.marketSizeEstimate} onChange={set('marketSizeEstimate')} placeholder="e.g. $5B total addressable market" accent={ACCENT} />
          <Hint text='"Hospital lab software is a ~$8B market growing 12% annually."' />
        </div>
        <div>
          <Label optional>Go-to-market strategy</Label>
          <TextArea value={form.gtmStrategy} onChange={set('gtmStrategy')} placeholder="How will you acquire your first customers? (1-2 sentences)" rows={3} maxLength={300} accent={ACCENT} />
          <Hint text="We'll target hospital procurement departments directly via partnerships with lab management consultants." />
        </div>
        <div>
          <Label optional>Your background</Label>
          <FounderBackgroundSelector value={form.founderBackground} onChange={v => setForm(f => ({ ...f, founderBackground: v }))} />
        </div>
      </>)}

      {/* ── STEP 5 — Problem ── */}
      {page === 5 && (<>
        <div>
          <Label>What problem are you solving?</Label>
          <TextArea value={form.problemStatement} onChange={set('problemStatement')} placeholder="Describe the specific pain point in 2–3 sentences. Be concrete." rows={4} maxLength={300} accent={ACCENT} />
          <Hint text='"Hospital labs lose 3–4 hours/day manually logging results across 5 disconnected systems, causing reporting delays and compliance risk."' />
        </div>
        <div>
          <Label>Who has this problem most acutely?</Label>
          <Input value={form.targetCustomer} onChange={set('targetCustomer')} placeholder="e.g. Head of Lab Operations at mid-size hospitals (100–500 beds)" maxLength={200} accent={ACCENT} />
        </div>
        <div>
          <Label optional>Location</Label>
          <Input value={form.location} onChange={set('location')} placeholder="e.g. London, UK" accent={ACCENT} />
          <p style={{ fontSize: 11, color: O.muted, marginTop: 6 }}>Investors sometimes filter by region.</p>
        </div>
        {error && (
          <div style={{ padding: '11px 15px', borderRadius: 10, background: O.alpha(O.red, 0.06), border: `1px solid ${O.alpha(O.red, 0.25)}`, color: O.red, fontSize: 13 }}>
            {error}
          </div>
        )}
      </>)}
    </OnboardingShell>
  )
}
