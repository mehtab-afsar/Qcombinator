"use client";

import { usePathname } from "next/navigation";
import InvestorSidebar from "@/features/investor/components/InvestorSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide sidebar during onboarding
  const hideSidebar = pathname.includes('/onboarding');

  if (hideSidebar) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <div style={{ display: "flex", height: "100vh", background: "#F9F7F2" }}>
        <InvestorSidebar />
        {/* 52px left margin matches the collapsed sidebar width */}
        <div style={{ flex: 1, overflowY: "auto", marginLeft: 52 }}>
          {children}
        </div>
      </div>
    </ErrorBoundary>
  );
}