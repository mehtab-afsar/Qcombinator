"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import FounderSidebar, { FounderNotificationBell } from "@/features/founder/components/FounderSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastStack } from "@/features/shared/components/Toast";
import { useToast } from "@/features/shared/hooks/useToast";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { toasts, dismiss } = useToast();

  // Hide sidebar when embedded in iframe, onboarding flows, or agent/CXO pages (those have their own sidebar)
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
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {/* fallback=null prevents children from mounting twice (once in fallback, once in LayoutInner)
          which would re-fire useEffects after Suspense resolves during client hydration */}
      <Suspense fallback={null}>
        <LayoutInner>{children}</LayoutInner>
      </Suspense>
    </ErrorBoundary>
  );
}
