"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Founder · Startup — a sketched rocket. */
export function RocketDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of a rocket">
      <DoodlePath {...s} duration={1.1} delay={0}
        d="M80 40 C88 48 94 62 94 82 L94 96 C94 100 89 103 80 103 C71 103 66 100 66 96 L66 82 C66 62 72 48 80 40 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.6} delay={0.5}
        d="M80 68 C75 68 71 72 71 77 C71 82 75 86 80 86 C85 86 89 82 89 77 C89 72 85 68 80 68 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.5} delay={0.8}
        d="M66 90 C58 92 52 100 50 110 C58 106 64 100 68 96 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.5} delay={0.9}
        d="M94 90 C102 92 108 100 110 110 C102 106 96 100 92 96 Z" />
      {["M72 103 C70 110 74 115 71 122", "M80 104 C78 112 83 117 80 125", "M88 103 C86 110 90 115 87 122"].map((d, i) => (
        <DoodlePath key={i} {...s} strokeWidth={2} duration={0.4} delay={1.1 + i * 0.08} d={d} />
      ))}
    </DoodleFrame>
  );
}
