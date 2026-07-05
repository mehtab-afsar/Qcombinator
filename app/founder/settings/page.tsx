'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Lock, Download, Trash2, RefreshCw, Save, AlertTriangle, Plug, CheckCircle, Users, Mail, Loader2 } from 'lucide-react';
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
import { InviteModal } from '@/components/ui/InviteModal'
import type { LucideIcon } from 'lucide-react'

type TabId = 'profile' | 'notifications' | 'team' | 'integrations';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'profile',       label: 'Profile',        icon: User   },
  { id: 'notifications', label: 'Notifications',  icon: Bell   },
  { id: 'team',          label: 'Team',           icon: Users  },
  { id: 'integrations',  label: 'Integrations',   icon: Plug   },
];

// ─── integrations catalog ─────────────────────────────────────────────────────
const CONNECTORS: {
  id: string; name: string; color: string; letter: string;
  desc: string; agents: string[];
  type: 'founder_key' | 'platform' | 'oauth'; available: boolean;
}[] = [
  // Per-founder — needs their own key
  { id: 'stripe',    name: 'Stripe',        color: '#635BFF', letter: 'S', desc: 'Live MRR, ARR & subscription metrics — boosts Signal Strength for investors',    agents: ['Felix'],              type: 'founder_key', available: true  },
  { id: 'posthog',   name: 'PostHog',       color: '#F54E00', letter: 'P', desc: 'Retention curves, funnels & PMF signals from your live product analytics',        agents: ['Nova', 'Carter'],     type: 'founder_key', available: true  },
  { id: 'calendly',  name: 'Calendly',      color: '#006BFF', letter: 'C', desc: 'Real booking links for demos, discovery calls & interviews',                      agents: ['Susi', 'Harper'],     type: 'founder_key', available: true  },
  // Platform-provided — always enabled
  { id: 'apollo',    name: 'Apollo.io',     color: '#1A56DB', letter: 'A', desc: 'Lead enrichment & verified contact emails for GTM outreach',                      agents: ['Patel', 'Riley'],     type: 'platform',    available: true  },
  { id: 'vapi',      name: 'Vapi.ai',       color: '#7C3AED', letter: 'V', desc: 'AI voice calls to qualified leads',                                               agents: ['Susi'],               type: 'platform',    available: true  },
  { id: 'resend',    name: 'Resend',        color: '#171717', letter: 'R', desc: 'Outreach email sequences and transactional delivery',                              agents: ['Patel'],              type: 'platform',    available: true  },
  // Coming soon
  { id: 'fireflies', name: 'Fireflies.ai',  color: '#FF4F68', letter: 'F', desc: 'Sales call transcripts and deal intelligence for Susi',                           agents: ['Susi'],               type: 'founder_key', available: false },
  { id: 'linkedin',  name: 'LinkedIn',      color: '#0077B5', letter: 'L', desc: 'Founder & team signals for investor discovery',                                   agents: ['Harper'],             type: 'oauth',       available: false },
  { id: 'sheets',    name: 'Google Sheets', color: '#34A853', letter: 'G', desc: 'Financial models & cap table ingestion for Felix',                                 agents: ['Felix'],              type: 'oauth',       available: false },
  { id: 'gmail',     name: 'Gmail',         color: '#EA4335', letter: 'G', desc: 'Customer conversation tracking for Carter',                                        agents: ['Carter'],             type: 'oauth',       available: false },
  { id: 'slack',     name: 'Slack',         color: '#4A154B', letter: 'S', desc: 'Team structure & async context for Sage',                                          agents: ['Sage'],               type: 'oauth',       available: false },
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
  const [_inviteSending,  setInviteSending]  = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Integrations
  const [intConnected, setIntConnected]         = useState<Record<string, boolean>>({})
  const [intLoaded,    setIntLoaded]            = useState(false)
  const [activeConnectForm, setActiveConnectForm] = useState<string | null>(null)
  const [keyInput,     setKeyInput]             = useState('')
  const [projectIdInput, setProjectIdInput]     = useState('')
  const [intSaving,    setIntSaving]            = useState(false)
  const [intError,     setIntError]             = useState('')
  const [stripeConnected,  setStripeConnected]  = useState(false)
  const [stripeMrr,        setStripeMrr]        = useState<number | undefined>()
  const [stripeKey,        setStripeKey]        = useState('')
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeError,      setStripeError]      = useState('')

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
    (async () => {
      try {
        const sb = (await import('@/lib/supabase/client')).createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        // Get founder profile to find startup_id
        const { data: profile, error: profileError } = await sb
          .from('founder_profiles')
          .select('startup_id')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile?.startup_id) {
          console.log('No startup found for user');
          setTeamMembers([]);
          setTeamInvites([]);
          setMyTeamRole('owner');
          setTeamLoading(false);
          return;
        }

        const startupId = profile.startup_id;

        // Get members via direct query (avoid RLS issues)
        const { data: members, error: membersError } = await sb
          .from('founder_profiles')
          .select('user_id, full_name')
          .eq('startup_id', startupId);

        if (membersError) {
          console.warn('Failed to fetch members:', membersError);
        }

        // Get pending invites
        const { data: invites, error: invitesError } = await sb
          .from('team_invites')
          .select('id, email, role, created_at')
          .eq('startup_id', startupId)
          .is('accepted_at', null);

        if (invitesError) {
          console.warn('Failed to fetch invites:', invitesError);
        }

        // Transform members to match expected shape
        const transformedMembers = (members || []).map(m => ({
          id: m.user_id,
          role: m.user_id === user.id ? 'owner' : 'member',
          joined_at: new Date().toISOString(),
          founder_profiles: { full_name: m.full_name, user_id: m.user_id },
        }));

        setTeamMembers(transformedMembers);
        setTeamInvites(invites ?? []);
        setMyTeamRole('owner');
        setTeamLoading(false);
      } catch (err) {
        console.error('Failed to load team:', err);
        setTeamLoading(false);
      }
    })();
  }

  useEffect(() => { if (activeTab === 'team') loadTeam(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'integrations') loadIntegrations(); }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadIntegrations() {
    if (intLoaded) return
    setIntLoaded(true)
    try {
      const [stripeRes, sbModule] = await Promise.all([
        fetch('/api/stripe/connect').catch(() => null),
        import('@/lib/supabase/client'),
      ])
      if (stripeRes?.ok) {
        const d = await stripeRes.json()
        if (d.profile?.stripe_verified) {
          setStripeConnected(true)
          setStripeMrr(d.profile.stripe_mrr)
        }
      }
      const sb = sbModule.createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: profile } = await sb
        .from('founder_profiles')
        .select('posthog_api_key, calendly_api_key, fireflies_api_key')
        .eq('user_id', user.id)
        .single()
      if (profile) {
        setIntConnected({
          posthog:   !!profile.posthog_api_key,
          calendly:  !!profile.calendly_api_key,
          fireflies: !!profile.fireflies_api_key,
        })
      }
    } catch {}
  }

  async function handleConnectIntegration(id: string) {
    setIntSaving(true)
    setIntError('')
    try {
      const sb = (await import('@/lib/supabase/client')).createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { setIntError('Not authenticated'); return }
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ integration: id, key: keyInput.trim(), projectId: projectIdInput.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setIntError(data.error ?? 'Failed'); return }
      setIntConnected(prev => ({ ...prev, [id]: true }))
      setActiveConnectForm(null)
      setKeyInput('')
      setProjectIdInput('')
      showToast(`${id[0].toUpperCase()}${id.slice(1)} connected`)
    } catch { setIntError('Network error') }
    finally { setIntSaving(false) }
  }

  async function handleDisconnectIntegration(id: string) {
    if (!confirm('Remove this integration?')) return
    try {
      const sb = (await import('@/lib/supabase/client')).createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) return
      await fetch(`/api/integrations/connect?integration=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      setIntConnected(prev => ({ ...prev, [id]: false }))
      showToast(`${id[0].toUpperCase()}${id.slice(1)} disconnected`)
    } catch {}
  }

  async function handleStripeConnect() {
    if (!stripeKey.startsWith('rk_')) { setStripeError('Key must start with rk_'); return }
    setStripeConnecting(true)
    setStripeError('')
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restrictedKey: stripeKey }),
      })
      const data = await res.json()
      if (!res.ok) { setStripeError(data.error ?? 'Connection failed'); return }
      setStripeConnected(true)
      setStripeMrr(data.verified?.mrr)
      setActiveConnectForm(null)
      setStripeKey('')
      showToast('Stripe connected — revenue verified')
    } catch { setStripeError('Network error — try again') }
    finally { setStripeConnecting(false) }
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      const sb = (await import('@/lib/supabase/client')).createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { showToast('Not authenticated', 'error'); return; }

      // Get founder profile to find startup_id
      const { data: profile } = await sb
        .from('founder_profiles')
        .select('startup_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.startup_id) { showToast('No workspace found', 'error'); return; }

      // Create invite
      const { data: _invite, error } = await sb
        .from('team_invites')
        .insert({
          startup_id: profile.startup_id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          token: Math.random().toString(36).slice(2),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) { showToast(error.message ?? 'Failed to send invite', 'error'); return; }

      showToast(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteModalOpen(false);
      loadTeam();
    } catch (_err) { showToast('Failed to send invite', 'error'); }
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

              {/* ── Security (inline in Profile tab) ── */}
              <SettingsCard title="Password & Security" description="Manage your account security">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Change Password</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>We&apos;ll send a reset link to your email address.</p>
                    <OutlineButton
                      onClick={async () => {
                        const { data: { user: u } } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
                        if (!u?.email) return
                        const sb = (await import('@/lib/supabase/client')).createClient()
                        await sb.auth.resetPasswordForEmail(u.email, { redirectTo: `${window.location.origin}/update-password` })
                        showToast('Password reset email sent')
                      }}
                    >
                      <RefreshCw style={{ height: 13, width: 13 }} /> Send password reset email
                    </OutlineButton>
                  </div>
                  <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Sign Out Everywhere</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>Revoke all active sessions on other devices.</p>
                    <OutlineButton
                      onClick={async () => {
                        if (!confirm('Sign out from all other devices?')) return
                        const sb = (await import('@/lib/supabase/client')).createClient()
                        await sb.auth.signOut({ scope: 'others' })
                        showToast('Signed out from all other sessions')
                      }}
                    >
                      <Lock style={{ height: 13, width: 13 }} /> Sign out other sessions
                    </OutlineButton>
                  </div>
                </div>
              </SettingsCard>

              {/* ── Danger zone (inline in Profile tab) ── */}
              <SettingsCard title="Data & Account" description="Export your data or delete your account">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Export Your Data</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>Download all your data as JSON</p>
                    <OutlineButton onClick={handleExportData}>
                      <Download style={{ height: 13, width: 13 }} /> Export Data
                    </OutlineButton>
                  </div>
                  <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: red, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Danger Zone</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 14 }}>Permanently delete your account and all associated data</p>
                    <button
                      onClick={handleDeleteAccount}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: red, color: '#fff', border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                    >
                      <Trash2 style={{ height: 13, width: 13 }} /> Delete Account
                    </button>
                  </div>
                </div>
              </SettingsCard>

            </div>
          )}

          {/* Company (merged into Profile tab above — this block now hidden) */}
          {(activeTab as string) === 'company-removed' && (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                Connect tools to give your AI advisors live data. <strong style={{ color: ink }}>Requires setup</strong> cards use your own API key — <strong style={{ color: ink }}>Platform</strong> cards are managed by Edge Alpha and always on.
              </p>

              {/* Requires your own key */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
                  Requires setup — your API key
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Stripe */}
                  <IntCard
                    id="stripe" name="Stripe" color="#635BFF" letter="S"
                    desc="Live MRR, ARR & subscription metrics — boosts Signal Strength for investors"
                    agents={['Felix']}
                    connected={stripeConnected}
                    badge={stripeConnected && stripeMrr !== undefined ? `$${stripeMrr.toLocaleString()} MRR` : undefined}
                    isOpen={activeConnectForm === 'stripe'}
                    onConnect={() => { setActiveConnectForm('stripe'); setStripeError(''); }}
                    onClose={() => { setActiveConnectForm(null); setStripeKey(''); setStripeError(''); }}
                    formContent={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { step: 1, text: <>In Stripe Dashboard → <strong>Developers</strong> → <strong>Restricted keys</strong> → Create new key</> },
                          { step: 2, text: <>Enable <strong>Read</strong> on Revenue, Subscriptions, Customers</> },
                          { step: 3, text: <>Paste the key below — starts with <code style={{ fontSize: 11, background: bg, padding: '1px 5px', borderRadius: 4 }}>rk_live_</code></> },
                        ].map(({ step, text }) => (
                          <div key={step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ height: 20, width: 20, borderRadius: '50%', background: '#635BFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2 }}>{step}</div>
                            <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, margin: 0 }}>{text}</p>
                          </div>
                        ))}
                        <input value={stripeKey} onChange={e => setStripeKey(e.target.value)} placeholder="rk_live_…"
                          style={{ width: '100%', padding: '9px 12px', background: bg, border: `1px solid ${stripeError ? red : bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        {stripeError && <p style={{ fontSize: 11, color: red, margin: 0 }}>{stripeError}</p>}
                        <button onClick={handleStripeConnect} disabled={stripeConnecting}
                          style={{ padding: '9px 18px', background: '#635BFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: stripeConnecting ? 'not-allowed' : 'pointer', opacity: stripeConnecting ? 0.7 : 1, fontFamily: 'inherit' }}>
                          {stripeConnecting ? 'Verifying…' : 'Verify & Connect'}
                        </button>
                      </div>
                    }
                  />

                  {/* PostHog */}
                  <IntCard
                    id="posthog" name="PostHog" color="#F54E00" letter="P"
                    desc="Retention curves, funnels & PMF signals from your live product analytics"
                    agents={['Nova', 'Carter']}
                    connected={!!intConnected.posthog}
                    isOpen={activeConnectForm === 'posthog'}
                    onConnect={() => { setActiveConnectForm('posthog'); setKeyInput(''); setProjectIdInput(''); setIntError(''); }}
                    onClose={() => { setActiveConnectForm(null); setKeyInput(''); setProjectIdInput(''); setIntError(''); }}
                    onDisconnect={() => handleDisconnectIntegration('posthog')}
                    formContent={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="PostHog personal API key (phx_…)"
                          style={{ width: '100%', padding: '9px 12px', background: bg, border: `1px solid ${intError ? red : bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        <input value={projectIdInput} onChange={e => setProjectIdInput(e.target.value)} placeholder="Project ID (found in Project Settings)"
                          style={{ width: '100%', padding: '9px 12px', background: bg, border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        {intError && <p style={{ fontSize: 11, color: red, margin: 0 }}>{intError}</p>}
                        <button onClick={() => handleConnectIntegration('posthog')} disabled={intSaving}
                          style={{ padding: '9px 18px', background: '#F54E00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: intSaving ? 'not-allowed' : 'pointer', opacity: intSaving ? 0.7 : 1, fontFamily: 'inherit' }}>
                          {intSaving ? 'Saving…' : 'Connect PostHog'}
                        </button>
                      </div>
                    }
                  />

                  {/* Calendly */}
                  <IntCard
                    id="calendly" name="Calendly" color="#006BFF" letter="C"
                    desc="Real booking links for demos, discovery calls & interviews"
                    agents={['Susi', 'Harper']}
                    connected={!!intConnected.calendly}
                    isOpen={activeConnectForm === 'calendly'}
                    onConnect={() => { setActiveConnectForm('calendly'); setKeyInput(''); setIntError(''); }}
                    onClose={() => { setActiveConnectForm(null); setKeyInput(''); setIntError(''); }}
                    onDisconnect={() => handleDisconnectIntegration('calendly')}
                    formContent={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="Calendly personal access token"
                          style={{ width: '100%', padding: '9px 12px', background: bg, border: `1px solid ${intError ? red : bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        {intError && <p style={{ fontSize: 11, color: red, margin: 0 }}>{intError}</p>}
                        <button onClick={() => handleConnectIntegration('calendly')} disabled={intSaving}
                          style={{ padding: '9px 18px', background: '#006BFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: intSaving ? 'not-allowed' : 'pointer', opacity: intSaving ? 0.7 : 1, fontFamily: 'inherit' }}>
                          {intSaving ? 'Saving…' : 'Connect Calendly'}
                        </button>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* Platform-provided */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
                  Platform — always enabled
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {CONNECTORS.filter(c => c.type === 'platform').map(c => (
                    <IntCard key={c.id} {...c} connected={true} isOpen={false} />
                  ))}
                </div>
              </div>

              {/* Coming soon */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
                  Coming soon
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Fireflies — coming soon but has a key form placeholder */}
                  <IntCard
                    id="fireflies" name="Fireflies.ai" color="#FF4F68" letter="F"
                    desc="Sales call transcripts and deal intelligence for Susi"
                    agents={['Susi']} connected={false} isOpen={false} available={false}
                  />
                  {CONNECTORS.filter(c => !c.available && c.type === 'oauth').map(c => (
                    <IntCard key={c.id} {...c} connected={false} isOpen={false} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Data & Privacy — merged into Profile tab */}
          {(activeTab as string) === 'data-removed' && (
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

          {/* Security — merged into Profile tab */}
          {(activeTab as string) === 'security-removed' && (
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

      {/* Invite Modal */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSendInvite={async (email, role) => {
          setInviteEmail(email)
          setInviteRole(role)
          await handleSendInvite()
        }}
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

function IntCard({
  id: _id, name, color, letter, desc, agents,
  type = 'founder_key', available = true,
  connected, badge, isOpen,
  onConnect, onClose, onDisconnect, formContent,
}: {
  id: string; name: string; color: string; letter: string;
  desc: string; agents: string[];
  type?: 'founder_key' | 'platform' | 'oauth'; available?: boolean;
  connected?: boolean; badge?: string; isOpen?: boolean;
  onConnect?: () => void; onClose?: () => void; onDisconnect?: () => void;
  formContent?: React.ReactNode;
}) {
  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
        {/* Icon */}
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color, fontFamily: 'system-ui' }}>
          {letter}
        </div>
        {/* Name + agents + desc */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{name}</p>
            {agents.map(a => (
              <span key={a} style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: `${blue}18`, color: blue }}>{a}</span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: muted, lineHeight: 1.4, margin: 0 }}>{desc}</p>
        </div>
        {/* Status + action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {!available ? (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: surf, color: muted, border: `1px solid ${bdr}` }}>Coming soon</span>
          ) : type === 'platform' ? (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: `${blue}12`, color: blue }}>Platform enabled</span>
          ) : connected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#ECFDF5', color: '#059669' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669', flexShrink: 0 }} />
                {badge ?? 'Connected'}
              </span>
              {onDisconnect && (
                <button onClick={onDisconnect} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 7, background: 'transparent', border: `1px solid ${bdr}`, color: muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Disconnect
                </button>
              )}
            </div>
          ) : (
            <button onClick={onConnect} style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, background: ink, color: bg, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Connect
            </button>
          )}
        </div>
      </div>
      {/* Inline key form */}
      {isOpen && formContent && (
        <div style={{ padding: '16px 18px', borderTop: `1px solid ${bdr}`, background: bg }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>Connect {name}</p>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>
          {formContent}
        </div>
      )}
    </div>
  );
}

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
