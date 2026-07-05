"use client";

import { O } from "../../theme";

export function SelectCard({
  label, sub, active, onClick, accent = O.ink,
}: {
  label: string; sub?: string; active: boolean; onClick: () => void; accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 17px", width: "100%",
        border: `1.5px solid ${active ? accent : O.bdr}`,
        borderRadius: 12, cursor: "pointer", textAlign: "left",
        background: active ? O.alpha(accent, 0.06) : O.card,
        boxShadow: active ? `0 0 0 3px ${O.alpha(accent, 0.1)}` : "none",
        transition: "all 0.14s",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: O.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: O.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{
        width: 19, height: 19, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${active ? accent : O.bdr}`,
        background: active ? accent : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.14s",
      }}>
        {active && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
      </div>
    </button>
  );
}

export function Chip({ label, selected, onClick, accent = O.ink }: { label: string; selected: boolean; onClick: () => void; accent?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 999, cursor: "pointer",
        border: `1.5px solid ${selected ? accent : O.bdr}`,
        background: selected ? O.alpha(accent, 0.08) : O.card,
        color: selected ? O.ink : "#4A4640",
        fontSize: 13.5, fontWeight: selected ? 600 : 400,
        transition: "all 0.14s",
        boxShadow: selected ? `0 0 0 3px ${O.alpha(accent, 0.08)}` : "none",
      }}
    >
      {label}
    </button>
  );
}
