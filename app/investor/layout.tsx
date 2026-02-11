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
    <div className="flex h-screen bg-gray-50">
      <div className="w-80 flex-shrink-0">
        <InvestorSidebar className="w-full h-full" />
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}