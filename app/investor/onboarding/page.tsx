'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, ChevronRight, ArrowLeft, Camera, Upload, X, FileText, Loader2 } from 'lucide-react'
import { O, FONT_SERIF, ACCENTS } from '@/features/onboarding/theme'
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell'
import { ProcessingScreen } from '@/features/onboarding/components/ProcessingScreen'
import { Label, SectionTitle, Input, SelectEl } from '@/features/onboarding/components/ui/Input'
import { Chip } from '@/features/onboarding/components/ui/SelectCard'
import { ScoutDoodle } from '@/features/onboarding/components/doodles/ScoutDoodle'
import { IdCardDoodle } from '@/features/onboarding/components/doodles/IdCardDoodle'
import { TargetDoodle } from '@/features/onboarding/components/doodles/TargetDoodle'
import { ScrollDoodle } from '@/features/onboarding/components/doodles/ScrollDoodle'
import { CameraDoodle } from '@/features/onboarding/components/doodles/CameraDoodle'
import { ImageCropUpload } from '@/components/ui/ImageCropUpload'
import {
  INVESTOR_STAGES as STAGES_OPTIONS,
  INVESTOR_SECTORS as SECTORS_OPTIONS,
  INVESTOR_CHECK_SIZES as CHECK_SIZES,
} from '@/features/investor/constants/criteria'

const ACCENT = ACCENTS.investor

const STEP_NAMES = ['Account', 'Profile', 'Criteria', 'Thesis', 'Photo']

const STEP_PANE = [
  { eyebrow: 'Investor platform', title: 'Deal flow, already scored.', body: 'Founders here are scored before you ever see their name.', Doodle: ScoutDoodle },
  { eyebrow: 'Your profile', title: 'Who are you?', body: 'Founders see this when you request a connection.', Doodle: IdCardDoodle },
  { eyebrow: 'Criteria', title: "What you're looking for.", body: 'We use this to match you with the right founders.', Doodle: TargetDoodle },
  { eyebrow: 'Thesis', title: 'Your investment thesis.', body: 'We use this to surface founders aligned with your worldview.', Doodle: ScrollDoodle },
  { eyebrow: 'Almost there', title: 'Put a face to your profile.', body: 'Optional — founders connect better with a photo.', Doodle: CameraDoodle },
]

// ── Option data — sectors/stages/check-sizes are shared with investor settings
// (single source of truth) via the imports at the top of this file.
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      letterSpacing: '-0.01em', transition: 'background 0.15s',
    }}>
      {children}
    </button>
  )
}

export default function InvestorOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [thesisUploading, setThesisUploading] = useState(false)
  const [thesisFileName, setThesisFileName] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const thesisRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(f => ({ ...f, [k]: v }))
  const toggle = (field: 'stages' | 'sectors' | 'checkSize', val: string) =>
    setForm(f => { const arr = f[field] as string[]; return { ...f, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] } })

  useEffect(() => {
    import('@/features/auth/services/auth.service')
      .then(({ getSession }) => getSession())
      .then(async (s) => {
        if (!s) return
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: ip } = await sb.from('investor_profiles').select('user_id').eq('user_id', s.user.id).maybeSingle()
        if (ip) router.replace('/investor/dashboard')
      })
      .catch(() => {})
  }, [router])

  const canStep1 = !!(form.email.trim() && form.password.length >= 8)
  const canStep2 = !!(form.firstName.trim() && form.lastName.trim() && (form.isSoloGP || form.firmName.trim()) && form.location.trim())
  const canStep3 = form.stages.length > 0 && form.sectors.length > 0 && form.checkSize.length > 0

  function go(n: number) { setDir(n > step ? 1 : -1); setStep(n); setError('') }

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
    setThesisUploading(true); setThesisFileName(null); setError('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload/thesis', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.text) {
        set('thesis', data.text); setThesisFileName(file.name)
      } else {
        setError(data.error || "Couldn't read that file. Try a PDF or Word doc, or paste your thesis below.")
      }
    } catch {
      setError("Upload failed. Check your connection, or paste your thesis below.")
    } finally { setThesisUploading(false) }
  }

  async function handleSubmit() {
    setLoading(true)
    await Promise.allSettled([
      avatarFile && (async () => { const fd = new FormData(); fd.append('file', avatarFile); fd.append('imageType', 'investor-avatar'); await fetch('/api/upload/image', { method: 'POST', body: fd }) })(),
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

  // Open the circular cropper for a freshly-picked image (validate first).
  function pickForCrop(file: File) {
    setError('')
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return }
    setCropFile(file)
  }

  // Cropper "Save" → store the cropped circular PNG as the avatar.
  function onCropSave(blob: Blob, previewUrl: string) {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(new File([blob], 'avatar.png', { type: 'image/png' }))
    setAvatarPreview(previewUrl)
    setCropFile(null)
  }

  if (processing) return (
    <ProcessingScreen
      step={processingStep}
      accent={ACCENT}
      title="Personalizing your deal flow"
      subtitle="This takes just a moment…"
      doodle={<ScoutDoodle color={ACCENT} />}
      messages={['Saving your investor profile', 'Analysing your investment thesis', 'Scoring founders against your criteria', 'Curating your personalised deal flow']}
    />
  )

  if (loading && step === 1) return (
    <div style={{ minHeight: '100vh', background: O.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: O.card, border: `1px solid ${O.bdr}`, boxShadow: '0 12px 48px rgba(0,0,0,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2.5px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      </div>
      <p style={{ fontSize: 14, color: O.muted, margin: 0 }}>Creating your account…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const initials = `${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`.toUpperCase() || 'YO'
  const matchCount = estimateMatches(form.sectors, form.stages, form.checkSize)
  const hasAnyCriteria = form.sectors.length + form.stages.length + form.checkSize.length > 0
  const pane = STEP_PANE[step - 1]

  return (
    <OnboardingShell
      accent={ACCENT}
      backHref="/founder/onboarding"
      backLabel="Joining as a founder?"
      backVisible={step === 1}
      stepNames={STEP_NAMES}
      step={step}
      doodle={<pane.Doodle key={step} color={ACCENT} />}
      doodleEyebrow={pane.eyebrow}
      doodleTitle={pane.title}
      doodleBody={pane.body}
      dir={dir}
      stepKey={step}
      footer={
        <>
          {step > 1 && (
            <button onClick={() => go(step - 1)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: O.muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14, padding: 0 }}>
              <ArrowLeft size={13} /> Back to {STEP_NAMES[step - 2]}
            </button>
          )}
          {step === 1 && (
            <PrimaryButton onClick={handleCreateAccount} disabled={!canStep1 || loading}>
              {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</> : <>Continue <ChevronRight size={15} /></>}
            </PrimaryButton>
          )}
          {step === 2 && <PrimaryButton onClick={() => canStep2 && go(3)} disabled={!canStep2}>Continue <ChevronRight size={15} /></PrimaryButton>}
          {step === 3 && <PrimaryButton onClick={() => canStep3 && go(4)} disabled={!canStep3}>Continue <ChevronRight size={15} /></PrimaryButton>}
          {step === 4 && (<>
            <PrimaryButton onClick={() => go(5)}>Continue <ChevronRight size={15} /></PrimaryButton>
            <button onClick={() => go(5)} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', fontSize: 13, color: O.muted, cursor: 'pointer', textDecoration: 'underline' }}>Skip</button>
          </>)}
          {step === 5 && (<>
            <PrimaryButton onClick={handleSubmit} disabled={loading}>
              {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <>Launch deal flow <ChevronRight size={15} /></>}
            </PrimaryButton>
            <button onClick={handleSubmit} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', fontSize: 13, color: O.muted, cursor: 'pointer', textDecoration: 'underline' }}>Skip & finish</button>
          </>)}
        </>
      }
    >
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 480, letterSpacing: '-0.02em', color: O.ink, margin: '0 0 6px' }}>
          {step === 1 && 'Join as an investor'}
          {step === 2 && 'Who are you?'}
          {step === 3 && "What are you looking for?"}
          {step === 4 && 'Your investment thesis'}
          {step === 5 && 'Put a face to your profile'}
        </h2>
      </div>

      {/* ── STEP 1 — Account ── */}
      {step === 1 && (<>
        <button
          onClick={async () => {
            const { createClient } = await import('@/lib/supabase/client')
            await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
          }}
          style={{
            width: '100%', height: 46, borderRadius: 12,
            border: `1.5px solid ${O.bdr}`, background: O.card, color: O.ink,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'background 0.12s',
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
          <Label>Email</Label>
          <Input value={form.email} onChange={v => set('email', v)} type="email" placeholder="you@fund.com" autoFocus accent={ACCENT} />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            value={form.password} onChange={v => set('password', v)}
            type={showPwd ? 'text' : 'password'} placeholder="Min. 8 characters" accent={ACCENT}
            right={<button type="button" onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: O.muted, padding: 0, display: 'flex' }}>{showPwd ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
          />
          {form.password.length > 0 && form.password.length < 8 && (
            <p style={{ fontSize: 12, color: O.amber, marginTop: 6 }}>{8 - form.password.length} more characters needed</p>
          )}
        </div>
        {error && <p style={{ fontSize: 13, color: O.red }}>{error}</p>}
        <p style={{ fontSize: 12, color: O.muted, textAlign: 'center', margin: 0 }}>
          Already have an account? <a href="/login" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
        </p>
      </>)}

      {/* ── STEP 2 — Profile ── */}
      {step === 2 && (<>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Label>First name</Label>
            <Input value={form.firstName} onChange={v => set('firstName', v)} placeholder="Jane" autoFocus accent={ACCENT} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input value={form.lastName} onChange={v => set('lastName', v)} placeholder="Smith" accent={ACCENT} />
          </div>
        </div>
        <div>
          <Label>Your title</Label>
          <SelectEl value={form.title} onChange={v => set('title', v)} placeholder="Select your title…" accent={ACCENT}>
            {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
          </SelectEl>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <Label>Firm / Fund name</Label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: O.muted }}>
              <input type="checkbox" checked={form.isSoloGP} onChange={e => set('isSoloGP', e.target.checked)} style={{ width: 13, height: 13, accentColor: ACCENT }} />
              I invest solo
            </label>
          </div>
          {!form.isSoloGP
            ? <Input value={form.firmName} onChange={v => set('firmName', v)} placeholder="e.g. Sequoia Capital, Andreessen Horowitz…" accent={ACCENT} />
            : <div style={{ padding: '11px 15px', borderRadius: 10, background: O.surf, border: `1px solid ${O.bdr}`, fontSize: 13, color: O.muted }}>
                You&apos;ll appear as an independent investor on founder profiles.
              </div>
          }
        </div>
        <div>
          <Label>Location</Label>
          <Input value={form.location} onChange={v => set('location', v)} placeholder="e.g. San Francisco, CA" accent={ACCENT} />
          <p style={{ fontSize: 11, color: O.muted, marginTop: 6 }}>Founders see your location on your investor card.</p>
        </div>
        {error && <p style={{ fontSize: 13, color: O.red }}>{error}</p>}
      </>)}

      {/* ── STEP 3 — Criteria ── */}
      {step === 3 && (<>
        <div style={{ padding: '15px 17px', borderRadius: 12, background: hasAnyCriteria ? O.alpha(ACCENT, 0.06) : O.surf, border: `1px solid ${hasAnyCriteria ? O.alpha(ACCENT, 0.3) : O.bdr}`, transition: 'all 0.3s' }}>
          {hasAnyCriteria ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: O.ink, margin: 0 }}>{matchCount}+ founders match your criteria</p>
                <p style={{ fontSize: 12, color: O.muted, margin: '2px 0 0' }}>Refine further to find your best matches</p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{Math.min(matchCount, 99)}</span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: O.muted, textAlign: 'center', margin: 0 }}>Select criteria below to see how many founders match you on day one.</p>
          )}
        </div>
        <div>
          <SectionTitle>Investment stages *</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STAGES_OPTIONS.map(o => <Chip key={o.value} label={o.label} selected={form.stages.includes(o.value)} onClick={() => toggle('stages', o.value)} accent={ACCENT} />)}
          </div>
        </div>
        <div>
          <SectionTitle>Sectors *</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {SECTORS_OPTIONS.map(o => {
              const on = form.sectors.includes(o.value)
              return (
                <button
                  key={o.value}
                  onClick={() => toggle('sectors', o.value)}
                  style={{
                    padding: '11px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1.5px solid ${on ? ACCENT : O.bdr}`,
                    background: on ? O.alpha(ACCENT, 0.07) : O.card,
                    boxShadow: on ? `0 0 0 3px ${O.alpha(ACCENT, 0.1)}` : 'none',
                    fontSize: 12.5, fontWeight: on ? 600 : 500, color: O.ink,
                    textAlign: 'center', transition: 'all 0.14s',
                  }}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <SectionTitle>Typical check size *</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CHECK_SIZES.map(o => <Chip key={o.value} label={o.label} selected={form.checkSize.includes(o.value)} onClick={() => toggle('checkSize', o.value)} accent={ACCENT} />)}
          </div>
        </div>
      </>)}

      {/* ── STEP 4 — Thesis ── */}
      {step === 4 && (<>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <Label>Upload thesis PDF</Label>
            <span style={{ fontSize: 11, color: O.muted }}>recommended</span>
          </div>
          {thesisFileName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 10, border: `1.5px solid ${ACCENT}`, background: O.alpha(ACCENT, 0.06) }}>
              <FileText size={18} color={ACCENT} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: O.green }}>✓ Thesis extracted</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: O.muted }}>{thesisFileName}</p>
              </div>
              <button onClick={() => { setThesisFileName(null); set('thesis', '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: O.muted, padding: 4 }}><X size={15} /></button>
            </div>
          ) : thesisUploading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 15px', borderRadius: 10, border: `1.5px dashed ${ACCENT}`, background: O.alpha(ACCENT, 0.05) }}>
              <Loader2 size={16} color={ACCENT} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: O.ink }}>Extracting thesis…</span>
            </div>
          ) : (
            <label htmlFor="thesis-upload" style={{ display: 'block', cursor: 'pointer' }}>
              <div style={{ padding: '22px 15px', borderRadius: 10, border: `1.5px dashed ${O.bdr}`, background: O.surf, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
                <Upload size={20} color={O.muted} />
                <p style={{ margin: 0, fontSize: 13, color: O.muted }}>Drop your thesis PDF, or <span style={{ color: O.ink, fontWeight: 600 }}>click to browse</span></p>
                <p style={{ margin: 0, fontSize: 11, color: O.muted }}>AI will extract your focus areas automatically</p>
              </div>
            </label>
          )}
          <input id="thesis-upload" ref={thesisRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) handleThesisUpload(file); e.target.value = '' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: O.bdr }} />
          <span style={{ fontSize: 11, color: O.muted, whiteSpace: 'nowrap' }}>or write it here</span>
          <div style={{ flex: 1, height: 1, background: O.bdr }} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <Label optional>Investment thesis</Label>
            <span style={{ fontSize: 11, color: O.muted }}>{form.thesis.length}/500</span>
          </div>
          <textarea
            value={form.thesis} onChange={e => set('thesis', e.target.value.slice(0, 500))} rows={5}
            placeholder="We back technical founders building in deep tech and climate. We focus on $500K–$2M checks at pre-seed and seed."
            style={{ width: '100%', padding: '11px 15px', border: `1.5px solid ${O.bdr}`, borderRadius: 10, fontSize: 14.5, color: O.ink, outline: 'none', background: O.card, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px ${O.alpha(ACCENT, 0.12)}` }}
            onBlur={e => { e.currentTarget.style.borderColor = O.bdr; e.currentTarget.style.boxShadow = 'none' }}
          />
          <p style={{ fontSize: 11, color: O.muted, marginTop: 6 }}>We use this for semantic matching — surfacing founders aligned with your worldview.</p>
        </div>
        {error && <p style={{ fontSize: 13, color: O.red }}>{error}</p>}
      </>)}

      {/* ── STEP 5 — Photo ── */}
      {step === 5 && (<>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Label>Your photo</Label>
          <div style={{ position: 'relative' }}>
            <label htmlFor="inv-avatar" style={{ display: 'block', cursor: 'pointer' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', border: `2px dashed ${avatarPreview ? ACCENT : O.bdr}`, background: avatarPreview ? 'transparent' : O.surf, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'border-color 0.15s' }}>
                {avatarPreview ? <Image src={avatarPreview} alt="Avatar" fill style={{ objectFit: 'cover' }} /> : <span style={{ fontSize: 26, fontWeight: 700, color: O.muted, letterSpacing: '-0.02em' }}>{initials}</span>}
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={18} color="#fff" style={{ opacity: 0 }} />
                </div>
              </div>
            </label>
            {avatarPreview && (
              <button onClick={() => { setAvatarFile(null); setAvatarPreview(null) }} style={{ position: 'absolute', top: -3, right: -3, width: 20, height: 20, borderRadius: '50%', background: O.red, border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                <X size={10} color="#fff" strokeWidth={3} />
              </button>
            )}
            <input id="inv-avatar" ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) pickForCrop(file) }} />
          </div>
          <p style={{ fontSize: 12, color: avatarPreview ? O.green : O.muted, fontWeight: avatarPreview ? 600 : 400 }}>{avatarPreview ? '✓ Photo selected' : 'Click to upload · JPG or PNG, max 5MB'}</p>
        </div>
        {error && (
          <div style={{ padding: '11px 15px', borderRadius: 10, background: O.alpha(O.red, 0.06), border: `1px solid ${O.alpha(O.red, 0.25)}`, color: O.red, fontSize: 13 }}>{error}</div>
        )}
      </>)}

      {cropFile && (
        <ImageCropUpload
          file={cropFile}
          accent={ACCENT}
          onCancel={() => setCropFile(null)}
          onSave={onCropSave}
        />
      )}
    </OnboardingShell>
  )
}
