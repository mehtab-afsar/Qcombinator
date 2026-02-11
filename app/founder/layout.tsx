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
    <div className="flex h-screen bg-gray-50">
      <FounderSidebar className="flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}