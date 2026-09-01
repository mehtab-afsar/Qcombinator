"use client";

/**
 * The three fundraising numbers — 92% pitch too early, 6 months wasted, 0 honest signals.
 *
 * These used to sit inside Ladder, in the middle of the LEVERAGE argument, where they quietly
 * contradicted it: the surrounding section is about how you use AI, and these are about how
 * founders lose money raising. A reader met them mid-thought and had to guess which story they
 * belonged to. They belong to the fundraising half of the page, next to the Q-Score, where they
 * are the reason that number exists.
 */

import { L, FONT_MONO } from "../theme";
import { PROBLEMS } from "../copy";
import { Reveal } from "./Section";
import { CountUp } from "./CountUp";

export function Problems() {
  return (
    <section style={{ padding: "0 24px 88px", maxWidth: 1180, margin: "0 auto" }}>
      <Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, paddingTop: 40, borderTop: `1px solid ${L.bdr}` }}>
          {PROBLEMS.map((p) => {
            const m = p.stat.match(/^(\d+)(.*)$/);
            const to = m ? Number(m[1]) : 0;
            const suffix = m ? m[2] : p.stat;
            return (
              <div key={p.stat} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: L.red, minWidth: 66, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  <CountUp to={to} suffix={suffix} />
                </span>
                <p style={{ fontSize: 13, color: L.muted, margin: 0, lineHeight: 1.55 }}>{p.label}</p>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
