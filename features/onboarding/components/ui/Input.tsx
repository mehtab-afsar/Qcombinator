"use client";

import { O, FONT_MONO } from "../../theme";

export function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: O.ink, marginBottom: 7 }}>
      {children}
      {optional && <span style={{ fontWeight: 400, color: O.muted, marginLeft: 5 }}>(optional)</span>}
    </label>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 600, color: O.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 11px" }}>
      {children}
    </p>
  );
}

export function Hint({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 9, padding: "9px 13px", borderRadius: 9, background: O.surf, border: `1px solid ${O.bdr}` }}>
      <span style={{ fontSize: 12, color: O.muted, lineHeight: 1.55 }}>
        <strong style={{ color: O.ink, fontWeight: 600 }}>Example:</strong> {text}
      </span>
    </div>
  );
}

export function Input({
  value, onChange, type = "text", placeholder, autoFocus, maxLength, right, accent = O.ink,
}: {
  value: string; onChange: (v: string) => void; type?: string;
  placeholder?: string; autoFocus?: boolean; maxLength?: number; right?: React.ReactNode; accent?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: "100%", height: 44, padding: right ? "0 44px 0 15px" : "0 15px",
          border: `1.5px solid ${O.bdr}`, borderRadius: 10,
          fontSize: 14.5, color: O.ink, outline: "none", background: O.card,
          boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${O.alpha(accent, 0.12)}`; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = O.bdr; e.currentTarget.style.boxShadow = "none"; }}
      />
      {right && <div style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)" }}>{right}</div>}
    </div>
  );
}

export function TextArea({
  value, onChange, placeholder, rows = 4, maxLength, accent = O.ink,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; maxLength?: number; accent?: string;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%", padding: "11px 15px",
          border: `1.5px solid ${O.bdr}`, borderRadius: 10,
          fontSize: 14.5, color: O.ink, outline: "none", background: O.card,
          boxSizing: "border-box", resize: "vertical", lineHeight: 1.6,
          transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "inherit",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${O.alpha(accent, 0.12)}`; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = O.bdr; e.currentTarget.style.boxShadow = "none"; }}
      />
      {maxLength && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 5 }}>
          <span style={{ fontSize: 11, color: value.length > maxLength * 0.8 ? O.amber : O.muted }}>{value.length}/{maxLength}</span>
        </div>
      )}
    </div>
  );
}

export function SelectEl({
  value, onChange, placeholder, children, accent = O.ink,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", height: 44, padding: "0 15px",
        border: `1.5px solid ${O.bdr}`, borderRadius: 10,
        fontSize: 14.5, color: value ? O.ink : O.muted, background: O.card,
        outline: "none", boxSizing: "border-box", cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${O.alpha(accent, 0.12)}`; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = O.bdr; e.currentTarget.style.boxShadow = "none"; }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}
