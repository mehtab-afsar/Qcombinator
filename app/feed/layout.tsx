"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import InvestorSidebar, { NotificationBell as InvestorNotificationBell } from "@/features/investor/components/InvestorSidebar";
import FounderSidebar, { FounderNotificationBell } from "@/features/founder/components/FounderSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<'investor' | 'founder' | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('investor_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      setRole(data ? 'investor' : 'founder')
    })
  }, [])

  return (
    <ErrorBoundary>
      <div style={{ display: "flex", height: "100vh", background: "#F9F7F2" }}>
        {role === 'investor' ? <InvestorSidebar /> : <FounderSidebar />}
        <div style={{ flex: 1, overflowY: "auto", marginLeft: 52, position: "relative" }}>
          <div style={{ position: "fixed", top: 12, right: 16, zIndex: 100, display: "flex", alignItems: "center", gap: 8 }}>
            {role === 'investor' ? <InvestorNotificationBell /> : <FounderNotificationBell />}
          </div>
          {children}
        </div>
      </div>
    </ErrorBoundary>
  )
}
