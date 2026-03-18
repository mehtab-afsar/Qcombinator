'use client'

import { useState } from 'react'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

export function LegalChecklistRenderer({ data, artifactId: _artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    companyStage?: string;
    priorityActions?: string[];
    incorporationItems?: { item: string; status: string; description: string; urgency?: string }[];
    ipItems?: { item: string; status: string; description: string }[];
    fundraisingDocs?: { document: string; description: string; recommendation: string }[];
    contractTemplates?: string[];
    redFlags?: string[];
  };

  const [showNdaModal, setShowNdaModal]       = useState(false);
  const [ndaCounterparty, setNdaCounterparty] = useState("");
  const [ndaEmail, setNdaEmail]               = useState("");
  const [ndaType, setNdaType]                 = useState<"mutual" | "one-way">("mutual");
  const [ndaPurpose, setNdaPurpose]           = useState("");
  const [generatingNda, setGeneratingNda]     = useState(false);
  const [ndaHtml, setNdaHtml]                 = useState<string | null>(null);

  // Data room state
  const [buildingDataRoom, setBuildingDataRoom] = useState(false);
  const [dataRoomMeta, setDataRoomMeta]         = useState<{ folderCount: number; artifactCount: number; missing: string[] } | null>(null);
  const [dataRoomError, setDataRoomError]       = useState<string | null>(null);

  async function handleBuildDataRoom() {
    if (buildingDataRoom) return;
    setBuildingDataRoom(true); setDataRoomError(null);
    try {
      const res = await fetch('/api/agents/leo/data-room');
      const result = await res.json();
      if (!res.ok) { setDataRoomError(result.error ?? 'Failed to build data room'); return; }
      setDataRoomMeta({ folderCount: result.folderCount, artifactCount: result.artifactCount, missing: result.missing ?? [] });
      // Download the HTML data room
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(result.startupName || 'data-room').replace(/\s+/g, '-').toLowerCase()}-data-room.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setDataRoomError('Network error'); }
    finally { setBuildingDataRoom(false); }
  }

  // SAFE generator state
  const [showSafeModal, setShowSafeModal]     = useState(false);
  const [safeType, setSafeType]               = useState<"post-money" | "pre-money">("post-money");
  const [safeInvestor, setSafeInvestor]       = useState("");
  const [safeInvestorEmail, setSafeInvestorEmail] = useState("");
  const [safeAmount, setSafeAmount]           = useState("");
  const [safeCap, setSafeCap]                 = useState("");
  const [safeDiscount, setSafeDiscount]       = useState("20");
  const [generatingSafe, setGeneratingSafe]   = useState(false);
  const [safeError, setSafeError]             = useState<string | null>(null);

  // IP Strategy state
  const [generatingIPStrat, setGeneratingIPStrat]       = useState(false);
  const [ipStratResult, setIpStratResult]               = useState<Record<string, unknown> | null>(null);
  const [ipStratError, setIpStratError]                 = useState<string | null>(null);
  const [ipStratTab, setIpStratTab]                     = useState<'portfolio' | 'trademarks' | 'patents' | 'redflags'>('portfolio');

  async function handleGenerateIPStrategy() {
    if (generatingIPStrat) return;
    setGeneratingIPStrat(true); setIpStratError(null); setIpStratResult(null);
    try {
      const res = await fetch('/api/agents/leo/ip-strategy', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.strategy) setIpStratResult(r.strategy);
      else setIpStratError(r.error ?? 'Generation failed');
    } catch { setIpStratError('Network error'); }
    finally { setGeneratingIPStrat(false); }
  }

  // Fundraising Checklist state
  const [generatingFRChecklist, setGeneratingFRChecklist] = useState(false);
  const [frChecklistResult, setFrChecklistResult]         = useState<Record<string, unknown> | null>(null);
  const [frChecklistError, setFrChecklistError]           = useState<string | null>(null);
  const [frChecklistPhaseIdx, setFrChecklistPhaseIdx]     = useState(0);
  const [frChecklistTab, setFrChecklistTab]               = useState<'phases' | 'redflags' | 'dataroom' | 'faq'>('phases');

  async function handleGenerateFRChecklist() {
    if (generatingFRChecklist) return;
    setGeneratingFRChecklist(true); setFrChecklistError(null); setFrChecklistResult(null);
    try {
      const res = await fetch('/api/agents/leo/fundraising-checklist', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.checklist) setFrChecklistResult(r.checklist);
      else setFrChecklistError(r.error ?? 'Generation failed');
    } catch { setFrChecklistError('Network error'); }
    finally { setGeneratingFRChecklist(false); }
  }

  // Term Sheet Analyzer state
  const [tsInstrument, setTsInstrument]               = useState('SAFE');
  const [tsRaiseAmount, setTsRaiseAmount]             = useState('');
  const [tsValuation, setTsValuation]                 = useState('');
  const [tsLeadInvestor, setTsLeadInvestor]           = useState('');
  const [generatingTS, setGeneratingTS]               = useState(false);
  const [tsResult, setTsResult]                       = useState<Record<string, unknown> | null>(null);
  const [tsError, setTsError]                         = useState<string | null>(null);
  const [tsTab, setTsTab]                             = useState<'flags' | 'friendly' | 'negotiation' | 'glossary'>('flags');

  async function handleAnalyzeTermSheet() {
    if (generatingTS) return;
    setGeneratingTS(true); setTsError(null); setTsResult(null);
    try {
      const res = await fetch('/api/agents/leo/term-sheet-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrument: tsInstrument, raiseAmount: tsRaiseAmount || undefined, valuation: tsValuation || undefined, leadInvestor: tsLeadInvestor || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.analysis) setTsResult(r.analysis);
      else setTsError(r.error ?? 'Analysis failed');
    } catch { setTsError('Network error'); }
    finally { setGeneratingTS(false); }
  }

  // Equity Plan state
  const [epPoolPct, setEpPoolPct]                     = useState('10');
  const [epVesting, setEpVesting]                     = useState('4');
  const [epCliff, setEpCliff]                         = useState('12');
  const [generatingEP, setGeneratingEP]               = useState(false);
  const [epResult, setEpResult]                       = useState<Record<string, unknown> | null>(null);
  const [epError, setEpError]                         = useState<string | null>(null);
  const [epTab, setEpTab]                             = useState<'grants' | 'vesting' | 'dilution' | 'legal'>('grants');

  async function handleGenerateEquityPlan() {
    if (generatingEP) return;
    setGeneratingEP(true); setEpError(null); setEpResult(null);
    try {
      const res = await fetch('/api/agents/leo/equity-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionPoolPercent: parseFloat(epPoolPct) || 10, vestingYears: parseInt(epVesting) || 4, cliffMonths: parseInt(epCliff) || 12 }),
      });
      const r = await res.json();
      if (res.ok && r.plan) setEpResult(r.plan);
      else setEpError(r.error ?? 'Generation failed');
    } catch { setEpError('Network error'); }
    finally { setGeneratingEP(false); }
  }

  // Co-founder agreement state
  const [showCoFounderModal, setShowCoFounderModal]   = useState(false);
  const [coFounderName, setCoFounderName]             = useState("");
  const [coFounderRole, setCoFounderRole]             = useState("");
  const [coFounderEquityPct, setCoFounderEquityPct]   = useState("50");
  const [yourEquityPct, setYourEquityPct]             = useState("50");
  const [coFounderVesting, setCoFounderVesting]       = useState("4");
  const [coFounderCliff, setCoFounderCliff]           = useState("12");
  const [generatingCoFounder, setGeneratingCoFounder] = useState(false);
  const [coFounderError, setCoFounderError]           = useState<string | null>(null);

  // Contractor agreement state
  const [showContractorPanel, setShowContractorPanel] = useState(false);
  const [ctxName, setCtxName]           = useState("");
  const [ctxRole, setCtxRole]           = useState("");
  const [ctxCompType, setCtxCompType]   = useState<"hourly" | "project">("hourly");
  const [ctxRate, setCtxRate]           = useState("");
  const [ctxStartDate, setCtxStartDate] = useState("");
  const [ctxScope, setCtxScope]         = useState("");
  const [generatingCtx, setGeneratingCtx]   = useState(false);
  const [ctxError, setCtxError]         = useState<string | null>(null);

  async function handleGenerateContractor() {
    if (generatingCtx || !ctxName.trim() || !ctxRole.trim() || !ctxScope.trim()) return;
    setGeneratingCtx(true); setCtxError(null);
    try {
      const res = await fetch('/api/agents/leo/contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorName: ctxName, contractorRole: ctxRole, compensationType: ctxCompType, rate: ctxRate, startDate: ctxStartDate || undefined, scope: ctxScope }),
      });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `contractor-agreement-${ctxName.toLowerCase().replace(/\s+/g, '-')}.html`; a.click();
        URL.revokeObjectURL(url);
        setShowContractorPanel(false);
      } else {
        setCtxError(r.error ?? 'Failed to generate contractor agreement');
      }
    } catch { setCtxError('Network error'); }
    finally { setGeneratingCtx(false); }
  }

  // Compliance audit state
  const [runningCompliance, setRunningCompliance] = useState(false);
  const [complianceReport, setComplianceReport] = useState<{
    overallRisk?: string;
    riskSummary?: string;
    items?: { area: string; status: string; finding: string; action: string; effort: string; priority: number }[];
    priorityActions?: string[];
    upcomingDeadlines?: { item: string; deadline: string; consequence: string }[];
    safeHarbors?: string[];
    disclaimer?: string;
  } | null>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  async function handleRunCompliance() {
    if (runningCompliance) return;
    setRunningCompliance(true); setComplianceError(null);
    try {
      const res = await fetch('/api/agents/leo/compliance', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.report) setComplianceReport(r.report);
      else setComplianceError(r.error ?? 'Failed to run compliance audit');
    } catch { setComplianceError('Network error'); }
    finally { setRunningCompliance(false); }
  }

  async function handleGenerateSafe() {
    if (!safeInvestor || !safeAmount || !safeCap || generatingSafe) return;
    setGeneratingSafe(true); setSafeError(null);
    try {
      const res = await fetch('/api/agents/leo/safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          safeType,
          investorName: safeInvestor,
          investorEmail: safeInvestorEmail,
          investmentAmount: Number(safeAmount.replace(/[^0-9.]/g, '')),
          valuationCap: Number(safeCap.replace(/[^0-9.]/g, '')),
          discountRate: Number(safeDiscount) || 20,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        const blob = new Blob([result.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `SAFE_${safeInvestor.replace(/\s+/g, '_')}.html`;
        a.click(); URL.revokeObjectURL(url);
        setShowSafeModal(false);
      } else {
        setSafeError(result.error ?? 'Failed to generate SAFE');
      }
    } catch { setSafeError('Network error'); }
    finally { setGeneratingSafe(false); }
  }

  async function handleGenerateCoFounder() {
    if (!coFounderName.trim() || !coFounderRole.trim() || generatingCoFounder) return;
    setGeneratingCoFounder(true); setCoFounderError(null);
    try {
      const res = await fetch('/api/agents/leo/cofounder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coFounderName: coFounderName.trim(),
          coFounderRole: coFounderRole.trim(),
          equityA: parseFloat(yourEquityPct) || 50,
          equityB: parseFloat(coFounderEquityPct) || 50,
          vestingYears: parseInt(coFounderVesting) || 4,
          cliffMonths: parseInt(coFounderCliff) || 12,
        }),
      });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cofounder-agreement-${coFounderName.trim().toLowerCase().replace(/\s+/g, '-')}.html`;
        a.click();
        URL.revokeObjectURL(url);
        setShowCoFounderModal(false);
      } else {
        setCoFounderError(r.error ?? 'Failed to generate');
      }
    } catch { setCoFounderError('Network error'); }
    finally { setGeneratingCoFounder(false); }
  }

  // Privacy Policy + ToS generator state
  const [showLegalDocModal, setShowLegalDocModal]   = useState(false);
  const [legalDocType, setLegalDocType]             = useState<"privacy" | "tos" | "both">("both");
  const [legalCollectsPayments, setLegalCollectsPayments] = useState(false);
  const [legalHasAccounts, setLegalHasAccounts]     = useState(true);
  const [legalExtraContext, setLegalExtraContext]   = useState("");
  const [generatingLegal, setGeneratingLegal]       = useState(false);
  const [legalError, setLegalError]                 = useState<string | null>(null);

  async function handleGenerateLegalDocs() {
    if (generatingLegal) return;
    setGeneratingLegal(true); setLegalError(null);
    try {
      const res = await fetch('/api/agents/leo/privacy-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: legalDocType,
          collectsPayments: legalCollectsPayments,
          hasUserAccounts: legalHasAccounts,
          extraContext: legalExtraContext.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${r.company?.replace(/\s+/g, '-').toLowerCase() ?? 'company'}-legal-docs.html`;
        a.click(); URL.revokeObjectURL(url);
        setShowLegalDocModal(false);
      } else {
        setLegalError(r.error ?? 'Failed to generate');
      }
    } catch { setLegalError('Network error'); }
    finally { setGeneratingLegal(false); }
  }

  // Contract clause library state
  const CLAUSE_TYPES = [
    { key: 'non-disclosure', label: 'NDA / Non-Disclosure' },
    { key: 'non-compete', label: 'Non-Compete' },
    { key: 'non-solicitation', label: 'Non-Solicitation' },
    { key: 'ip-assignment', label: 'IP Assignment' },
    { key: 'indemnification', label: 'Indemnification' },
    { key: 'limitation-of-liability', label: 'Limitation of Liability' },
    { key: 'governing-law', label: 'Governing Law' },
    { key: 'dispute-resolution', label: 'Dispute Resolution' },
    { key: 'termination', label: 'Termination' },
    { key: 'payment-terms', label: 'Payment Terms' },
  ];
  // Document diff state
  // IP Audit state
  const [showIPAuditPanel, setShowIPAuditPanel] = useState(false);
  const [ipCodeAuthors, setIpCodeAuthors]       = useState("");
  const [ipPriorEmployers, setIpPriorEmployers] = useState("");
  const [ipOSSLibraries, setIpOSSLibraries]     = useState("");
  const [ipHasContracts, setIpHasContracts]     = useState<boolean | undefined>(undefined);
  const [ipContext, setIpContext]               = useState("");
  const [runningIPAudit, setRunningIPAudit]     = useState(false);
  const [ipAuditResult, setIpAuditResult]       = useState<{
    riskScore?: number; riskLevel?: string;
    risks?: { category: string; risk: string; severity: string; likelihood: string; explanation: string }[];
    urgentItems?: string[];
    recommendations?: { action: string; timeline: string; cost: string }[];
    investorReadiness?: string;
    cleanBillOfHealth?: string[];
    priorityQuestion?: string;
  } | null>(null);
  const [ipAuditError, setIpAuditError]         = useState<string | null>(null);

  async function handleRunIPAudit() {
    if (runningIPAudit) return;
    setRunningIPAudit(true); setIpAuditError(null); setIpAuditResult(null);
    try {
      const res = await fetch('/api/agents/leo/ip-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeAuthors: ipCodeAuthors.trim() || undefined,
          priorEmployers: ipPriorEmployers.trim() || undefined,
          ossLibraries: ipOSSLibraries.trim() || undefined,
          hasContractorAgreements: ipHasContracts,
          additionalContext: ipContext.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok && r.audit) setIpAuditResult(r.audit);
      else setIpAuditError(r.error ?? 'IP audit failed');
    } catch { setIpAuditError('Network error'); }
    finally { setRunningIPAudit(false); }
  }

  // Regulatory Research state
  const [showRegulatoryPanel, setShowRegulatoryPanel] = useState(false);
  const [regulatoryIndustry, setRegulatoryIndustry]   = useState("");
  const [regulatoryContext, setRegulatoryContext]     = useState("");
  const [runningRegulatory, setRunningRegulatory]     = useState(false);
  const [regulatoryResult, setRegulatoryResult]       = useState<{
    regulations?: { name: string; applies: boolean; severity: string; summary: string; penalty: string; applicableBecause: string }[];
    complianceChecklist?: { item: string; category: string; timeline: string; difficulty: string; estimatedCost: string }[];
    riskAreas?: { area: string; risk: string; severity: string }[];
    complianceScore?: number;
    biggestRisk?: string;
    quickWins?: string[];
    expertAdvice?: string;
  } | null>(null);
  const [regulatoryError, setRegulatoryError]         = useState<string | null>(null);
  const [regActiveTab, setRegActiveTab]               = useState<"overview" | "checklist" | "risks">("overview");

  async function handleRegulatoryResearch() {
    if (runningRegulatory) return;
    setRunningRegulatory(true); setRegulatoryError(null); setRegulatoryResult(null);
    try {
      const res = await fetch('/api/agents/leo/regulatory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: regulatoryIndustry.trim() || undefined,
          additionalContext: regulatoryContext.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok && r.result) setRegulatoryResult(r.result);
      else setRegulatoryError(r.error ?? 'Research failed');
    } catch { setRegulatoryError('Network error'); }
    finally { setRunningRegulatory(false); }
  }

  // Cap Table Validation state
  const [showCapTablePanel, setShowCapTablePanel] = useState(false);
  const [capTableData, setCapTableData]           = useState("");
  const [capTableContext, setCapTableContext]      = useState("");
  const [runningCapTable, setRunningCapTable]     = useState(false);
  const [capTableResult, setCapTableResult]       = useState<{
    healthScore?: number;
    overallAssessment?: string;
    issues?: { issue: string; category: string; severity: string; explanation: string; howToFix: string; timeline: string }[];
    urgentFixes?: string[];
    investorReadinessGaps?: string[];
    safeHarbor?: string[];
    optionPoolAnalysis?: { currentSize: string; recommendedSize: string; reasoning: string };
    nextSteps?: string;
    lawyerBrief?: string;
  } | null>(null);
  const [capTableError, setCapTableError]         = useState<string | null>(null);
  const [capTableTab, setCapTableTab]             = useState<"issues" | "urgent" | "investor">("issues");

  async function handleValidateCapTable() {
    if (!capTableData.trim() || runningCapTable) return;
    setRunningCapTable(true); setCapTableError(null); setCapTableResult(null);
    try {
      const res = await fetch('/api/agents/leo/cap-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capTableData: capTableData.trim(),
          additionalContext: capTableContext.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok && r.result) setCapTableResult(r.result);
      else setCapTableError(r.error ?? 'Validation failed');
    } catch { setCapTableError('Network error'); }
    finally { setRunningCapTable(false); }
  }

  const [showDiffModal, setShowDiffModal]     = useState(false);
  const [diffDocType, setDiffDocType]         = useState("contract");
  const [diffOriginal, setDiffOriginal]       = useState("");
  const [diffRevised, setDiffRevised]         = useState("");
  const [diffing, setDiffing]                 = useState(false);
  const [diffResult, setDiffResult]           = useState<{
    summary?: string;
    overallImpact?: string;
    changes?: { section: string; type: string; original: string | null; revised: string | null; explanation: string; severity: string; founderImpact: string }[];
    redFlags?: string[];
    winsBySide?: { founder: string[]; investor: string[] };
    negotiationAdvice?: string | null;
  } | null>(null);
  const [diffError, setDiffError]             = useState<string | null>(null);

  async function handleRunDiff() {
    if (!diffOriginal.trim() || !diffRevised.trim() || diffing) return;
    setDiffing(true); setDiffError(null); setDiffResult(null);
    try {
      const res = await fetch('/api/agents/leo/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType: diffDocType, original: diffOriginal, revised: diffRevised }),
      });
      const r = await res.json();
      if (res.ok && r.diff) setDiffResult(r.diff);
      else setDiffError(r.error ?? 'Diff failed');
    } catch { setDiffError('Network error'); }
    finally { setDiffing(false); }
  }

  const [showClausePanel, setShowClausePanel]       = useState(false);
  const [selectedClause, setSelectedClause]         = useState<string | null>(null);
  const [clauseContext, setClauseContext]           = useState("");
  const [fetchingClause, setFetchingClause]         = useState(false);
  const [clauseResult, setClauseResult]             = useState<{
    clauseType?: string; summary?: string;
    variants?: { label: string; riskLevel: string; text: string; notes: string }[];
    keyTermsToNegotiate?: string[]; redFlags?: string[];
  } | null>(null);
  const [clauseError, setClauseError]               = useState<string | null>(null);
  const [copiedClause, setCopiedClause]             = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant]       = useState(0);

  async function handleFetchClause(type: string) {
    if (fetchingClause) return;
    setSelectedClause(type); setFetchingClause(true); setClauseError(null); setClauseResult(null); setSelectedVariant(0);
    try {
      const res = await fetch('/api/agents/leo/clauses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clauseType: type, context: clauseContext.trim() || undefined }),
      });
      const r = await res.json();
      if (res.ok) setClauseResult(r.clause);
      else setClauseError(r.error ?? 'Failed to generate clause');
    } catch { setClauseError('Network error'); }
    finally { setFetchingClause(false); }
  }

  // Term sheet analyzer state
  const [showTermModal, setShowTermModal]           = useState(false);
  const [termText, setTermText]                     = useState("");
  const [analyzingTerm, setAnalyzingTerm]           = useState(false);
  const [termAnalysis, setTermAnalysis]             = useState<{
    overallRisk: string;
    summary: string;
    flags: { clause: string; severity: string; explanation: string; recommendation: string; standardMarket?: string }[];
    highlights: { clause: string; value: string; comment: string; verdict: string }[];
  } | null>(null);
  const [termError, setTermError]                   = useState<string | null>(null);

  async function handleAnalyzeTerm() {
    if (!termText.trim() || analyzingTerm) return;
    setAnalyzingTerm(true); setTermError(null); setTermAnalysis(null);
    try {
      const res = await fetch('/api/agents/leo/term-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: termText.trim() }),
      });
      const result = await res.json();
      if (res.ok) setTermAnalysis(result);
      else setTermError(result.error ?? 'Analysis failed');
    } catch { setTermError('Network error'); }
    finally { setAnalyzingTerm(false); }
  }

  async function handleGenerateNda() {
    if (!ndaCounterparty || !ndaPurpose || generatingNda) return;
    setGeneratingNda(true);
    try {
      const res = await fetch('/api/agents/leo/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterpartyName: ndaCounterparty, counterpartyEmail: ndaEmail, ndaType, purpose: ndaPurpose }),
      });
      const result = await res.json();
      if (res.ok) {
        setNdaHtml(result.html);
        // Offer download
        const blob = new Blob([result.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `NDA_${ndaCounterparty.replace(/\s+/g, '_')}.html`;
        a.click(); URL.revokeObjectURL(url);
      }
    } catch {} finally { setGeneratingNda(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const statusColor: Record<string, string> = { required: red, recommended: amber, optional: muted };
  const urgencyBg: Record<string, string> = { now: "#FEF2F2", soon: "#FFFBEB", later: "#F0FDF4" };
  const urgencyColor: Record<string, string> = { now: red, soon: amber, later: green };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Generate NDA CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Generate an NDA</p>
          <p style={{ fontSize: 11, color: muted }}>Create a mutual or one-way NDA for investors, contractors, or partners. Download as HTML.</p>
        </div>
        <button onClick={() => setShowNdaModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Create NDA
        </button>
      </div>

      {/* ── NDA Modal ── */}
      {showNdaModal && (
        <div onClick={() => { if (!generatingNda) setShowNdaModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Generate NDA</p>
              <button onClick={() => setShowNdaModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {ndaHtml ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ fontSize: 22, marginBottom: 10 }}>📄</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>NDA downloaded!</p>
                <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Open the HTML file in your browser to review and print to PDF.</p>
                <button onClick={() => { setShowNdaModal(false); setNdaHtml(null); setNdaCounterparty(""); setNdaEmail(""); setNdaPurpose(""); }} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: amber, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Counterparty Name *</label>
                  <input value={ndaCounterparty} onChange={e => setNdaCounterparty(e.target.value)} placeholder="Acme Corp / Jane Smith" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Their Email (optional)</label>
                  <input value={ndaEmail} onChange={e => setNdaEmail(e.target.value)} placeholder="legal@acme.com" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>NDA Type</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["mutual", "one-way"] as const).map(t => (
                      <button key={t} onClick={() => setNdaType(t)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: `1px solid ${ndaType === t ? amber : bdr}`, background: ndaType === t ? "#FFFBEB" : "transparent", fontSize: 12, fontWeight: 600, color: ndaType === t ? amber : muted, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Purpose *</label>
                  <input value={ndaPurpose} onChange={e => setNdaPurpose(e.target.value)} placeholder="Exploring a potential partnership / investment discussion" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <button onClick={handleGenerateNda} disabled={!ndaCounterparty || !ndaPurpose || generatingNda} style={{ padding: "10px", borderRadius: 8, border: "none", background: !ndaCounterparty || !ndaPurpose ? bdr : amber, color: !ndaCounterparty || !ndaPurpose ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !ndaCounterparty || !ndaPurpose ? "not-allowed" : "pointer" }}>
                  {generatingNda ? "Generating…" : "Generate & Download NDA"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── SAFE Note Generator CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Generate a SAFE Note</p>
          <p style={{ fontSize: 11, color: muted }}>YC post-money or pre-money SAFE — fill in investor details and download as HTML (print to PDF).</p>
        </div>
        <button onClick={() => setShowSafeModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Create SAFE
        </button>
      </div>

      {/* ── SAFE Modal ── */}
      {showSafeModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowSafeModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Generate SAFE Note</p>
              <button onClick={() => setShowSafeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>SAFE Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["post-money", "pre-money"] as const).map(t => (
                    <button key={t} onClick={() => setSafeType(t)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: `1px solid ${safeType === t ? green : bdr}`, background: safeType === t ? "#F0FDF4" : "transparent", fontSize: 12, fontWeight: 600, color: safeType === t ? green : muted, cursor: "pointer" }}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Investor Name *</label>
                <input value={safeInvestor} onChange={e => setSafeInvestor(e.target.value)} placeholder="Jane Smith / Acme Ventures" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Investor Email (optional)</label>
                <input value={safeInvestorEmail} onChange={e => setSafeInvestorEmail(e.target.value)} placeholder="jane@acme.vc" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Investment Amount ($) *</label>
                  <input value={safeAmount} onChange={e => setSafeAmount(e.target.value)} placeholder="150000" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Valuation Cap ($) *</label>
                  <input value={safeCap} onChange={e => setSafeCap(e.target.value)} placeholder="5000000" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Discount Rate (%) — typically 20%</label>
                <input value={safeDiscount} onChange={e => setSafeDiscount(e.target.value)} placeholder="20" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              {safeError && <p style={{ fontSize: 12, color: red }}>{safeError}</p>}
              <p style={{ fontSize: 10, color: muted, fontStyle: "italic" }}>⚠ Have a lawyer review before signing. This is not legal advice.</p>
              <button onClick={handleGenerateSafe} disabled={!safeInvestor || !safeAmount || !safeCap || generatingSafe} style={{ padding: "10px", borderRadius: 8, border: "none", background: !safeInvestor || !safeAmount || !safeCap ? bdr : green, color: !safeInvestor || !safeAmount || !safeCap ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !safeInvestor || !safeAmount || !safeCap ? "not-allowed" : "pointer" }}>
                {generatingSafe ? "Generating…" : "Generate & Download SAFE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {d.companyStage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: muted }}>Stage:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: ink, textTransform: "capitalize" }}>{d.companyStage.replace(/-/g, ' ')}</span>
        </div>
      )}

      {d.priorityActions && d.priorityActions.length > 0 && (
        <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "14px 16px", border: `1px solid #FECACA` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Priority Actions</p>
          {d.priorityActions.map((a, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8, marginBottom: 3 }}>→ {a}</p>
          ))}
        </div>
      )}

      {d.incorporationItems && d.incorporationItems.length > 0 && (
        <div>
          <p style={sectionHead}>Incorporation</p>
          {d.incorporationItems.map((item, i) => (
            <div key={i} style={{ background: item.urgency ? urgencyBg[item.urgency] || surf : surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, flex: 1, paddingRight: 8 }}>{item.item}</p>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {item.urgency && <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: urgencyColor[item.urgency] || muted }}>{item.urgency}</span>}
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: statusColor[item.status] || muted }}>{item.status}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{item.description}</p>
            </div>
          ))}
        </div>
      )}

      {d.ipItems && d.ipItems.length > 0 && (
        <div>
          <p style={sectionHead}>IP Protection</p>
          {d.ipItems.map((item, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${bdr}`, padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{item.item}</p>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: statusColor[item.status] || muted }}>{item.status}</span>
              </div>
              <p style={{ fontSize: 11, color: muted }}>{item.description}</p>
            </div>
          ))}
        </div>
      )}

      {d.fundraisingDocs && d.fundraisingDocs.length > 0 && (
        <div>
          <p style={sectionHead}>Fundraising Documents</p>
          {d.fundraisingDocs.map((doc, i) => (
            <div key={i} style={{ background: "#EFF6FF", borderRadius: 8, padding: "12px 14px", border: `1px solid #BFDBFE`, marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: blue, marginBottom: 4 }}>{doc.document}</p>
              <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 4 }}>{doc.description}</p>
              <p style={{ fontSize: 11, color: ink }}>→ {doc.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      {d.redFlags && d.redFlags.length > 0 && (
        <div>
          <p style={sectionHead}>Red Flags</p>
          {d.redFlags.map((flag, i) => (
            <p key={i} style={{ fontSize: 12, color: red, lineHeight: 1.6, marginBottom: 4 }}>⚠ {flag}</p>
          ))}
        </div>
      )}

      {/* ── Co-Founder Agreement ── */}
      {showCoFounderModal ? (
        <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink }}>Co-Founder Agreement Generator</p>
            <button onClick={() => { setShowCoFounderModal(false); setCoFounderError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 13, lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Co-Founder Name *</label>
                <input value={coFounderName} onChange={e => setCoFounderName(e.target.value)} placeholder="Jane Smith" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Co-Founder Role *</label>
                <input value={coFounderRole} onChange={e => setCoFounderRole(e.target.value)} placeholder="CTO" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Your Equity %</label>
                <input type="number" value={yourEquityPct} onChange={e => setYourEquityPct(e.target.value)} min={0} max={100} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Co-Founder Equity %</label>
                <input type="number" value={coFounderEquityPct} onChange={e => setCoFounderEquityPct(e.target.value)} min={0} max={100} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Vesting Years</label>
                <input type="number" value={coFounderVesting} onChange={e => setCoFounderVesting(e.target.value)} min={1} max={10} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Cliff Months</label>
                <input type="number" value={coFounderCliff} onChange={e => setCoFounderCliff(e.target.value)} min={0} max={24} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
            </div>
            {coFounderError && <p style={{ fontSize: 11, color: red }}>{coFounderError}</p>}
            <button onClick={handleGenerateCoFounder} disabled={!coFounderName || !coFounderRole || generatingCoFounder} style={{ padding: "9px", borderRadius: 8, border: "none", background: !coFounderName || !coFounderRole ? bdr : ink, color: !coFounderName || !coFounderRole ? muted : bg, fontSize: 13, fontWeight: 700, cursor: !coFounderName || !coFounderRole ? "not-allowed" : "pointer" }}>
              {generatingCoFounder ? "Generating…" : "Download Agreement HTML"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Co-Founder Agreement</p>
            <p style={{ fontSize: 11, color: muted }}>Generate a co-founder agreement with equity split, vesting schedule, IP assignment, and dispute resolution — downloads as print-ready HTML.</p>
          </div>
          <button onClick={() => setShowCoFounderModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Draft Agreement
          </button>
        </div>
      )}

      {/* ── Build Data Room ─────────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 16px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: dataRoomMeta ? 10 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Investor Data Room</p>
            <p style={{ fontSize: 11, color: muted }}>Leo bundles all your agent deliverables into a clean, shareable HTML data room — financials, legal, GTM, team, and more.</p>
          </div>
          <button
            onClick={handleBuildDataRoom}
            disabled={buildingDataRoom}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: buildingDataRoom ? bdr : ink, color: buildingDataRoom ? muted : bg, fontSize: 12, fontWeight: 600, cursor: buildingDataRoom ? "not-allowed" : "pointer", whiteSpace: "nowrap", marginLeft: 12 }}
          >
            {buildingDataRoom ? "Building…" : "Build Data Room"}
          </button>
        </div>
        {dataRoomMeta && (
          <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 10 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: ink }}>{dataRoomMeta.artifactCount}</p>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase" }}>documents</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: ink }}>{dataRoomMeta.folderCount}</p>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase" }}>sections</p>
              </div>
              {dataRoomMeta.missing.length > 0 && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: amber, fontWeight: 600, marginBottom: 3 }}>Missing sections:</p>
                  <p style={{ fontSize: 11, color: muted }}>{dataRoomMeta.missing.join(', ')}</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: 11, color: green }}>✓ Data room downloaded — open in your browser, then File → Print → Save as PDF to share.</p>
          </div>
        )}
        {dataRoomError && <p style={{ fontSize: 11, color: red, marginTop: 6 }}>{dataRoomError}</p>}
      </div>

      {/* ── Clerky / Stripe Atlas CTA ─────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}`, marginTop: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Start Incorporation</p>
        <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 12 }}>
          Leo has collected enough data to pre-fill your incorporation. Choose a platform to get started — your details are already on your clipboard.
        </p>
        <div style={{ background: bg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 12, fontFamily: "monospace", fontSize: 11, color: ink, lineHeight: 1.7 }}>
          <p><strong>Entity type:</strong> Delaware C-Corp</p>
          <p><strong>Stage:</strong> {d.companyStage ? d.companyStage.replace(/-/g, " ") : "Pre-seed"}</p>
          <p><strong>Suggested par value:</strong> $0.0001 / share</p>
          <p><strong>Auth shares:</strong> 10,000,000 common</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              const text = `Entity type: Delaware C-Corp\nStage: ${d.companyStage ? d.companyStage.replace(/-/g, " ") : "Pre-seed"}\nPar value: $0.0001\nAuthorized shares: 10,000,000 common\n\nPriority actions:\n${(d.priorityActions || []).map(a => `- ${a}`).join("\n")}`;
              navigator.clipboard.writeText(text).catch(() => {});
            }}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "white", fontSize: 12, fontWeight: 600, color: ink, cursor: "pointer" }}
          >
            Copy Details
          </button>
          <a
            href="https://clerky.com/formations/new"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              const text = `Entity type: Delaware C-Corp\nStage: ${d.companyStage ? d.companyStage.replace(/-/g, " ") : "Pre-seed"}\nPar value: $0.0001\nAuthorized shares: 10,000,000 common`;
              navigator.clipboard.writeText(text).catch(() => {});
            }}
            style={{ padding: "8px 14px", borderRadius: 8, background: green, fontSize: 12, fontWeight: 600, color: "white", textDecoration: "none", display: "inline-block" }}
          >
            Start on Clerky
          </a>
          <a
            href="https://stripe.com/atlas"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: "8px 14px", borderRadius: 8, background: "#635BFF", fontSize: 12, fontWeight: 600, color: "white", textDecoration: "none", display: "inline-block" }}
          >
            Start on Stripe Atlas
          </a>
        </div>
      </div>

      {/* ── Term Sheet Analyzer CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Analyze a Term Sheet or SAFE</p>
          <p style={{ fontSize: 11, color: muted }}>Paste any term sheet — Leo flags red flags, unusual clauses, and what to negotiate.</p>
        </div>
        <button onClick={() => { setShowTermModal(true); setTermAnalysis(null); setTermError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Analyze Term Sheet
        </button>
      </div>

      {/* ── Term Sheet Modal ── */}
      {showTermModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowTermModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Term Sheet / SAFE Analyzer</p>
              <button onClick={() => setShowTermModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>

            {!termAnalysis ? (
              <>
                <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>Paste your term sheet, SAFE, or any funding document. Leo will flag red flags and unusual clauses.</p>
                <textarea
                  value={termText}
                  onChange={e => setTermText(e.target.value)}
                  placeholder="Paste term sheet text here…"
                  rows={12}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, fontFamily: "monospace", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", outline: "none" }}
                />
                {termError && <p style={{ fontSize: 12, color: red, marginTop: 8 }}>{termError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={() => setShowTermModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleAnalyzeTerm} disabled={analyzingTerm || termText.trim().length < 100} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: analyzingTerm || termText.trim().length < 100 ? bdr : "#7C3AED", color: analyzingTerm || termText.trim().length < 100 ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: analyzingTerm || termText.trim().length < 100 ? "not-allowed" : "pointer" }}>
                    {analyzingTerm ? "Analyzing…" : "Analyze with Leo"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Risk badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: termAnalysis.overallRisk === "high" ? "#FEF2F2" : termAnalysis.overallRisk === "medium" ? "#FFFBEB" : "#F0FDF4", border: `1px solid ${termAnalysis.overallRisk === "high" ? "#FECACA" : termAnalysis.overallRisk === "medium" ? "#FDE68A" : "#BBF7D0"}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 999, background: termAnalysis.overallRisk === "high" ? red : termAnalysis.overallRisk === "medium" ? amber : green, color: "#fff" }}>
                    {termAnalysis.overallRisk} risk
                  </span>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{termAnalysis.summary}</p>
                </div>

                {/* Key terms */}
                {termAnalysis.highlights.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Key Terms</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {termAnalysis.highlights.map((h, i) => (
                        <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: h.verdict === "good" ? "#F0FDF4" : h.verdict === "watch" ? "#FFFBEB" : surf, border: `1px solid ${h.verdict === "good" ? "#BBF7D0" : h.verdict === "watch" ? "#FDE68A" : bdr}`, flex: "1 1 180px" }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 2 }}>{h.clause}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 3 }}>{h.value}</p>
                          <p style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>{h.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red flags */}
                {termAnalysis.flags.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Flags & Red Flags ({termAnalysis.flags.length})</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {termAnalysis.flags.map((f, i) => (
                        <div key={i} style={{ borderRadius: 10, border: `1px solid ${f.severity === "high" ? "#FECACA" : f.severity === "medium" ? "#FDE68A" : bdr}`, overflow: "hidden" }}>
                          <div style={{ padding: "10px 14px", background: f.severity === "high" ? "#FEF2F2" : f.severity === "medium" ? "#FFFBEB" : surf, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 999, background: f.severity === "high" ? red : f.severity === "medium" ? amber : muted, color: "#fff" }}>{f.severity}</span>
                            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{f.clause}</p>
                          </div>
                          <div style={{ padding: "10px 14px" }}>
                            <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 8 }}>{f.explanation}</p>
                            <div style={{ padding: "8px 12px", background: "#EFF6FF", borderRadius: 7 }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: blue, marginBottom: 3 }}>RECOMMENDATION</p>
                              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{f.recommendation}</p>
                            </div>
                            {f.standardMarket && (
                              <p style={{ fontSize: 11, color: muted, marginTop: 8, fontStyle: "italic" }}>Market standard: {f.standardMarket}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button onClick={() => { setTermAnalysis(null); setTermText(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Analyze Another</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Privacy Policy + ToS Generator ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Generate Privacy Policy + Terms of Service</p>
          <p style={{ fontSize: 11, color: muted }}>Leo generates complete, founder-friendly legal docs customized to your product — downloadable HTML, ready to publish.</p>
        </div>
        <button onClick={() => { setShowLegalDocModal(true); setLegalError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          Generate Docs
        </button>
      </div>

      {/* ── Legal Docs Modal ── */}
      {showLegalDocModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowLegalDocModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Legal Documents</p>
              <button onClick={() => setShowLegalDocModal(false)} style={{ background: "none", border: "none", fontSize: 18, color: muted, cursor: "pointer" }}>×</button>
            </div>
            {/* Doc type */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>What to generate</label>
              <div style={{ display: "flex", gap: 6 }}>
                {([["both", "Both (recommended)"], ["privacy", "Privacy Policy"], ["tos", "Terms of Service"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setLegalDocType(val)} style={{ flex: 1, padding: "7px 8px", borderRadius: 8, border: `1px solid ${legalDocType === val ? green : bdr}`, background: legalDocType === val ? "#F0FDF4" : bg, color: legalDocType === val ? green : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{label}</button>
                ))}
              </div>
            </div>
            {/* Checkboxes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: ink, cursor: "pointer" }}>
                <input type="checkbox" checked={legalHasAccounts} onChange={e => setLegalHasAccounts(e.target.checked)} />
                My product has user accounts / login
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: ink, cursor: "pointer" }}>
                <input type="checkbox" checked={legalCollectsPayments} onChange={e => setLegalCollectsPayments(e.target.checked)} />
                My product collects payments
              </label>
            </div>
            {/* Extra context */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Any special notes? (optional)</label>
              <textarea value={legalExtraContext} onChange={e => setLegalExtraContext(e.target.value)} placeholder="e.g. HIPAA compliance needed, GDPR applies, minors may use the product…" rows={3} style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: ink, outline: "none", resize: "none", boxSizing: "border-box" }} />
            </div>
            {legalError && <p style={{ fontSize: 11, color: red }}>{legalError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowLegalDocModal(false)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleGenerateLegalDocs} disabled={generatingLegal} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: generatingLegal ? bdr : green, color: generatingLegal ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: generatingLegal ? "not-allowed" : "pointer" }}>
                {generatingLegal ? "Generating…" : "Download HTML"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contract Clause Library ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: showClausePanel ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Contract Clause Library</p>
            <p style={{ fontSize: 11, color: muted }}>Get 3 variants of any standard clause — founder-friendly, balanced, and investor-friendly — ready to paste.</p>
          </div>
          <button onClick={() => setShowClausePanel(p => !p)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {showClausePanel ? "Hide" : "Browse Clauses"}
          </button>
        </div>
        {showClausePanel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Clause type grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {CLAUSE_TYPES.map(c => (
                <button key={c.key} onClick={() => handleFetchClause(c.key)} disabled={fetchingClause} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 8, border: `1px solid ${selectedClause === c.key ? "#7C3AED" : bdr}`, background: selectedClause === c.key ? "#EDE9FE" : bg, color: selectedClause === c.key ? "#7C3AED" : ink, fontSize: 12, cursor: fetchingClause ? "not-allowed" : "pointer", fontWeight: selectedClause === c.key ? 600 : 400 }}>
                  {fetchingClause && selectedClause === c.key ? "Generating…" : c.label}
                </button>
              ))}
            </div>
            {/* Optional context */}
            <input value={clauseContext} onChange={e => setClauseContext(e.target.value)} placeholder="Optional: add context (e.g. 'contractor agreement for offshore dev')" style={{ border: `1px solid ${bdr}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: ink, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
            {clauseError && <p style={{ fontSize: 11, color: red }}>{clauseError}</p>}
            {/* Clause result */}
            {clauseResult && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "#EDE9FE", borderRadius: 8, padding: "10px 14px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", marginBottom: 3 }}>{clauseResult.clauseType}</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{clauseResult.summary}</p>
                </div>
                {/* Variant tabs */}
                {clauseResult.variants && clauseResult.variants.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {clauseResult.variants.map((v, vi) => {
                        const vc = v.riskLevel === "low" ? green : v.riskLevel === "high" ? red : amber;
                        return (
                          <button key={vi} onClick={() => setSelectedVariant(vi)} style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1px solid ${selectedVariant === vi ? vc : bdr}`, background: selectedVariant === vi ? vc + "1A" : bg, color: selectedVariant === vi ? vc : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                    {(() => {
                      const v = clauseResult.variants![selectedVariant];
                      if (!v) return null;
                      const ck = `clause-${selectedVariant}`;
                      return (
                        <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
                          <p style={{ fontSize: 11, color: muted, marginBottom: 8, fontStyle: "italic" }}>{v.notes}</p>
                          <div style={{ position: "relative" }}>
                            <pre style={{ fontSize: 11, color: ink, lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word", background: surf, borderRadius: 8, padding: "12px 40px 12px 12px", fontFamily: "inherit", margin: 0 }}>{v.text}</pre>
                            <button onClick={() => { navigator.clipboard.writeText(v.text).then(() => { setCopiedClause(ck); setTimeout(() => setCopiedClause(null), 1500); }).catch(() => {}); }} style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: copiedClause === ck ? green : bg, color: copiedClause === ck ? "#fff" : muted, fontSize: 10, cursor: "pointer" }}>
                              {copiedClause === ck ? "✓" : "Copy"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* Negotiate + red flags */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {clauseResult.keyTermsToNegotiate && clauseResult.keyTermsToNegotiate.length > 0 && (
                    <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: `1px solid #BBF7D0` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: green, marginBottom: 6 }}>What to Negotiate</p>
                      {clauseResult.keyTermsToNegotiate.map((t, ti) => <p key={ti} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>• {t}</p>)}
                    </div>
                  )}
                  {clauseResult.redFlags && clauseResult.redFlags.length > 0 && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: `1px solid #FECACA` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: red, marginBottom: 6 }}>Red Flags to Watch</p>
                      {clauseResult.redFlags.map((f, fi) => <p key={fi} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>• {f}</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── IP Audit ─────────────────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: amber, marginBottom: 2 }}>
              IP Audit
              {ipAuditResult?.riskLevel && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: ipAuditResult.riskLevel === "critical" ? "#FEF2F2" : ipAuditResult.riskLevel === "high" ? "#FFFBEB" : "#F0FDF4", color: ipAuditResult.riskLevel === "critical" ? red : ipAuditResult.riskLevel === "high" ? amber : green, fontWeight: 700 }}>{ipAuditResult.riskLevel?.toUpperCase()}</span>}
            </p>
            <p style={{ fontSize: 11, color: muted }}>Check code ownership, prior employer claims, OSS licenses, and contractor IP before fundraising.</p>
          </div>
          <button onClick={() => { if (showIPAuditPanel && !runningIPAudit) setShowIPAuditPanel(false); else setShowIPAuditPanel(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: amber, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showIPAuditPanel ? "Close" : "Audit IP"}
          </button>
        </div>
        {showIPAuditPanel && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {!ipAuditResult ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Who wrote the code?</label>
                    <input value={ipCodeAuthors} onChange={e => setIpCodeAuthors(e.target.value)} placeholder="Founder 1, Contractor X, 3 employees..." style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Prior employers of founders/devs</label>
                    <input value={ipPriorEmployers} onChange={e => setIpPriorEmployers(e.target.value)} placeholder="Google, Meta, Stripe..." style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Open source libraries used</label>
                  <input value={ipOSSLibraries} onChange={e => setIpOSSLibraries(e.target.value)} placeholder="React (MIT), PostgreSQL (BSD), ffmpeg..." style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>Contractor IP assignments signed?</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ label: "Yes, all signed", val: true }, { label: "No / unsure", val: false }].map(opt => (
                      <button key={String(opt.val)} onClick={() => setIpHasContracts(opt.val)} style={{ flex: 1, padding: "7px 12px", borderRadius: 8, border: `1px solid ${ipHasContracts === opt.val ? (opt.val ? green : red) : bdr}`, background: ipHasContracts === opt.val ? (opt.val ? "#F0FDF4" : "#FEF2F2") : bg, color: ipHasContracts === opt.val ? (opt.val ? green : red) : muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Anything else Leo should know?</label>
                  <textarea value={ipContext} onChange={e => setIpContext(e.target.value)} placeholder="Any unusual IP situations, joint development, university IP, open source contributions..." rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                {ipAuditError && <p style={{ fontSize: 12, color: red }}>{ipAuditError}</p>}
                <button onClick={handleRunIPAudit} disabled={runningIPAudit} style={{ padding: "10px", borderRadius: 8, border: "none", background: runningIPAudit ? bdr : amber, color: runningIPAudit ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: runningIPAudit ? "not-allowed" : "pointer" }}>
                  {runningIPAudit ? "Auditing…" : "Run IP Audit"}
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Risk score */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", border: `4px solid ${(ipAuditResult.riskScore ?? 0) >= 60 ? red : (ipAuditResult.riskScore ?? 0) >= 35 ? amber : green}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: (ipAuditResult.riskScore ?? 0) >= 60 ? red : (ipAuditResult.riskScore ?? 0) >= 35 ? amber : green }}>{ipAuditResult.riskScore}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>IP Risk Score</p>
                    <p style={{ fontSize: 11, color: muted }}>0 = clean · 100 = critical risk</p>
                    {ipAuditResult.investorReadiness && <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>{ipAuditResult.investorReadiness}</p>}
                  </div>
                </div>

                {/* Urgent items */}
                {ipAuditResult.urgentItems && ipAuditResult.urgentItems.length > 0 && (
                  <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 6 }}>FIX BEFORE FUNDRAISING</p>
                    {ipAuditResult.urgentItems.map((item, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, marginBottom: 3 }}>⚠ {item}</p>
                    ))}
                  </div>
                )}

                {/* Risks */}
                {ipAuditResult.risks && ipAuditResult.risks.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 8 }}>IP Risks</p>
                    {ipAuditResult.risks.filter(r => r.severity !== "low").map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: r.severity === "critical" ? "#FEF2F2" : r.severity === "high" ? "#FFFBEB" : surf, color: r.severity === "critical" ? red : r.severity === "high" ? amber : muted, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{r.severity?.toUpperCase()}</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{r.risk}</p>
                          <p style={{ fontSize: 11, color: muted }}>{r.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {ipAuditResult.recommendations && ipAuditResult.recommendations.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 8 }}>Recommended Actions</p>
                    {ipAuditResult.recommendations.map((r, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "8px 12px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: r.timeline === "immediately" ? "#FEF2F2" : "#FFFBEB", color: r.timeline === "immediately" ? red : amber, fontWeight: 700 }}>{r.timeline?.replace("_", " ").toUpperCase()}</span>
                          <span style={{ fontSize: 10, color: green }}>{r.cost}</span>
                        </div>
                        <p style={{ fontSize: 12, color: ink }}>{r.action}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Clean items */}
                {ipAuditResult.cleanBillOfHealth && ipAuditResult.cleanBillOfHealth.length > 0 && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>✓ LOOKING GOOD</p>
                    {ipAuditResult.cleanBillOfHealth.map((c, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>✓ {c}</p>
                    ))}
                  </div>
                )}

                {ipAuditResult.priorityQuestion && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: `1px solid #BFDBFE` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 4 }}>ASK YOUR LAWYER</p>
                    <p style={{ fontSize: 12, color: ink }}>{ipAuditResult.priorityQuestion}</p>
                  </div>
                )}

                <button onClick={() => { setIpAuditResult(null); setShowIPAuditPanel(false); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Regulatory Research ───────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>
              Regulatory Research
              {regulatoryResult?.complianceScore !== undefined && (
                <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: regulatoryResult.complianceScore >= 70 ? "#F0FDF4" : regulatoryResult.complianceScore >= 40 ? "#FFFBEB" : "#FEF2F2", color: regulatoryResult.complianceScore >= 70 ? green : regulatoryResult.complianceScore >= 40 ? amber : red, fontWeight: 700 }}>
                  Compliance: {regulatoryResult.complianceScore}/100
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: muted }}>Industry-specific regulations that apply to your startup — what you must comply with and by when.</p>
          </div>
          <button onClick={() => { if (showRegulatoryPanel && !runningRegulatory) setShowRegulatoryPanel(false); else setShowRegulatoryPanel(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showRegulatoryPanel ? "Close" : regulatoryResult ? "Refresh" : "Research"}
          </button>
        </div>
        {showRegulatoryPanel && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {!regulatoryResult && !runningRegulatory && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Industry (optional — uses your profile if blank)</p>
                  <input value={regulatoryIndustry} onChange={e => setRegulatoryIndustry(e.target.value)} placeholder="e.g. HealthTech, FinTech, EdTech, SaaS…" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Additional context (optional)</p>
                  <textarea value={regulatoryContext} onChange={e => setRegulatoryContext(e.target.value)} placeholder="e.g. We handle health data, process payments, have users in EU..." rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                {regulatoryError && <p style={{ fontSize: 12, color: red }}>{regulatoryError}</p>}
                <button onClick={handleRegulatoryResearch} disabled={runningRegulatory} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                  Research Regulations
                </button>
              </div>
            )}
            {runningRegulatory && (
              <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>Researching applicable regulations for your industry…</p>
            )}
            {regulatoryResult && !runningRegulatory && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Biggest risk banner */}
                {regulatoryResult.biggestRisk && (
                  <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 4 }}>HIGHEST RISK</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{regulatoryResult.biggestRisk}</p>
                  </div>
                )}

                {/* Quick wins */}
                {regulatoryResult.quickWins && regulatoryResult.quickWins.length > 0 && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>DO THIS WEEK</p>
                    {regulatoryResult.quickWins.map((w, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>✓ {w}</p>
                    ))}
                  </div>
                )}

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4 }}>
                  {(["overview", "checklist", "risks"] as const).map(tab => (
                    <button key={tab} onClick={() => setRegActiveTab(tab)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", background: regActiveTab === tab ? blue : surf, color: regActiveTab === tab ? "#fff" : ink, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                      {tab === "overview" ? "Regulations" : tab === "checklist" ? "Checklist" : "Risk Areas"}
                    </button>
                  ))}
                </div>

                {/* Regulations tab */}
                {regActiveTab === "overview" && regulatoryResult.regulations && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {regulatoryResult.regulations.map((reg, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${reg.severity === "must_comply" ? "#FECACA" : reg.severity === "likely_applies" ? "#FDE68A" : bdr}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{reg.name}</p>
                          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: reg.severity === "must_comply" ? "#FEF2F2" : reg.severity === "likely_applies" ? "#FFFBEB" : surf, color: reg.severity === "must_comply" ? red : reg.severity === "likely_applies" ? amber : muted, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{(reg.severity ?? "").replace(/_/g, " ").toUpperCase()}</span>
                        </div>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.6, marginBottom: 4 }}>{reg.summary}</p>
                        <p style={{ fontSize: 10, color: muted }}>{reg.applicableBecause}</p>
                        {reg.penalty && <p style={{ fontSize: 10, color: red, marginTop: 4 }}>⚠ Penalty: {reg.penalty}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Checklist tab */}
                {regActiveTab === "checklist" && regulatoryResult.complianceChecklist && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {regulatoryResult.complianceChecklist.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "8px 12px", borderRadius: 8, background: surf, border: `1px solid ${bdr}`, alignItems: "flex-start" }}>
                        <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: item.timeline === "immediately" ? "#FEF2F2" : item.timeline === "before_launch" ? "#FFFBEB" : "#EFF6FF", border: `1px solid ${item.timeline === "immediately" ? "#FECACA" : item.timeline === "before_launch" ? "#FDE68A" : "#BFDBFE"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, color: item.timeline === "immediately" ? red : item.timeline === "before_launch" ? amber : blue, fontWeight: 700 }}>{item.timeline === "immediately" ? "!" : item.timeline === "before_launch" ? "◷" : "→"}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{item.item}</p>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 999, background: "#F0F0F0", color: muted, fontWeight: 600 }}>{(item.category ?? "").replace(/_/g, " ")}</span>
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 999, background: "#F0F0F0", color: muted, fontWeight: 600 }}>{item.difficulty}</span>
                            {item.estimatedCost && <span style={{ fontSize: 9, color: muted }}>~{item.estimatedCost}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risks tab */}
                {regActiveTab === "risks" && regulatoryResult.riskAreas && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {regulatoryResult.riskAreas.map((r, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: r.severity === "high" ? "#FEF2F2" : r.severity === "medium" ? "#FFFBEB" : surf, border: `1px solid ${r.severity === "high" ? "#FECACA" : r.severity === "medium" ? "#FDE68A" : bdr}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: r.severity === "high" ? red : r.severity === "medium" ? amber : ink }}>{r.area}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, color: r.severity === "high" ? red : r.severity === "medium" ? amber : muted, textTransform: "uppercase" }}>{r.severity}</span>
                        </div>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{r.risk}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expert advice */}
                {regulatoryResult.expertAdvice && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 4 }}>WHICH LAWYER TO HIRE</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{regulatoryResult.expertAdvice}</p>
                  </div>
                )}

                <button onClick={() => { setRegulatoryResult(null); setRegActiveTab("overview"); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  New Research
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Cap Table Validation ──────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: amber, marginBottom: 2 }}>
              Cap Table Validation
              {capTableResult?.healthScore !== undefined && (
                <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: capTableResult.healthScore >= 70 ? "#F0FDF4" : capTableResult.healthScore >= 40 ? "#FFFBEB" : "#FEF2F2", color: capTableResult.healthScore >= 70 ? green : capTableResult.healthScore >= 40 ? amber : red, fontWeight: 700 }}>
                  Health: {capTableResult.healthScore}/100
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: muted }}>Leo reviews your cap table for legal gaps, investor red flags, and missing agreements investors will find in due diligence.</p>
          </div>
          <button onClick={() => { if (showCapTablePanel && !runningCapTable) setShowCapTablePanel(false); else setShowCapTablePanel(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: amber, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showCapTablePanel ? "Close" : capTableResult ? "Refresh" : "Validate"}
          </button>
        </div>
        {showCapTablePanel && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {!capTableResult && !runningCapTable && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Paste your cap table * (text description is fine)</p>
                  <textarea value={capTableData} onChange={e => setCapTableData(e.target.value)} placeholder={"Founders:\n- Alice Smith: 45% (vesting 4yr/1yr cliff, start Jan 2024)\n- Bob Jones: 45% (same)\n\nOption Pool: 10% (ESOP)\n- Issued to engineers: 3%\n- Advisors: 1% (verbal agreement, no SAFE)\n\nSAFE holders: YC $500K MFN SAFE (unconverted)"} rows={8} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", fontFamily: "monospace", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Additional context (optional)</p>
                  <input value={capTableContext} onChange={e => setCapTableContext(e.target.value)} placeholder="e.g. Delaware C-Corp, raising Series A, 83(b) filed for founders" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                {capTableError && <p style={{ fontSize: 12, color: red }}>{capTableError}</p>}
                <button onClick={handleValidateCapTable} disabled={!capTableData.trim() || runningCapTable} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: !capTableData.trim() ? bdr : amber, color: !capTableData.trim() ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: !capTableData.trim() ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
                  Validate Cap Table
                </button>
              </div>
            )}
            {runningCapTable && (
              <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>Reviewing cap table structure and identifying legal gaps…</p>
            )}
            {capTableResult && !runningCapTable && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Health score + assessment */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  {capTableResult.healthScore !== undefined && (
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: capTableResult.healthScore >= 70 ? "#F0FDF4" : capTableResult.healthScore >= 40 ? "#FFFBEB" : "#FEF2F2", border: `3px solid ${capTableResult.healthScore >= 70 ? green : capTableResult.healthScore >= 40 ? amber : red}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: capTableResult.healthScore >= 70 ? green : capTableResult.healthScore >= 40 ? amber : red }}>{capTableResult.healthScore}</span>
                        <span style={{ fontSize: 8, color: muted, fontWeight: 600 }}>HEALTH</span>
                      </div>
                    </div>
                  )}
                  {capTableResult.overallAssessment && (
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, flex: 1 }}>{capTableResult.overallAssessment}</p>
                  )}
                </div>

                {/* Option pool analysis */}
                {capTableResult.optionPoolAnalysis && (
                  <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Current Pool</p><p style={{ fontSize: 15, fontWeight: 700, color: ink }}>{capTableResult.optionPoolAnalysis.currentSize}</p></div>
                    <div><p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Recommended</p><p style={{ fontSize: 15, fontWeight: 700, color: blue }}>{capTableResult.optionPoolAnalysis.recommendedSize}</p></div>
                    <p style={{ fontSize: 11, color: muted, gridColumn: "1 / -1" }}>{capTableResult.optionPoolAnalysis.reasoning}</p>
                  </div>
                )}

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4 }}>
                  {(["issues", "urgent", "investor"] as const).map(tab => (
                    <button key={tab} onClick={() => setCapTableTab(tab)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", background: capTableTab === tab ? amber : surf, color: capTableTab === tab ? "#fff" : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {tab === "issues" ? `Issues (${capTableResult?.issues?.length ?? 0})` : tab === "urgent" ? "Urgent Fixes" : "Investor Gaps"}
                    </button>
                  ))}
                </div>

                {/* Issues tab */}
                {capTableTab === "issues" && capTableResult.issues && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {capTableResult.issues.map((issue, i) => (
                      <div key={i} style={{ background: issue.severity === "critical" ? "#FEF2F2" : issue.severity === "high" ? "#FFFBEB" : surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${issue.severity === "critical" ? "#FECACA" : issue.severity === "high" ? "#FDE68A" : bdr}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: issue.severity === "critical" ? red : issue.severity === "high" ? amber : ink }}>{issue.issue}</p>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: surf, color: muted, fontWeight: 700 }}>{issue.severity.toUpperCase()}</span>
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: surf, color: muted, fontWeight: 600 }}>{(issue.category ?? "").replace(/_/g, " ")}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 4 }}>{issue.explanation}</p>
                        <p style={{ fontSize: 11, color: blue, fontWeight: 500 }}>Fix: {issue.howToFix}</p>
                        <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Timeline: {(issue.timeline ?? "").replace(/_/g, " ")}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Urgent fixes tab */}
                {capTableTab === "urgent" && capTableResult.urgentFixes && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={{ fontSize: 11, color: muted }}>Address these before your next fundraising conversation:</p>
                    {capTableResult.urgentFixes.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                        <span style={{ fontSize: 14, color: red, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{f}</p>
                      </div>
                    ))}
                    {capTableResult.safeHarbor && capTableResult.safeHarbor.length > 0 && (
                      <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0", marginTop: 8 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>DOING WELL — DON&apos;T CHANGE</p>
                        {capTableResult.safeHarbor.map((s, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>✓ {s}</p>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Investor gaps tab */}
                {capTableTab === "investor" && capTableResult.investorReadinessGaps && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={{ fontSize: 11, color: muted }}>Sophisticated investors will flag these in due diligence:</p>
                    {capTableResult.investorReadinessGaps.map((g, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>⚠ {g}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Next steps + lawyer brief */}
                {capTableResult.nextSteps && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 4 }}>NEXT STEPS</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{capTableResult.nextSteps}</p>
                  </div>
                )}
                {capTableResult.lawyerBrief && (
                  <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 4 }}>WHAT TO TELL YOUR LAWYER</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>{capTableResult.lawyerBrief}</p>
                  </div>
                )}

                <button onClick={() => { setCapTableResult(null); setCapTableData(""); setCapTableContext(""); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  Validate Another
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Document Version Diff ── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Document Version Diff</p>
            <p style={{ fontSize: 11, color: muted }}>Paste two versions of any legal document — Leo highlights every change, explains the impact, and flags what to negotiate.</p>
          </div>
          <button onClick={() => { setShowDiffModal(true); setDiffResult(null); setDiffError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            Compare Versions
          </button>
        </div>
      </div>

      {/* ── Document Diff Modal ── */}
      {showDiffModal && (
        <div onClick={() => { if (!diffing) setShowDiffModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 16, padding: 28, width: "100%", maxWidth: 780, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Document Diff Analyzer</p>
                <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>Paste original and revised — Leo finds every change and explains the legal impact</p>
              </div>
              <button onClick={() => setShowDiffModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {!diffResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Doc type */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>Document Type</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["SAFE", "Term Sheet", "NDA", "SERP", "Contractor Agreement", "Custom"].map(dt => (
                      <button key={dt} onClick={() => setDiffDocType(dt.toLowerCase().replace(/ /g, '_'))} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${diffDocType === dt.toLowerCase().replace(/ /g, '_') ? red : bdr}`, background: diffDocType === dt.toLowerCase().replace(/ /g, '_') ? "#FEF2F2" : bg, color: diffDocType === dt.toLowerCase().replace(/ /g, '_') ? red : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {dt}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Side by side textareas */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Original Version</label>
                    <textarea
                      value={diffOriginal}
                      onChange={e => setDiffOriginal(e.target.value)}
                      placeholder="Paste the original document text here…"
                      rows={10}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 11, color: ink, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Revised Version</label>
                    <textarea
                      value={diffRevised}
                      onChange={e => setDiffRevised(e.target.value)}
                      placeholder="Paste the revised document text here…"
                      rows={10}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 11, color: ink, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                {diffError && <p style={{ fontSize: 12, color: red }}>{diffError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowDiffModal(false)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleRunDiff} disabled={diffing || !diffOriginal.trim() || !diffRevised.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: diffing ? bdr : red, color: diffing ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: diffing ? "not-allowed" : "pointer" }}>
                    {diffing ? "Analyzing…" : "Compare Versions"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Summary + overall impact */}
                <div style={{ background: diffResult.overallImpact === "founder_favorable" ? "#F0FDF4" : diffResult.overallImpact === "investor_favorable" ? "#FEF2F2" : "#FFFBEB", borderRadius: 10, padding: "12px 16px", border: `1px solid ${diffResult.overallImpact === "founder_favorable" ? "#BBF7D0" : diffResult.overallImpact === "investor_favorable" ? "#FECACA" : "#FDE68A"}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: diffResult.overallImpact === "founder_favorable" ? green : diffResult.overallImpact === "investor_favorable" ? red : amber, marginBottom: 4 }}>
                    {diffResult.overallImpact === "founder_favorable" ? "✓ Favorable to Founder" : diffResult.overallImpact === "investor_favorable" ? "⚠ Favorable to Investor" : "↔ Neutral Changes"}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: ink, lineHeight: 1.6 }}>{diffResult.summary}</p>
                </div>
                {/* Changes */}
                {diffResult.changes && diffResult.changes.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 8 }}>{diffResult.changes.length} Change{diffResult.changes.length !== 1 ? 's' : ''} Found</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {diffResult.changes.map((c, ci) => {
                        const typeColor = c.type === "removed" ? red : c.type === "added" ? green : c.type === "tightened" ? amber : blue;
                        const sevColor = c.severity === "major" ? red : c.severity === "moderate" ? amber : muted;
                        return (
                          <div key={ci} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: `1px solid ${c.severity === "major" ? "#FECACA" : bdr}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: typeColor + "1A", color: typeColor, textTransform: "uppercase" }}>{c.type}</span>
                                <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{c.section}</p>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: sevColor }}>{c.severity}</span>
                            </div>
                            <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 6 }}>{c.explanation}</p>
                            <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>Impact on you: {c.founderImpact}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Red flags */}
                {diffResult.redFlags && diffResult.redFlags.length > 0 && (
                  <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "12px 14px", border: "1px solid #FECACA" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: red, marginBottom: 8 }}>🚩 Red Flags</p>
                    {diffResult.redFlags.map((f, fi) => <p key={fi} style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>• {f}</p>)}
                  </div>
                )}
                {/* Wins by side */}
                {diffResult.winsBySide && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {diffResult.winsBySide.founder && diffResult.winsBySide.founder.length > 0 && (
                      <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>✓ Your Wins</p>
                        {diffResult.winsBySide.founder.map((w, wi) => <p key={wi} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>• {w}</p>)}
                      </div>
                    )}
                    {diffResult.winsBySide.investor && diffResult.winsBySide.investor.length > 0 && (
                      <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: "1px solid #FECACA" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 6 }}>⚠ Investor Wins</p>
                        {diffResult.winsBySide.investor.map((w, wi) => <p key={wi} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>• {w}</p>)}
                      </div>
                    )}
                  </div>
                )}
                {diffResult.negotiationAdvice && (
                  <div style={{ background: "#FFFBEB", borderRadius: 10, padding: "12px 14px", border: "1px solid #FDE68A" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: amber, marginBottom: 4 }}>What to Push Back On</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{diffResult.negotiationAdvice}</p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setDiffResult(null); setDiffOriginal(""); setDiffRevised(""); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer" }}>Compare Another</button>
                  <button onClick={() => setShowDiffModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Contractor Agreement Generator ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showContractorPanel ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Contractor Agreement Generator</p>
            <p style={{ fontSize: 11, color: muted }}>Leo drafts a ready-to-sign Independent Contractor Agreement (IC) — IP assignment, confidentiality, non-solicitation, and payment terms included.</p>
            {ctxError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{ctxError}</p>}
          </div>
          <button onClick={() => { setShowContractorPanel(!showContractorPanel); setCtxError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {showContractorPanel ? "Close" : "Draft Agreement"}
          </button>
        </div>
        {showContractorPanel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Contractor Name *</label>
                <input value={ctxName} onChange={e => setCtxName(e.target.value)} placeholder="Alex Johnson" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Role / Service *</label>
                <input value={ctxRole} onChange={e => setCtxRole(e.target.value)} placeholder="Full-stack Developer" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Compensation Type</label>
                <select value={ctxCompType} onChange={e => setCtxCompType(e.target.value as "hourly" | "project")} style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", background: "#fff" }}>
                  <option value="hourly">Hourly Rate</option>
                  <option value="project">Project Fee</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Rate / Fee ($)</label>
                <input value={ctxRate} onChange={e => setCtxRate(e.target.value)} placeholder={ctxCompType === "hourly" ? "150" : "5000"} style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Start Date</label>
                <input value={ctxStartDate} onChange={e => setCtxStartDate(e.target.value)} placeholder="e.g. April 1, 2026" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Scope of Work *</label>
              <textarea value={ctxScope} onChange={e => setCtxScope(e.target.value)} placeholder="e.g. Design and develop a Next.js web application including authentication, dashboard, and API integrations. Deliver working code in 6 weeks." rows={3} style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: ink, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleGenerateContractor} disabled={generatingCtx || !ctxName.trim() || !ctxRole.trim() || !ctxScope.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: generatingCtx || !ctxName.trim() || !ctxRole.trim() || !ctxScope.trim() ? bdr : ink, color: generatingCtx || !ctxName.trim() || !ctxRole.trim() || !ctxScope.trim() ? muted : bg, fontSize: 13, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
              {generatingCtx ? "Drafting…" : "Download Contractor Agreement"}
            </button>
          </div>
        )}
      </div>

      {/* ── Compliance Audit ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: complianceReport ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: red, marginBottom: 2 }}>Compliance Audit</p>
            <p style={{ fontSize: 11, color: muted }}>Leo reviews your legal checklist against your stage and industry, flags risk items, and prioritizes the actions that matter most right now.</p>
            {complianceError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{complianceError}</p>}
          </div>
          <button onClick={handleRunCompliance} disabled={runningCompliance}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningCompliance ? bdr : red, color: runningCompliance ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: runningCompliance ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {runningCompliance ? "Auditing…" : "Run Audit"}
          </button>
        </div>
        {complianceReport && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: complianceReport.overallRisk === 'high' ? "#FEE2E2" : complianceReport.overallRisk === 'medium' ? "#FEF3C7" : "#DCFCE7", color: complianceReport.overallRisk === 'high' ? red : complianceReport.overallRisk === 'medium' ? amber : "#16A34A" }}>
                {complianceReport.overallRisk?.toUpperCase()} RISK
              </span>
              <p style={{ fontSize: 12, color: muted }}>{complianceReport.riskSummary}</p>
            </div>
            {(complianceReport.priorityActions ?? []).length > 0 && (
              <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Priority Actions</p>
                {(complianceReport.priorityActions ?? []).map((a, i) => (
                  <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>→ {a}</p>
                ))}
              </div>
            )}
            {(complianceReport.items ?? []).map((item, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ink }}>{item.area}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: item.status === 'critical' ? "#FEE2E2" : item.status === 'needs attention' ? "#FEF3C7" : "#DCFCE7", color: item.status === 'critical' ? red : item.status === 'needs attention' ? amber : "#16A34A" }}>
                    {item.status}
                  </span>
                  <span style={{ fontSize: 10, color: muted }}>effort: {item.effort}</span>
                </div>
                <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{item.finding}</p>
                <p style={{ fontSize: 11, color: blue, fontWeight: 600 }}>→ {item.action}</p>
              </div>
            ))}
            {complianceReport.upcomingDeadlines && complianceReport.upcomingDeadlines.length > 0 && (
              <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 6 }}>Upcoming Deadlines</p>
                {complianceReport.upcomingDeadlines.map((d, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}><strong>{d.item}</strong> — {d.deadline} <span style={{ color: red }}>({d.consequence})</span></p>
                ))}
              </div>
            )}
            {complianceReport.disclaimer && <p style={{ fontSize: 10, color: muted, fontStyle: "italic" }}>{complianceReport.disclaimer}</p>}
            <button onClick={() => setComplianceReport(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── IP Strategy ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>IP Strategy</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Patents, trademarks, trade secrets, and licensing opportunities — your full IP moat.</p>
          </div>
          <button onClick={handleGenerateIPStrategy} disabled={generatingIPStrat} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingIPStrat ? bdr : blue, color: generatingIPStrat ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingIPStrat ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingIPStrat ? "Analyzing…" : "Build IP Strategy"}
          </button>
        </div>
        {ipStratError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{ipStratError}</p>}
        {ipStratResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {!!ipStratResult.ipScore && (
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: blue + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: blue }}>{String(ipStratResult.ipScore)}</span>
                </div>
              )}
              {!!ipStratResult.verdict && <p style={{ fontSize: 12, color: muted, fontStyle: "italic" }}>{String(ipStratResult.verdict)}</p>}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
              {(["portfolio", "trademarks", "patents", "redflags"] as const).map(t => (
                <button key={t} onClick={() => setIpStratTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${ipStratTab === t ? blue : bdr}`, background: ipStratTab === t ? blue : bg, color: ipStratTab === t ? "#fff" : ink, fontSize: 11, fontWeight: ipStratTab === t ? 700 : 400, cursor: "pointer" }}>
                  {t === "portfolio" ? "📁 Portfolio" : t === "trademarks" ? "™ Trademarks" : t === "patents" ? "⚙️ Patents" : "🚩 Red Flags"}
                </button>
              ))}
            </div>
            {ipStratTab === "portfolio" && !!ipStratResult.portfolio && (() => {
              const items = ipStratResult.portfolio as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((ip, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(ip.asset ?? '')}</p>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          {!!ip.ipType && <span style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 7px", color: muted }}>{String(ip.ipType)}</span>}
                          {!!ip.protectionLevel && <span style={{ fontSize: 10, fontWeight: 700, color: ip.protectionLevel === 'strong' ? green : ip.protectionLevel === 'weak' ? red : amber }}>{String(ip.protectionLevel)}</span>}
                        </div>
                      </div>
                      {!!ip.status && <p style={{ fontSize: 11, color: blue, marginBottom: 2 }}><b>Status:</b> {String(ip.status)}</p>}
                      {!!ip.value && <p style={{ fontSize: 11, color: muted }}>{String(ip.value)}</p>}
                    </div>
                  ))}
                  {!!ipStratResult.defensiveMoat && (
                    <div style={{ background: blue + "11", borderRadius: 8, padding: 10, borderLeft: `3px solid ${blue}` }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Defensive Moat</p>
                      <p style={{ fontSize: 11, color: ink }}>{String(ipStratResult.defensiveMoat)}</p>
                    </div>
                  )}
                </div>
              );
            })()}
            {ipStratTab === "trademarks" && !!ipStratResult.trademarks && (() => {
              const items = ipStratResult.trademarks as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((tm, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(tm.mark ?? '')}</p>
                        {!!tm.urgency && <span style={{ fontSize: 10, fontWeight: 700, color: String(tm.urgency).includes('now') ? red : amber }}>{String(tm.urgency)}</span>}
                      </div>
                      {!!tm.class && <p style={{ fontSize: 11, color: muted, marginBottom: 2 }}>{String(tm.class)}</p>}
                      {!!tm.cost && <p style={{ fontSize: 11, color: green }}>{String(tm.cost)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {ipStratTab === "patents" && !!ipStratResult.patentCandidates && (() => {
              const items = ipStratResult.patentCandidates as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((p, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(p.invention ?? '')}</p>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          {!!p.type && <span style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 7px", color: muted }}>{String(p.type)}</span>}
                          {!!p.viability && <span style={{ fontSize: 10, fontWeight: 700, color: p.viability === 'high' ? green : p.viability === 'low' ? red : amber }}>{String(p.viability)}</span>}
                        </div>
                      </div>
                      {!!p.reasoning && <p style={{ fontSize: 11, color: muted }}>{String(p.reasoning)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {ipStratTab === "redflags" && !!ipStratResult.redFlags && (() => {
              const items = ipStratResult.redFlags as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((rf, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${rf.severity === 'high' ? red : rf.severity === 'medium' ? amber : bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(rf.risk ?? '')}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: rf.severity === 'high' ? red : rf.severity === 'medium' ? amber : green }}>{String(rf.severity ?? '').toUpperCase()}</span>
                      </div>
                      {!!rf.fix && <p style={{ fontSize: 11, color: blue }}><b>Fix:</b> {String(rf.fix)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {!!ipStratResult.priorityAction && (
              <div style={{ marginTop: 12, background: blue + "11", borderRadius: 8, padding: 10, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Priority Action</p>
                <p style={{ fontSize: 12, color: ink }}>{String(ipStratResult.priorityAction)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fundraising Checklist ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Fundraising Readiness</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Complete fundraising checklist — phases, data room, due diligence prep, and investor FAQ</p>
          </div>
          <button onClick={handleGenerateFRChecklist} disabled={generatingFRChecklist} style={{ padding: "8px 16px", borderRadius: 8, background: generatingFRChecklist ? surf : ink, color: generatingFRChecklist ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingFRChecklist ? "default" : "pointer" }}>
            {generatingFRChecklist ? "Assessing…" : "Check Readiness"}
          </button>
        </div>
        {frChecklistError && <p style={{ color: "#DC2626", fontSize: 12 }}>{frChecklistError}</p>}
        {frChecklistResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: surf, borderRadius: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: bg, margin: 0 }}>{String(frChecklistResult.readinessScore ?? 0)}</p>
              </div>
              <div>
                {!!frChecklistResult.verdict && <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 2px" }}>{String(frChecklistResult.verdict)}</p>}
                {!!frChecklistResult.readinessLevel && <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 12, background: frChecklistResult.readinessLevel==="ready" ? "#D1FAE5" : frChecklistResult.readinessLevel==="overdue" ? "#FEE2E2" : "#FEF3C7", color: frChecklistResult.readinessLevel==="ready" ? "#16A34A" : frChecklistResult.readinessLevel==="overdue" ? "#DC2626" : "#D97706", fontWeight: 600 }}>{String(frChecklistResult.readinessLevel)}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["phases","redflags","dataroom","faq"] as const).map(t => (
                <button key={t} onClick={() => setFrChecklistTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${frChecklistTab===t ? ink : bdr}`, background: frChecklistTab===t ? ink : bg, color: frChecklistTab===t ? bg : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t==="phases" ? "📋 Phases" : t==="redflags" ? "🚩 Red Flags" : t==="dataroom" ? "📁 Data Room" : "❓ Investor FAQ"}
                </button>
              ))}
            </div>
            {frChecklistTab === "phases" && !!(frChecklistResult.phases as unknown[])?.length && (
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {(frChecklistResult.phases as { phase: string }[]).map((p, i) => (
                    <button key={i} onClick={() => setFrChecklistPhaseIdx(i)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${frChecklistPhaseIdx===i ? ink : bdr}`, background: frChecklistPhaseIdx===i ? ink : bg, color: frChecklistPhaseIdx===i ? bg : ink, fontSize: 11, cursor: "pointer" }}>{p.phase}</button>
                  ))}
                </div>
                {(() => {
                  const ph = (frChecklistResult.phases as Record<string, unknown>[])[frChecklistPhaseIdx];
                  if (!ph) return null;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(ph.tasks as { task: string; done: boolean; critical: boolean; effort: string; timeToComplete: string }[] | undefined ?? []).map((t, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: t.done ? "#F0FDF4" : surf, borderRadius: 8, border: `1px solid ${t.critical ? "#DC2626" : bdr}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ fontSize: 14, marginTop: 1 }}>{t.done ? "✅" : "⬜"}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, color: ink, margin: "0 0 2px" }}>{t.task}</p>
                            <div style={{ display: "flex", gap: 8 }}>
                              {t.critical && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>CRITICAL</span>}
                              <span style={{ fontSize: 10, color: muted }}>Effort: {t.effort}</span>
                              <span style={{ fontSize: 10, color: muted }}>{t.timeToComplete}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
            {frChecklistTab === "redflags" && !!(frChecklistResult.redFlags as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(frChecklistResult.redFlags as { flag: string; severity: string; fix: string }[]).map((f, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #DC2626" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{f.flag}</p>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: f.severity==="high" ? "#DC2626" : "#D97706", color: "#fff", fontWeight: 700 }}>{f.severity}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#16A34A", margin: 0 }}>Fix: {f.fix}</p>
                  </div>
                ))}
              </div>
            )}
            {frChecklistTab === "dataroom" && !!(frChecklistResult.dataRoomItems as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(frChecklistResult.dataRoomItems as { item: string; priority: string; status: string }[]).map((d, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: surf, borderRadius: 8 }}>
                    <p style={{ fontSize: 12, color: ink, margin: 0 }}>{d.item}</p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: d.priority==="must-have" ? ink : surf, color: d.priority==="must-have" ? bg : muted, fontWeight: 600 }}>{d.priority}</span>
                      <span style={{ fontSize: 10, color: d.status==="ready" ? "#16A34A" : d.status==="needs creation" ? "#DC2626" : muted }}>{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {frChecklistTab === "faq" && !!(frChecklistResult.investorFAQ as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(frChecklistResult.investorFAQ as { question: string; strongAnswer: string }[]).map((f, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 6px" }}>Q: {f.question}</p>
                    <p style={{ fontSize: 12, color: muted, margin: 0 }}>{f.strongAnswer}</p>
                  </div>
                ))}
              </div>
            )}
            {!!frChecklistResult.priorityAction && <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}><p style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>Priority Action</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(frChecklistResult.priorityAction)}</p></div>}
            <button onClick={() => setFrChecklistResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Term Sheet Analyzer ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Term Sheet Analyzer</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Decode any term sheet — red flags, founder-friendly terms, and negotiation leverage</p>
          </div>
          <button onClick={handleAnalyzeTermSheet} disabled={generatingTS} style={{ padding: "8px 16px", borderRadius: 8, background: generatingTS ? surf : ink, color: generatingTS ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingTS ? "default" : "pointer" }}>
            {generatingTS ? "Analyzing…" : "Analyze Term Sheet"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <select value={tsInstrument} onChange={e => setTsInstrument(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 12 }}>
            {["SAFE","Convertible Note","Priced Equity","KISS"].map(i => <option key={i}>{i}</option>)}
          </select>
          <input value={tsRaiseAmount} onChange={e => setTsRaiseAmount(e.target.value)} placeholder="Raise amount (e.g. $2M)" style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 12, width: 160 }} />
          <input value={tsValuation} onChange={e => setTsValuation(e.target.value)} placeholder="Valuation cap (e.g. $10M)" style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 12, width: 180 }} />
          <input value={tsLeadInvestor} onChange={e => setTsLeadInvestor(e.target.value)} placeholder="Lead investor (optional)" style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 12, width: 180 }} />
        </div>
        {tsError && <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 10 }}>{tsError}</p>}
        {tsResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!tsResult.summary && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(tsResult.summary)}</p>}
            {!!tsResult.verdict && <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, margin: 0 }}>Verdict: {String(tsResult.verdict)}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["flags","friendly","negotiation","glossary"] as const).map(t => (
                <button key={t} onClick={() => setTsTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${tsTab===t ? ink : bdr}`, background: tsTab===t ? ink : bg, color: tsTab===t ? bg : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t==="flags" ? "🚩 Red Flags" : t==="friendly" ? "✅ Founder-Friendly" : t==="negotiation" ? "🤝 Negotiate" : "📖 Glossary"}
                </button>
              ))}
            </div>
            {tsTab === "flags" && !!(tsResult.redFlags as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(tsResult.redFlags as { flag: string; risk: string; suggestion: string }[]).map((f, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #DC2626" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", margin: "0 0 4px" }}>{f.flag}</p>
                    <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>{f.risk}</p>
                    <p style={{ fontSize: 11, color: "#16A34A", margin: 0 }}>Suggestion: {f.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
            {tsTab === "friendly" && !!(tsResult.founderFriendly as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(tsResult.founderFriendly as { term: string; why: string }[]).map((f, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>{f.term}</p>
                    <p style={{ fontSize: 12, color: ink, margin: 0 }}>{f.why}</p>
                  </div>
                ))}
              </div>
            )}
            {tsTab === "negotiation" && !!(tsResult.negotiationPoints as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(tsResult.negotiationPoints as { point: string; ask: string; rationale: string; priority: string }[]).map((n, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{n.point}</p>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: n.priority==="high" ? "#DC2626" : n.priority==="medium" ? "#D97706" : "#8A867C", color: "#fff", fontWeight: 700 }}>{n.priority}</span>
                    </div>
                    <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Ask: <strong>{n.ask}</strong></p>
                    <p style={{ fontSize: 11, color: muted, margin: 0 }}>{n.rationale}</p>
                  </div>
                ))}
              </div>
            )}
            {tsTab === "glossary" && !!(tsResult.glossary as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(tsResult.glossary as { term: string; plain: string }[]).map((g, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: surf, borderRadius: 8, display: "flex", gap: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0, minWidth: 140 }}>{g.term}</p>
                    <p style={{ fontSize: 12, color: muted, margin: 0 }}>{g.plain}</p>
                  </div>
                ))}
              </div>
            )}
            {!!tsResult.lawyerBrief && <div style={{ padding: "10px 14px", background: "#EFF6FF", borderRadius: 8, borderLeft: "3px solid #2563EB" }}><p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", margin: "0 0 4px" }}>For your lawyer:</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(tsResult.lawyerBrief)}</p></div>}
            <button onClick={() => setTsResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-analyze</button>
          </div>
        )}
      </div>

      {/* ── Equity Plan ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: ink, margin: 0 }}>Equity Plan Builder</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Model your option pool, grant strategy, and dilution scenarios</p>
          </div>
          <button onClick={handleGenerateEquityPlan} disabled={generatingEP} style={{ padding: "8px 16px", borderRadius: 8, background: generatingEP ? muted : ink, color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: generatingEP ? "not-allowed" : "pointer" }}>
            {generatingEP ? "Building…" : "Build Equity Plan"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          {[
            { label: "Option Pool %", value: epPoolPct, set: setEpPoolPct, placeholder: "10" },
            { label: "Vesting Years", value: epVesting, set: setEpVesting, placeholder: "4" },
            { label: "Cliff (months)", value: epCliff, set: setEpCliff, placeholder: "12" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{label}</p>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, background: bg, boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        {epError && <p style={{ fontSize: 12, color: red, marginBottom: 10 }}>{epError}</p>}
        {epResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["grants", "vesting", "dilution", "legal"] as const).map(t => (
                <button key={t} onClick={() => setEpTab(t)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${epTab === t ? ink : bdr}`, background: epTab === t ? ink : "transparent", color: epTab === t ? "#fff" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
              ))}
            </div>
            {epTab === "grants" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Option Pool", val: (epResult.optionPool as Record<string,unknown>)?.totalShares },
                    { label: "Pool %", val: (epResult.optionPool as Record<string,unknown>)?.percentOfCompany },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: bg, borderRadius: 8, padding: 12, textAlign: "center" as const }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: ink, margin: 0 }}>{String(val ?? "—")}</p>
                      <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{label}</p>
                    </div>
                  ))}
                </div>
                {!!(epResult.grantSuggestions as unknown[])?.length && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 8 }}>Grant Suggestions</p>
                    {(epResult.grantSuggestions as { role: string; shares: string; percentEquity: string; rationale: string }[]).map((g, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{g.role}</p>
                          <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{g.rationale}</p>
                        </div>
                        <div style={{ textAlign: "right" as const }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{g.percentEquity}</p>
                          <p style={{ fontSize: 11, color: muted }}>{g.shares} shares</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!!epResult.keyInsight && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginTop: 10 }}>{String(epResult.keyInsight)}</p>}
              </div>
            )}
            {epTab === "vesting" && (
              <div>
                {!!epResult.vestingSchedule && (() => {
                  const vs = epResult.vestingSchedule as Record<string, unknown>;
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                        {[["Cliff", vs.cliff], ["Total Period", vs.totalPeriod], ["Post-Cliff", vs.postCliffSchedule]].map(([l, v]) => (
                          <div key={String(l)} style={{ background: bg, borderRadius: 8, padding: 10, textAlign: "center" as const }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{String(v ?? "—")}</p>
                            <p style={{ fontSize: 11, color: muted }}>{String(l)}</p>
                          </div>
                        ))}
                      </div>
                      {!!vs.earlyExercise && <p style={{ fontSize: 12, color: muted }}><strong>Early Exercise:</strong> {String(vs.earlyExercise)}</p>}
                      {!!vs.acceleration && <p style={{ fontSize: 12, color: muted }}><strong>Acceleration:</strong> {String(vs.acceleration)}</p>}
                    </div>
                  );
                })()}
                {!!epResult.refreshStrategy && <p style={{ fontSize: 12, color: muted, fontStyle: "italic" }}><strong>Refresh Strategy:</strong> {String(epResult.refreshStrategy)}</p>}
              </div>
            )}
            {epTab === "dilution" && (
              <div>
                {!!(epResult.dilutionModel as unknown[])?.length && (
                  <div>
                    {(epResult.dilutionModel as { round: string; newShares: string; postRoundPool: string; founderDilution: string; note: string }[]).map((r, i) => (
                      <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{r.round}</p>
                          <p style={{ fontSize: 12, color: red, fontWeight: 600, margin: 0 }}>-{r.founderDilution}</p>
                        </div>
                        <p style={{ fontSize: 11, color: muted, margin: 0 }}>{r.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {epTab === "legal" && (
              <div>
                {!!(epResult.a409Guidance as unknown[])?.length && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 8 }}>409A Guidance</p>
                    {(epResult.a409Guidance as { topic: string; guidance: string }[]).map((g, i) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{g.topic}</p>
                        <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>{g.guidance}</p>
                      </div>
                    ))}
                  </div>
                )}
                {!!(epResult.legalChecklist as unknown[])?.length && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 8 }}>Legal Checklist</p>
                    {(epResult.legalChecklist as { item: string; status: string; priority: string }[]).map((c, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 12, color: ink, margin: 0 }}>{c.item}</p>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: c.priority === "critical" ? "#FEE2E2" : "#FEF3C7", color: c.priority === "critical" ? red : amber, fontWeight: 600 }}>{c.priority}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIRING PLAN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
