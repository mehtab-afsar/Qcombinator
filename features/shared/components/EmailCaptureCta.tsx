"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { bg, surf, bdr, ink, muted, red } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";

/**
 * The end-of-funnel email capture shared by public landing-page tools (the Leverage Check,
 * Q-Score Lite) that compute something for an anonymous visitor and want to convert them into a
 * signup without gating the result itself. Posts the email against an already-created row via
 * `linkEndpoint`, then always redirects into onboarding regardless of whether that write
 * succeeded — the visitor's path to signup must never depend on this non-critical write.
 */
export interface EmailCaptureCtaProps {
  /** e.g. '/api/leverage-check/link-email' | '/api/qscore-lite/link-email' */
  linkEndpoint: string;
  /** The id of the row being linked — sent as `submissionId` in the link-email POST body. */
  submissionId: string;
  /** Query param name carrying `submissionId` into onboarding — e.g. 'leverageCheckId' | 'qScoreLiteId'. */
  redirectIdParam: string;
  eyebrow: string;
  heading: string;
}

export function EmailCaptureCta({
  linkEndpoint, submissionId, redirectIdParam, eyebrow, heading,
}: EmailCaptureCtaProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email"); return; }
    setLoading(true);
    setError("");
    try {
      await fetch(linkEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, email: email.trim() }),
      });
    } catch {
      // Non-fatal — the visitor still proceeds to signup even if this write failed.
    }
    router.push(`/founder/onboarding?${redirectIdParam}=${encodeURIComponent(submissionId)}&email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "36px 32px", marginTop: 56, textAlign: "center" }}>
      <p style={{ fontFamily: font.family.mono, fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: muted, margin: "0 0 12px" }}>
        {eyebrow}
      </p>
      <h3 style={{ fontFamily: font.family.serif, fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 480, color: ink, margin: "0 0 24px", maxWidth: 480, marginInline: "auto", textWrap: "balance" }}>
        {heading}
      </h3>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={{
            flex: "1 1 220px", padding: "13px 16px", borderRadius: 999,
            border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 14.5, outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "13px 24px", borderRadius: 999, border: "none",
            background: ink, color: bg, fontSize: 14.5, fontWeight: 600,
            cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {loading ? <Loader2 size={15} className="ea-cta-spin" /> : <>Continue <ArrowRight size={15} /></>}
        </button>
      </form>
      {error && <p style={{ fontSize: 12.5, color: red, marginTop: 10 }}>{error}</p>}

      <style>{`
        .ea-cta-spin { animation: ea-cta-spin-kf 0.8s linear infinite; }
        @keyframes ea-cta-spin-kf { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .ea-cta-spin { animation: none; } }
      `}</style>
    </div>
  );
}
