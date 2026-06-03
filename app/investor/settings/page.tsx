'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Building2, Target, Bell, LogOut, Save, RefreshCw, CheckCircle, Upload, FileText, Users, Mail, Loader2, X, ChevronDown, Shield, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useInvestorSettings } from '@/features/investor/hooks/useInvestorSettings'
import {
  saveInvestorAccount,
  saveInvestorPreferences,
  saveInvestorNotifications,
  signOutInvestor,
} from '@/features/investor/services/investor-settings.service'
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'
import { TabNav } from '@/features/shared/components/TabNav'
import { PageSpinner } from '@/features/shared/components/Spinner'

// ─── types ────────────────────────────────────────────────────────────────────
type TabId = 'profile' | 'notifications' | 'team'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',        icon: User   },
  { id: 'notifications', label: 'Notifications',  icon: Bell   },
  { id: 'team',          label: 'Team',           icon: Users  },
]

const SECTOR_OPTIONS = [
  'SaaS', 'AI/ML', 'FinTech', 'HealthTech', 'CleanTech', 'EdTech',
  'E-Commerce', 'Marketplace', 'Developer Tools', 'Consumer', 'Deep Tech', 'Other',
]
const STAGE_OPTIONS = ['Pre-Seed', 'Seed', 'Series A', 'Series B+']
const CHECK_OPTIONS = ['$25K–$100K', '$100K–$500K', '$500K–$2M', '$2M+']

// ─── input style ──────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${bdr}`,
  background: bg, color: ink, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
}

// ─── component ────────────────────────────────────────────────────────────────
export default function InvestorSettingsPage() {
  const router = useRouter()
  const { settings: initialSettings, loading } = useInvestorSettings()

  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Images
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null)
  const [firmLogoUrl,     setFirmLogoUrl]     = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingLogo,   setUploadingLogo]   = useState(false)

  // Thesis upload
  const [thesisUploading,   setThesisUploading]   = useState(false)
  const [thesisExtracted,   setThesisExtracted]   = useState<{
    thesis: string; sectors: string[]; stages: string[]; checkSize: string; portfolioCompanies: string[]
  } | null>(null)

  // Form fields — initialised from hook once loaded
  const [displayName, setDisplayName] = useState('')
  const [email,       setEmail]       = useState('')
  const [fundName,    setFundName]    = useState('')
  const [title,       setTitle]       = useState('')
  const [thesis,      setThesis]      = useState('')
  const [sectors,     setSectors]     = useState<string[]>([])
  const [stages,      setStages]      = useState<string[]>([])
  const [checkSizes,  setCheckSizes]  = useState<string[]>([])
  const [newFounders,        setNewFounders]        = useState(true)
  const [highQScore,         setHighQScore]         = useState(true)
  const [connectionReq,      setConnectionReq]      = useState(true)
  const [weeklyDigest,       setWeeklyDigest]       = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [qscoreUpdates,      setQscoreUpdates]      = useState(true)
  const [investorMessages,   setInvestorMessages]   = useState(true)
  const [runwayAlerts,       setRunwayAlerts]        = useState(true)

  // Portfolio display config
  const [portfolioCfg, setPortfolioCfg] = useState({
    showMRR: true, showRunway: true, showBurn: true,
    showGrowth: true, showQScore: true, showHealth: true,
  })
  const [savingPortfolioCfg, setSavingPortfolioCfg] = useState(false)

  // Team
  const [invTeamMembers,    setInvTeamMembers]    = useState<{ id: string; role: string; joined_at: string; member_user_id: string; investor_profiles: { full_name: string } | null }[]>([])
  const [invTeamInvites,    setInvTeamInvites]    = useState<{ id: string; email: string; role: string; created_at: string }[]>([])
  const [invIsOwner,        setInvIsOwner]        = useState(true)
  const [invTeamLoading,    setInvTeamLoading]    = useState(false)
  const [invInviteEmail,    setInvInviteEmail]    = useState('')
  const [invInviteRole,     setInvInviteRole]     = useState<'admin' | 'analyst'>('analyst')
  const [invInviteSending,  setInvInviteSending]  = useState(false)
  const [showInvTeamForm,   setShowInvTeamForm]   = useState(false)

  // Q-Score parameter weights (P1-P6)
  const [weights, setWeights] = useState({
    weight_p1: 20, weight_p2: 17, weight_p3: 18,
    weight_p4: 15, weight_p5: 12, weight_p6: 18,
  })
  const [savingWeights, setSavingWeights] = useState(false)

  // Populate form once settings are loaded
  useEffect(() => {
    if (!initialSettings) return
    setEmail(initialSettings.email)
    setDisplayName(initialSettings.displayName)
    setFundName(initialSettings.fundName)
    setTitle(initialSettings.title)
    setThesis(initialSettings.thesis)
    setSectors(initialSettings.sectors)
    setStages(initialSettings.stages)
    setCheckSizes(initialSettings.checkSizes)
    setNewFounders(initialSettings.newFounders)
    setHighQScore(initialSettings.highQScore)
    setConnectionReq(initialSettings.connectionReq)
    setWeeklyDigest(initialSettings.weeklyDigest)
    setEmailNotifications(initialSettings.emailNotifications ?? true)
    setQscoreUpdates(initialSettings.qscoreUpdates ?? true)
    setInvestorMessages(initialSettings.investorMessages ?? true)
    setRunwayAlerts(initialSettings.runwayAlerts ?? true)
    setAvatarUrl((initialSettings as unknown as Record<string, unknown>).avatarUrl as string | null ?? null)
    setFirmLogoUrl((initialSettings as unknown as Record<string, unknown>).firmLogoUrl as string | null ?? null)
  }, [initialSettings])

  // Load portfolio config + weights on mount
  useEffect(() => {
    fetch('/api/investor/portfolio-config').then(r => r.json()).then(({ config }) => {
      if (config) setPortfolioCfg(cfg => ({ ...cfg, ...config }))
    }).catch(() => {})
    fetch('/api/investor/weights').then(r => r.json()).then(({ weights: w }) => {
      if (w) setWeights(wts => ({ ...wts, ...w }))
    }).catch(() => {})
  }, [])

  async function handleSavePortfolioCfg() {
    setSavingPortfolioCfg(true)
    try {
      await fetch('/api/investor/portfolio-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioCfg),
      })
      showToast('Portfolio display saved')
    } catch { showToast('Failed to save', 'error') }
    finally { setSavingPortfolioCfg(false) }
  }

  async function handleSaveWeights() {
    setSavingWeights(true)
    try {
      await fetch('/api/investor/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights),
      })
      showToast('Q-Score weights saved')
    } catch { showToast('Failed to save', 'error') }
    finally { setSavingWeights(false) }
  }

  function loadInvTeam() {
    setInvTeamLoading(true)
    fetch('/api/investor/team/members')
      .then(r => r.json())
      .then(d => { setInvTeamMembers(d.members ?? []); setInvTeamInvites(d.invites ?? []); setInvIsOwner(d.isOwner ?? true) })
      .catch(() => {})
      .finally(() => setInvTeamLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === 'team') loadInvTeam() }, [activeTab])

  async function handleSendInvTeamInvite() {
    if (!invInviteEmail.trim()) return
    setInvInviteSending(true)
    try {
      const res  = await fetch('/api/investor/team/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: invInviteEmail.trim(), role: invInviteRole }) })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Failed to send invite', 'error'); return }
      showToast(`Invite sent to ${invInviteEmail.trim()}`)
      setInvInviteEmail('')
      setShowInvTeamForm(false)
      loadInvTeam()
    } catch { showToast('Failed to send invite', 'error') }
    finally { setInvInviteSending(false) }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function toggleMulti(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const handleImageUpload = async (file: File, imageType: 'investor-avatar' | 'investor-logo') => {
    const setUploading = imageType === 'investor-avatar' ? setUploadingAvatar : setUploadingLogo
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('imageType', imageType)
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      if (imageType === 'investor-avatar') setAvatarUrl(url)
      else setFirmLogoUrl(url)
      showToast('Image updated')
    } catch {
      showToast('Upload failed', 'error')
    } finally { setUploading(false) }
  }

  const handleThesisUpload = async (file: File) => {
    setThesisUploading(true)
    setThesisExtracted(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/investor/thesis-upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const { extractedData } = await res.json()
      setThesisExtracted(extractedData)
    } catch {
      showToast('Failed to extract thesis data', 'error')
    } finally { setThesisUploading(false) }
  }

  const handleApplyThesis = async () => {
    if (!thesisExtracted) return
    setSaving(true)
    try {
      await saveInvestorPreferences({
        thesis: thesisExtracted.thesis,
        sectors: thesisExtracted.sectors,
        stages: thesisExtracted.stages,
        checkSizes: thesisExtracted.checkSize ? [thesisExtracted.checkSize] : checkSizes,
      })
      setThesis(thesisExtracted.thesis)
      setSectors(thesisExtracted.sectors)
      setStages(thesisExtracted.stages)
      setThesisExtracted(null)
      showToast('Thesis applied to your profile')
    } catch {
      showToast('Failed to apply thesis', 'error')
    } finally { setSaving(false) }
  }

  const handleSaveAccount = async () => {
    setSaving(true)
    try {
      await saveInvestorAccount({ displayName, fundName, title })
      showToast('Account saved')
    } catch {
      showToast('Failed to save', 'error')
    } finally { setSaving(false) }
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      await saveInvestorPreferences({ thesis, sectors, stages, checkSizes })
      showToast('Preferences saved')
    } catch {
      showToast('Failed to save', 'error')
    } finally { setSaving(false) }
  }

  const handleSaveNotifications = async () => {
    setSaving(true)
    try {
      await saveInvestorNotifications({ newFounders, highQScore, connectionReq, weeklyDigest, emailNotifications, qscoreUpdates, investorMessages, runwayAlerts })
      showToast('Notification preferences saved')
    } catch {
      showToast('Failed to save', 'error')
    } finally { setSaving(false) }
  }

  const handleSignOut = async () => {
    await signOutInvestor()
    router.push('/login')
  }

  if (loading) return <PageSpinner label="Loading settings…" />

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '40px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 8 }}>
            Investor · Settings
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: 300, letterSpacing: '-0.03em', color: ink }}>
            Settings.
          </h1>
        </div>

        {/* tabs */}
        <TabNav
          tabs={TABS}
          active={activeTab}
          onChange={id => setActiveTab(id as TabId)}
          style={{ marginBottom: 32 }}
        />

        {/* ── account tab ── */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Photo & Logo */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User style={{ height: 14, width: 14, color: muted }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Profile Photo & Firm Logo</p>
              </div>
              <div style={{ padding: '20px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: uploadingAvatar ? 'wait' : 'pointer' }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar url={avatarUrl} name={displayName || 'You'} size={80} radius={999} fontSize={28} />
                    {uploadingAvatar && (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw style={{ height: 18, width: 18, color: '#fff', animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: muted }}>Profile photo</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'investor-avatar'); e.target.value = ''; }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: uploadingLogo ? 'wait' : 'pointer' }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar url={firmLogoUrl} name={fundName || 'Fund'} size={80} radius={14} fontSize={26} bgColor={blue} fgColor="#fff" />
                    {uploadingLogo && (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw style={{ height: 18, width: 18, color: '#fff', animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: muted }}>Firm logo</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'investor-logo'); e.target.value = ''; }} />
                </label>
              </div>
            </div>

            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User style={{ height: 14, width: 14, color: muted }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Account Information</p>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Display Name
                    </label>
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Email
                    </label>
                    <input value={email} readOnly style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Fund / Firm Name
                    </label>
                    <input value={fundName} onChange={e => setFundName(e.target.value)} placeholder="Sequoia Capital" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Title
                    </label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Partner" style={inputStyle} />
                  </div>
                </div>
                <button
                  onClick={handleSaveAccount}
                  disabled={saving}
                  style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ink, color: bg, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Save style={{ height: 13, width: 13 }} />
                  {saving ? 'Saving…' : 'Save account'}
                </button>
              </div>
            </div>

            {/* ── Security section (inline in Profile tab) ── */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield style={{ height: 14, width: 14, color: muted }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Password & Security</p>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Change Password</p>
                  <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>We'll send a reset link to your email address.</p>
                  <button
                    onClick={async () => {
                      const { data: { user: u } } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
                      if (!u?.email) return
                      const sb = (await import('@/lib/supabase/client')).createClient()
                      await sb.auth.resetPasswordForEmail(u.email, { redirectTo: `${window.location.origin}/update-password` })
                      alert('Password reset email sent')
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <RefreshCw style={{ height: 13, width: 13 }} /> Send password reset email
                  </button>
                </div>
                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Sign Out Everywhere</p>
                  <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>Revoke all active sessions on other devices.</p>
                  <button
                    onClick={handleSignOut}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Lock style={{ height: 13, width: 13 }} /> Sign out other sessions
                  </button>
                </div>
              </div>
            </div>

            {/* danger zone */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Building2 style={{ height: 14, width: 14, color: red }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: red }}>Delete Account</p>
              </div>
              <p style={{ fontSize: 12, color: muted, marginBottom: 14 }}>Permanently delete your account and all associated data.</p>
              <button
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: red, color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <LogOut style={{ height: 12, width: 12 }} /> Delete Account
              </button>
            </div>
          </div>
        )}

        {/* ── preferences tab ── */}
        {activeTab === 'preferences-removed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Investment Thesis PDF upload — extract sectors/stages/check sizes automatically */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText style={{ height: 14, width: 14, color: muted }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Investment Thesis PDF</p>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: 12, color: muted, marginBottom: 16 }}>
                  Upload your fund thesis or LP deck — we&apos;ll extract your focus sectors, stages, and investment philosophy automatically.
                </p>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, fontWeight: 500, color: ink, cursor: thesisUploading ? 'wait' : 'pointer' }}>
                  {thesisUploading ? (
                    <><RefreshCw style={{ height: 13, width: 13, animation: 'spin 1s linear infinite' }} /> Extracting thesis data…</>
                  ) : (
                    <><Upload style={{ height: 13, width: 13 }} /> Upload PDF (max 10 MB)</>
                  )}
                  <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={thesisUploading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleThesisUpload(f); e.target.value = ''; }} />
                </label>

                {thesisExtracted && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: 20, padding: '16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Extracted Data Preview</p>
                    {thesisExtracted.thesis && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 3 }}>Thesis</p>
                        <p style={{ fontSize: 12, color: ink }}>{thesisExtracted.thesis}</p>
                      </div>
                    )}
                    {thesisExtracted.sectors.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 5 }}>Sectors</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {thesisExtracted.sectors.map(s => (
                            <span key={s} style={{ padding: '2px 8px', borderRadius: 999, background: '#EFF6FF', color: blue, fontSize: 11, fontWeight: 500 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {thesisExtracted.stages.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 5 }}>Stages</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {thesisExtracted.stages.map(s => (
                            <span key={s} style={{ padding: '2px 8px', borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: ink, fontSize: 11 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {thesisExtracted.checkSize && (
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 3 }}>Check Size</p>
                        <p style={{ fontSize: 12, color: ink }}>{thesisExtracted.checkSize}</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleApplyThesis}
                        disabled={saving}
                        style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: ink, color: bg, fontSize: 12, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <CheckCircle style={{ height: 12, width: 12 }} /> Apply to my profile
                      </button>
                      <button
                        onClick={() => setThesisExtracted(null)}
                        style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', color: muted, fontSize: 12, cursor: 'pointer' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Investment Thesis text */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target style={{ height: 14, width: 14, color: muted }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Investment Thesis</p>
              </div>
              <div style={{ padding: '20px' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Your thesis (shown to founders when they match with you)
                </label>
                <textarea
                  value={thesis}
                  onChange={e => setThesis(e.target.value)}
                  placeholder="We invest in pre-seed and seed stage companies building in AI/ML and developer tools. We look for technical founders with strong market insight…"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Sectors */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Sector Focus</p>
                <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>Select all that apply</p>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SECTOR_OPTIONS.map(s => {
                  const selected = sectors.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleMulti(sectors, setSectors, s)}
                      style={{
                        padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all .12s',
                        border: `1px solid ${selected ? blue : bdr}`,
                        background: selected ? '#EFF6FF' : bg,
                        color: selected ? blue : muted,
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Stages */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Stage Preference</p>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {STAGE_OPTIONS.map(s => {
                  const selected = stages.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleMulti(stages, setStages, s)}
                      style={{
                        padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all .12s',
                        border: `1px solid ${selected ? blue : bdr}`,
                        background: selected ? '#EFF6FF' : bg,
                        color: selected ? blue : muted,
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Check Size */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Check Size</p>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CHECK_OPTIONS.map(c => {
                  const selected = checkSizes.includes(c)
                  return (
                    <button
                      key={c}
                      onClick={() => toggleMulti(checkSizes, setCheckSizes, c)}
                      style={{
                        padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all .12s',
                        border: `1px solid ${selected ? blue : bdr}`,
                        background: selected ? '#EFF6FF' : bg,
                        color: selected ? blue : muted,
                      }}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleSavePreferences}
              disabled={saving}
              style={{ alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 8, border: 'none', background: ink, color: bg, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Save style={{ height: 13, width: 13 }} />
              {saving ? 'Saving…' : 'Save preferences'}
            </button>

            {/* Portfolio Display Configuration */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Portfolio Display</p>
                <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>Choose which metrics to show on your portfolio view</p>
              </div>
              <div style={{ padding: '4px 0' }}>
                {([
                  { key: 'showQScore',  label: 'Q-Score',    sub: 'Composite investor readiness score' },
                  { key: 'showHealth',  label: 'Health',     sub: 'Excellent / Good / Watch / Critical indicator' },
                  { key: 'showMRR',     label: 'Revenue',    sub: 'Monthly recurring revenue (self-reported or Stripe)' },
                  { key: 'showGrowth',  label: 'Growth',     sub: 'MoM or YoY growth rate' },
                  { key: 'showBurn',    label: 'Burn Rate',  sub: 'Monthly cash burn' },
                  { key: 'showRunway',  label: 'Runway',     sub: 'Months of cash remaining' },
                ] as { key: keyof typeof portfolioCfg; label: string; sub: string }[]).map((item, i, arr) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${bdr}` : 'none' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: muted }}>{item.sub}</p>
                    </div>
                    <button
                      onClick={() => setPortfolioCfg(c => ({ ...c, [item.key]: !c[item.key] }))}
                      style={{ width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', background: portfolioCfg[item.key] ? green : bdr, transition: 'background .2s', flexShrink: 0, position: 'relative' }}
                    >
                      <div style={{ position: 'absolute', top: 3, left: portfolioCfg[item.key] ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 20px', borderTop: `1px solid ${bdr}`, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSavePortfolioCfg} disabled={savingPortfolioCfg} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ink, color: bg, fontSize: 12, fontWeight: 500, cursor: savingPortfolioCfg ? 'not-allowed' : 'pointer', opacity: savingPortfolioCfg ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Save style={{ height: 12, width: 12 }} />
                  {savingPortfolioCfg ? 'Saving…' : 'Save display settings'}
                </button>
              </div>
            </div>

            {/* Q-Score Dimension Weights */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Q-Score Dimension Weights</p>
                <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>Adjust how each dimension is weighted when ranking deal flow</p>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {([
                  { key: 'weight_p1', label: 'P1: Market Readiness',   color: blue },
                  { key: 'weight_p2', label: 'P2: Market Potential',   color: green },
                  { key: 'weight_p3', label: 'P3: IP & Defensibility', color: amber },
                  { key: 'weight_p4', label: 'P4: Founder & Team',     color: red },
                  { key: 'weight_p5', label: 'P5: Structural Impact',  color: blue },
                  { key: 'weight_p6', label: 'P6: Financials',         color: green },
                ] as { key: keyof typeof weights; label: string; color: string }[]).map(({ key, label, color }) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: ink }}>{label}</label>
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{weights[key]}</span>
                    </div>
                    <input
                      type="range" min={0} max={40} step={1} value={weights[key]}
                      onChange={e => setWeights(w => ({ ...w, [key]: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: color }}
                    />
                  </div>
                ))}
                <p style={{ fontSize: 11, color: muted }}>
                  Total weight: <strong>{Object.values(weights).reduce((a, b) => a + b, 0)}</strong> (proportional — any total works)
                </p>
              </div>
              <div style={{ padding: '14px 20px', borderTop: `1px solid ${bdr}`, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSaveWeights} disabled={savingWeights} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ink, color: bg, fontSize: 12, fontWeight: 500, cursor: savingWeights ? 'not-allowed' : 'pointer', opacity: savingWeights ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Save style={{ height: 12, width: 12 }} />
                  {savingWeights ? 'Saving…' : 'Save weights'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── notifications tab ── */}
        {activeTab === 'notifications' && (
          <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell style={{ height: 14, width: 14, color: muted }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Notification Preferences</p>
            </div>
            <div style={{ padding: '4px 0' }}>
              {/* Deal flow alerts */}
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: muted, padding: '12px 20px 4px' }}>Deal Flow Alerts</p>
              {[
                { label: 'New high-quality founders join the platform', sub: 'Founders with Q-Score 70+ in your sectors', state: newFounders, set: setNewFounders },
                { label: 'Q-Score updates from founders you follow', sub: 'When a connected founder improves their score', state: highQScore, set: setHighQScore },
                { label: 'Runway alerts', sub: 'When a founder you follow drops below 6 months of runway', state: runwayAlerts, set: setRunwayAlerts },
              ].map((item, i, arr) => (
                <div
                  key={item.label}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${bdr}` : 'none' }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: muted }}>{item.sub}</p>
                  </div>
                  <button onClick={() => item.set(!item.state)} style={{ width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', background: item.state ? green : bdr, transition: 'background .2s', flexShrink: 0, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 3, left: item.state ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              ))}
              {/* Communication */}
              <div style={{ height: 1, background: bdr, margin: '4px 0' }} />
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: muted, padding: '12px 20px 4px' }}>Communication</p>
              {[
                { label: 'Connection request notifications', sub: 'When a founder sends you a connection request', state: connectionReq, set: setConnectionReq },
                { label: 'Investor messages', sub: 'When a founder replies to your message', state: investorMessages, set: setInvestorMessages },
                { label: 'Q-Score milestone alerts', sub: 'When a followed founder hits a new Q-Score tier', state: qscoreUpdates, set: setQscoreUpdates },
              ].map((item, i, arr) => (
                <div
                  key={item.label}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${bdr}` : 'none' }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: muted }}>{item.sub}</p>
                  </div>
                  <button onClick={() => item.set(!item.state)} style={{ width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', background: item.state ? green : bdr, transition: 'background .2s', flexShrink: 0, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 3, left: item.state ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              ))}
              {/* Email delivery */}
              <div style={{ height: 1, background: bdr, margin: '4px 0' }} />
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: muted, padding: '12px 20px 4px' }}>Email Delivery</p>
              {[
                { label: 'Email notifications', sub: 'Master toggle — disabling this pauses all email alerts', state: emailNotifications, set: setEmailNotifications },
                { label: 'Weekly digest email', sub: 'Summary of top founders and deal flow insights, sent every Monday', state: weeklyDigest, set: setWeeklyDigest },
              ].map((item, i, arr) => (
                <div
                  key={item.label}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${bdr}` : 'none' }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: muted }}>{item.sub}</p>
                  </div>
                  <button onClick={() => item.set(!item.state)} style={{ width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', background: item.state ? green : bdr, transition: 'background .2s', flexShrink: 0, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 3, left: item.state ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 11, color: muted }}>Notification emails will be sent to <strong>{email}</strong></p>
              <button
                onClick={handleSaveNotifications}
                disabled={saving}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ink, color: bg, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Save style={{ height: 13, width: 13 }} />
                {saving ? 'Saving…' : 'Save notifications'}
              </button>
            </div>
          </div>
        )}

        {/* Team */}
        {activeTab === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>Your Team</h2>
                <p style={{ fontSize: 13, color: muted }}>Invite analysts and partners to your deal flow workspace.</p>
              </div>
              {invIsOwner && (
                <button onClick={() => setShowInvTeamForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: blue, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Mail style={{ width: 13, height: 13 }} /> Invite member
                </button>
              )}
            </div>

            {showInvTeamForm && (
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input type="email" placeholder="analyst@fund.com" value={invInviteEmail} onChange={e => setInvInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendInvTeamInvite()} style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${bdr}`, fontSize: 13, color: ink, background: '#fff', fontFamily: 'inherit', outline: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <select value={invInviteRole} onChange={e => setInvInviteRole(e.target.value as 'admin' | 'analyst')} style={{ padding: '9px 32px 9px 12px', borderRadius: 8, border: `1.5px solid ${bdr}`, fontSize: 13, color: ink, background: '#fff', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                      <option value="analyst">Analyst</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: muted, pointerEvents: 'none' }} />
                  </div>
                  <button onClick={handleSendInvTeamInvite} disabled={invInviteSending || !invInviteEmail.trim()} style={{ padding: '9px 18px', borderRadius: 8, background: invInviteSending ? muted : blue, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: invInviteSending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {invInviteSending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : null}
                    Send invite
                  </button>
                  <button onClick={() => setShowInvTeamForm(false)} style={{ padding: '9px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${bdr}`, color: muted, cursor: 'pointer' }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <p style={{ fontSize: 11, color: muted, marginTop: 10 }}><strong>Analyst:</strong> View deal flow, pipeline, and message founders.&ensp;<strong>Admin:</strong> Full access except billing.</p>
              </div>
            )}

            <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 16, overflow: 'hidden' }}>
              {invTeamLoading ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}><Loader2 style={{ width: 20, height: 20, color: muted, margin: '0 auto' }} className="animate-spin" /></div>
              ) : invTeamMembers.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <Users style={{ width: 28, height: 28, color: muted, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: muted }}>Just you for now — invite an analyst.</p>
                </div>
              ) : invTeamMembers.map((m, i) => {
                const name      = m.investor_profiles?.full_name ?? 'Unknown'
                const roleColor = m.role === 'admin' ? blue : muted
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: i > 0 ? `1px solid ${bdr}` : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${roleColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: roleColor, flexShrink: 0 }}>{name[0]?.toUpperCase() ?? '?'}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 1 }}>{name}</p>
                      <p style={{ fontSize: 11, color: muted }}>Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${roleColor}15`, color: roleColor, textTransform: 'capitalize' }}>{m.role}</span>
                    {invIsOwner && (
                      <button onClick={async () => { if (!confirm('Remove this member?')) return; await fetch(`/api/investor/team/members?userId=${m.member_user_id}`, { method: 'DELETE' }); loadInvTeam() }} style={{ padding: '5px 10px', borderRadius: 7, background: 'transparent', border: `1px solid ${bdr}`, fontSize: 11, color: muted, cursor: 'pointer' }}>Remove</button>
                    )}
                  </div>
                )
              })}
            </div>

            {invTeamInvites.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Pending invites</p>
                <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
                  {invTeamInvites.map((inv, i) => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: i > 0 ? `1px solid ${bdr}` : 'none' }}>
                      <Mail style={{ width: 15, height: 15, color: muted, flexShrink: 0 }} />
                      <p style={{ flex: 1, fontSize: 13, color: ink }}>{inv.email}</p>
                      <span style={{ fontSize: 11, color: muted, textTransform: 'capitalize' }}>{inv.role}</span>
                      <span style={{ fontSize: 11, color: amber, background: '#FFFBEB', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security */}
        {activeTab === 'security-removed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Password reset */}
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 4 }}>Password</p>
              <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
                To change your password, we&apos;ll send a reset link to your email.
              </p>
              <button
                onClick={async () => {
                  const { data: { user } } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
                  if (!user?.email) return
                  const sb = (await import('@/lib/supabase/client')).createClient()
                  await sb.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/update-password` })
                  setToast({ msg: 'Password reset email sent', type: 'success' })
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: `1.5px solid ${bdr}`, background: 'white', color: ink, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                <RefreshCw style={{ height: 13, width: 13 }} />
                Send password reset email
              </button>
            </div>

            {/* Connected accounts */}
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 4 }}>Connected accounts</p>
              <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>OAuth providers linked to your account.</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, border: `1px solid ${bdr}`, background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>Google</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#ECFDF5', color: '#059669' }}>Connected</span>
              </div>
            </div>

            {/* Sign out all sessions */}
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 4 }}>Sign out everywhere</p>
              <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
                Revoke all active sessions on other devices. You&apos;ll remain signed in here.
              </p>
              <button
                onClick={async () => {
                  if (!confirm('Sign out from all other devices?')) return
                  const sb = (await import('@/lib/supabase/client')).createClient()
                  await sb.auth.signOut({ scope: 'others' })
                  setToast({ msg: 'Signed out from all other sessions', type: 'success' })
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: `1.5px solid ${bdr}`, background: 'white', color: ink, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                <Lock style={{ height: 13, width: 13 }} />
                Sign out other sessions
              </button>
            </div>

          </div>
        )}

      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: toast.type === 'success' ? ink : red,
              color: bg, borderRadius: 10, padding: '10px 20px',
              fontSize: 13, fontWeight: 500, zIndex: 9999,
              display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            }}
          >
            {toast.type === 'success' && <CheckCircle style={{ height: 14, width: 14 }} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
