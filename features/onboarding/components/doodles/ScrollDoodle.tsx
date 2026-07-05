"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Investor · Thesis — a sketched folded document. */
export function ScrollDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of a document">
      <DoodlePath {...s} duration={1.1} delay={0} d="M52 44 L96 44 L112 60 L112 116 L52 116 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.4} delay={0.9} d="M96 44 L96 60 L112 60" />
      {["M62 74 L100 74", "M62 84 L100 84", "M62 94 L92 94", "M62 104 L84 104"].map((d, i) => (
        <DoodlePath key={i} {...s} strokeWidth={2.2} duration={0.35} delay={1.3 + i * 0.1} d={d} />
      ))}
    </DoodleFrame>
  );
}
