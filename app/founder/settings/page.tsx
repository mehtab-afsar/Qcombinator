'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { User, Building2, Bell, Lock, Download, Trash2, RefreshCw, Save, AlertTriangle, Plug, CreditCard, CheckCircle } from 'lucide-react';
import { useFounderData } from '@/features/founder/hooks/useFounderData';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  loadSettings,
  saveAccountSettings,
  saveCompanySettings,
  saveNotificationSettings,
  exportUserData,
} from '@/features/founder/services/settings.service';

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';
const red   = '#DC2626';
const green = '#16A34A';

type TabId = 'account' | 'company' | 'notifications' | 'data' | 'connectors' | 'billing';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'account',       label: 'Account',       icon: User },
  { id: 'company',       label: 'Company',        icon: Building2 },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'connectors',    label: 'Connectors',     icon: Plug },
  { id: 'billing',       label: 'Billing',        icon: CreditCard },
  { id: 'data',          label: 'Data & Privacy', icon: Lock },
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

  const { profile, loading } = useFounderData();
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

  // Account
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');

  // Company
  const [startupName,  setStartupName]  = useState('');
  const [industry,     setIndustry]     = useState('');
  const [description,  setDescription]  = useState('');

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
      setEmailNotifications(s.notificationPreferences.emailNotifications)
      setQScoreUpdates(s.notificationPreferences.qScoreUpdates)
      setInvestorMessages(s.notificationPreferences.investorMessages)
      setWeeklyDigest(s.notificationPreferences.weeklyDigest)
      setRunwayAlerts(s.notificationPreferences.runwayAlerts)
    }).catch(() => {})
  }, []);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

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
      await saveCompanySettings(startupName, industry, description);
      showToast('Company settings saved');
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
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${bdr}`, marginBottom: 28 }}
        >
          {TABS.map((tab) => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? ink : muted,
                  background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${ink}` : '2px solid transparent',
                  marginBottom: -1, cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap',
                }}
              >
                <Icon style={{ height: 13, width: 13 }} />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

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
                <FieldRow label="Stage" hint="Update this in your assessment">
                  <input
                    value={profile?.stage || ''}
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
                <SaveButton onClick={handleSaveCompany} loading={saving} />
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

          {/* Connectors */}
          {activeTab === 'connectors' && (
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
            </div>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SettingsCard title="Current Plan" description="Your subscription details">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: '#EFF6FF', border: '1px solid #BFDBFE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CreditCard style={{ width: 18, height: 18, color: '#2563EB' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>Pro Plan</p>
                    <p style={{ fontSize: 12, color: muted }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: green, fontWeight: 600, marginRight: 8,
                      }}>
                        <CheckCircle style={{ width: 11, height: 11 }} /> Active
                      </span>
                      · Renews monthly
                    </p>
                  </div>
                </div>
                <div style={{ paddingTop: 8, borderTop: `1px solid ${bdr}` }}>
                  <button
                    disabled
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '9px 22px',
                      background: bdr, color: muted,
                      border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 500,
                      cursor: 'not-allowed',
                    }}
                  >
                    Manage subscription →
                  </button>
                  <p style={{ fontSize: 11, color: muted, marginTop: 8 }}>
                    Subscription management coming soon.
                  </p>
                </div>
              </SettingsCard>
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
