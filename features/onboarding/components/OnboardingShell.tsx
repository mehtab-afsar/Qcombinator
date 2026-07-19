"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { O, FONT_SERIF, EASE } from "../theme";
import { useIsWide } from "../hooks/useIsWide";
import { useMotionPrefs } from "../hooks/useMotionPrefs";
import { StepProgress } from "./StepProgress";

const slide = {
  enter: (d: number) => ({ x: d * 18, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -18, opacity: 0 }),
};

function Pill({ brand, backHref, backLabel, backVisible }: { brand: string; backHref: string; backLabel: string; backVisible: boolean }) {
  return (
    <div style={{ position: "fixed", top: 16, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "center", padding: "0 24px", pointerEvents: "none" }}>
      <div style={{
        pointerEvents: "auto", width: "100%", maxWidth: 780, padding: "10px 20px",
        background: O.alpha(O.bg, 0.92), backdropFilter: "blur(20px) saturate(1.6)", WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        border: `1px solid ${O.alpha(O.bdr, 0.8)}`, borderRadius: 999, boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: O.ink, letterSpacing: "-0.02em" }}>{brand}</span>
        <a href={backHref} style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: O.muted, textDecoration: "none",
          opacity: backVisible ? 1 : 0, pointerEvents: backVisible ? "auto" : "none", transition: "opacity 0.2s",
        }}>
          <ArrowLeft size={13} /> {backLabel}
        </a>
      </div>
    </div>
  );
}

export function OnboardingShell({
  accent, brand = "Edge Alpha", backHref, backLabel, backVisible = true,
  stepNames, step, doodle, doodleEyebrow, doodleTitle, doodleBody, doodleExtra,
  dir, stepKey, children, footer,
}: {
  accent: string;
  brand?: string;
  backHref: string;
  backLabel: string;
  backVisible?: boolean;
  stepNames: string[];
  step: number;
  doodle: ReactNode;
  doodleEyebrow: string;
  doodleTitle: string;
  doodleBody: string;
  doodleExtra?: ReactNode;
  dir: number;
  stepKey: number;
  children: ReactNode;
  footer: ReactNode;
}) {
  const wide = useIsWide();
  const reduced = useMotionPrefs();

  const DoodlePane = (
    <div style={{
      background: O.surf, borderRadius: wide ? "20px 0 0 20px" : 20,
      padding: wide ? "40px 34px" : "28px 24px 20px",
      display: "flex", flexDirection: "column",
      minHeight: wide ? undefined : undefined,
    }}>
      <StepProgress step={step} total={stepNames.length} names={stepNames} accent={accent} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: wide ? "20px 0" : "16px 0 4px", minHeight: wide ? 220 : 120 }}>
        <div style={{ width: wide ? 168 : 92, height: wide ? 168 : 92, marginBottom: wide ? 22 : 12 }}>
          {doodle}
        </div>
        {wide && (
          <div style={{ textAlign: "center", maxWidth: 260 }}>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: accent, margin: "0 0 8px" }}>{doodleEyebrow}</p>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 480, letterSpacing: "-0.02em", color: O.ink, margin: "0 0 8px", lineHeight: 1.15 }}>{doodleTitle}</h2>
            <p style={{ fontSize: 13, color: O.muted, lineHeight: 1.55, margin: 0 }}>{doodleBody}</p>
            {doodleExtra}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: O.bg, color: O.ink }}>
      <Pill brand={brand} backHref={backHref} backLabel={backLabel} backVisible={backVisible} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: `${wide ? 100 : 84}px 20px 60px` }}>
        <div style={{
          width: "100%", maxWidth: wide ? 900 : 460,
          display: wide ? "grid" : "flex", gridTemplateColumns: wide ? "300px 1fr" : undefined,
          flexDirection: wide ? undefined : "column",
          background: O.card, borderRadius: 20, overflow: "hidden",
          border: `1px solid ${O.bdr}`, boxShadow: "0 20px 60px -30px rgba(24,22,15,0.25), 0 4px 16px -6px rgba(24,22,15,0.08)",
        }}>
          {DoodlePane}

          {/* form pane */}
          <div style={{ padding: wide ? "40px 44px" : "26px 22px 20px", display: "flex", flexDirection: "column" }}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={stepKey}
                custom={dir}
                variants={reduced ? undefined : slide}
                initial={reduced ? undefined : "enter"}
                animate={reduced ? undefined : "center"}
                exit={reduced ? undefined : "exit"}
                transition={{ duration: 0.2, ease: EASE }}
                style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
            <div style={{ marginTop: 22 }}>{footer}</div>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: O.muted, marginTop: 20 }}>
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
