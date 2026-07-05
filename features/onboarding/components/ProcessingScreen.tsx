"use client";

import { Check, Loader2 } from "lucide-react";
import { O, FONT_SERIF } from "../theme";

export function ProcessingScreen({
  step, messages, title, subtitle, accent, doodle,
}: {
  step: number;
  messages: string[];
  title: string;
  subtitle: string;
  accent: string;
  doodle?: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: O.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 24 }}>
      {doodle && <div style={{ width: 100, height: 100 }}>{doodle}</div>}
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 480, letterSpacing: "-0.02em", color: O.ink, margin: "0 0 8px" }}>{title}</h2>
        <p style={{ fontSize: 14, color: O.muted, margin: 0 }}>{subtitle}</p>
      </div>
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((msg, i) => {
          const done = i + 1 < step;
          const active = i + 1 === step;
          return (
            <div key={msg} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: O.card, border: `1px solid ${done ? O.bdr : O.surf}`, transition: "all 0.3s" }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? accent : active ? O.alpha(accent, 0.1) : O.surf,
                border: `1.5px solid ${done || active ? accent : O.bdr}`, transition: "all 0.3s",
              }}>
                {done ? <Check size={12} color="#fff" strokeWidth={3} /> : active ? (
                  <Loader2 size={12} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <span style={{ fontSize: 10, color: O.muted }}>{i + 1}</span>
                )}
              </div>
              <span style={{ fontSize: 14, color: done || active ? O.ink : O.muted, fontWeight: done || active ? 500 : 400, transition: "color 0.3s" }}>{msg}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
