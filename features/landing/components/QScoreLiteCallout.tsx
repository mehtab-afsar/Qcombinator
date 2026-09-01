"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { QSCORE_LITE_CALLOUT } from "../copy";
import { Reveal, Eyebrow } from "./Section";

/** Sits right after HowItWorks — the natural next question once a visitor has just read the six
 *  Q-Score dimensions is "okay, what would MY company score?". Links to features/qscore-lite/**,
 *  a fully independent public tool, not the real Q-Score above it. */
export function QScoreLiteCallout() {
  return (
    <section style={{ padding: "20px 24px 100px", maxWidth: 900, margin: "0 auto" }}>
      <Reveal>
        <div style={{
          background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 20,
          padding: "44px 40px", textAlign: "center",
        }}>
          <Eyebrow color={L.blue}>{QSCORE_LITE_CALLOUT.eyebrow}</Eyebrow>
          <h2 style={{
            fontFamily: FONT_SERIF, fontSize: "clamp(24px, 3.2vw, 34px)", fontWeight: 480,
            lineHeight: 1.2, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 14px",
            maxWidth: 560, marginInline: "auto", textWrap: "balance",
          }}>
            {QSCORE_LITE_CALLOUT.heading}
          </h2>
          <p style={{ fontSize: 15, color: L.muted, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 28px" }}>
            {QSCORE_LITE_CALLOUT.body}
          </p>
          <Link href="/qscore-lite" className="lp-cta" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: L.ink, color: L.bg, padding: "13px 26px", borderRadius: 999,
            fontSize: 15, fontWeight: 600, textDecoration: "none",
          }}>
            {QSCORE_LITE_CALLOUT.cta} <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: L.muted, margin: "16px 0 0" }}>
            No signup wall · Public evidence only
          </p>
        </div>
      </Reveal>
    </section>
  );
}
