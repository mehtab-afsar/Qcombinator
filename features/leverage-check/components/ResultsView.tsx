"use client";

import { bg, surf, bdr, ink, muted, blue, green } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";
import { DIMENSION_ORDER, DIMENSION_LABELS } from "../scoring/questions";
import { EmailCaptureCta } from "@/features/shared/components/EmailCaptureCta";
import type { LeverageCheckApiResult } from "./LeverageCheckPage";

/**
 * The short result / full report are free-form text from the LLM (or the local fallback
 * template), not structured markdown — the system prompt's own format uses short, all-caps
 * lines as section headers (e.g. "YOUR DIAGNOSIS"). Render each non-empty line as a paragraph,
 * styling the ones that read as a header (short, fully uppercase) as a heading instead of prose.
 */
function ReportText({ text, dark = false }: { text: string; dark?: boolean }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const headingColor = dark ? green : blue;
  const bodyColor = dark ? bg : ink;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {lines.map((line, i) => {
        const isHeading = line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line);
        return isHeading ? (
          <p key={i} style={{
            fontFamily: font.family.mono, fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase",
            color: headingColor, margin: i === 0 ? "0" : "18px 0 0", fontWeight: 700,
          }}>
            {line}
          </p>
        ) : (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.7, color: bodyColor, margin: 0 }}>{line}</p>
        );
      })}
    </div>
  );
}

/**
 * The short result's own text opens with "YOUR FOUNDER LEVERAGE / [multiple]x / [ARCHETYPE]"
 * per the system prompt's format — but the card above already renders that as a dedicated
 * badge (the big serif multiple + archetype label), so showing it again as plain text reads as
 * a duplicated, badly-styled repeat of the same three lines. Strip that leading block once it's
 * been visually covered, and start the prose from the founder's personalised sentence.
 */
function stripLeverageHeader(text: string, multiple: number, archetype: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const multiplePattern = new RegExp(`^${multiple}x$`, "i");
  while (lines.length > 0) {
    const line = lines[0];
    const isHeaderLine =
      /^YOUR FOUNDER LEVERAGE$/i.test(line) ||
      multiplePattern.test(line) ||
      line.toUpperCase() === archetype.toUpperCase();
    if (!isHeaderLine) break;
    lines.shift();
  }
  return lines.join("\n");
}

function DimensionBars({ scores }: { scores: LeverageCheckApiResult["dimensionScores"] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {DIMENSION_ORDER.map((dim) => (
        <div key={dim}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 13, color: ink, fontWeight: 600 }}>{DIMENSION_LABELS[dim]}</span>
            <span style={{ fontFamily: font.family.mono, fontSize: 12.5, color: muted }}>{scores[dim]}</span>
          </div>
          <div style={{ height: 6, background: surf, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${scores[dim]}%`,
              background: `linear-gradient(90deg, ${blue}, ${green})`, borderRadius: 3,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResultsView({ result }: { result: LeverageCheckApiResult }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 24px 80px" }}>
      {/* Short result — the immediate teaser */}
      <div style={{ background: ink, color: bg, borderRadius: 20, padding: "40px 32px", marginBottom: 48, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: font.family.serif, fontSize: 56, fontWeight: 700 }}>{result.multiple}×</span>
        </div>
        <p style={{ fontFamily: font.family.mono, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: green, margin: "0 0 24px" }}>
          {result.archetype}
        </p>
        <div style={{ textAlign: "left" }}>
          <ReportText text={stripLeverageHeader(result.shortResult, result.multiple, result.archetype)} dark />
        </div>
      </div>

      {/* Dimension breakdown */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: "28px 26px", marginBottom: 48 }}>
        <p style={{ fontFamily: font.family.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: muted, margin: "0 0 18px" }}>
          Your leverage profile
        </p>
        <DimensionBars scores={result.dimensionScores} />
      </div>

      {/* Full report */}
      <div style={{ marginBottom: 8 }}>
        <ReportText text={result.fullReport} />
      </div>

      <EmailCaptureCta
        submissionId={result.id}
        linkEndpoint="/api/leverage-check/link-email"
        redirectIdParam="leverageCheckId"
        eyebrow="Founder in Command. Agents in Execution."
        heading="Build my 10× Operating Model"
      />
    </div>
  );
}
