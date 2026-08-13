"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from "framer-motion";
import { L, DUSK, FONT_SERIF, FONT_MONO } from "../theme";
import { STEPS, PARAMETERS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { useMotionPrefs } from "@/features/shared/hooks/useMotionPrefs";
import { useIsWide } from "@/features/shared/hooks/useIsWide";
import { HeroBuilding } from "./building/HeroBuilding";

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Static variant (mobile / reduced-motion) ────────────────────────────────

function StaticHowItWorks() {
  const reduced = useMotionPrefs();
  return (
    <section id="how-it-works" style={{ padding: "100px 24px", maxWidth: 1180, margin: "0 auto", scrollMarginTop: 80 }}>
      <Reveal>
        <Eyebrow color={L.green}>How it works</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 44px", maxWidth: 640, textWrap: "balance" }}>
          Score. Improve. Unlock.
        </h2>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginBottom: 56 }}>
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={reduced ? undefined : { opacity: 0, y: 26 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.14 }}
            style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "30px 28px", height: "100%" }}
          >
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: L.blue, letterSpacing: "0.12em" }}>{s.n}</span>
            <h3 style={{ fontSize: 19, fontWeight: 650, color: L.ink, margin: "12px 0 10px", letterSpacing: "-0.01em" }}>{s.title}</h3>
            <p style={{ fontSize: 14.5, color: L.muted, lineHeight: 1.65, margin: 0 }}>{s.body}</p>
          </motion.div>
        ))}
      </div>

      <Reveal>
        <DimensionsPanel />
      </Reveal>
    </section>
  );
}

function DimensionsPanel() {
  return (
    <div style={{ background: L.surf, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "26px 28px" }}>
      <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: L.muted, margin: "0 0 18px" }}>
        The six dimensions investors actually price
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 18 }}>
        {PARAMETERS.map((p, i) => (
          <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: p.color, marginTop: 5, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: L.ink, margin: 0 }}>P{i + 1} · {p.name}</p>
              <div style={{ height: 2, background: L.alpha(p.color, 0.4), borderRadius: 2, margin: "5px 0 6px" }} />
              <p style={{ fontSize: 12.5, color: L.muted, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pinned depth-gallery (desktop) ──────────────────────────────────────────

/** One step card flying in from depth to its place in the row. Deliberately normal flow, not
 *  position:absolute — its "home" position comes from flexbox (see the row it sits in), and the
 *  x/y/z/opacity here are pure motion transforms layered on top, resolving to 0 by the end of
 *  its arrival window. The old version computed a fixed pixel slot by hand and centered itself
 *  with position:absolute; that math was tuned for one specific column width, so it silently
 *  broke (cards overlapping the tower, or each other) the moment the available width changed —
 *  flexbox laying the row out is what actually stays correct as that width changes. */
function DepthCard({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const s = STEPS[index];
  const a0 = 0.06 + index * 0.20;
  const a1 = a0 + 0.16;

  const z = useTransform(progress, [a0, a1], [-420, 0]);
  const x = useTransform(progress, [a0, a1], [(index - 1) * 60, 0]);
  const y = useTransform(progress, [a0, a1], [70, 0]);
  const opacity = useTransform(progress, [a0, a0 + 0.05], [0, 1]);

  return (
    <motion.div
      style={{
        width: 260, flexShrink: 0, x, y, z, opacity,
        background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 16,
        padding: "24px 22px", boxShadow: "0 22px 44px -26px rgba(24,22,15,0.28)",
      }}
    >
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: L.blue, letterSpacing: "0.12em" }}>{s.n}</span>
      <h3 style={{ fontSize: 17.5, fontWeight: 650, color: L.ink, margin: "12px 0 10px", letterSpacing: "-0.01em" }}>{s.title}</h3>
      <p style={{ fontSize: 13.5, color: L.muted, lineHeight: 1.55, margin: 0 }}>{s.body}</p>
    </motion.div>
  );
}

/** One dimension tile fanning into the curved gallery — same reasoning as DepthCard: normal
 *  flow (flex-wrap row), 3D pose (y/z/rotateY) applied as motion transforms on top of wherever
 *  flexbox actually put it, so a narrower stage column wraps the row instead of hiding tiles. */
function DimensionTile({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const p = PARAMETERS[index];
  const t0 = 0.74 + index * 0.028;
  const t1 = t0 + 0.10;
  // curved gallery pose: outer tiles rotate toward the centre and recede
  const centerOffset = index - 2.5; // -2.5 … +2.5
  const finalRotY = centerOffset * -6.5;
  const finalZ = -Math.abs(centerOffset) * 26;

  const opacity = useTransform(progress, [t0, t0 + 0.05], [0, 1]);
  const y = useTransform(progress, [t0, t1], [90, 0]);
  const z = useTransform(progress, [t0, t1], [-260, finalZ]);
  const rotateY = useTransform(progress, [t0, t1], [0, finalRotY]);
  const lineScale = useTransform(progress, [t1, t1 + 0.06], [0, 1]);

  return (
    <motion.div
      style={{
        // flex (not a fixed width + flexShrink:0) so all six can shrink just enough to stay on
        // one line with the wider gap below, instead of wrapping to a second row.
        flex: "1 1 108px", minWidth: 0, maxWidth: 160, opacity, y, z, rotateY,
        background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 14,
        padding: "15px 14px", boxShadow: "0 16px 34px -22px rgba(24,22,15,0.3)",
      }}
    >
      <span aria-hidden="true" style={{ display: "block", width: 8, height: 8, borderRadius: 99, background: p.color, marginBottom: 8 }} />
      <p style={{ fontFamily: FONT_MONO, fontSize: 11.5, fontWeight: 700, color: L.ink, margin: 0, lineHeight: 1.35 }}>P{index + 1} · {p.name}</p>
      <motion.div style={{ height: 2, background: L.alpha(p.color, 0.5), borderRadius: 2, margin: "7px 0 7px", transformOrigin: "left", scaleX: lineScale }} />
      <p style={{ fontSize: 11, color: L.muted, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
    </motion.div>
  );
}

// Crop window into the tower's own 400×470 viewBox (features/landing/components/building/
// geometry.ts): x [188,300] (112 wide, centered on the right face — CX=200 to CX+W=266) and
// y [170,360] (190 tall — excludes the roof apex above ~162 and the foundation below ~366).
// Never shows the whole silhouette, just this one slice, blown up. The CSS numbers below are
// derived directly from those bounds against the 400×470 viewBox — see the comment inline.
const CROP_ASPECT = "112 / 190";
// width/height: how big the full 400×470 canvas renders relative to the crop window, so that
// the crop region exactly fills it (400/112 and 470/190). left/top: how far to shift that full
// canvas so viewBox point (188,170) — the crop's own top-left — lands at the window's (0,0).
const TOWER_ZOOM_STYLE = { width: "357.1%", height: "247.4%", left: "-167.9%", top: "-89.5%" } as const;

/** The tower from the Hero, zoomed into one slice of its right face — never the whole
 *  silhouette. Floors accumulate into this fixed window as `builtFloors` rises with scroll, so
 *  they visibly "switch on" one at a time instead of the camera panning to follow them.
 *
 *  A flex item (its parent is `display:flex`, see PinnedHowItWorks) with `flexShrink:0` and
 *  `height:100%` — flex's own sizing algorithm derives this item's WIDTH from that stretched
 *  height via aspect-ratio, which is what makes it reach the top of the screen *and* get
 *  broader together on a taller viewport, instead of a fixed-width column that's merely taller.
 *  The sibling stage column (flex:1) then gets however much width is actually left over — no
 *  percentage guessing needed to keep the two from overlapping or leaving a gap. */
function ZoomedTowerPanel({ builtFloors }: { builtFloors: MotionValue<number> }) {
  return (
    <div style={{ position: "relative", height: "100%", flexShrink: 0, maxWidth: 460, aspectRatio: CROP_ASPECT, overflow: "hidden", zIndex: 1 }}>
      <div style={{ position: "absolute", ...TOWER_ZOOM_STYLE }}>
        <BuiltTower builtFloors={builtFloors} />
      </div>
    </div>
  );
}

/** HeroBuilding takes a plain number, not a motion value — this subscribes to the live scroll-
 *  driven value and re-renders the SVG each time it changes (motion.div's own style prop can
 *  consume a MotionValue directly; a custom SVG prop like builtFloors can't, so it needs an
 *  explicit subscription instead). */
function BuiltTower({ builtFloors }: { builtFloors: MotionValue<number> }) {
  const [v, setV] = useState(builtFloors.get());
  useMotionValueEvent(builtFloors, "change", setV);
  return <HeroBuilding builtFloors={v} />;
}

function PinnedHowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const railFill = useTransform(scrollYProgress, [0.06, 0.9], [0, 1]);
  const dimsLabelOpacity = useTransform(scrollYProgress, [0.72, 0.8], [0, 1]);
  // during the finale the step-card row recedes upward slightly to make room for the dimension
  // gallery below it — applied once to the whole row now, not per-card
  const rowY = useTransform(scrollYProgress, [0.70, 0.86], [0, -46]);
  const rowScale = useTransform(scrollYProgress, [0.70, 0.86], [1, 0.94]);
  // The whole screen goes dark the moment this section is entered, holds through the entire
  // step/dimension reveal, then returns to the page's own light background right at the end —
  // same "curtain" idea as the Hero's own light/dark handoff, just inverted (dark → light → this
  // section starts dark and ends light, handing back to the normal page).
  const stageBg = useTransform(scrollYProgress, [0, 0.045, 0.93, 1], [L.bg, DUSK.skyMid, DUSK.skyMid, L.bg]);
  // Floors accumulate roughly in step with the cards/dimensions arriving (they finish around
  // progress 0.98) — not tied 1:1 to any single card, just paced to feel like the same thing
  // happening twice, once in text and once in the building.
  const builtFloors = useTransform(scrollYProgress, [0.04, 0.95], [0, 6]);

  return (
    <section ref={ref} id="how-it-works" style={{ height: "300vh", position: "relative", scrollMarginTop: 0 }}>
      <motion.div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: stageBg }}>
        {/* tower + stage, side by side via flex — the tower's own width is aspect-ratio-derived
            (see ZoomedTowerPanel), so the stage column just takes flex:1 and gets whatever's
            left, rather than both sides guessing percentages that have to add up correctly. */}
        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          <ZoomedTowerPanel builtFloors={builtFloors} />

          {/* stage column — 3D card/dimension choreography. Both rows below are normal flex-wrap
              layout now (see DepthCard/DimensionTile), not fixed-pixel position:absolute slots —
              that's what actually keeps content inside this column instead of running under the
              tower or off the edge as its width changes with viewport size. */}
          <div style={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden" }}>
            {/* Both rows in one flex column, vertically centered as a single unit, with one
                explicit `gap` controlling the space between them — the step row and the
                dimension row used to be positioned independently (one centered in leftover
                space, one pinned to the bottom), which had no precise relationship to each
                other and left a gap that was really just whatever leftover space happened to
                fall between two separately-tuned numbers. One gap value now instead of two. */}
            <div style={{ position: "absolute", inset: 0, perspective: 1300, transformStyle: "preserve-3d", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 34, padding: "0 28px" }}>
              <motion.div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", transformStyle: "preserve-3d", y: rowY, scale: rowScale }}>
                {STEPS.map((_, i) => (
                  <DepthCard key={i} progress={scrollYProgress} index={i} />
                ))}
              </motion.div>

              {/* finale: six dimensions fan into a curved gallery */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transformStyle: "preserve-3d" }}>
                <motion.p style={{ opacity: dimsLabelOpacity, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: DUSK.textDim, margin: 0 }}>
                  The six dimensions investors actually price
                </motion.p>
                {/* nowrap on purpose — tiles are flex/shrinkable (see DimensionTile) rather than
                    a fixed width, so all six stay on one line and shrink slightly instead of
                    wrapping to a second row */}
                <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "nowrap", width: "100%", perspective: 1100, transformStyle: "preserve-3d" }}>
                  {PARAMETERS.map((_, i) => (
                    <DimensionTile key={i} progress={scrollYProgress} index={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* header — a separate overlay above the flex row, spanning the full width, so it
            centers on the true page center rather than the center of whatever's left of the
            tower */}
        <div style={{ position: "absolute", top: "9vh", left: 0, right: 0, textAlign: "center", padding: "0 24px", zIndex: 3, pointerEvents: "none" }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: DUSK.skyGlow, margin: "0 0 14px" }}>How it works</p>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(28px, 3.4vw, 42px)", fontWeight: 480, lineHeight: 1.1, letterSpacing: "-0.02em", color: DUSK.text, margin: "0 auto 18px", maxWidth: 560, textWrap: "balance" }}>
            Score. Improve. Unlock.
          </h2>
          {/* progress rail */}
          <div style={{ width: 220, height: 3, background: "rgba(245,239,228,0.18)", borderRadius: 99, margin: "0 auto", overflow: "hidden" }} aria-hidden="true">
            <motion.div style={{ height: "100%", background: L.green, borderRadius: 99, transformOrigin: "left", scaleX: railFill }} />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export function HowItWorks() {
  const reduced = useMotionPrefs();
  const wide = useIsWide();
  if (reduced || !wide) return <StaticHowItWorks />;
  return <PinnedHowItWorks />;
}
