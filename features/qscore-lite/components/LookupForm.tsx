"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { bg, bdr, ink, muted, blue, red } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";

export function LookupForm({
  onSubmit, error,
}: { onSubmit: (companyName: string, url: string) => void; error: string }) {
  const [companyName, setCompanyName] = useState("");
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !url.trim()) return;
    onSubmit(companyName.trim(), url.trim());
  }

  const canSubmit = companyName.trim().length > 0 && url.trim().length > 0;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "140px 24px 100px" }}>
      <p style={{ fontFamily: font.family.mono, fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: blue, margin: "0 0 16px" }}>
        Q-Score Lite
      </p>
      <h1 style={{ fontFamily: font.family.serif, fontSize: "clamp(30px, 4.5vw, 44px)", fontWeight: 480, lineHeight: 1.1, letterSpacing: "-0.02em", color: ink, margin: "0 0 16px", textWrap: "balance" }}>
        See what an investor would find about you.
      </h1>
      <p style={{ fontSize: 15.5, color: muted, lineHeight: 1.6, margin: "0 0 40px" }}>
        Enter your company — we scan public evidence only, no self-report — and return a fundability
        score with a confidence level. Free, no signup wall.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: ink, marginBottom: 6 }}>
            Company name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Inc."
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 12,
              border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 15, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: ink, marginBottom: 6 }}>
            Website
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="acme.com"
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 12,
              border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 15, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && <p style={{ fontSize: 13, color: red, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 24px", borderRadius: 999, border: "none", marginTop: 8,
            background: canSubmit ? ink : bdr, color: bg,
            fontSize: 15, fontWeight: 600, cursor: canSubmit ? "pointer" : "default",
          }}
        >
          See my Q-Score Lite <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
