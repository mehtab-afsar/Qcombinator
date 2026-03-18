'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { bg, bdr, ink, muted, green, amber, red } from '../../shared/constants/colors'

export function ICPRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    summary?: string;
    buyerPersona?: { title?: string; role?: string; seniority?: string; dayInLife?: string; goals?: string[]; frustrations?: string[] };
    firmographics?: { companySize?: string; industry?: string[]; revenue?: string; geography?: string[]; techStack?: string[] };
    painPoints?: { pain: string; severity: string; currentSolution: string }[];
    buyingTriggers?: string[];
    channels?: { channel: string; priority: string; rationale: string }[];
    qualificationCriteria?: string[];
  };

  // Lead enrichment state
  type Lead = { name: string; email: string; title: string | null; confidence: number; linkedin: string | null };
  const [showEnrich, setShowEnrich]         = useState(false);
  const [enrichDomain, setEnrichDomain]     = useState("");
  const [enrichKey, setEnrichKey]           = useState("");
  const [enriching, setEnriching]           = useState(false);
  const [enrichLeads, setEnrichLeads]       = useState<Lead[] | null>(null);
  const [enrichOrg, setEnrichOrg]           = useState("");
  const [enrichError, setEnrichError]       = useState<string | null>(null);
  const [copiedLeads, setCopiedLeads]       = useState(false);
  const [addedToSeq,  setAddedToSeq]        = useState(false);

  async function handleEnrich() {
    if (!enrichDomain.trim() || enriching) return;
    setEnriching(true); setEnrichError(null); setEnrichLeads(null);
    try {
      const res = await fetch('/api/agents/patel/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: enrichDomain.trim(), hunterApiKey: enrichKey.trim() || undefined }),
      });
      const r = await res.json();
      if (res.ok) { setEnrichLeads(r.leads); setEnrichOrg(r.organization ?? enrichDomain); }
      else setEnrichError(r.error ?? 'Enrichment failed');
    } catch { setEnrichError('Network error'); }
    finally { setEnriching(false); }
  }

  function copyLeadsAsCSV() {
    if (!enrichLeads?.length) return;
    const csv = ['name,email,company,title', ...enrichLeads.map(l => `${l.name},${l.email},${enrichOrg},${l.title ?? ''}`)]
      .join('\n');
    navigator.clipboard.writeText(csv).catch(() => {});
    setCopiedLeads(true);
    setTimeout(() => setCopiedLeads(false), 2000);
  }

  const sevColor: Record<string, string> = { high: red, medium: amber, low: green };

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* Buyer Persona */}
      {d.buyerPersona && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Buyer Persona</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { l: "Title", v: d.buyerPersona.title },
              { l: "Role", v: d.buyerPersona.role },
              { l: "Seniority", v: d.buyerPersona.seniority },
            ].filter(x => x.v).map(({ l, v }) => (
              <div key={l}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</p>
                <p style={{ fontSize: 13, color: ink }}>{v}</p>
              </div>
            ))}
          </div>
          {d.buyerPersona.dayInLife && (
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{d.buyerPersona.dayInLife}</p>
          )}
          {d.buyerPersona.goals && d.buyerPersona.goals.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: green, marginBottom: 4 }}>Goals</p>
              {d.buyerPersona.goals.map((g, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>• {g}</p>
              ))}
            </div>
          )}
          {d.buyerPersona.frustrations && d.buyerPersona.frustrations.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: red, marginBottom: 4 }}>Frustrations</p>
              {d.buyerPersona.frustrations.map((f, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>• {f}</p>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Firmographics */}
      {d.firmographics && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Firmographics</p>
          {d.firmographics.companySize && <p style={{ fontSize: 12, color: ink, marginBottom: 4 }}>Size: {d.firmographics.companySize}</p>}
          {d.firmographics.revenue && <p style={{ fontSize: 12, color: ink, marginBottom: 4 }}>Revenue: {d.firmographics.revenue}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(d.firmographics.industry || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
            {(d.firmographics.geography || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
            {(d.firmographics.techStack || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
          </div>
        </CardContent></Card>
      )}

      {/* Pain Points */}
      {d.painPoints && d.painPoints.length > 0 && (
        <div>
          <p style={sectionHead}>Pain Points</p>
          <Accordion type="multiple" className="flex flex-col gap-1">
            {d.painPoints.map((pp, i) => (
              <AccordionItem key={i} value={`pp-${i}`} className="border rounded-xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{pp.pain}</span>
                    <Badge variant="outline" style={{ color: sevColor[pp.severity] || muted, borderColor: sevColor[pp.severity] || muted, marginLeft: "auto" }}>
                      {pp.severity}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <p style={{ fontSize: 11, color: muted }}>Current solution: {pp.currentSolution}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Buying Triggers */}
      {d.buyingTriggers && d.buyingTriggers.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Buying Triggers</p>
          <div className="flex flex-col gap-1.5">
            {d.buyingTriggers.map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ fontSize: 11, color: muted, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{t}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Channels */}
      {d.channels && d.channels.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Recommended Channels</p>
          <div className="flex flex-col gap-3">
            {d.channels.map((ch, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{ch.channel}</span>
                  <Badge variant={ch.priority === "primary" ? "default" : "secondary"}>{ch.priority}</Badge>
                </div>
                <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{ch.rationale}</p>
                {i < d.channels!.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Qualification */}
      {d.qualificationCriteria && d.qualificationCriteria.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Qualification Criteria</p>
          <div className="flex flex-col gap-1">
            {d.qualificationCriteria.map((q, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>✓ {q}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Hunter.io Lead Enrichment */}
      <Card><CardContent className="pt-4 pb-4">
        <div className="flex justify-between items-start" style={{ marginBottom: showEnrich || enrichLeads ? 14 : 0 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Suggested Leads (Hunter.io)</p>
            <p style={{ fontSize: 11, color: muted }}>Enter a company domain — Patel finds decision-maker emails matching your ICP.</p>
          </div>
          <button onClick={() => { setShowEnrich(p => !p); setEnrichLeads(null); setEnrichError(null); }} style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: ink, color: bg, fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {showEnrich ? "Close" : "Find Leads"}
          </button>
        </div>

        {showEnrich && !enrichLeads && (
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2">
              <input
                value={enrichDomain}
                onChange={e => setEnrichDomain(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEnrich(); }}
                placeholder="acme.com"
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, outline: "none" }}
              />
              <button onClick={handleEnrich} disabled={!enrichDomain.trim() || enriching} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                {enriching ? "Searching…" : "Search"}
              </button>
            </div>
            <div>
              <p style={{ fontSize: 10, color: muted, marginBottom: 4 }}>Hunter API Key (optional — uses shared key if blank)</p>
              <input value={enrichKey} onChange={e => setEnrichKey(e.target.value)} placeholder="Leave blank to use Edge Alpha's key (25 searches/mo)" style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, outline: "none", boxSizing: "border-box" }} />
            </div>
            {enrichError && <p style={{ fontSize: 12, color: red }}>{enrichError}</p>}
          </div>
        )}

        {enrichLeads && (
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{enrichLeads.length} leads at {enrichOrg}</p>
              <div className="flex gap-2">
                <button onClick={copyLeadsAsCSV} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: bg, fontSize: 11, fontWeight: 600, color: copiedLeads ? green : ink, cursor: "pointer" }}>
                  {copiedLeads ? "✓ Copied" : "Copy as CSV"}
                </button>
                <button
                  onClick={() => {
                    if (!enrichLeads?.length) return;
                    const csv = ['name,email,company,title', ...enrichLeads.map(l => `${l.name},${l.email},${enrichOrg},${l.title ?? ''}`)].join('\n');
                    sessionStorage.setItem('patel_enriched_leads', csv);
                    setAddedToSeq(true);
                    setTimeout(() => setAddedToSeq(false), 3000);
                  }}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: addedToSeq ? green : ink, color: bg, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                >
                  {addedToSeq ? "✓ Added to Outreach!" : "Add to Outreach Sequence ↓"}
                </button>
                <button onClick={() => { setEnrichLeads(null); setShowEnrich(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: bg, fontSize: 11, color: muted, cursor: "pointer" }}>
                  New search
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {enrichLeads.map((lead, i) => (
                <div key={i} className="flex justify-between items-center" style={{ padding: "8px 12px", background: bg, borderRadius: 8, border: `1px solid ${bdr}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{lead.name}</p>
                    <p style={{ fontSize: 11, color: muted }}>{lead.email}{lead.title ? ` · ${lead.title}` : ''}</p>
                  </div>
                  <Badge variant="outline">{lead.confidence}%</Badge>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: muted, marginTop: 8 }}>Copy as CSV to paste into the Outreach Sequence sender above →</p>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
