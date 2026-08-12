'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Lock, Download, Trash2, RefreshCw, Save, Plug, CheckCircle, Users, Mail } from 'lucide-react';
import { useFounderData } from '@/features/founder/hooks/useFounderData';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  loadSettings,
  saveAccountSettings,
  saveNotificationSettings,
  exportUserData,
} from '@/features/founder/services/settings.service';
import { bg, surf, bdr, ink, muted, blue, green, red, purple, alpha } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'
import { TabNav } from '@/features/shared/components/TabNav'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { Badge, type BadgeVariant } from '@/features/shared/components/Badge'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { RowSkeleton } from '@/features/shared/components/Skeleton'
import { InviteModal } from '@/components/ui/InviteModal'
import { ConnectorsPanel } from '@/features/executive/components/ConnectorsPanel'
import { useToast } from '@/features/shared/hooks/useToast'
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
  const { toast } = useToast();
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
        const res = await fetch('/api/team/members');
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Failed to load team');
          return;
        }

        setTeamMembers(data.members ?? []);
        setTeamInvites(data.invites ?? []);
        setMyTeamRole(data.myRole ?? null);
      } catch (err) {
        console.error('Failed to load team:', err);
        toast.error('Failed to load team');
      } finally {
        setTeamLoading(false);
      }
    })();
  }

  useEffect(() => { if (activeTab === 'team') loadTeam(); }, [activeTab]);

  async function handleSendInvite(email: string, role: 'admin' | 'member' | 'viewer') {
    setInviteSending(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to send invite'); return; }

      if (data.emailSent) {
        toast.success(`Invite sent to ${email.trim()}`);
      } else {
        toast.error(`Invite created, but the email couldn't be delivered to ${email.trim()} — share the link manually or check email settings.`);
      }
      setInviteModalOpen(false);
      loadTeam();
    } catch (_err) { toast.error('Failed to send invite'); }
    finally { setInviteSending(false); }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`Remove ${name} from your team?`)) return;
    const res = await fetch(`/api/team/members?userId=${userId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? 'Failed to remove member'); return; }
    toast.success(`${name} removed from team`);
    loadTeam();
  }

  async function handleChangeRole(userId: string, role: 'admin' | 'member' | 'viewer') {
    const res = await fetch(`/api/team/members?userId=${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? 'Failed to update role'); return; }
    loadTeam();
  }

  async function handleCancelInvite(inviteId: string) {
    if (!confirm('Cancel this invite?')) return;
    const res = await fetch(`/api/team/members?inviteId=${inviteId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? 'Failed to cancel invite'); return; }
    toast.success('Invite cancelled');
    loadTeam();
  }

  async function handleResendInvite(email: string, role: 'admin' | 'member' | 'viewer') {
    setInviteSending(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to resend'); return; }
      if (data.emailSent) {
        toast.success(`Invite resent to ${email}`);
      } else {
        toast.error(`Invite refreshed, but the email couldn't be delivered to ${email} — check email settings.`);
      }
      loadTeam();
    } catch { toast.error('Failed to resend invite'); }
    finally { setInviteSending(false); }
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
      toast.success('Image updated');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      await saveAccountSettings(fullName);
      toast.success('Account settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      await exportUserData();
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await saveNotificationSettings({ emailNotifications, qScoreUpdates, investorMessages, weeklyDigest, runwayAlerts });
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
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
        toast.success('Account deleted successfully');
        await new Promise(r => setTimeout(r, 500));
        router.push('/');
      } else {
        toast.error(data.error ?? 'Failed to delete account');
      }
    } catch {
      toast.error('Failed to delete account');
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
                        toast.success('Password reset email sent')
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
                        toast.success('Signed out from all other sessions')
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
              <ConnectorsPanel />
            </div>
          )}

          {/* Team */}
          {activeTab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              <SectionCard
                title="Your Team"
                subtitle="Invite co-founders and employees to your startup workspace."
                action={(myTeamRole === 'owner' || myTeamRole === 'admin') && (
                  <Button variant="primary" icon={<Mail size={13} />} onClick={() => setInviteModalOpen(true)}>
                    Invite member
                  </Button>
                )}
                noPadding
              >
                {teamLoading ? (
                  <>
                    <RowSkeleton />
                    <RowSkeleton />
                    <RowSkeleton />
                  </>
                ) : teamMembers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Just you for now"
                    body="Invite your co-founder to share the workspace."
                    style={{ border: 'none', borderRadius: 0, padding: '40px 24px' }}
                  />
                ) : (
                  teamMembers.map((m, i) => {
                    const name    = m.founder_profiles?.full_name ?? 'Unknown';
                    const isOwner = m.role === 'owner';
                    const roleColor: Record<string, string> = { owner: purple, admin: blue, member: green, viewer: muted };
                    const roleBadgeVariant: Record<string, BadgeVariant> = { owner: 'purple', admin: 'blue', member: 'green', viewer: 'neutral' };
                    const color = roleColor[m.role] ?? muted;
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: i > 0 ? `1px solid ${bdr}` : 'none' }}>
                        <Avatar name={name} size={36} radius={10} bgColor={alpha(color, 0.08)} fgColor={color} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 1 }}>{name}</p>
                          <p style={{ fontSize: 11, color: muted }}>Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                        </div>
                        <Badge variant={roleBadgeVariant[m.role] ?? 'neutral'} style={{ textTransform: 'capitalize' }}>{m.role}</Badge>
                        {!isOwner && myTeamRole === 'owner' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select
                              value={m.role}
                              onChange={e => handleChangeRole(m.founder_profiles?.user_id ?? '', e.target.value as 'admin' | 'member' | 'viewer')}
                              style={{ padding: '4px 8px', borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 11, color: ink, background: bg, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <Button variant="secondary" size="sm" onClick={() => handleRemoveMember(m.founder_profiles?.user_id ?? '', name)} style={{ color: red, borderColor: alpha(red, 0.3) }}>
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </SectionCard>

              {/* Pending invites */}
              {teamInvites.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Pending invites</p>
                  <SectionCard noPadding>
                    {teamInvites.map((inv, i) => (
                      <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: i > 0 ? `1px solid ${bdr}` : 'none' }}>
                        <Mail style={{ width: 15, height: 15, color: muted, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, color: ink, margin: 0 }}>{inv.email}</p>
                          <p style={{ fontSize: 11, color: muted, margin: '2px 0 0', textTransform: 'capitalize' }}>{inv.role}</p>
                        </div>
                        <Badge variant="amber">Pending</Badge>
                        {(myTeamRole === 'owner' || myTeamRole === 'admin') && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button
                              variant="secondary" size="sm"
                              onClick={() => handleResendInvite(inv.email, inv.role as 'admin' | 'member' | 'viewer')}
                            >
                              Resend
                            </Button>
                            <Button
                              variant="secondary" size="sm"
                              onClick={() => handleCancelInvite(inv.id)}
                              style={{ color: red, borderColor: alpha(red, 0.3) }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </SectionCard>
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
