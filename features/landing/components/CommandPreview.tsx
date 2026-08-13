"use client";

/**
 * The Command View, previewed — replaces the old "Advisory bench" chat mockup, which showed an
 * interaction the product deliberately doesn't have (ADR-034: "the Executive model works to a
 * mandate, it does not wait to be messaged"). Shows the real shape instead: a Q-Score dial with
 * the five real executives (lib/registry/executives/**, copied into EXECUTIVES — see copy.ts)
 * arranged around it on a tilted 3D plane, and the three real moments of a cycle
 * (mandate → briefing → approval), mirroring MandateCard / BriefingsPanel / ActionsPanel.
 *
 * Scroll-driven, not timer-driven — same pinned-section technique Hero.tsx already uses (a tall
 * wrapper, a `position: sticky` inner section, `useScroll` + `useTransform`). Flat 2D ring — no
 * perspective tilt, no orbiting decoration. Everything that moves is either real state (the
 * dial, the rail) or tied directly to scroll position.
 */

import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { EXECUTIVES, EXECUTIVE_ACTIVITY, CYCLE_MOMENTS } from "../copy";
import { Reveal } from "./Section";
import { useMotionPrefs } from "@/features/shared/hooks/useMotionPrefs";
import { QScoreDial } from "@/features/qscore/components/QScoreDial";

const EASE = [0.22, 1, 0.36, 1] as const;
const PIN_VH = 300;
const CYCLE_START = 0.58;
const SEG_WIDTH = (1 - CYCLE_START) / CYCLE_MOMENTS.length;

/** One line in the activity log, keyed to its own scroll window — each executive's entry
 *  animates in independently rather than together, since the point is that the team isn't
 *  synchronized around one moment, it's five people each on their own clock. */
function ActivityRow({ entry, index, progress }: {
  entry: (typeof EXECUTIVE_ACTIVITY)[number]; index: number; progress: MotionValue<number>;
}) {
  const start = 0.03 + index * 0.09;
  const end = start + 0.14;
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const x = useTransform(progress, [start, end], [-14, 0]);
  const exec = EXECUTIVES.find((e) => e.id === entry.execId)!;
  const color = exec.color ?? L.ink;

  return (
    <motion.div
      style={{
        opacity, x, display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 2px",
        borderBottom: index < EXECUTIVE_ACTIVITY.length - 1 ? `1px solid ${L.bdr}` : "none",
      }}
    >
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: color, marginTop: 5, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, color, letterSpacing: "0.03em" }}>{exec.short}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: L.muted }}>{entry.when}</span>
        </div>
        <p style={{ fontSize: 13, color: L.ink, lineHeight: 1.45, margin: 0 }}>{entry.body}</p>
      </div>
    </motion.div>
  );
}

/** The panel chrome shared by the scroll-linked and static versions — a Q-Score header over
 *  the activity log, styled like a real console readout rather than a decorative diagram. */
function ActivityPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 20, padding: "20px 22px 8px", boxShadow: "0 20px 44px -30px rgba(24,22,15,0.22)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6, paddingBottom: 16, borderBottom: `1px solid ${L.bdr}` }}>
        <QScoreDial score={73} size={48} centerLabel="" />
        <div>
          <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: L.muted, margin: "0 0 3px" }}>Q-Score · 73</p>
          <p style={{ fontSize: 13, fontWeight: 650, color: L.ink, margin: 0 }}>What the team is working against, right now</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** One segment of the step rail — its fill is a direct read of scroll position inside this
 *  moment's window: empty before it, filling through it, staying full after. No timer. */
function ScrollRailSegment({ index, onSelect, progress }: { index: number; onSelect: (i: number) => void; progress: MotionValue<number> }) {
  const start = CYCLE_START + index * SEG_WIDTH;
  const end = start + SEG_WIDTH;
  const fill = useTransform(progress, [start, end], [0, 1]);
  return (
    <button
      onClick={() => onSelect(index)}
      aria-label={`Show ${CYCLE_MOMENTS[index].label}`}
      style={{ flex: 1, height: 3, borderRadius: 99, border: "none", cursor: "pointer", padding: 0, background: L.bdr, overflow: "hidden", position: "relative" }}
    >
      <motion.div style={{ position: "absolute", inset: 0, background: L.ink, transformOrigin: "left", scaleX: fill }} />
    </button>
  );
}

function MomentCard({ m }: { m: (typeof CYCLE_MOMENTS)[number] }) {
  const isApproval = "action" in m && m.action;
  return (
    <div style={{
      background: isApproval ? L.alpha(L.amber, 0.06) : L.card,
      border: `1px solid ${isApproval ? L.alpha(L.amber, 0.35) : L.bdr}`,
      borderRadius: 16, padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase",
          color: isApproval ? L.amber : L.muted, fontWeight: isApproval ? 700 : 400,
        }}>
          {m.eyebrow}
        </span>
        {"verdict" in m && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: L.green, background: L.alpha(L.green, 0.1), padding: "2px 8px", borderRadius: 999 }}>
            {m.verdict}
          </span>
        )}
      </div>
      <p style={{ fontFamily: FONT_SERIF, fontSize: 18, lineHeight: 1.4, color: L.ink, margin: "0 0 6px", letterSpacing: "-0.005em" }}>
        {m.heading}
      </p>
      <p style={{ fontSize: 13, color: L.muted, margin: 0 }}>{m.sub}</p>

      {isApproval && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <span style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 10, background: L.ink, color: L.bg, fontSize: 12.5, fontWeight: 700 }}>
            Approve and send
          </span>
          <span style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${L.bdr}`, color: L.muted, fontSize: 12.5, fontWeight: 600 }}>
            Decline
          </span>
        </div>
      )}
    </div>
  );
}

/** Activity log + cycle, laid out flat with no scroll-linking — the reduced-motion and
 *  no-JS-pin fallback. Every entry and the first moment are simply visible; the rail is
 *  click-only. */
function StaticFallback({ step, onSelect }: { step: number; onSelect: (i: number) => void }) {
  return (
    <div style={{ maxWidth: 980, margin: "64px auto 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48, alignItems: "center", padding: "0 24px" }}>
      <ActivityPanel>
        {EXECUTIVE_ACTIVITY.map((entry) => {
          const exec = EXECUTIVES.find((e) => e.id === entry.execId)!;
          const color = exec.color ?? L.ink;
          return (
            <div key={entry.execId} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 2px", borderBottom: `1px solid ${L.bdr}` }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, color, letterSpacing: "0.03em" }}>{exec.short}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: L.muted }}>{entry.when}</span>
                </div>
                <p style={{ fontSize: 13, color: L.ink, lineHeight: 1.45, margin: 0 }}>{entry.body}</p>
              </div>
            </div>
          );
        })}
      </ActivityPanel>
      <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {CYCLE_MOMENTS.map((m, i) => (
            <button key={m.key} onClick={() => onSelect(i)} aria-label={`Show ${m.label}`} style={{ flex: 1, height: 3, borderRadius: 99, border: "none", cursor: "pointer", padding: 0, background: i <= step ? L.ink : L.bdr }} />
          ))}
        </div>
        <MomentCard m={CYCLE_MOMENTS[step]} />
        <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: L.muted, margin: "16px 0 0" }}>One cycle, shown in miniature — illustrative, not your live data.</p>
      </div>
    </div>
  );
}

export function CommandPreview() {
  const reduced = useMotionPrefs();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: progress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(0);

  useMotionValueEvent(progress, "change", v => {
    const idx = Math.min(CYCLE_MOMENTS.length - 1, Math.max(0, Math.floor((v - CYCLE_START) / SEG_WIDTH)));
    setStep(idx);
  });

  const heading = (
    <>
      <Reveal>
        <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: L.blue, margin: "0 0 20px", textAlign: "center" }}>Inside Edge Alpha</p>
      </Reveal>
      <Reveal delay={0.06}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(34px, 5vw, 58px)", fontWeight: 460, lineHeight: 1.07, letterSpacing: "-0.025em", color: L.ink, margin: "0 0 20px", textWrap: "balance", textAlign: "center", maxWidth: 720, marginInline: "auto" }}>
          Five executives, running on their own clock.
        </h2>
      </Reveal>
      <Reveal delay={0.12}>
        <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: L.muted, lineHeight: 1.6, margin: 0, textWrap: "balance", textAlign: "center", maxWidth: 720, marginInline: "auto" }}>
          A CEO, growth, finance, product, and operations executive — each owns real work
          against your Q-Score, every cycle. No chat window to open. No prompt to write.
        </p>
      </Reveal>
    </>
  );

  return (
    <section id="team" style={{ scrollMarginTop: 80 }}>
      {reduced ? (
        <>
          <div style={{ padding: "130px 24px 0" }}>{heading}</div>
          <div style={{ padding: "36px 0 120px" }}>
            <StaticFallback step={step} onSelect={setStep} />
          </div>
        </>
      ) : (
        <div ref={ref} style={{ height: `${PIN_VH}vh`, position: "relative" }}>
          {/* The heading now lives inside the pinned box instead of above it, so it stays on
              screen for the whole scroll-linked animation — previously it was normal-flow content
              that scrolled away before the pin even engaged, and the box's scroll effect ran with
              no heading in view at all. */}
          <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
            <div style={{ marginBottom: 44 }}>{heading}</div>
            <div style={{ maxWidth: 980, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48, alignItems: "center" }}>
              {/* the log — Q-Score at the top, each executive's entry landing on its own
                  independent schedule as you scroll (not a synchronized reveal) */}
              <ActivityPanel>
                {EXECUTIVE_ACTIVITY.map((entry, i) => (
                  <ActivityRow key={entry.execId} entry={entry} index={i} progress={progress} />
                ))}
              </ActivityPanel>

              {/* the cycle — the rail fills with scroll position; the card follows it */}
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {CYCLE_MOMENTS.map((_, i) => (
                    <ScrollRailSegment key={CYCLE_MOMENTS[i].key} index={i} onSelect={setStep} progress={progress} />
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={CYCLE_MOMENTS[step].key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    <MomentCard m={CYCLE_MOMENTS[step]} />
                  </motion.div>
                </AnimatePresence>
                <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: L.muted, margin: "16px 0 0" }}>
                  Scroll — one cycle, shown in miniature. Illustrative, not your live data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
