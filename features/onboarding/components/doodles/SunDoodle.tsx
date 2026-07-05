"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Founder · Account — a sketched sun (new beginning / welcome). */
export function SunDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of the sun">
      <DoodlePath {...s} duration={1} delay={0.4}
        d="M58 78 C58 63 68 54 80 55 C93 56 101 66 100 79 C99 92 89 101 77 100 C65 99 57 90 58 78 Z" />
      {[
        "M80 46 C79 42 81 38 80 34",
        "M96 52 C99 49 101 46 104 43",
        "M104 78 C108 77 112 78 116 78",
        "M96 104 C99 107 101 110 104 113",
        "M80 110 C79 114 81 118 80 122",
        "M64 104 C61 107 59 110 56 113",
        "M56 78 C52 77 48 78 44 78",
        "M64 52 C61 49 59 46 56 43",
      ].map((d, i) => (
        <DoodlePath key={i} {...s} strokeWidth={2.2} duration={0.4} delay={0.05 * i} d={d} />
      ))}
    </DoodleFrame>
  );
}
