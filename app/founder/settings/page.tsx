'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { User, Building2, Bell, Lock, Download, Trash2, RefreshCw, Save, AlertTriangle, Plug, CheckCircle, Users, Mail, Loader2, X, ChevronDown, Shield } from 'lucide-react';
import { useFounderData } from '@/features/founder/hooks/useFounderData';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  loadSettings,
  saveAccountSettings,
  saveCompanySettings,
  saveStartupDetailsSettings,
  saveNotificationSettings,
  saveStartupProfileSettings,
  exportUserData,
} from '@/features/founder/services/settings.service';
import { bg, surf, bdr, ink, muted, blue, green, red } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'
import { TabNav } from '@/features/shared/components/TabNav'

type TabId = 'account' | 'company' | 'notifications' | 'integrations' | 'data' | 'team' | 'security';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'account',       label: 'Account',        icon: User      },
  { id: 'company',       label: 'Company',        icon: Building2 },
  { id: 'notifications', label: 'Notifications',  icon: Bell      },
  { id: 'team',          label: 'Team',           icon: Users     },
  { id: 'security',      label: 'Security',       icon: Shield    },
  { id: 'integrations',  label: 'Integrations',   icon: Plug      },
  { id: 'data',          label: 'Data & Privacy', icon: Lock      },
];

// ─── connectors data ──────────────────────────────────────────────────────────
const CONNECTORS = [
  { id: 'stripe',  name: 'Stripe',        desc: 'Revenue & MRR data',          available: true,  link: '/founder/dashboard' },
  { id: 'linkedin',name: 'LinkedIn',      desc: 'Team & founder signals',       available: false, link: null },
  { id: 'sheets',  name: 'Google Sheets', desc: 'Financial models',             available: false, link: null },
  { id: 'gmail',   name: 'Gmail',         desc: 'Customer conversations',       available: false, link: null },
  { id: 'slack',   name: 'Slack',         desc: 'Team structure',               available: false, link: null },
];

function SettingsInner() {
  const router   = useRouter();
  const params   = useSearchParams();
  const urlTab   = params.get('tab') as TabId | null;

  const { loading } = useFounderData();
  const [activeTab, setActiveTab] = useState<TabId>(urlTab ?? 'account');

  // Sync from URL
  useEffect(() => {
    if (urlTab && TABS.some(t => t.id === urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    router.push(`/founder/settings?tab=${tab}`);
  }
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Images
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null);
  const [companyLogoUrl,  setCompanyLogoUrl]  = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo,   setUploadingLogo]   = useState(false);

  // Account
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');

  // Company
  const [startupName,  setStartupName]  = useState('');
  const [industry,     setIndustry]     = useState('');
  const [description,  setDescription]  = useState('');

  // Company extras
  const [tagline,          setTagline]          = useState('');
  const [location,         setLocation]         = useState('');

  // Startup details (JSONB)
  const [problemStatement, setProblemStatement] = useState('');
  const [targetCustomer,   setTargetCustomer]   = useState('');

  // Startup profile
  const [spStage,         setSpStage]         = useState('');
  const [spRevenue,       setSpRevenue]       = useState('');
  const [spTeamSize,      setSpTeamSize]      = useState('');
  const [spFunding,       setSpFunding]       = useState('');
  const [spWebsite,       setSpWebsite]       = useState('');

  // Team
  const [teamMembers,    setTeamMembers]    = useState<{ id: string; role: string; joined_at: string; founder_profiles: { full_name: string; user_id: string } | null }[]>([]);
  const [teamInvites,    setTeamInvites]    = useState<{ id: string; email: string; role: string; created_at: string }[]>([]);
  const [myTeamRole,     setMyTeamRole]     = useState<string | null>(null);
  const [teamLoading,    setTeamLoading]    = useState(false);
  const [inviteEmail,    setInviteEmail]    = useState('');
  const [inviteRole,     setInviteRole]     = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviteSending,  setInviteSending]  = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [qScoreUpdates,       setQScoreUpdates]       = useState(true);
  const [investorMessages,    setInvestorMessages]    = useState(true);
  const [weeklyDigest,        setWeeklyDigest]        = useState(false);
  const [runwayAlerts,        setRunwayAlerts]        = useState(true);

  // Load all settings from Supabase on mount
  useEffect(() => {
    loadSettings().then(s => {
      if (!s) return
      setEmail(s.email)
      setFullName(s.fullName)
      setStartupName(s.startupName)
      setIndustry(s.industry)
      setDescription(s.description)
      setSpStage(s.stage)
      setSpRevenue(s.revenueStatus)
      setSpTeamSize(s.teamSize)
      setSpFunding(s.fundingStatus)
      setSpWebsite(s.website)
      setTagline(s.tagline)
      setLocation(s.location)
      setProblemStatement(s.problemStatement)
      setTargetCustomer(s.targetCustomer)
      setAvatarUrl(s.avatarUrl || null)
      setCompanyLogoUrl(s.companyLogoUrl || null)
      setEmailNotifications(s.notificationPreferences.emailNotifications)
      setQScoreUpdates(s.notificationPreferences.qScoreUpdates)
      setInvestorMessages(s.notificationPreferences.investorMessages)
      setWeeklyDigest(s.notificationPreferences.weeklyDigest)
      setRunwayAlerts(s.notificationPreferences.runwayAlerts)
    }).catch(() => {})
  }, []);

  function loadTeam() {
    setTeamLoading(true);
    fetch('/api/team/members')
      .then(r => r.json())
      .then(d => {
        setTeamMembers(d.members ?? []);
        setTeamInvites(d.invites ?? []);
        setMyTeamRole(d.myRole ?? null);
      })
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  }

  useEffect(() => { if (activeTab === 'team') loadTeam(); }, [activeTab]);

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      const res = await fetch('/api/team/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? 'Failed to send invite', 'error'); return; }
      showToast(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setShowInviteForm(false);
      loadTeam();
    } catch { showToast('Failed to send invite', 'error'); }
    finally { setInviteSending(false); }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`Remove ${name} from your team?`)) return;
    await fetch(`/api/team/members?userId=${userId}`, { method: 'DELETE' });
    loadTeam();
  }

  async function handleChangeRole(userId: string, role: 'admin' | 'member' | 'viewer') {
    await fetch(`/api/team/members?userId=${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    loadTeam();
  }

  async function handleCancelInvite(inviteId: string) {
    if (!confirm('Cancel this invite?')) return;
    await fetch(`/api/team/members?inviteId=${inviteId}`, { method: 'DELETE' });
    loadTeam();
  }

  async function handleResendInvite(email: string) {
    setInviteSending(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? 'Failed to resend', 'error'); return; }
      showToast(`Invite resent to ${email}`);
      loadTeam();
    } catch { showToast('Failed to resend invite', 'error'); }
    finally { setInviteSending(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const handleImageUpload = async (file: File, imageType: 'founder-avatar' | 'founder-logo') => {
    const setUploading = imageType === 'founder-avatar' ? setUploadingAvatar : setUploadingLogo;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('imageType', imageType);
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      if (imageType === 'founder-avatar') setAvatarUrl(url);
      else setCompanyLogoUrl(url);
      showToast('Image updated');
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      await saveAccountSettings(fullName);
      showToast('Account settings saved');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      await saveCompanySettings(startupName, industry, description, tagline, location);
      showToast('Company settings saved');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStartupDetails = async () => {
    setSaving(true);
    try {
      await saveStartupDetailsSettings(problemStatement, targetCustomer);
      showToast('Startup details saved');
    } catch {
      showToast('Failed to save startup details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStartupProfile = async () => {
    setSaving(true);
    try {
      await saveStartupProfileSettings(spStage, spRevenue, spTeamSize, spFunding, spWebsite);
      showToast('Startup profile saved');
    } catch {
      showToast('Failed to save startup profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      await exportUserData();
      showToast('Data exported successfully');
    } catch {
      showToast('Failed to export data', 'error');
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await saveNotificationSettings({ emailNotifications, qScoreUpdates, investorMessages, weeklyDigest, runwayAlerts });
      showToast('Preferences saved');
    } catch {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure? This will permanently delete your account. This cannot be undone.')) {
      showToast('Please contact support@edgealpha.ai to delete your account.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ height: 22, width: 22, color: muted, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 13, color: muted }}>Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '36px 28px 72px' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '10px 18px', borderRadius: 10,
          background: toast.type === 'success' ? green : red,
          color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* ── header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: muted, fontWeight: 600, marginBottom: 5 }}>
            Founder · Settings
          </p>
          <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 300, letterSpacing: '-0.03em', color: ink }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Manage your account and preferences</p>
        </motion.div>

        {/* ── tab nav ── */}
        <TabNav
          tabs={TABS}
          active={activeTab}
          onChange={id => handleTabChange(id as TabId)}
          style={{ marginBottom: 28 }}
        />

        {/* ── tab panels ── */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >

          {/* Account */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SettingsCard title="Profile Photo & Logo" description="Upload your profile photo and company logo">
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {/* Profile photo */}
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: uploadingAvatar ? 'wait' : 'pointer' }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar url={avatarUrl} name={fullName || 'You'} size={80} radius={999} fontSize={28} />
                      {uploadingAvatar && (
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <RefreshCw style={{ height: 18, width: 18, color: '#fff', animation: 'spin 1s linear infinite' }} />
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: muted }}>Profile photo</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'founder-avatar'); e.target.value = ''; }} />
                  </label>
                  {/* Company logo */}
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: uploadingLogo ? 'wait' : 'pointer' }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar url={companyLogoUrl} name={startupName || 'Co'} size={80} radius={14} fontSize={26} />
                      {uploadingLogo && (
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <RefreshCw style={{ height: 18, width: 18, color: '#fff', animation: 'spin 1s linear infinite' }} />
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: muted }}>Company logo</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'founder-logo'); e.target.value = ''; }} />
                  </label>
                </div>
              </SettingsCard>

              <SettingsCard title="Account Information" description="Update your personal information">
                <FieldRow label="Full Name">
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    style={inputStyle}
                  />
                </FieldRow>
                <FieldRow label="Email" hint="Email is managed through your auth provider">
                  <input
                    type="email"
                    value={email}
                    disabled
                    style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                  />
                </FieldRow>
                <SaveButton onClick={handleSaveAccount} loading={saving} />
              </SettingsCard>

            </div>
          )}

          {/* Company */}
          {activeTab === 'company' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SettingsCard title="Company Details" description="Manage your startup information">
                <FieldRow label="Company Name">
                  <input
                    value={startupName}
                    onChange={e => setStartupName(e.target.value)}
                    placeholder="Your startup name"
                    style={inputStyle}
                  />
                </FieldRow>
                <FieldRow label="Industry">
                  <input
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g., B2B SaaS, FinTech"
                    style={inputStyle}
                  />
                </FieldRow>
                <FieldRow label="Description">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of your startup"
                    style={{ ...inputStyle, minHeight: 96, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                </FieldRow>
                <FieldRow label="Tagline" hint="One-liner shown on your investor profile (max 140 chars)">
                  <input
                    value={tagline}
                    onChange={e => setTagline(e.target.value.slice(0, 140))}
                    placeholder="e.g., AI-powered compliance for regulated industries"
                    style={inputStyle}
                  />
                </FieldRow>
                <FieldRow label="Location">
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g., London, UK"
                    style={inputStyle}
                  />
                </FieldRow>
                <SaveButton onClick={handleSaveCompany} loading={saving} />
              </SettingsCard>

              <SettingsCard title="Startup Details" description="Your problem, customer, and traction data — visible to investors">
                <FieldRow label="Problem Statement">
                  <textarea
                    value={problemStatement}
                    onChange={e => setProblemStatement(e.target.value)}
                    placeholder="What problem are you solving? Be specific."
                    style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                </FieldRow>
                <FieldRow label="Target Customer">
                  <input
                    value={targetCustomer}
                    onChange={e => setTargetCustomer(e.target.value)}
                    placeholder="Who is your ideal customer? e.g., Mid-market CFOs"
                    style={inputStyle}
                  />
                </FieldRow>
                <SaveButton onClick={handleSaveStartupDetails} loading={saving} />

                <Divider />

                <FieldRow label="Stage">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { v: 'product-development', l: 'Product Development', s: 'Building or validating the product' },
                      { v: 'commercial',           l: 'Commercial',          s: 'Early customers or pilots underway' },
                      { v: 'growth-scaling',       l: 'Growth / Scaling',    s: 'Scaling revenue and team' },
                    ].map(o => (
                      <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${spStage === o.v ? blue : bdr}`, background: spStage === o.v ? `${blue}0D` : surf }}>
                        <input type="radio" name="sp-stage" value={o.v} checked={spStage === o.v} onChange={() => setSpStage(o.v)} style={{ accentColor: blue }} />
                        <span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: spStage === o.v ? blue : ink }}>{o.l}</span>
                          {o.s && <span style={{ fontSize: 11, color: muted, display: 'block' }}>{o.s}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow label="Revenue">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { v: 'pre-revenue',   l: 'Pre-revenue',            s: 'No paying customers yet' },
                      { v: 'early-revenue', l: 'Early revenue (pilots)', s: 'First paying customers' },
                      { v: 'recurring',     l: 'Recurring revenues',     s: 'Signed contracts or SaaS MRR' },
                    ].map(o => (
                      <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${spRevenue === o.v ? blue : bdr}`, background: spRevenue === o.v ? `${blue}0D` : surf }}>
                        <input type="radio" name="sp-revenue" value={o.v} checked={spRevenue === o.v} onChange={() => setSpRevenue(o.v)} style={{ accentColor: blue }} />
                        <span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: spRevenue === o.v ? blue : ink }}>{o.l}</span>
                          {o.s && <span style={{ fontSize: 11, color: muted, display: 'block' }}>{o.s}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow label="Team Size">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['1-5', '5-10', '10+'].map(v => (
                      <button key={v} onClick={() => setSpTeamSize(v)} style={{ padding: '8px 18px', borderRadius: 7, cursor: 'pointer', border: `1.5px solid ${spTeamSize === v ? blue : bdr}`, background: spTeamSize === v ? `${blue}0D` : surf, fontSize: 13, fontWeight: spTeamSize === v ? 600 : 400, color: spTeamSize === v ? blue : ink, fontFamily: 'inherit' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow label="Funding Status">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { v: 'bootstrapped',   l: 'Bootstrapped'     },
                      { v: 'friends-family', l: 'Friends & family' },
                      { v: 'angel',          l: 'Angel investors'  },
                      { v: 'vc',             l: 'VC'               },
                    ].map(o => (
                      <button key={o.v} onClick={() => setSpFunding(o.v)} style={{ padding: '8px 18px', borderRadius: 7, cursor: 'pointer', border: `1.5px solid ${spFunding === o.v ? blue : bdr}`, background: spFunding === o.v ? `${blue}0D` : surf, fontSize: 13, fontWeight: spFunding === o.v ? 600 : 400, color: spFunding === o.v ? blue : ink, fontFamily: 'inherit' }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow label="Website">
                  <input value={spWebsite} onChange={e => setSpWebsite(e.target.value)} placeholder="https://" style={inputStyle} />
                </FieldRow>
                <SaveButton onClick={handleSaveStartupProfile} loading={saving} />
              </SettingsCard>
            </div>
          )}


          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SettingsCard title="Notification Preferences" description="Choose what updates you want to receive">
                <NotifRow
                  label="Email Notifications"
                  sub="Receive email updates about your account"
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                />
                <Divider />
                <NotifRow
                  label="Q-Score Updates"
                  sub="Get notified when your Q-Score changes"
                  checked={qScoreUpdates}
                  onChange={setQScoreUpdates}
                />
                <Divider />
                <NotifRow
                  label="Investor Messages"
                  sub="Notifications for new investor connections"
                  checked={investorMessages}
                  onChange={setInvestorMessages}
                />
                <Divider />
                <NotifRow
                  label="Runway Alerts"
                  sub="Alert when runway drops below 3 months"
                  checked={runwayAlerts}
                  onChange={setRunwayAlerts}
                />
                <Divider />
                <NotifRow
                  label="Weekly Digest"
                  sub="Weekly summary of your progress"
                  checked={weeklyDigest}
                  onChange={setWeeklyDigest}
                />
                <div style={{ marginTop: 8 }}>
                  <SaveButton label="Save Preferences" onClick={handleSaveNotifications} />
                </div>
              </SettingsCard>
            </div>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 13, color: muted }}>
                  Connect external tools to enrich your Q-Score and investor profile with verified data.
                </p>
              </div>
              {CONNECTORS.map(c => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px',
                    background: surf, border: `1px solid ${bdr}`, borderRadius: 14,
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: bg, border: `1px solid ${bdr}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Plug style={{ width: 16, height: 16, color: muted }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: muted }}>{c.desc}</p>
                  </div>
                  {!c.available ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                      background: surf, color: muted, border: `1px solid ${bdr}`,
                    }}>
                      Coming soon
                    </span>
                  ) : c.link ? (
                    <a
                      href={c.link}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 999,
                        background: ink, color: bg, textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <CheckCircle style={{ width: 12, height: 12 }} />
                      Connect
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: muted }}>—</span>
                  )}
                </div>
              ))}
              <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>
                More integrations launching soon — Stripe live metrics, LinkedIn signals, and Google Sheets models.
              </p>
            </div>
          )}

          {/* Data & Privacy */}
          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SettingsCard title="Data Management" description="Export or manage your data">
                {/* Export */}
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Export Your Data</p>
                  <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>Download all your data in JSON format</p>
                  <OutlineButton onClick={handleExportData}>
                    <Download style={{ height: 13, width: 13 }} />
                    Export Data
                  </OutlineButton>
                </div>

                {/* Danger */}
                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: red, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Danger Zone
                  </p>
                  <p style={{ fontSize: 12, color: muted, marginBottom: 14 }}>
                    Permanently delete your account and all associated data
                  </p>
                  <button
                    onClick={handleDeleteAccount}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '9px 20px', background: red, color: '#fff',
                      border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    <Trash2 style={{ height: 13, width: 13 }} />
                    Delete Account
                  </button>
                </div>
              </SettingsCard>

              {/* Notice */}
              <div style={{ display: 'flex', gap: 12, padding: '16px 20px', background: surf, border: `1px solid ${bdr}`, borderRadius: 14 }}>
                <AlertTriangle style={{ height: 15, width: 15, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: ink, marginBottom: 3 }}>Your Data Is Secure</p>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
                    Your data is stored securely in Supabase with row-level security. Only you and investors you connect with can access your information.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SettingsCard title="Password" description="Update your account password">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 13, color: muted, margin: 0 }}>
                    To change your password, we&apos;ll send a reset link to your email address.
                  </p>
                  <OutlineButton
                    onClick={async () => {
                      const { data: { user } } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
                      if (!user?.email) return
                      const sb = (await import('@/lib/supabase/client')).createClient()
                      await sb.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/update-password` })
                      showToast('Password reset email sent')
                    }}
                  >
                    <RefreshCw style={{ height: 13, width: 13 }} />
                    Send password reset email
                  </OutlineButton>
                </div>
              </SettingsCard>

              <SettingsCard title="Connected accounts" description="OAuth providers linked to your account">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: ink, margin: 0 }}>Google</p>
                      <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>OAuth sign-in</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#ECFDF5', color: '#059669' }}>Connected</span>
                </div>
              </SettingsCard>

              <SettingsCard title="Sign out everywhere" description="Revoke all active sessions on other devices">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 13, color: muted, margin: 0 }}>
                    This will sign you out of all browsers and devices except the current one.
                  </p>
                  <OutlineButton
                    onClick={async () => {
                      if (!confirm('Sign out from all other devices?')) return
                      const sb = (await import('@/lib/supabase/client')).createClient()
                      await sb.auth.signOut({ scope: 'others' })
                      showToast('Signed out from all other sessions')
                    }}
                  >
                    <Lock style={{ height: 13, width: 13 }} />
                    Sign out other sessions
                  </OutlineButton>
                </div>
              </SettingsCard>
            </div>
          )}

          {/* Team */}
          {activeTab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>Your Team</h2>
                  <p style={{ fontSize: 13, color: muted }}>Invite co-founders and employees to your startup workspace.</p>
                </div>
                {(myTeamRole === 'owner' || myTeamRole === 'admin') && (
                  <button
                    onClick={() => setShowInviteForm(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: blue, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Mail style={{ width: 13, height: 13 }} /> Invite member
                  </button>
                )}
              </div>

              {/* Invite form */}
              {showInviteForm && (
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: '20px 22px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 14 }}>Send invite</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      placeholder="colleague@startup.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                      style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${bdr}`, fontSize: 13, color: ink, background: '#fff', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <div style={{ position: 'relative' }}>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                        style={{ padding: '9px 32px 9px 12px', borderRadius: 8, border: `1.5px solid ${bdr}`, fontSize: 13, color: ink, background: '#fff', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', outline: 'none' }}
                      >
                        <option value="admin">Co-founder (Admin)</option>
                        <option value="member">Team Member</option>
                        <option value="viewer">Viewer (read-only)</option>
                      </select>
                      <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: muted, pointerEvents: 'none' }} />
                    </div>
                    <button
                      onClick={handleSendInvite}
                      disabled={inviteSending || !inviteEmail.trim()}
                      style={{ padding: '9px 18px', borderRadius: 8, background: inviteSending ? muted : blue, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: inviteSending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {inviteSending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : null}
                      Send invite
                    </button>
                    <button onClick={() => setShowInviteForm(false)} style={{ padding: '9px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${bdr}`, color: muted, cursor: 'pointer' }}>
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: muted, marginTop: 10 }}>
                    <strong>Admin:</strong> Full access, can invite others.&ensp;
                    <strong>Member:</strong> Operational agents only.&ensp;
                    <strong>Viewer:</strong> Read-only (Q-Score + artifacts).
                  </p>
                </div>
              )}

              {/* Members list */}
              <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 16, overflow: 'hidden' }}>
                {teamLoading ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <Loader2 style={{ width: 20, height: 20, color: muted, margin: '0 auto' }} className="animate-spin" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center' }}>
                    <Users style={{ width: 28, height: 28, color: muted, margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 13, color: muted }}>Just you for now — invite your co-founder.</p>
                  </div>
                ) : (
                  teamMembers.map((m, i) => {
                    const name    = m.founder_profiles?.full_name ?? 'Unknown';
                    const isOwner = m.role === 'owner';
                    const roleColors: Record<string, string> = { owner: '#7C3AED', admin: blue, member: green, viewer: muted };
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: i > 0 ? `1px solid ${bdr}` : 'none' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${roleColors[m.role] ?? muted}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: roleColors[m.role] ?? muted, flexShrink: 0 }}>
                          {name[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 1 }}>{name}</p>
                          <p style={{ fontSize: 11, color: muted }}>Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${roleColors[m.role] ?? muted}15`, color: roleColors[m.role] ?? muted, textTransform: 'capitalize' }}>
                          {m.role}
                        </span>
                        {!isOwner && myTeamRole === 'owner' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select
                              value={m.role}
                              onChange={e => handleChangeRole(m.founder_profiles?.user_id ?? '', e.target.value as 'admin' | 'member' | 'viewer')}
                              style={{ padding: '4px 8px', borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 11, color: ink, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button onClick={() => handleRemoveMember(m.founder_profiles?.user_id ?? '', name)} style={{ padding: '4px 10px', borderRadius: 7, background: 'transparent', border: `1px solid #FECACA`, fontSize: 11, color: '#DC2626', cursor: 'pointer' }}>
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pending invites */}
              {teamInvites.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Pending invites</p>
                  <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
                    {teamInvites.map((inv, i) => (
                      <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: i > 0 ? `1px solid ${bdr}` : 'none' }}>
                        <Mail style={{ width: 15, height: 15, color: muted, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, color: ink, margin: 0 }}>{inv.email}</p>
                          <p style={{ fontSize: 11, color: muted, margin: '2px 0 0', textTransform: 'capitalize' }}>{inv.role}</p>
                        </div>
                        <span style={{ fontSize: 11, color: '#D97706', background: '#FFFBEB', padding: '2px 8px', borderRadius: 999, fontWeight: 600, flexShrink: 0 }}>Pending</span>
                        {(myTeamRole === 'owner' || myTeamRole === 'admin') && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleResendInvite(inv.email)}
                              style={{ padding: '4px 10px', borderRadius: 7, background: 'transparent', border: `1px solid ${bdr}`, fontSize: 11, color: muted, cursor: 'pointer' }}
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleCancelInvite(inv.id)}
                              style={{ padding: '4px 10px', borderRadius: 7, background: 'transparent', border: `1px solid #FECACA`, fontSize: 11, color: '#DC2626', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shared vs private note */}
              <div style={{ display: 'flex', gap: 12, padding: '14px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                <CheckCircle style={{ width: 14, height: 14, color: green, flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>
                  <strong style={{ color: ink }}>What&apos;s shared:</strong> Q-Score, all artifacts, startup profile.&ensp;
                  <strong style={{ color: ink }}>What&apos;s private:</strong> Your agent conversations — each person&apos;s advisory sessions stay personal.
                </p>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F9F7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: '#8A867C', fontFamily: 'system-ui, sans-serif' }}>Loading settings…</p>
      </div>
    }>
      <SettingsInner />
    </Suspense>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${bdr}` }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 4 }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: muted }}>{description}</p>
      </div>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: ink }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: muted }}>{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: checked ? ink : bdr,
        position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 8, background: '#fff',
        position: 'absolute', top: 3,
        left: checked ? 21 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  );
}

function NotifRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{label}</p>
        <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{sub}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: bdr }} />;
}

function SaveButton({ label = 'Save Changes', onClick, loading }: { label?: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '9px 22px',
        background: loading ? bdr : ink,
        color: loading ? muted : bg,
        border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        alignSelf: 'flex-start', transition: 'opacity 0.15s',
      }}
    >
      <Save style={{ height: 13, width: 13 }} />
      {loading ? 'Saving…' : label}
    </button>
  );
}

function OutlineButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px',
        background: 'transparent', color: ink, border: `1px solid ${bdr}`, borderRadius: 999,
        fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = ink)}
      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = bdr)}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 13,
  color: ink,
  background: bg,
  border: `1px solid ${bdr}`,
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
