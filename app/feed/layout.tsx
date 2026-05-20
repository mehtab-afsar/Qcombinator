"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell as InvestorNotificationBell } from "@/features/investor/components/InvestorSidebar";
import { FounderNotificationBell } from "@/features/founder/components/FounderSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Rss, ArrowLeft } from "lucide-react";
import { bdr, ink, muted, blue } from "@/lib/constants/colors";

interface NavProfile {
  name: string | null
  avatarUrl: string | null
}

function PulseNavbar({ role, profile }: { role: 'investor' | 'founder' | null; profile: NavProfile }) {
  const dashHref = role === 'investor' ? '/investor/dashboard' : '/founder/dashboard'

  function initials(name: string) {
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      height: 52, background: '#fff',
      borderBottom: `1px solid ${bdr}`,
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 0,
    }}>
      {/* Left — back link */}
      <a
        href={dashHref}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          textDecoration: 'none', color: muted, fontSize: 12, fontWeight: 500,
          transition: 'color .12s', flexShrink: 0,
          padding: '6px 10px', borderRadius: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = ink)}
        onMouseLeave={e => (e.currentTarget.style.color = muted)}
      >
        <ArrowLeft style={{ height: 13, width: 13 }} />
        Dashboard
      </a>

      {/* Center — Pulse branding */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: `linear-gradient(135deg, ${blue}20, ${blue}10)`,
          border: `1px solid ${blue}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Rss style={{ height: 13, width: 13, color: blue }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: ink, letterSpacing: '-0.02em' }}>Pulse</span>
      </div>

      {/* Right — bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {role === 'investor' ? <InvestorNotificationBell /> : <FounderNotificationBell />}
        {profile.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${bdr}` }}
              />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${blue}20, ${blue}35)`,
                border: `1.5px solid ${blue}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: blue,
              }}>
                {initials(profile.name)}
              </div>
            )}
            <span style={{ fontSize: 12, fontWeight: 500, color: ink, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.name}
            </span>
          </div>
        )}
      </div>
    </nav>
  )
}

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  const [role,    setRole]    = useState<'investor' | 'founder' | null>(null)
  const [profile, setProfile] = useState<NavProfile>({ name: null, avatarUrl: null })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: inv } = await supabase
        .from('investor_profiles')
        .select('user_id, full_name, firm_name')
        .eq('user_id', user.id)
        .maybeSingle()

      if (inv) {
        setRole('investor')
        setProfile({ name: inv.full_name ?? inv.firm_name ?? null, avatarUrl: null })
      } else {
        const { data: fp } = await supabase
          .from('founder_profiles')
          .select('full_name, startup_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle()
        setRole('founder')
        setProfile({ name: fp?.startup_name ?? fp?.full_name ?? null, avatarUrl: fp?.avatar_url ?? null })
      }
    })
  }, [])

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F9F7F2' }}>
        <PulseNavbar role={role} profile={profile} />
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </ErrorBoundary>
  )
}
