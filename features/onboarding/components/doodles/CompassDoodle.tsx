"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Founder · Strategy — a sketched compass. */
export function CompassDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of a compass">
      <DoodlePath {...s} duration={1.1} delay={0}
        d="M56 80 C56 65 66 55 80 56 C94 57 103 67 102 81 C101 95 90 105 77 104 C64 103 55 93 56 80 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.6} delay={0.8} d="M80 60 L88 80 L80 100 L73 79 Z" />
      {["M80 50 L80 42", "M110 80 L118 80", "M80 110 L80 118", "M50 80 L42 80"].map((d, i) => (
        <DoodlePath key={i} {...s} strokeWidth={2.2} duration={0.3} delay={1.2 + i * 0.06} d={d} />
      ))}
    </DoodleFrame>
  );
}
