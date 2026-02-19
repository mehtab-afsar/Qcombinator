"use client";

import { usePathname } from "next/navigation";
import FounderSidebar from "@/features/founder/components/FounderSidebar";

export default function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide sidebar during onboarding and assessment
  const hideSidebar = pathname.includes('/onboarding') || pathname.includes('/assessment');

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div style={{ background: "#F9F7F2", minHeight: "100vh" }}>
      <FounderSidebar />
      {/* Offset by collapsed sidebar width so content is never hidden */}
      <div style={{ marginLeft: "3.05rem", minHeight: "100vh", overflowX: "hidden" }}>
        {children}
      </div>
    </div>
  );
}