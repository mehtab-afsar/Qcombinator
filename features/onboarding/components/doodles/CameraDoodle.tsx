"use client";
import { DoodleFrame, DoodlePath } from "./Doodle";

/** Investor · Photo — a sketched camera. */
export function CameraDoodle({ color = "#18160F" }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2.6 } as const;
  return (
    <DoodleFrame label="A hand-drawn sketch of a camera">
      <DoodlePath {...s} duration={1.1} delay={0}
        d="M42 62 C42 58 45 55 49 55 L66 55 L70 47 L94 47 L98 55 L115 55 C119 55 122 58 122 62 L122 100 C122 104 119 107 115 107 L49 107 C45 107 42 104 42 100 Z" />
      <DoodlePath {...s} strokeWidth={2.3} duration={0.7} delay={0.9}
        d="M68 78 C68 70 74 64 82 64 C90 64 96 70 96 78 C96 86 90 92 82 92 C74 92 68 86 68 78 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.4} delay={1.5}
        d="M75 78 C75 74 78 71 82 71 C86 71 89 74 89 78 C89 82 86 85 82 85 C78 85 75 82 75 78 Z" />
      <DoodlePath {...s} strokeWidth={2.2} duration={0.35} delay={1.8} d="M52 58 L60 58 L60 52 L52 52 Z" />
    </DoodleFrame>
  );
}
