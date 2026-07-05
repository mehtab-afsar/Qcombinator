"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { ADVISERS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { useMotionPrefs } from "../hooks/useMotionPrefs";

/** Small friendly founder avatar (thinking pose), drawn in ink linework. */
function FounderAvatar({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 80" width="66" height="66" aria-hidden="true">
      <circle cx="40" cy="40" r="38" fill={L.card} stroke={L.bdr} strokeWidth="1.5" />
      {/* head */}
      <circle cx="40" cy="33" r="13" fill={L.surf} stroke={L.ink} strokeWidth="1.6" />
      {/* shoulders */}
      <path d="M20 66 Q20 49 40 49 Q60 49 60 66" fill={L.surf} stroke={L.ink} strokeWidth="1.6" />
      {/* thinking hand */}
      <circle cx="30" cy="46" r="4.5" fill={L.card} stroke={L.ink} strokeWidth="1.6" />
      {/* spark of an idea */}
      <circle cx="40" cy="33" r="13" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="3 4" opacity="0.7" />
    </svg>
  );
}

export function Agents() {
  const reduced = useMotionPrefs();
  const [selected, setSelected] = useState(0);
  const active = ADVISERS[selected];

  return (
    <section id="advisers" style={{ padding: "110px 24px", maxWidth: 1180, margin: "0 auto", scrollMarginTop: 80 }}>
      <Reveal>
        <Eyebrow color={L.blue}>Your bench</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 14px", maxWidth: 720, textWrap: "balance" }}>
          Every founder worry has a specialist.
        </h2>
        <p style={{ fontSize: 17, color: L.muted, maxWidth: 580, lineHeight: 1.65, margin: "0 0 44px" }}>
          The questions that keep you up are floating below. Tap one — the adviser who
          owns it answers with your context, not a generic playbook.
        </p>
      </Reveal>

      <Reveal>
        <div className="lp-mm-grid" style={{ display: "grid", gridTemplateColumns: "minmax(300px, 440px) 1fr", gap: 22, alignItems: "stretch" }}>
          {/* The thought bubble — founder's active answer */}
          <div style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 20, padding: "30px 30px 26px", position: "relative", display: "flex", flexDirection: "column", minHeight: 300, overflow: "hidden" }}>
            <div aria-hidden="true" style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: L.alpha(active.color, 0.10), transition: "background 0.4s" }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: L.muted, position: "relative" }}>
              You&apos;re wondering…
            </span>
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.32 }}
                style={{ position: "relative", flexGrow: 1, display: "flex", flexDirection: "column" }}
              >
                <p style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: "clamp(19px, 2.4vw, 24px)", color: L.ink, margin: "10px 0 22px", lineHeight: 1.4 }}>
                  “{active.thought}”
                </p>
                <div style={{ borderTop: `1px dashed ${L.bdr}`, paddingTop: 18, marginTop: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <FounderAvatar color={active.color} />
                    <div>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: L.ink }}>{active.name}</span>
                      <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 12, color: active.color }}>{active.role}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 16, color: L.ink, lineHeight: 1.6, margin: 0 }}>{active.advice}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* The thought-clouds */}
          <div role="tablist" aria-label="Founder worries" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {ADVISERS.map((a, i) => {
              const on = selected === i;
              return (
                <motion.button
                  key={a.name}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setSelected(i)}
                  className="lp-cloud"
                  initial={reduced ? undefined : { opacity: 0, scale: 0.9, y: 12 }}
                  whileInView={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
                  whileHover={reduced ? undefined : { y: -4 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                  style={{
                    display: "flex", flexDirection: "column", gap: 5, textAlign: "left",
                    background: on ? L.alpha(a.color, 0.07) : L.card,
                    border: `1.5px solid ${on ? a.color : L.bdr}`,
                    borderRadius: 16, padding: "15px 16px", cursor: "pointer",
                    fontFamily: "inherit", transition: "border-color 0.2s, background 0.2s",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: a.color, boxShadow: on ? `0 0 8px ${a.color}` : "none" }} />
                    <span style={{ fontSize: 14.5, fontWeight: 650, color: L.ink }}>{a.domain}</span>
                  </span>
                  <span style={{ fontSize: 12.5, color: L.muted, lineHeight: 1.4, fontStyle: "italic" }}>{a.thought}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: on ? a.color : L.muted, marginTop: 2, letterSpacing: "0.04em" }}>
                    {on ? `→ ${a.name}` : a.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
