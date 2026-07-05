"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Investor · Criteria — a sketched target / crosshair. */
export function TargetDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of a target">
      <DoodlePath {...s} duration={1} delay={0}
        d="M54 80 C54 63 65 52 80 52 C95 52 106 63 106 80 C106 97 95 108 80 108 C65 108 54 97 54 80 Z" />
      <DoodlePath {...s} strokeWidth={2.3} duration={0.7} delay={0.7}
        d="M65 80 C65 71 72 65 80 65 C88 65 95 71 95 80 C95 89 88 95 80 95 C72 95 65 89 65 80 Z" />
      <DoodlePath {...s} strokeWidth={2.6} duration={0.3} delay={1.3}
        d="M76 80 C76 78 84 78 84 80 C84 82 76 82 76 80 Z" />
      {["M80 46 L80 38", "M122 80 L114 80", "M80 122 L80 114", "M38 80 L46 80"].map((d, i) => (
        <DoodlePath key={i} {...s} strokeWidth={2.2} duration={0.3} delay={1.5 + i * 0.06} d={d} />
      ))}
    </DoodleFrame>
  );
}
