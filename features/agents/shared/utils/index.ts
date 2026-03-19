import type { ArtifactData } from '../../types/agent.types';

export function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtFileType(mimeType: string, name: string): string {
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (mimeType === "text/csv" || name.endsWith(".csv")) return "CSV";
  if (name.endsWith(".md")) return "MD";
  return "TXT";
}

export function fmtNum(n: number, decimals = 0): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function healthColor(val: number, lo: number, hi: number): string {
  const green = "#16A34A";
  const amber = "#D97706";
  const red   = "#DC2626";
  if (val >= hi) return green;
  if (val >= lo) return amber;
  return red;
}

/**
 * ICP quality rubric — 5 criteria, each worth 20 points.
 * Scores a finished icp_document artifact on substance, not just key presence.
 *
 * 1. Named job title (e.g. "VP Sales" not just "manager")
 * 2. Company size with reasoning (e.g. "50-200 employees because...")
 * 3. Buying trigger (event that makes them look for a solution)
 * 4. Exclusion criteria (who is NOT the ICP)
 * 5. Named example customer (real company or person)
 *
 * 80+ → full Q-Score confidence upgrade on the GTM dimension.
 */
function scoreICPQuality(content: Record<string, unknown>): { pct: number; label: string; missing: string[] } {
  const text = JSON.stringify(content).toLowerCase();
  const missing: string[] = [];
  let score = 0;

  // 1. Named job title
  const hasJobTitle = /\b(vp|director|head of|manager|cto|ceo|cfo|coo|founder|owner|lead|principal|analyst)\b/.test(text);
  if (hasJobTitle) score += 20;
  else missing.push("Named job title (e.g. VP Sales, Head of Operations)");

  // 2. Company size with context
  const hasSizeWithContext = /\b(\d+[\s-]+\d+\s*(employees|people|headcount|staff)|<\s*\d+\s*employees|series [a-d]|seed stage|enterprise|smb|mid.market)\b/.test(text);
  if (hasSizeWithContext) score += 20;
  else missing.push("Company size with context (e.g. 50-200 employees, Series B)");

  // 3. Buying trigger — the event that makes them search
  const hasTrigger = /\b(trigger|when they|after|following|caused by|prompted by|pain point|urgency|budget cycle|renewal|incident|expansion|hire|compliance|incident)\b/.test(text);
  if (hasTrigger) score += 20;
  else missing.push("Buying trigger (what event makes them look for a solution)");

  // 4. Exclusion criteria — who is NOT the ICP
  const hasExclusion = /\b(not|exclude|avoid|wrong fit|bad fit|don't serve|too small|too large|out of scope|won't work for)\b/.test(text);
  if (hasExclusion) score += 20;
  else missing.push("Exclusion criteria (who is NOT your ICP)");

  // 5. Named example — real company or person name as reference
  // Look for proper nouns or explicit example markers
  const hasExample = /\b(example|like|such as|e\.g\.|for instance|similar to|[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|GmbH|SaaS|AI|Tech))\b/.test(JSON.stringify(content));
  if (hasExample) score += 20;
  else missing.push("Named example customer (a real company or person as reference)");

  const label = score >= 80 ? "Complete" : score >= 60 ? "Good" : score >= 40 ? "Partial" : "Needs work";
  return { pct: score, label, missing };
}

export function computeQualityScore(artifact: ArtifactData): { pct: number; label: string; missing: string[] } {
  const REQUIRED_KEYS: Record<string, string[]> = {
    icp_document:       ["summary", "buyerPersona", "firmographics", "painPoints", "buyingTriggers", "channels", "qualificationCriteria"],
    outreach_sequence:  ["subject", "emails", "followUpCadence"],
    battle_card:        ["competitor", "theirStrengths", "theirWeaknesses", "ourAdvantages", "objectionHandling", "pricingComparison"],
    gtm_playbook:       ["executiveSummary", "targetMarket", "channels", "timeline", "budget", "kpis"],
    sales_script:       ["openingHook", "discoveryQuestions", "valueProposition", "objectionHandling", "closingScript"],
    brand_messaging:    ["positioningStatement", "taglines", "elevatorPitch", "valuePropPillars", "toneOfVoice"],
    financial_summary:  ["keyMetrics", "revenueModel", "unitEconomics", "burnAndRunway", "fundraisingAsk"],
    legal_checklist:    ["incorporationStatus", "ipAssignment", "cofounderAgreements", "fundingDocuments", "complianceItems"],
    hiring_plan:        ["currentTeam", "hiringPriorities", "roleDescriptions", "compensationFramework", "hiringTimeline"],
    pmf_survey:         ["surveyQuestions", "segmentAnalysis", "pmfSignals", "nextExperiments"],
    competitive_matrix: ["competitors", "featureComparison", "ourPosition", "pricingComparison", "battleCards"],
    strategic_plan:     ["vision", "strategicBets", "milestones", "risks", "okrs"],
  };

  // ICP documents use a quality rubric (5 criteria) instead of key presence check
  if (artifact.type === "icp_document") {
    return scoreICPQuality(artifact.content as Record<string, unknown>);
  }

  const required = REQUIRED_KEYS[artifact.type] ?? [];
  if (required.length === 0) return { pct: 100, label: "Complete", missing: [] };

  const content = artifact.content as Record<string, unknown>;
  const missing: string[] = [];
  let populated = 0;

  for (const k of required) {
    const val = content[k];
    const hasVal = val !== null && val !== undefined &&
      (Array.isArray(val) ? val.length > 0 : typeof val === "string" ? val.trim().length > 3 : true);
    if (hasVal) populated++;
    else missing.push(k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()));
  }

  const pct = Math.round((populated / required.length) * 100);
  const label = pct >= 90 ? "Complete" : pct >= 70 ? "Good" : pct >= 50 ? "Partial" : "Needs work";
  return { pct, label, missing };
}

export function artifactToText(artifact: ArtifactData): string {
  const lines: string[] = [`# ${artifact.title}\n`];
  function walk(obj: unknown, depth = 0): void {
    if (obj === null || obj === undefined) return;
    if (typeof obj === "string")  { lines.push("  ".repeat(depth) + obj); return; }
    if (typeof obj === "number" || typeof obj === "boolean") { lines.push("  ".repeat(depth) + String(obj)); return; }
    if (Array.isArray(obj)) { obj.forEach(item => walk(item, depth)); return; }
    if (typeof obj === "object") {
      Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          lines.push("  ".repeat(depth) + `${label}: ${v}`);
        } else {
          lines.push("  ".repeat(depth) + `${label}:`);
          walk(v, depth + 1);
        }
      });
    }
  }
  walk(artifact.content);
  return lines.join("\n");
}
