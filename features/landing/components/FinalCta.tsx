"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { Reveal } from "./Section";

export function FinalCta() {
  return (
    <section style={{ padding: "50px 24px 110px", maxWidth: 1180, margin: "0 auto" }}>
      <Reveal>
        <div style={{ background: L.ink, borderRadius: 24, padding: "70px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div aria-hidden="true" style={{ position: "absolute", top: "-38%", left: "50%", transform: "translateX(-50%)", width: 560, height: 420, background: L.alpha(L.green, 0.18), filter: "blur(40px)" }} />
          <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: L.green, margin: "0 0 18px", position: "relative" }}>
            Ten minutes to your number
          </p>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(32px, 4.6vw, 54px)", fontWeight: 480, lineHeight: 1.08, letterSpacing: "-0.02em", color: L.bg, margin: "0 auto 16px", maxWidth: 660, textWrap: "balance", position: "relative" }}>
            What&apos;s your Q-Score?
          </h2>
          <p style={{ fontSize: 16.5, color: L.alpha(L.bg, 0.72), maxWidth: 480, lineHeight: 1.65, margin: "0 auto 34px", position: "relative" }}>
            Find out exactly how investors will read your startup — and what to fix first. Free.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
            <Link href="/founder/onboarding" className="lp-cta" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: L.bg, color: L.ink, padding: "15px 32px", borderRadius: 999, fontSize: 15.5, fontWeight: 600, textDecoration: "none" }}>
              Get your Q-Score <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/login" className="lp-cta" style={{ display: "inline-flex", alignItems: "center", background: "transparent", color: L.alpha(L.bg, 0.85), padding: "15px 26px", borderRadius: 999, border: `1px solid ${L.alpha(L.bg, 0.25)}`, fontSize: 15.5, fontWeight: 500, textDecoration: "none" }}>
              I invest — show me deal flow
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
