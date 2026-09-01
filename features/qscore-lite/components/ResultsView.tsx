"use client";

import { bg, surf, bdr, ink, muted, blue, green, amber, purple, cyan } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";
import { PARAMETER_DEFINITIONS } from "../scoring/parameters";
import { INDICATOR_DEFINITIONS } from "../scoring/indicators";
import { EmailCaptureCta } from "@/features/shared/components/EmailCaptureCta";
import { ParameterCard } from "./ParameterCard";
import type { QScoreLiteApiResult } from "./QScoreLitePage";
import type { IndicatorResult, ParameterId } from "../scoring/types";

const LOW_CONFIDENCE_THRESHOLD = 25;
const MIN_ACTIVE_FOR_HIGHLIGHTS = 3;

// One accent per parameter, in PARAMETER_DEFINITIONS order — deliberately a different 5-color
// set from the real Q-Score's own P1–P6 palette (features/landing/copy.ts), so nothing implies
// these are the same taxonomy.
const PARAMETER_ACCENTS: Record<ParameterId, string> = {
  founder_team: blue,
  market_attractiveness: green,
  product_technical_depth: purple,
  commercial_momentum: amber,
  company_readiness: cyan,
};

function labelFor(id: IndicatorResult["id"]): string {
  return INDICATOR_DEFINITIONS.find((d) => d.id === id)?.label ?? id;
}

function parameterIdFor(id: IndicatorResult["id"]): ParameterId | undefined {
  return INDICATOR_DEFINITIONS.find((d) => d.id === id)?.parameterId;
}

function ScoreHero({ qslScore, confidencePct }: { qslScore: number; confidencePct: number }) {
  return (
    <div style={{ background: ink, color: bg, borderRadius: 20, padding: "40px 32px", marginBottom: 24, textAlign: "center" }}>
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

function HighlightCard({ eyebrow, color, label, note }: { eyebrow: string; color: string; label: string; note: string }) {
  return (
    <div style={{ flex: "1 1 220px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: "18px 20px" }}>
      <p style={{ fontFamily: font.family.mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color, margin: "0 0 8px" }}>
        {eyebrow}
      </p>
      <p style={{ fontSize: 14.5, fontWeight: 650, color: ink, margin: "0 0 5px" }}>{label}</p>
      <p style={{ fontSize: 12.5, color: muted, lineHeight: 1.5, margin: 0 }}>{note}</p>
    </div>
  );
}

/** The immediate narrative read — strongest finding and biggest confirmed gap — before the
 *  visitor has to work through all 20 indicators themselves. Purely a client-side reduction over
 *  already-fetched data, no new fetch. Falls back to a plain "still building the picture" note
 *  when there's too little active evidence to responsibly call anything a highlight. */
function HighlightStrip({ indicators }: { indicators: IndicatorResult[] }) {
  const active = indicators.filter((i) => i.rawScore !== null);
  if (active.length < MIN_ACTIVE_FOR_HIGHLIGHTS) {
    return (
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: "18px 20px", marginBottom: 32 }}>
        <p style={{ fontSize: 13.5, color: muted, margin: 0, lineHeight: 1.5 }}>
          Only {active.length} of 20 indicators had enough public evidence to score — too thin a sample
          to call out a strongest or weakest area yet.
        </p>
      </div>
    );
  }

  const strongest = active.reduce((best, i) => (i.rawScore! > best.rawScore! ? i : best));
  const weakest = active.reduce((worst, i) => (i.rawScore! < worst.rawScore! ? i : worst));

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
      <HighlightCard eyebrow="Strongest finding" color={green} label={labelFor(strongest.id)} note={strongest.reasoning ?? ""} />
      <HighlightCard eyebrow="Biggest gap" color={amber} label={labelFor(weakest.id)} note={weakest.reasoning ?? ""} />
    </div>
  );
}

export function ResultsView({ result }: { result: QScoreLiteApiResult }) {
  const isLowConfidence = result.confidencePct < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px" }}>
      <p style={{ fontFamily: font.family.mono, fontSize: 12, color: muted, marginBottom: 24 }}>{result.companyName} — {result.domain}</p>

      <ScoreHero qslScore={result.qslScore} confidencePct={result.confidencePct} />

      {isLowConfidence && (
        <div style={{ background: `${amber}15`, border: `1px solid ${amber}`, borderRadius: 12, padding: "16px 18px", marginBottom: 32 }}>
          <p style={{ fontSize: 13.5, color: ink, margin: 0, lineHeight: 1.5 }}>
            We couldn&apos;t verify much public evidence for this company — the score above reflects a
            thin evidence base, not necessarily a weak company. A quiet public footprint isn&apos;t the
            same as a weak one.
          </p>
        </div>
      )}

      <HighlightStrip indicators={result.indicators} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 8 }}>
        {PARAMETER_DEFINITIONS.map((param) => {
          const parameter = result.parameters.find((p) => p.id === param.id);
          const indicators = result.indicators.filter((i) => parameterIdFor(i.id) === param.id);
          if (!parameter) return null;
          return (
            <ParameterCard
              key={param.id}
              parameter={parameter}
              indicators={indicators}
              accentColor={PARAMETER_ACCENTS[param.id]}
            />
          );
        })}
      </div>

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
