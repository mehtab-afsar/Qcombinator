"use client";

import { usePathname } from "next/navigation";
import InvestorSidebar from "@/features/investor/components/InvestorSidebar";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide sidebar during onboarding
  const hideSidebar = pathname.includes('/onboarding');

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F9F7F2" }}>
      <div style={{ flexShrink: 0 }}>
        <InvestorSidebar className="h-full" />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}