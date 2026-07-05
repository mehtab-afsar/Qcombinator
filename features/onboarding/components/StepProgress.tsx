"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { O, FONT_MONO, EASE } from "../theme";

export function StepProgress({
  step, total, names, accent,
}: {
  step: number; total: number; names: string[]; accent: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: O.muted }}>
          Step {step} of {total}
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: accent, fontWeight: 600 }}>{names[step - 1]}</span>
      </div>
      <div style={{ height: 3, background: O.bdr, borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
        <motion.div
          animate={{ width: `${(step / total) * 100}%` }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ height: "100%", background: accent, borderRadius: 99 }}
        />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {names.map((name, i) => {
          const s = i + 1;
          const done = s < step;
          const active = s === step;
          return (
            <div
              key={name}
              title={name}
              style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? accent : active ? O.alpha(accent, 0.14) : O.card,
                border: `1.5px solid ${done || active ? accent : O.bdr}`,
                transition: "all 0.2s",
              }}
            >
              {done ? <Check size={11} color="#fff" strokeWidth={3} /> : (
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? accent : O.muted }}>{s}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
