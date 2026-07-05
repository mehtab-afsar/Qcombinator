"use client";

import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { STEPS, PARAMETERS } from "../copy";
import { Reveal, Eyebrow } from "./Section";

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "100px 24px", maxWidth: 1180, margin: "0 auto", scrollMarginTop: 80 }}>
      <Reveal>
        <Eyebrow color={L.green}>How it works</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 50px", maxWidth: 640, textWrap: "balance" }}>
          Score. Improve. Unlock.
        </h2>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginBottom: 56 }}>
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.12}>
            <div style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "30px 28px", height: "100%" }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: L.blue, letterSpacing: "0.12em" }}>{s.n}</span>
              <h3 style={{ fontSize: 19, fontWeight: 650, color: L.ink, margin: "12px 0 10px", letterSpacing: "-0.01em" }}>{s.title}</h3>
              <p style={{ fontSize: 14.5, color: L.muted, lineHeight: 1.65, margin: 0 }}>{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div style={{ background: L.surf, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "26px 28px" }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: L.muted, margin: "0 0 18px" }}>
            The six dimensions investors actually price
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {PARAMETERS.map((p, i) => (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: p.color, marginTop: 5, flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: L.ink, margin: 0 }}>P{i + 1} · {p.name}</p>
                  <p style={{ fontSize: 12.5, color: L.muted, lineHeight: 1.5, margin: "3px 0 0" }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
