"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FounderRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace("/founder/dashboard");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#F9F7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ height: 48, width: 48, background: "#18160F", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ color: "#F9F7F2", fontWeight: 900, fontSize: 10, letterSpacing: "0.05em" }}>EDGE</span>
        </div>
        <p style={{ fontSize: 13, color: "#8A867C" }}>Redirecting to dashboard…</p>
      </div>
    </div>
  );
}
