"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ink, muted } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";
import { useMotionPrefs } from "@/features/shared/hooks/useMotionPrefs";

// Purely cosmetic staging — the actual work is one await in QScoreLitePage; this just keeps a
// 5-15s real wait from feeling broken, same idea as the onboarding page's loading screen.
const STAGES = [
  "Searching public sources…",
  "Checking GitHub, patents & press…",
  "Weighing evidence…",
  "Scoring…",
];
const STAGE_DURATION_MS = 2800;

export function LoadingState() {
  const reduced = useMotionPrefs();
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, STAGE_DURATION_MS);
    return () => clearInterval(interval);
  }, [reduced]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
      <Loader2 size={28} color={ink} className={reduced ? undefined : "ql-loading-spin"} />
      <p style={{ fontFamily: font.family.mono, fontSize: 13.5, color: muted }}>{STAGES[stageIndex]}</p>
      <style>{`
        .ql-loading-spin { animation: ql-loading-spin-kf 1s linear infinite; }
        @keyframes ql-loading-spin-kf { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
