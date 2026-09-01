"use client";

/**
 * The hinge. Above it, the page is about a number (Founder Leverage). Below it, the page is about
 * the product that moves that number (Edge Alpha, the Q-Score, the executive team).
 *
 * The page previously cut straight from "here's what the check tells you" into "Score. Improve.
 * Unlock." with nothing in between — a founder reading top to bottom met a second, unrelated
 * pitch and had to work out for themselves how the two connected. Most won't. This section exists
 * to make that handover explicit, and it is deliberately the quietest thing on the page: a
 * transition should be felt, not performed.
 */

import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { BRIDGE } from "../copy";
import { Reveal, Eyebrow } from "./Section";

export function Bridge() {
  return (
    <section style={{ padding: "20px 24px 96px", maxWidth: 1180, margin: "0 auto" }}>
      <Reveal>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow color={L.blue}>{BRIDGE.eyebrow}</Eyebrow>
          <h2 style={{
            fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.2vw, 38px)", fontWeight: 480,
            letterSpacing: "-0.02em", lineHeight: 1.2, color: L.ink,
            margin: "0 0 20px", textWrap: "balance",
          }}>
            {BRIDGE.heading}
          </h2>
          <p style={{
            fontSize: "clamp(15.5px, 1.8vw, 17.5px)", color: L.muted, lineHeight: 1.7,
            margin: "0 auto 24px", maxWidth: "62ch",
          }}>
            {BRIDGE.body}
          </p>
          <p style={{ fontFamily: FONT_MONO, fontSize: 13, color: L.ink, margin: 0 }}>
            {BRIDGE.closer}
          </p>
        </div>
      </Reveal>
    </section>
  );
}
