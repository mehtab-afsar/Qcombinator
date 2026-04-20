'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Building2, Target, Bell, LogOut, Save, RefreshCw, CheckCircle, Upload, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useInvestorSettings } from '@/features/investor/hooks/useInvestorSettings'
import {
  saveInvestorAccount,
  saveInvestorPreferences,
  saveInvestorNotifications,
  signOutInvestor,
} from '@/features/investor/services/investor-settings.service'
import { bg, surf, bdr, ink, muted, blue, green, red } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'

// ─── types ────────────────────────────────────────────────────────────────────
type TabId = 'account' | 'preferences' | 'notifications'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'account',       label: 'Account',        icon: User       },
  { id: 'preferences',   label: 'Preferences',    icon: Target     },
  { id: 'notifications', label: 'Notifications',  icon: Bell       },
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

  const [activeTab, setActiveTab] = useState<TabId>('account')
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
  const [newFounders,   setNewFounders]   = useState(true)
  const [highQScore,    setHighQScore]    = useState(true)
  const [connectionReq, setConnectionReq] = useState(true)
  const [weeklyDigest,  setWeeklyDigest]  = useState(false)

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
    setAvatarUrl((initialSettings as unknown as Record<string, unknown>).avatarUrl as string | null ?? null)
    setFirmLogoUrl((initialSettings as unknown as Record<string, unknown>).firmLogoUrl as string | null ?? null)
  }, [initialSettings])

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
      await saveInvestorNotifications({ newFounders, highQScore, connectionReq, weeklyDigest })
      showToast('Notification preferences saved')
    } catch {
      showToast('Failed to save', 'error')
    } finally { setSaving(false) }
  }

  const handleSignOut = async () => {
    await signOutInvestor()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ height: 20, width: 20, color: muted, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 13, color: muted }}>Loading settings…</p>
        </div>
      </div>
    )
  }

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
        <div style={{ display: 'flex', borderBottom: `1px solid ${bdr}`, marginBottom: 32 }}>
          {TABS.map(tab => {
            const Icon   = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', fontSize: 12, fontWeight: active ? 600 : 400,
                  color: active ? ink : muted, background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${ink}` : '2px solid transparent',
                  marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Icon style={{ height: 13, width: 13 }} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── account tab ── */}
        {activeTab === 'account' && (
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

            {/* Investment Thesis PDF */}
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText style={{ height: 14, width: 14, color: muted }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Investment Thesis</p>
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

            {/* danger zone */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Building2 style={{ height: 14, width: 14, color: red }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: red }}>Sign Out</p>
              </div>
              <p style={{ fontSize: 12, color: muted, marginBottom: 14 }}>Sign out of your investor account.</p>
              <button
                onClick={handleSignOut}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #FECACA', background: 'transparent', color: red, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <LogOut style={{ height: 12, width: 12 }} /> Sign out
              </button>
            </div>
          </div>
        )}

        {/* ── preferences tab ── */}
        {activeTab === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Investment Thesis */}
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
              {[
                { label: 'New high-quality founders join the platform', sub: 'Founders with Q-Score 70+ in your sectors', state: newFounders, set: setNewFounders },
                { label: 'Q-Score updates from founders you follow', sub: 'When a connected founder improves their score', state: highQScore, set: setHighQScore },
                { label: 'Connection request notifications', sub: 'When a founder sends you a connection request', state: connectionReq, set: setConnectionReq },
                { label: 'Weekly digest email', sub: 'Summary of top founders and deal flow insights', state: weeklyDigest, set: setWeeklyDigest },
              ].map((item, i, arr) => (
                <div
                  key={item.label}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${bdr}` : 'none' }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: muted }}>{item.sub}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.state)}
                    style={{
                      width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: item.state ? green : bdr, transition: 'background .2s', flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: item.state ? 20 : 3,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
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
