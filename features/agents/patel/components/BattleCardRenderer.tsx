'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

export function BattleCardRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    competitor?: string;
    overview?: string;
    positioningMatrix?: { dimension: string; us: string; them: string; verdict: string }[];
    objectionHandling?: { objection: string; response: string; proofPoint: string }[];
    strengths?: string[];
    weaknesses?: string[];
    winStrategy?: string;
    sources?: { title: string; url: string }[];
  };

  const verdictColor: Record<string, string> = { advantage: green, parity: amber, disadvantage: red };
  const verdictLabel: Record<string, string> = { advantage: "Win", parity: "Tie", disadvantage: "Lose" };

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  return (
    <div className="flex flex-col gap-3">
      {d.overview && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.overview}</p>
        </CardContent></Card>
      )}

      {/* Positioning Matrix */}
      {d.positioningMatrix && d.positioningMatrix.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Positioning Matrix</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 60px", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {["Dimension", "Us", "Them", ""].map(h => (
              <div key={h} style={{ background: surf, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
            {d.positioningMatrix.map((row, i) => (
              <>
                <div key={`d${i}`} style={{ background: bg, padding: "10px", fontSize: 12, fontWeight: 600, color: ink }}>{row.dimension}</div>
                <div key={`u${i}`} style={{ background: bg, padding: "10px", fontSize: 11, color: ink, lineHeight: 1.4 }}>{row.us}</div>
                <div key={`t${i}`} style={{ background: bg, padding: "10px", fontSize: 11, color: muted, lineHeight: 1.4 }}>{row.them}</div>
                <div key={`v${i}`} style={{ background: bg, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Badge variant="outline" style={{ fontSize: 9, color: verdictColor[row.verdict] || muted, borderColor: verdictColor[row.verdict] || muted }}>
                    {verdictLabel[row.verdict] || row.verdict}
                  </Badge>
                </div>
              </>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Objection Handling */}
      {d.objectionHandling && d.objectionHandling.length > 0 && (
        <div>
          <p style={sectionHead}>Objection Handling</p>
          <Accordion type="multiple" className="flex flex-col gap-1">
            {d.objectionHandling.map((obj, i) => (
              <AccordionItem key={i} value={`obj-${i}`} className="border rounded-xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, textAlign: "left" }}>&quot;{obj.objection}&quot;</p>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 6 }}>{obj.response}</p>
                  <p style={{ fontSize: 11, color: muted }}>📊 {obj.proofPoint}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Strengths / Weaknesses */}
      {(d.strengths?.length || d.weaknesses?.length) ? (
        <div className="grid grid-cols-2 gap-3">
          {d.strengths && d.strengths.length > 0 && (
            <Card><CardContent className="pt-4 pb-4">
              <p style={{ ...sectionHead, color: amber }}>Their Strengths</p>
              {d.strengths.map((s, i) => <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 4 }}>• {s}</p>)}
            </CardContent></Card>
          )}
          {d.weaknesses && d.weaknesses.length > 0 && (
            <Card><CardContent className="pt-4 pb-4">
              <p style={{ ...sectionHead, color: green }}>Their Weaknesses</p>
              {d.weaknesses.map((w, i) => <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 4 }}>• {w}</p>)}
            </CardContent></Card>
          )}
        </div>
      ) : null}

      {/* Win Strategy */}
      {d.winStrategy && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Win Strategy</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.winStrategy}</p>
        </CardContent></Card>
      )}

      {/* Sources */}
      {d.sources && d.sources.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Sources</p>
          {d.sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", fontSize: 11, color: blue, textDecoration: "none", marginBottom: 4, lineHeight: 1.4 }}>
              {s.title || s.url} ↗
            </a>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}
