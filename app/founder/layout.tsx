"use client";

import { usePathname } from "next/navigation";
import FounderSidebar from "@/components/layout/founder-sidebar";

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
    <div className="flex h-screen bg-gray-50">
      <div className="w-80 flex-shrink-0">
        <FounderSidebar className="w-full h-full" />
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}