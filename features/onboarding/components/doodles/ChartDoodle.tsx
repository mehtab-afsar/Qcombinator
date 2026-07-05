"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Founder · Traction — a sketched rising line chart. */
export function ChartDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of a rising line chart">
      <DoodlePath {...s} strokeWidth={2.2} duration={0.6} delay={0} d="M40 118 L120 118" />
      <DoodlePath {...s} duration={1} delay={0.3} d="M44 108 L64 92 L82 100 L108 62 L122 46" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.3} delay={1.3} d="M122 46 L110 48" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.3} delay={1.4} d="M122 46 L118 58" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.3} delay={0.9}
        d="M62 92 C62 90 66 90 66 92 C66 94 62 94 62 92 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.3} delay={1}
        d="M80 100 C80 98 84 98 84 100 C84 102 80 102 80 100 Z" />
    </DoodleFrame>
  );
}
