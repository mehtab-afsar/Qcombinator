"use client";

import FounderSidebar from "@/features/founder/components/FounderSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div style={{ display: "flex", height: "100vh", background: "#F9F7F2" }}>
        <FounderSidebar />
        {/* 52px matches the collapsed sidebar width */}
        <div style={{ flex: 1, overflowY: "auto", marginLeft: 52 }}>
          {children}
        </div>
      </div>
    </ErrorBoundary>
  );
}
