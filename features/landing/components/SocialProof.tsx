"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { L, FONT_SERIF } from "../theme";
import { TESTIMONIALS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { useMotionPrefs } from "../hooks/useMotionPrefs";

export function SocialProof() {
  const reduced = useMotionPrefs();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % TESTIMONIALS.length), 5200);
    return () => clearInterval(id);
  }, [reduced]);

  const t = TESTIMONIALS[index];

  return (
    <section style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
      <Reveal>
        <Eyebrow color={L.green}>Founders and funds</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 46px", textWrap: "balance" }}>
          Both sides of the table use the same number.
        </h2>
      </Reveal>

      <Reveal>
        <div style={{ minHeight: 232 }} aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: 0.45 }}
              style={{ margin: 0 }}
            >
              <blockquote style={{ margin: 0 }}>
                <p style={{ fontFamily: FONT_SERIF, fontSize: "clamp(19px, 2.6vw, 26px)", fontWeight: 420, lineHeight: 1.5, color: L.ink, margin: "0 0 28px", letterSpacing: "-0.005em" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>
              <figcaption style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 99, background: L.alpha(t.color, 0.12), border: `1px solid ${L.alpha(t.color, 0.4)}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: t.color }}>
                  {t.initials}
                </span>
                <span style={{ textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: L.ink }}>{t.name}</span>
                  <span style={{ display: "block", fontSize: 13, color: L.muted }}>{t.role}</span>
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 26 }}>
          {TESTIMONIALS.map((item, i) => (
            <button
              key={item.name}
              onClick={() => setIndex(i)}
              aria-label={`Show testimonial from ${item.name}`}
              aria-current={index === i}
              style={{
                width: index === i ? 22 : 8, height: 8, borderRadius: 99,
                background: index === i ? L.green : L.bdr,
                border: "none", cursor: "pointer", padding: 0,
                transition: "width 0.25s, background 0.25s",
              }}
            />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
