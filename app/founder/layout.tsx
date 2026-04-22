"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import FounderSidebar, { FounderNotificationBell } from "@/features/founder/components/FounderSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Hide sidebar when:
  // 1. Embedded inside CXOChat iframe (?_embed=1)
  // 2. Onboarding / assessment flows
  // 3. CXO workspace pages (/founder/cxo/[agentId]) — those have their own sidebar
  const hideSidebar =
    searchParams.get("_embed") === "1" ||
    pathname.includes("/onboarding") ||
    pathname.includes("/assessment") ||
    pathname.includes("/profile-builder") ||
    /\/founder\/cxo\/.+/.test(pathname);

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div style={{ background: "#F9F7F2", minHeight: "100vh" }}>
      <FounderSidebar />
      {/* Top-right utility bar */}
      <div style={{ position: "fixed", top: 12, right: 16, zIndex: 100, display: "flex", alignItems: "center", gap: 8 }}>
        <FounderNotificationBell />
      </div>
      {/* Offset by collapsed sidebar width so content is never hidden */}
      <div style={{ marginLeft: 52, minHeight: "100vh", overflowX: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<>{children}</>}>
        <LayoutInner>{children}</LayoutInner>
      </Suspense>
    </ErrorBoundary>
  );
}
