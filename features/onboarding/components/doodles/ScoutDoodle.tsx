"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Investor · Intro/Account — a sketched magnifying glass (scouting deal flow). */
export function ScoutDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of a magnifying glass">
      {/* lens — drawn as a doubled, slightly offset outline for a hand-retraced sketch feel */}
      <DoodlePath {...s} strokeWidth={2.8} duration={1.1} delay={0}
        d="M42 66 C42 45 59 28 80 28 C101 28 118 45 118 66 C118 87 101 104 80 104 C59 104 42 87 42 66 Z" />
      <DoodlePath {...s} strokeWidth={1.6} duration={1.1} delay={0.15}
        d="M47 68 C47 49 62 34 81 34 C100 34 115 49 115 68 C115 87 100 99 81 99 C62 99 47 87 47 68 Z" />
      {/* glint — light catching the glass */}
      <DoodlePath {...s} strokeWidth={2.2} duration={0.4} delay={1}
        d="M58 46 C61 41 66 37 71 35" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.3} delay={1.15}
        d="M53 56 C54 53 56 50 58 48" />
      {/* handle */}
      <DoodlePath {...s} strokeWidth={4} duration={0.55} delay={1.3}
        d="M104 92 C112 100 122 111 132 124" />
    </DoodleFrame>
  );
}
