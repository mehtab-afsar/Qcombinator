"use client";

import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { PROBLEMS } from "../copy";
import { Reveal, Eyebrow } from "./Section";

export function Problem() {
  return (
    <section style={{ padding: "100px 24px", maxWidth: 1180, margin: "0 auto" }}>
      <Reveal>
        <Eyebrow color={L.red}>The problem</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 14px", maxWidth: 640, textWrap: "balance" }}>
          Most founders raise blind.
        </h2>
        <p style={{ fontSize: 17, color: L.muted, maxWidth: 560, lineHeight: 1.65, margin: "0 0 50px" }}>
          Fundraising has a feedback problem: you find out you weren&apos;t ready only after
          the meetings stop getting booked.
        </p>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {PROBLEMS.map((p, i) => (
          <Reveal key={p.stat} delay={i * 0.1}>
            <div style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "30px 28px", height: "100%" }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 42, fontWeight: 700, color: L.red, margin: "0 0 10px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{p.stat}</p>
              <p style={{ fontSize: 15.5, fontWeight: 600, color: L.ink, margin: "0 0 10px", lineHeight: 1.45 }}>{p.label}</p>
              <p style={{ fontSize: 14, color: L.muted, lineHeight: 1.65, margin: 0 }}>{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
