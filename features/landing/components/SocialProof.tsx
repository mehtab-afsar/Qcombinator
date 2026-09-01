"use client";

/**
 * "Both sides of the table use the same number" — a true statement about how the product is
 * built, so the heading stays. What sat beneath it did not: six invented testimonials, rotating
 * on a carousel, making specific claims about funding rounds that never happened, under a
 * caption admitting they were illustrative.
 *
 * A pre-launch product has no customers, and the honest version of social proof at that stage is
 * the mechanism, not testimony. So this now states what each side actually gets from the score,
 * in the company's own voice. When there are real founders and real investors to quote, this is
 * the section their words belong in — and the carousel can come back with them.
 */

import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { TWO_SIDES } from "../copy";
import { Reveal, Eyebrow } from "./Section";

export function SocialProof() {
  return (
    <section style={{ padding: "100px 24px", maxWidth: 980, margin: "0 auto" }}>
      <Reveal>
        <div style={{ textAlign: "center" }}>
          <Eyebrow color={L.green}>Founders and funds</Eyebrow>
          <h2 style={{
            fontFamily: FONT_SERIF, fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 480,
            lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink,
            margin: "0 0 56px", textWrap: "balance",
          }}>
            Both sides of the table use the same number.
          </h2>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="two-sides" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 }}>
          {TWO_SIDES.map((s) => (
            <div key={s.side} style={{ borderTop: `1px solid ${L.bdr}`, paddingTop: 24 }}>
              <span style={{
                display: "block", fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase", color: L.green,
                marginBottom: 14,
              }}>
                {s.side}
              </span>
              <p style={{
                fontSize: "clamp(15.5px, 1.8vw, 17.5px)", color: L.ink,
                lineHeight: 1.65, margin: 0, maxWidth: "42ch",
              }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </Reveal>

      <style>{`
        @media (max-width: 820px) {
          .two-sides { grid-template-columns: 1fr !important; gap: 36px !important; }
        }
      `}</style>
    </section>
  );
}
