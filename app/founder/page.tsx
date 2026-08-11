"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/features/shared/components/BrandMark";

export default function FounderRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace("/founder/dashboard");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#F9F7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", margin: "0 auto 16px" }}>
          <BrandMark size={48} />
        </div>
        <p style={{ fontSize: 13, color: "#8A867C" }}>Redirecting to dashboard…</p>
      </div>
    </div>
  );
}
