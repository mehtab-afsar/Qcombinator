"use client";

import { bg, surf, bdr, ink, muted, blue, green, amber } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";
import { PARAMETER_DEFINITIONS } from "../scoring/parameters";
import { INDICATOR_DEFINITIONS } from "../scoring/indicators";
import { EmailCaptureCta } from "@/features/shared/components/EmailCaptureCta";
import type { QScoreLiteApiResult } from "./QScoreLitePage";
import type { IndicatorResult, ParameterId } from "../scoring/types";

const LOW_CONFIDENCE_THRESHOLD = 25;

function ScoreBadge({ qslScore, confidencePct }: { qslScore: number; confidencePct: number }) {
  return (
    <div style={{ background: ink, color: bg, borderRadius: 20, padding: "40px 32px", marginBottom: 40, textAlign: "center" }}>
      <span style={{ fontFamily: font.family.serif, fontSize: 56, fontWeight: 700 }}>{qslScore}</span>
      <span style={{ fontFamily: font.family.mono, fontSize: 16, opacity: 0.6 }}> / 100</span>
      <p style={{ fontFamily: font.family.mono, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: green, margin: "10px 0 0" }}>
        Q-Score Lite
      </p>
      <p style={{ fontSize: 13.5, opacity: 0.75, margin: "14px 0 0" }}>
        {confidencePct}% evidence confidence — {confidencePct < LOW_CONFIDENCE_THRESHOLD
          ? "we found very little public evidence for this company."
          : "based on public evidence found across web search, GitHub, and patent sources."}
      </p>
    </div>
  );
}

function ParameterBars({ result }: { result: QScoreLiteApiResult }) {
  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: "28px 26px", marginBottom: 40 }}>
      <p style={{ fontFamily: font.family.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: muted, margin: "0 0 18px" }}>
        Parameter breakdown
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {result.parameters.map((p) => (
          <div key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: ink, fontWeight: 600 }}>{p.label}</span>
              <span style={{ fontFamily: font.family.mono, fontSize: 12.5, color: muted }}>
                {p.score === null ? "no evidence" : Math.round(p.score)}
                {p.activeCount < p.totalCount && (
                  <span style={{ color: amber }}> · {p.activeCount}/{p.totalCount} found</span>
                )}
              </span>
            </div>
            <div style={{ height: 6, background: bg, borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${p.score ?? 0}%`,
                background: `linear-gradient(90deg, ${blue}, ${green})`, borderRadius: 3,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndicatorRow({ indicator }: { indicator: IndicatorResult }) {
  const found = indicator.rawScore !== null;
  const label = INDICATOR_DEFINITIONS.find((d) => d.id === indicator.id)?.label ?? indicator.id;
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${bdr}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 13.5, color: ink, fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: font.family.mono, fontSize: 12, color: found ? green : muted, flexShrink: 0 }}>
          {found ? `${indicator.rawScore}/5` : "not found"}
        </span>
      </div>
      {found && (
        <>
          <p style={{ fontSize: 12.5, color: muted, margin: "4px 0 0", lineHeight: 1.5 }}>{indicator.reasoning}</p>
          {indicator.citedUrls.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {indicator.citedUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11.5, color: blue, textDecoration: "none" }}>
                  {safeHostname(url)} ↗
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// The API response's IndicatorResult doesn't carry parameterId directly (that's a property of
// the static definition, not the per-lookup result) — look it up from INDICATOR_DEFINITIONS to
// group the flat 20-entry list back under its parameter heading.
function parameterIdFor(indicatorId: IndicatorResult["id"]): ParameterId | undefined {
  return INDICATOR_DEFINITIONS.find((d) => d.id === indicatorId)?.parameterId;
}

function IndicatorDetail({ result }: { result: QScoreLiteApiResult }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {PARAMETER_DEFINITIONS.map((param) => {
        const indicators = result.indicators.filter((i) => parameterIdFor(i.id) === param.id);
        if (indicators.length === 0) return null;
        return (
          <div key={param.id} style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: font.family.mono, fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: blue, margin: "0 0 6px" }}>
              {param.label}
            </p>
            {indicators.map((i) => <IndicatorRow key={i.id} indicator={i} />)}
          </div>
        );
      })}
    </div>
  );
}

export function ResultsView({ result }: { result: QScoreLiteApiResult }) {
  const isLowConfidence = result.confidencePct < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 24px 80px" }}>
      <p style={{ fontFamily: font.family.mono, fontSize: 12, color: muted, marginBottom: 24 }}>{result.companyName} — {result.domain}</p>

      <ScoreBadge qslScore={result.qslScore} confidencePct={result.confidencePct} />

      {isLowConfidence && (
        <div style={{ background: `${amber}15`, border: `1px solid ${amber}`, borderRadius: 12, padding: "16px 18px", marginBottom: 40 }}>
          <p style={{ fontSize: 13.5, color: ink, margin: 0, lineHeight: 1.5 }}>
            We couldn&apos;t verify much public evidence for this company — the score above reflects a
            thin evidence base, not necessarily a weak company. A quiet public footprint isn&apos;t the
            same as a weak one.
          </p>
        </div>
      )}

      <ParameterBars result={result} />
      <IndicatorDetail result={result} />

      <EmailCaptureCta
        submissionId={result.id}
        linkEndpoint="/api/qscore-lite/link-email"
        redirectIdParam="qScoreLiteId"
        eyebrow="Fundable is measurable."
        heading="See your full, verified Q-Score"
      />
    </div>
  );
}
