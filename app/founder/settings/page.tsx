'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Lock, Download, Trash2, RefreshCw, Save, Plug, CheckCircle, Users, Mail, Loader2 } from 'lucide-react';
import { useFounderData } from '@/features/founder/hooks/useFounderData';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  loadSettings,
  saveAccountSettings,
  saveNotificationSettings,
  exportUserData,
} from '@/features/founder/services/settings.service';
import { bg, surf, bdr, ink, muted, blue, green, red } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'
import { TabNav } from '@/features/shared/components/TabNav'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { InviteModal } from '@/components/ui/InviteModal'
import type { LucideIcon } from 'lucide-react'

type TabId = 'profile' | 'notifications' | 'team' | 'integrations';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'profile',       label: 'Profile',        icon: User   },
  { id: 'notifications', label: 'Notifications',  icon: Bell   },
  { id: 'team',          label: 'Team',           icon: Users  },
  { id: 'integrations',  label: 'Integrations',   icon: Plug   },
];

function SettingsInner() {
  const router   = useRouter();
  const params   = useSearchParams();
  const urlTab   = params.get('tab');  // string | null

  const { loading } = useFounderData();
  const VALID_TABS: TabId[] = ['profile', 'notifications', 'team', 'integrations'];
  const [activeTab, setActiveTab] = useState<TabId>(
    VALID_TABS.includes(urlTab as TabId) ? (urlTab as TabId) : 'profile'
  );

  // Sync from URL
  useEffect(() => {
    if (urlTab && TABS.some(t => t.id === urlTab)) {
      setActiveTab(urlTab as TabId);
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

  // Team
  const [teamMembers,    setTeamMembers]    = useState<{ id: string; role: string; joined_at: string; founder_profiles: { full_name: string; user_id: string } | null }[]>([]);
  const [teamInvites,    setTeamInvites]    = useState<{ id: string; email: string; role: string; created_at: string }[]>([]);
  const [myTeamRole,     setMyTeamRole]     = useState<string | null>(null);
  const [teamLoading,    setTeamLoading]    = useState(false);
  const [_inviteSending,  setInviteSending]  = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Notifications
  const [stripeStatus, setStripeStatus] = useState<{
    stripe_verified: boolean; stripe_verified_at: string | null;
    stripe_mrr: number | null; stripe_arr: number | null;
    stripe_customers: number | null; stripe_last30: number | null;
  } | null>(null);
  const [stripeLoading,    setStripeLoading]    = useState(false);
  const [stripeKeyInput,   setStripeKeyInput]   = useState('');
  const [stripeConnecting, setStripeConnecting] = useState(false);

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
    (async () => {
      try {
        const sb = (await import('@/lib/supabase/client')).createClient();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { setTeamLoading(false); return; }

        const res = await fetch('/api/team/members', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error ?? 'Failed to load team', 'error');
          return;
        }

        setTeamMembers(data.members ?? []);
        setTeamInvites(data.invites ?? []);
        setMyTeamRole(data.myRole ?? null);
      } catch (err) {
        console.error('Failed to load team:', err);
        showToast('Failed to load team', 'error');
      } finally {
        setTeamLoading(false);
      }
    })();
  }

  useEffect(() => { if (activeTab === 'team') loadTeam(); }, [activeTab]);

  function loadStripeStatus() {
    setStripeLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/stripe/connect');
        const data = await res.json();
        if (!res.ok) { showToast(data.error ?? 'Failed to load Stripe status', 'error'); return; }
        setStripeStatus(data.profile ?? null);
      } catch (err) {
        console.error('Failed to load Stripe status:', err);
        showToast('Failed to load Stripe status', 'error');
      } finally {
        setStripeLoading(false);
      }
    })();
  }

  useEffect(() => { if (activeTab === 'integrations') loadStripeStatus(); }, [activeTab]);

  async function handleStripeConnect() {
    if (!stripeKeyInput.trim().startsWith('rk_')) {
      showToast('Enter a Stripe restricted key — it starts with "rk_"', 'error');
      return;
    }
    setStripeConnecting(true);
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restrictedKey: stripeKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? 'Failed to verify with Stripe', 'error'); return; }
      showToast('Revenue verified with Stripe');
      setStripeKeyInput('');
      loadStripeStatus();
    } catch (err) {
      console.error('Stripe connect failed:', err);
      showToast('Failed to verify with Stripe', 'error');
    } finally {
      setStripeConnecting(false);
    }
  }

  async function getAuthHeader(): Promise<Record<string, string> | null> {
    const sb = (await import('@/lib/supabase/client')).createClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showToast('Not authenticated', 'error'); return null; }
    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function handleSendInvite(email: string, role: 'admin' | 'member' | 'viewer') {
    setInviteSending(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) return;

      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? 'Failed to send invite', 'error'); return; }

      showToast(`Invite sent to ${email.trim()}`);
      setInviteModalOpen(false);
      loadTeam();
    } catch (_err) { showToast('Failed to send invite', 'error'); }
    finally { setInviteSending(false); }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`Remove ${name} from your team?`)) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch(`/api/team/members?userId=${userId}`, { method: 'DELETE', headers: authHeader });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(data.error ?? 'Failed to remove member', 'error'); return; }
    showToast(`${name} removed from team`);
    loadTeam();
  }

  async function handleChangeRole(userId: string, role: 'admin' | 'member' | 'viewer') {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch(`/api/team/members?userId=${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(data.error ?? 'Failed to update role', 'error'); return; }
    loadTeam();
  }

  async function handleCancelInvite(inviteId: string) {
    if (!confirm('Cancel this invite?')) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch(`/api/team/members?inviteId=${inviteId}`, { method: 'DELETE', headers: authHeader });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(data.error ?? 'Failed to cancel invite', 'error'); return; }
    showToast('Invite cancelled');
    loadTeam();
  }

  async function handleResendInvite(email: string, role: 'admin' | 'member' | 'viewer') {
    setInviteSending(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) return;
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ email, role }),
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

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure? This action cannot be undone. All your account data will be permanently deleted.')) return;
    try {
      const response = await fetch('/api/founder/delete-account', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        showToast('Account deleted successfully', 'success');
        await new Promise(r => setTimeout(r, 500));
        router.push('/');
      } else {
        showToast(data.error ?? 'Failed to delete account', 'error');
      }
    } catch {
      showToast('Failed to delete account', 'error');
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
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Profile Completion Summary */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.05) 100%)',
                border: `1px solid rgba(59,130,246,0.2)`,
                borderRadius: 14,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Profile Completeness</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: ink, margin: '0 0 6px' }}>
                    {Math.round(((fullName ? 1 : 0) + (startupName ? 1 : 0) + (companyLogoUrl ? 1 : 0) + (avatarUrl ? 1 : 0)) / 4 * 100)}% Complete
                  </p>
                  <p style={{ fontSize: 11, color: muted, margin: 0 }}>
                    Add photo, logo, and company info to complete your profile
                  </p>
                </div>
                <div style={{
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.5)',
                  borderRadius: '50%',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#3B82F6',
                }}>
                  {Math.round(((fullName ? 1 : 0) + (startupName ? 1 : 0) + (companyLogoUrl ? 1 : 0) + (avatarUrl ? 1 : 0)) / 4 * 100)}%
                </div>
              </div>

              <SectionCard title="Profile Photo & Logo" subtitle="Upload your profile photo and company logo" style={{ background: surf }}>
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
              </SectionCard>

              <SectionCard title="Account Information" subtitle="Update your personal information" style={{ background: surf }}>
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
                <Button onClick={handleSaveAccount} loading={saving} icon={<Save style={{ height: 13, width: 13 }} />}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </SectionCard>

              {/* ── Security (inline in Profile tab) ── */}
              <SectionCard title="Password & Security" subtitle="Manage your account security" style={{ background: surf }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Change Password</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>We&apos;ll send a reset link to your email address.</p>
                    <Button
                      variant="secondary"
                      icon={<RefreshCw style={{ height: 13, width: 13 }} />}
                      onClick={async () => {
                        const { data: { user: u } } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
                        if (!u?.email) return
                        const sb = (await import('@/lib/supabase/client')).createClient()
                        await sb.auth.resetPasswordForEmail(u.email, { redirectTo: `${window.location.origin}/update-password` })
                        showToast('Password reset email sent')
                      }}
                    >
                      Send password reset email
                    </Button>
                  </div>
                  <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Sign Out Everywhere</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>Revoke all active sessions on other devices.</p>
                    <Button
                      variant="secondary"
                      icon={<Lock style={{ height: 13, width: 13 }} />}
                      onClick={async () => {
                        if (!confirm('Sign out from all other devices?')) return
                        const sb = (await import('@/lib/supabase/client')).createClient()
                        await sb.auth.signOut({ scope: 'others' })
                        showToast('Signed out from all other sessions')
                      }}
                    >
                      Sign out other sessions
                    </Button>
                  </div>
                </div>
              </SectionCard>

              {/* ── Danger zone (inline in Profile tab) ── */}
              <SectionCard title="Data & Account" subtitle="Export your data or delete your account" style={{ background: surf }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Export Your Data</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>Download all your data as JSON</p>
                    <Button variant="secondary" icon={<Download style={{ height: 13, width: 13 }} />} onClick={handleExportData}>
                      Export Data
                    </Button>
                  </div>
                  <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: red, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Danger Zone</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 14 }}>Permanently delete your account and all associated data</p>
                    <Button variant="danger" icon={<Trash2 style={{ height: 13, width: 13 }} />} onClick={handleDeleteAccount}>
                      Delete Account
                    </Button>
                  </div>
                </div>
              </SectionCard>

            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SectionCard title="Notification Preferences" subtitle="Choose what updates you want to receive" style={{ background: surf }}>
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
                  <Button onClick={handleSaveNotifications} icon={<Save style={{ height: 13, width: 13 }} />}>
                    Save Preferences
                  </Button>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionCard title="Verify revenue with Stripe" subtitle="A restricted key is used once to read your metrics, then discarded — never stored" style={{ background: surf }}>
                {stripeLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: muted, fontSize: 13 }}>
                    <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                    Loading…
                  </div>
                ) : stripeStatus?.stripe_verified ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle style={{ width: 15, height: 15, color: green }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>
                        Verified {stripeStatus.stripe_verified_at ? new Date(stripeStatus.stripe_verified_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 18 }}>
                      {[
                        { label: 'MRR',       value: stripeStatus.stripe_mrr },
                        { label: 'ARR',       value: stripeStatus.stripe_arr },
                        { label: 'Customers', value: stripeStatus.stripe_customers },
                        { label: 'Last 30d',  value: stripeStatus.stripe_last30 },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ padding: '10px 14px', background: surf, borderRadius: 10, border: `1px solid ${bdr}` }}>
                          <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>{label}</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: ink, margin: 0 }}>
                            {value == null ? '—' : label === 'Customers' ? value.toLocaleString() : `$${value.toLocaleString()}`}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 8 }}>Re-verify to refresh these numbers with a new key.</p>
                    <input
                      type="password" value={stripeKeyInput} onChange={e => setStripeKeyInput(e.target.value)}
                      placeholder="rk_live_..." autoComplete="off"
                      style={{ width: '100%', maxWidth: 360, padding: '9px 12px', borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
                    />
                    <div>
                      <Button variant="secondary" onClick={handleStripeConnect} disabled={stripeConnecting}>
                        {stripeConnecting ? 'Verifying…' : 'Re-verify'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 14, maxWidth: 480 }}>
                      Connect a Stripe <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" style={{ color: blue }}>restricted key</a> (read-only, subscriptions + customers + charges)
                      to unlock a verified-revenue badge and boost your Q-Score&apos;s Signal Strength.
                    </p>
                    <input
                      type="password" value={stripeKeyInput} onChange={e => setStripeKeyInput(e.target.value)}
                      placeholder="rk_live_..." autoComplete="off"
                      style={{ width: '100%', maxWidth: 360, padding: '9px 12px', borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
                    />
                    <div>
                      <Button onClick={handleStripeConnect} loading={stripeConnecting} icon={<Save style={{ height: 13, width: 13 }} />}>
                        {stripeConnecting ? 'Verifying…' : 'Verify with Stripe'}
                      </Button>
                    </div>
                  </div>
                )}
              </SectionCard>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '40px 24px' }}>
                <Plug style={{ width: 26, height: 26, color: muted }} />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: ink, margin: 0 }}>Other connectors are being rebuilt</h2>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, maxWidth: 380, margin: 0 }}>
                  We&apos;re moving off one-off, paste-your-own-API-key connections onto a single secure
                  framework. This section will come back once the first connectors land on it.
                </p>
              </div>
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
                    onClick={() => setInviteModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: blue, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Mail style={{ width: 13, height: 13 }} /> Invite member
                  </button>
                )}
              </div>


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
                              onClick={() => handleResendInvite(inv.email, inv.role as 'admin' | 'member' | 'viewer')}
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

      {/* Invite Modal */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSendInvite={handleSendInvite}
      />
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
