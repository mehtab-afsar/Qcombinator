"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Investor · Profile — a sketched ID card. */
export function IdCardDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of an ID card">
      <DoodlePath {...s} duration={1.1} delay={0}
        d="M40 56 C40 52 43 49 47 49 L113 49 C117 49 120 52 120 56 L120 104 C120 108 117 111 113 111 L47 111 C43 111 40 108 40 104 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.6} delay={0.9}
        d="M52 66 C52 61 56 57 61 57 C66 57 70 61 70 66 C70 71 66 75 61 75 C56 75 52 71 52 66 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.3} delay={1.3} d="M78 62 L108 62" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.3} delay={1.4} d="M78 70 L104 70" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.35} delay={1.5} d="M50 88 L110 88" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.35} delay={1.6} d="M50 96 L96 96" />
    </DoodleFrame>
  );
}
