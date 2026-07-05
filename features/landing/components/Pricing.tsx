"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { PRICING } from "../copy";
import { Reveal, Eyebrow } from "./Section";

function Plan({ plan, featured }: { plan: typeof PRICING.free | typeof PRICING.pro; featured?: boolean }) {
  return (
    <div
      style={{
        background: featured ? L.ink : L.card,
        border: `1px solid ${featured ? L.ink : L.bdr}`,
        borderRadius: 18, padding: "34px 32px",
        display: "flex", flexDirection: "column", height: "100%", position: "relative",
      }}
    >
      {featured && (
        <span style={{ position: "absolute", top: -11, left: 32, background: L.green, color: "#fff", fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 99, padding: "3px 12px" }}>
          Most founders
        </span>
      )}
      <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: featured ? L.alpha(L.bg, 0.6) : L.muted, margin: "0 0 12px" }}>{plan.name}</p>
      <p style={{ margin: "0 0 6px" }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 46, fontWeight: 480, color: featured ? L.bg : L.ink, letterSpacing: "-0.02em" }}>{plan.price}</span>
        {"period" in plan && <span style={{ fontSize: 15, color: featured ? L.alpha(L.bg, 0.6) : L.muted }}>{plan.period}</span>}
      </p>
      <p style={{ fontSize: 14.5, color: featured ? L.alpha(L.bg, 0.75) : L.muted, margin: "0 0 24px" }}>{plan.tagline}</p>
      <ul style={{ listStyle: "none", margin: "0 0 30px", padding: 0, display: "flex", flexDirection: "column", gap: 11, flexGrow: 1 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5, color: featured ? L.alpha(L.bg, 0.9) : L.muted, lineHeight: 1.5 }}>
            <Check size={16} aria-hidden="true" style={{ color: L.green, flexShrink: 0, marginTop: 2 }} />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/founder/onboarding"
        className="lp-cta"
        style={{
          display: "block", textAlign: "center",
          background: featured ? L.bg : L.ink,
          color: featured ? L.ink : L.bg,
          padding: "13px 24px", borderRadius: 999,
          fontSize: 14.5, fontWeight: 600, textDecoration: "none",
        }}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto", scrollMarginTop: 80 }}>
      <Reveal>
        <Eyebrow color={L.green}>Pricing</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 14px", textWrap: "balance" }}>
          Free until you&apos;re ready to raise.
        </h2>
        <p style={{ fontSize: 17, color: L.muted, maxWidth: 540, lineHeight: 1.65, margin: "0 0 48px" }}>
          Know exactly where you stand for nothing. Pay when you&apos;re moving the number.
        </p>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <Reveal><Plan plan={PRICING.free} /></Reveal>
        <Reveal delay={0.1}><Plan plan={PRICING.pro} featured /></Reveal>
      </div>
    </section>
  );
}
