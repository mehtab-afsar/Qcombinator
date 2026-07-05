"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Founder · Problem — a sketched lightbulb. */
export function LightbulbDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of a lightbulb">
      <DoodlePath {...s} duration={1.1} delay={0}
        d="M64 72 C62 56 70 44 82 44 C94 44 102 55 99 71 C97 82 90 88 87 94 L73 94 C70 88 66 82 64 72 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.5} delay={0.9} d="M74 62 C77 68 83 56 86 64" />
      {["M74 96 L86 96", "M75 101 L85 101", "M76 106 L84 106"].map((d, i) => (
        <DoodlePath key={i} {...s} strokeWidth={2.2} duration={0.3} delay={1.2 + i * 0.08} d={d} />
      ))}
      {["M56 50 L50 45", "M108 50 L114 45", "M82 32 L82 24"].map((d, i) => (
        <DoodlePath key={`r${i}`} {...s} strokeWidth={2.2} duration={0.3} delay={1.5 + i * 0.08} d={d} />
      ))}
    </DoodleFrame>
  );
}
