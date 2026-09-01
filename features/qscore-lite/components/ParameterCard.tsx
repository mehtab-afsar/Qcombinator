"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { bg, surf, bdr, ink, muted, green, amber, red } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";
import { useMotionPrefs } from "@/features/shared/hooks/useMotionPrefs";
import type { IndicatorResult, ParameterScore } from "../scoring/types";
import { INDICATOR_DEFINITIONS } from "../scoring/indicators";

function scoreChipColor(rawScore: number | null): string {
  if (rawScore === null) return muted;
  if (rawScore >= 4) return green;
  if (rawScore >= 2) return amber;
  return red;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function IndicatorRow({ indicator }: { indicator: IndicatorResult }) {
  const found = indicator.rawScore !== null;
  const label = INDICATOR_DEFINITIONS.find((d) => d.id === indicator.id)?.label ?? indicator.id;
  return (
    <div style={{ padding: "14px 0", borderTop: `1px solid ${bdr}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: found ? 6 : 0 }}>
        <span style={{ fontSize: 13.5, color: ink, fontWeight: 600 }}>{label}</span>
        <span style={{
          fontFamily: font.family.mono, fontSize: 11, fontWeight: 700, flexShrink: 0,
          color: found ? bg : muted, background: found ? scoreChipColor(indicator.rawScore) : surf,
          padding: "2px 8px", borderRadius: 999,
        }}>
          {found ? `${indicator.rawScore}/5` : "not found"}
        </span>
      </div>
      {found && (
        <>
          <p style={{ fontSize: 12.5, color: muted, margin: "0 0 8px", lineHeight: 1.55 }}>{indicator.reasoning}</p>
          {indicator.citedUrls.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {indicator.citedUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 11, color: ink, textDecoration: "none",
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 999,
                  padding: "3px 10px",
                }}>
                  {safeHostname(url)}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ParameterCard({
  parameter, indicators, accentColor,
}: { parameter: ParameterScore; indicators: IndicatorResult[]; accentColor: string }) {
  const [open, setOpen] = useState(false);
  const reduced = useMotionPrefs();

  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "18px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: accentColor, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: ink, fontWeight: 600 }}>{parameter.label}</span>
          </div>
          <div style={{ height: 5, background: surf, borderRadius: 3, overflow: "hidden", width: 140, maxWidth: "40vw" }}>
            <div style={{ height: "100%", width: `${parameter.score ?? 0}%`, background: accentColor, borderRadius: 3 }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: font.family.serif, fontSize: 22, fontWeight: 700, color: ink }}>
              {parameter.score === null ? "—" : Math.round(parameter.score)}
            </span>
            <span style={{ display: "block", fontFamily: font.family.mono, fontSize: 10, color: muted }}>
              {parameter.activeCount}/{parameter.totalCount} found
            </span>
          </div>
          <ChevronDown
            size={16} color={muted}
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: reduced ? "none" : "transform 0.2s ease",
            }}
          />
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 20px 18px" }}>
          {indicators.map((i) => <IndicatorRow key={i.id} indicator={i} />)}
        </div>
      )}
    </div>
  );
}
