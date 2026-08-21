"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import FounderSidebar, { FounderNotificationBell } from "@/features/founder/components/FounderSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastStack } from "@/features/shared/components/Toast";
import { useToast } from "@/features/shared/hooks/useToast";
import { ExecutiveWorkspaceProvider } from "@/features/executive/hooks/useExecutiveWorkspace";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { toasts, dismiss } = useToast();

  // Hide sidebar when embedded in iframe, during onboarding flows, or on the email-verification
  // block screen — each of those is a deliberate standalone screen with its own layout.
  //
  // ⚠️ verify-email MUST be here. It's a full-screen BLOCK ("this is the destination, not a
  // decoration" — see its own docstring) for a founder whose email isn't confirmed yet. Without
  // this line the full sidebar/nav renders around it, and a blocked founder can simply click
  // Dashboard/Matching/Academy in the nav to route around the block entirely.
  const hideSidebar =
    searchParams.get("_embed") === "1" ||
    pathname.includes("/onboarding") ||
    pathname.includes("/assessment") ||
    pathname.includes("/profile-builder") ||
    pathname.includes("/verify-email");

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
        <ExecutiveWorkspaceProvider>
          <LayoutInner>{children}</LayoutInner>
        </ExecutiveWorkspaceProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
