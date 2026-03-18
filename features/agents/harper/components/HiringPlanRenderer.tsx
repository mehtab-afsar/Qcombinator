'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, CheckCircle2, Loader2, Globe, Copy, Check, Download, ExternalLink, Send, MessageSquare } from 'lucide-react'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'
import { CopyBtn } from '../../shared/components/CopyBtn'

export function HiringPlanRenderer({ data, artifactId, userId }: { data: Record<string, unknown>; artifactId?: string; userId?: string }) {
  const d = data as {
    currentGaps?: string[];
    nextHires?: { role: string; priority: string; timing: string; whyNow?: string; responsibilities?: string[]; requirements?: string[]; niceToHave?: string[]; salaryRange?: string; equity?: string }[];
    orgRoadmap?: { milestone: string; teamSize: number; newRoles: string[] }[];
    compensationBands?: { role: string; salary: string; equity: string; stage: string }[];
    interviewProcess?: string[];
    cultureValues?: string[];
  };

  type Application = { id: string; role_slug: string; role_title?: string; applicant_name: string; applicant_email: string; score?: number; score_notes?: string; created_at: string; status?: string };
  const [applications, setApplications] = useState<Application[]>([]);
  const [showApps, setShowApps]         = useState(false);
  const [loadingApps, setLoadingApps]   = useState(false);

  // Hiring funnel analytics state
  const [showFunnelPanel, setShowFunnelPanel] = useState(false);
  const [loadingFunnel, setLoadingFunnel]     = useState(false);
  const [funnelData, setFunnelData]           = useState<{
    funnel?: { sourced: number; outreached: number; applied: number; screened: number; interviewed: number; offered: number; hired: number };
    conversionRates?: { sourceToApply: number | null; applyToScreen: number | null; screenToInterview: number | null; interviewToOffer: number | null; offerToHire: number | null };
    avgScore?: number | null;
    scoreDistribution?: { strong: number; good: number; weak: number };
    byRole?: Record<string, { applied: number; screened: number }>;
    avgDaysToOffer?: number | null;
  } | null>(null);

  async function loadFunnelData() {
    if (loadingFunnel) return;
    setLoadingFunnel(true); setShowFunnelPanel(true);
    try {
      const res = await fetch('/api/agents/harper/pipeline');
      if (res.ok) { const r = await res.json(); setFunnelData(r); }
    } catch { /* ignore */ }
    finally { setLoadingFunnel(false); }
  }

  // Rejection state
  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [rejectSentIds, setRejectSentIds] = useState<Set<string>>(new Set());

  // Interview scorecard state
  const [scorecardApp, setScorecardApp]       = useState<Application | null>(null);
  const [scorecardNotes, setScorecardNotes]   = useState("");
  const [scoringApp, setScoringApp]           = useState(false);
  const [scorecardResult, setScorecardResult] = useState<{
    overallScore?: number; recommendation?: string; summary?: string;
    dimensions?: { name: string; score: number; maxScore: number; evidence: string; gap: string | null }[];
    strengths?: string[]; concerns?: string[]; suggestedNextSteps?: string; referenceCheckFocus?: string;
  } | null>(null);
  const [scorecardError, setScorecardError] = useState<string | null>(null);

  async function handleGenerateScorecard() {
    if (!scorecardApp || !scorecardNotes.trim() || scoringApp) return;
    setScoringApp(true); setScorecardError(null); setScorecardResult(null);
    try {
      const res = await fetch('/api/agents/harper/scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: scorecardApp.applicant_name,
          role: scorecardApp.role_title ?? scorecardApp.role_slug,
          interviewNotes: scorecardNotes,
          applicationId: scorecardApp.id,
        }),
      });
      const r = await res.json();
      if (res.ok) setScorecardResult(r.scorecard);
      else setScorecardError(r.error ?? 'Failed to generate scorecard');
    } catch { setScorecardError('Network error'); }
    finally { setScoringApp(false); }
  }

  async function handleSendRejection(app: Application) {
    if (rejectingId === app.id) return;
    setRejectingId(app.id);
    try {
      const res = await fetch('/api/agents/harper/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId:  app.id,
          applicantName:  app.applicant_name,
          applicantEmail: app.applicant_email,
          roleTitle:      app.role_title ?? app.role_slug,
          score:          app.score,
          scoreNotes:     app.score_notes,
        }),
      });
      if (res.ok) setRejectSentIds(prev => new Set([...prev, app.id]));
    } catch { /* non-critical */ }
    finally { setRejectingId(null); }
  }

  // Offer letter state
  const [showOfferModal, setShowOfferModal]     = useState(false);
  const [offerCandidate, setOfferCandidate]     = useState("");
  const [offerEmail, setOfferEmail]             = useState("");
  const [offerRole, setOfferRole]               = useState("");
  const [offerSalary, setOfferSalary]           = useState("");
  const [offerEquity, setOfferEquity]           = useState("");
  const [offerStartDate, setOfferStartDate]     = useState("");
  const [generatingOffer, setGeneratingOffer]   = useState(false);
  const [offerHtml, setOfferHtml]               = useState<string | null>(null);
  const [offerError, setOfferError]             = useState<string | null>(null);
  const [offerSendEmail, setOfferSendEmail]     = useState(false);

  // Candidate outreach state
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  // Reference check kit state
  const [showRefKitPanel, setShowRefKitPanel]     = useState(false);
  const [refCandidateName, setRefCandidateName]   = useState("");
  const [refRole, setRefRole]                     = useState("");
  const [refClaimedExp, setRefClaimedExp]         = useState("");
  const [refConcerns, setRefConcerns]             = useState("");
  const [generatingRefKit, setGeneratingRefKit]   = useState(false);
  const [refKitResult, setRefKitResult]           = useState<{
    intro?: string;
    questions?: { category: string; question: string; whyItMatters: string; followUp: string | null; redFlagAnswer: string | null }[];
    redFlagProbes?: { concern: string; question: string }[];
    signalQuestions?: string[];
    outro?: string;
    interpretationGuide?: string;
  } | null>(null);
  const [refKitError, setRefKitError]             = useState<string | null>(null);
  const [refActiveSection, setRefActiveSection]   = useState<"questions" | "redflags" | "signals">("questions");

  // Compensation framework state
  const [generatingComp, setGeneratingComp] = useState(false);
  const [compResult, setCompResult] = useState<{
    philosophyStatement?: string;
    salaryBands?: { level: string; title: string; department: string; baseSalaryRange?: { low: string; mid: string; high: string }; targetTotalComp?: string; benchmarkPercentile?: string; notes?: string }[];
    equityBands?: { level: string; title: string; equityRange: string; vestingSchedule?: string; refreshPolicy?: string; dilutionNote?: string }[];
    benefitsStack?: { mustHave?: string[]; competitive?: string[]; earlyStageAlternatives?: string[] };
    negotiationPlaybook?: { scenario: string; response: string }[];
    offerStructure?: string;
    refreshGrantPolicy?: string;
    benchmarkSources?: string[];
    keyInsight?: string;
  } | null>(null);
  const [compError, setCompError] = useState<string | null>(null);
  const [compTab, setCompTab] = useState<'salary' | 'equity' | 'negotiation'>('salary');

  async function handleGenerateComp() {
    if (generatingComp) return;
    setGeneratingComp(true); setCompError(null);
    try {
      const res = await fetch('/api/agents/harper/compensation', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.framework) setCompResult(r.framework);
      else setCompError(r.error ?? 'Failed to generate compensation framework');
    } catch { setCompError('Network error'); }
    finally { setGeneratingComp(false); }
  }

  // Job description state
  const [jdRole, setJdRole]             = useState('');
  const [jdLevel, setJdLevel]           = useState('');
  const [jdDepartment, setJdDepartment] = useState('');
  const [generatingJD, setGeneratingJD] = useState(false);
  const [jdError, setJdError]           = useState<string | null>(null);

  async function handleGenerateJD() {
    if (!jdRole.trim() || generatingJD) return;
    setGeneratingJD(true); setJdError(null);
    try {
      const res = await fetch('/api/agents/harper/job-descriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: jdRole, level: jdLevel || undefined, department: jdDepartment || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `jd-${jdRole.toLowerCase().replace(/\s+/g, '-')}.html`; a.click();
        URL.revokeObjectURL(url);
      } else { setJdError(r.error ?? 'Failed to generate job description'); }
    } catch { setJdError('Network error'); }
    finally { setGeneratingJD(false); }
  }

  // Culture Assessment (Harper) state
  const [generatingCultAssess, setGeneratingCultAssess] = useState(false);
  const [cultAssessResult, setCultAssessResult]         = useState<Record<string, unknown> | null>(null);
  const [cultAssessError, setCultAssessError]           = useState<string | null>(null);
  const [cultAssessDimIdx, setCultAssessDimIdx]         = useState(0);
  const [cultAssessTab, setCultAssessTab]               = useState<'dimensions' | 'rituals' | 'hiring' | 'remote'>('dimensions');

  async function handleGenerateCultureAssessment() {
    if (generatingCultAssess) return;
    setGeneratingCultAssess(true); setCultAssessError(null); setCultAssessResult(null);
    try {
      const res = await fetch('/api/agents/harper/culture-assessment', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.assessment) setCultAssessResult(r.assessment);
      else setCultAssessError(r.error ?? 'Generation failed');
    } catch { setCultAssessError('Network error'); }
    finally { setGeneratingCultAssess(false); }
  }

  // Salary Benchmarking state
  const [salaryRolesInput, setSalaryRolesInput]     = useState('');
  const [salaryLocation, setSalaryLocation]         = useState('US (remote-friendly)');
  const [generatingSalary, setGeneratingSalary]     = useState(false);
  const [salaryResult, setSalaryResult]             = useState<Record<string, unknown> | null>(null);
  const [salaryError, setSalaryError]               = useState<string | null>(null);
  const [salaryRoleIdx, setSalaryRoleIdx]           = useState(0);

  async function handleGenerateSalaryBenchmarks() {
    if (generatingSalary) return;
    setGeneratingSalary(true); setSalaryError(null); setSalaryResult(null);
    const roles = salaryRolesInput ? salaryRolesInput.split(',').map(r => r.trim()).filter(Boolean) : undefined;
    try {
      const res = await fetch('/api/agents/harper/salary-benchmarking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles, location: salaryLocation || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.benchmarks) setSalaryResult(r.benchmarks);
      else setSalaryError(r.error ?? 'Generation failed');
    } catch { setSalaryError('Network error'); }
    finally { setGeneratingSalary(false); }
  }

  // Performance Review state
  const [prName, setPrName]                         = useState('');
  const [prRole, setPrRole]                         = useState('');
  const [prPeriod, setPrPeriod]                     = useState('Q1 2026');
  const [generatingPR, setGeneratingPR]             = useState(false);
  const [prResult, setPrResult]                     = useState<{ framework: Record<string, unknown>; html: string } | null>(null);
  const [prError, setPrError]                       = useState<string | null>(null);

  async function handleGeneratePerformanceReview() {
    if (generatingPR) return;
    setGeneratingPR(true); setPrError(null); setPrResult(null);
    try {
      const res = await fetch('/api/agents/harper/performance-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName: prName || undefined, role: prRole || undefined, reviewPeriod: prPeriod || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.review) setPrResult(r.review as { framework: Record<string, unknown>; html: string });
      else setPrError(r.error ?? 'Generation failed');
    } catch { setPrError('Network error'); }
    finally { setGeneratingPR(false); }
  }

  function handleDownloadPR() {
    if (!prResult?.html) return;
    const blob = new Blob([prResult.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `performance-review-${(prName || 'employee').replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Culture Deck state
  const [generatingCulture, setGeneratingCulture]   = useState(false);
  const [cultureResult, setCultureResult]           = useState<{ deck: Record<string, unknown>; html: string } | null>(null);
  const [cultureError, setCultureError]             = useState<string | null>(null);

  async function handleGenerateCultureDeck() {
    if (generatingCulture) return;
    setGeneratingCulture(true); setCultureError(null); setCultureResult(null);
    try {
      const res = await fetch('/api/agents/harper/culture-deck', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.deck && r.html) setCultureResult({ deck: r.deck, html: r.html });
      else setCultureError(r.error ?? 'Generation failed');
    } catch { setCultureError('Network error'); }
    finally { setGeneratingCulture(false); }
  }

  function handleDownloadCultureDeck() {
    if (!cultureResult?.html) return;
    const blob = new Blob([cultureResult.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'culture-deck.html'; a.click();
    URL.revokeObjectURL(url);
  }

  // Interview Kit state
  const [ikRole, setIkRole]                       = useState('');
  const [ikLevel, setIkLevel]                     = useState('');
  const [generatingIK, setGeneratingIK]           = useState(false);
  const [ikResult, setIkResult]                   = useState<Record<string, unknown> | null>(null);
  const [ikError, setIkError]                     = useState<string | null>(null);
  const [ikSection, setIkSection]                 = useState<'behavioral' | 'technical' | 'rubric'>('behavioral');

  async function handleGenerateInterviewKit() {
    if (!ikRole.trim() || generatingIK) return;
    setGeneratingIK(true); setIkError(null); setIkResult(null);
    try {
      const res = await fetch('/api/agents/harper/interview-kit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: ikRole, level: ikLevel || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.kit) setIkResult(r.kit);
      else setIkError(r.error ?? 'Failed to generate interview kit');
    } catch { setIkError('Network error'); }
    finally { setGeneratingIK(false); }
  }

  async function handleGenerateRefKit() {
    if (!refCandidateName.trim() || !refRole.trim() || generatingRefKit) return;
    setGeneratingRefKit(true); setRefKitError(null); setRefKitResult(null);
    try {
      const res = await fetch('/api/agents/harper/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: refCandidateName.trim(),
          role: refRole.trim(),
          claimedExperience: refClaimedExp.trim() || undefined,
          concerns: refConcerns.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok && r.kit) setRefKitResult(r.kit);
      else setRefKitError(r.error ?? 'Generation failed');
    } catch { setRefKitError('Network error'); }
    finally { setGeneratingRefKit(false); }
  }

  const [outreachName, setOutreachName]           = useState("");
  const [outreachTitle, setOutreachTitle]         = useState("");
  const [outreachCompany, setOutreachCompany]     = useState("");
  const [outreachUrl, setOutreachUrl]             = useState("");
  const [outreachRole, setOutreachRole]           = useState("");
  const [outreachChannel, setOutreachChannel]     = useState<"email" | "linkedin" | "twitter">("linkedin");
  const [outreachContext, setOutreachContext]     = useState("");
  const [draftingOutreach, setDraftingOutreach]   = useState(false);
  const [outreachDraft, setOutreachDraft]         = useState<{ subject?: string | null; message?: string; hook?: string; followUpNote?: string } | null>(null);
  const [outreachError, setOutreachError]         = useState<string | null>(null);
  const [copiedOutreach, setCopiedOutreach]       = useState(false);

  async function handleDraftOutreach() {
    if (!outreachName.trim() || !outreachRole.trim() || draftingOutreach) return;
    setDraftingOutreach(true); setOutreachError(null); setOutreachDraft(null);
    try {
      const res = await fetch('/api/agents/harper/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: outreachName.trim(),
          candidateTitle: outreachTitle.trim() || undefined,
          candidateCompany: outreachCompany.trim() || undefined,
          candidateUrl: outreachUrl.trim() || undefined,
          role: outreachRole.trim(),
          channel: outreachChannel,
          extraContext: outreachContext.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok) setOutreachDraft(r.draft);
      else setOutreachError(r.error ?? 'Failed to draft message');
    } catch { setOutreachError('Network error'); }
    finally { setDraftingOutreach(false); }
  }

  // Multi-board job posting state
  const [showBoardModal, setShowBoardModal]   = useState(false);
  const [boardModalRole, setBoardModalRole]   = useState("");
  const [boardPosts, setBoardPosts]           = useState<Record<string, { content: string; boardUrl: string }> | null>(null);
  const [generatingBoards, setGeneratingBoards] = useState(false);
  const [boardError, setBoardError]           = useState<string | null>(null);
  const [boardTab, setBoardTab]               = useState("hn");
  const [boardCopied, setBoardCopied]         = useState<Record<string, boolean>>({});
  const [boardApplyUrl, setBoardApplyUrl]     = useState("");

  async function handleGenerateOffer() {
    if (!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim() || generatingOffer) return;
    setGeneratingOffer(true); setOfferError(null); setOfferHtml(null);
    try {
      const res = await fetch('/api/agents/harper/offer-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: offerCandidate.trim(),
          candidateEmail: offerEmail.trim() || undefined,
          role: offerRole.trim(),
          salary: offerSalary.trim(),
          equity: offerEquity.trim() || undefined,
          startDate: offerStartDate || undefined,
          send: offerSendEmail && !!offerEmail.trim(),
        }),
      });
      const r = await res.json();
      if (res.ok) setOfferHtml(r.html);
      else setOfferError(r.error ?? 'Failed to generate offer letter');
    } catch { setOfferError('Network error'); }
    finally { setGeneratingOffer(false); }
  }

  async function handleGenerateBoards(hire: { role: string; salaryRange?: string; equity?: string; responsibilities?: string[]; requirements?: string[]; whyNow?: string }) {
    if (!hire || generatingBoards) return;
    setBoardModalRole(hire.role);
    setBoardPosts(null);
    setBoardError(null);
    setBoardCopied({});
    setBoardTab("hn");
    setShowBoardModal(true);
    setGeneratingBoards(true);
    try {
      const res = await fetch("/api/agents/harper/post-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: { role: hire.role, salaryRange: hire.salaryRange, equity: hire.equity, responsibilities: hire.responsibilities, requirements: hire.requirements, whyNow: hire.whyNow },
          boards: ["hn", "linkedin", "wellfound", "indeed", "remoteok"],
        }),
      });
      const r = await res.json();
      if (res.ok) { setBoardPosts(r.posts); setBoardApplyUrl(r.applyUrl ?? ""); }
      else setBoardError(r.error ?? "Failed to generate job postings");
    } catch { setBoardError("Network error"); }
    finally { setGeneratingBoards(false); }
  }

  function downloadOffer() {
    if (!offerHtml) return;
    const blob = new Blob([offerHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offer-letter-${offerCandidate.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!artifactId) return;
    setLoadingApps(true);
    fetch('/api/agents/harper/apply')
      .then(r => r.json())
      .then(d => { if (d.applications) setApplications(d.applications); })
      .catch(() => {})
      .finally(() => setLoadingApps(false));
  }, [artifactId]);

  // ── Candidate Sourcing ──
  const [sourcingRole, setSourcingRole]         = useState<string | null>(null);
  const [sourcingResult, setSourcingResult]     = useState<Record<string, unknown> | null>(null);
  const [sourcingError, setSourcingError]       = useState<string | null>(null);
  const [sourcingLoading, setSourcingLoading]   = useState(false);
  const [showSourcingFor, setShowSourcingFor]   = useState<string | null>(null); // role name

  // Onboarding kit state
  const [onboardingRole, setOnboardingRole]           = useState<string | null>(null);
  const [generatingOnboarding, setGeneratingOnboarding] = useState(false);
  const [onboardingHtml, setOnboardingHtml]           = useState<string | null>(null);
  const [onboardingError, setOnboardingError]         = useState<string | null>(null);
  const [onboardingNewHireName, setOnboardingNewHireName] = useState("");
  const [onboardingStartDate, setOnboardingStartDate] = useState("");
  const [showOnboardingFor, setShowOnboardingFor]     = useState<string | null>(null);

  async function handleSourceCandidates(hire: { role: string; requirements?: string[] }) {
    if (sourcingLoading) return;
    setSourcingLoading(true); setSourcingError(null); setSourcingResult(null);
    setSourcingRole(hire.role); setShowSourcingFor(hire.role);
    try {
      const res = await fetch('/api/agents/harper/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleName: hire.role,
          skills: hire.requirements?.slice(0, 5) ?? [],
          remoteOk: true,
          seniority: 'senior',
        }),
      });
      const r = await res.json();
      if (res.ok) setSourcingResult(r.sourced);
      else setSourcingError(r.error ?? 'Sourcing failed');
    } catch { setSourcingError('Network error'); }
    finally { setSourcingLoading(false); }
  }

  async function handleGenerateOnboarding(roleName: string) {
    if (generatingOnboarding) return;
    setOnboardingRole(roleName); setGeneratingOnboarding(true); setOnboardingError(null); setOnboardingHtml(null);
    try {
      const res = await fetch('/api/agents/harper/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleName,
          newHireName: onboardingNewHireName.trim() || undefined,
          startDate: onboardingStartDate || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `onboarding-kit-${roleName.toLowerCase().replace(/\s+/g, '-')}.html`;
        a.click();
        URL.revokeObjectURL(url);
        setOnboardingHtml(r.html);
        setShowOnboardingFor(roleName);
      } else {
        setOnboardingError(r.error ?? 'Failed to generate onboarding kit');
      }
    } catch { setOnboardingError('Network error'); }
    finally { setGeneratingOnboarding(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const priorityColor: Record<string, string> = { critical: red, high: amber, "nice-to-have": muted };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {d.currentGaps && d.currentGaps.length > 0 && (
        <div style={{ background: "#FFFBEB", borderRadius: 10, padding: "12px 14px", border: `1px solid #FED7AA` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 6 }}>Current Team Gaps</p>
          {d.currentGaps.map((gap, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>• {gap}</p>)}
        </div>
      )}

      {d.nextHires && d.nextHires.length > 0 && (
        <div>
          <p style={sectionHead}>Next Hires</p>
          {d.nextHires.map((hire, i) => {
            // Build job description text for posting
            const jdText = [
              `Role: ${hire.role}`,
              hire.timing ? `Timeline: ${hire.timing}` : "",
              hire.whyNow ? `Why we're hiring now: ${hire.whyNow}` : "",
              hire.salaryRange ? `Compensation: ${hire.salaryRange}${hire.equity ? ` + ${hire.equity} equity` : ""}` : "",
              hire.requirements?.length ? `\nRequirements:\n${hire.requirements.map(r => `• ${r}`).join("\n")}` : "",
              hire.niceToHave?.length ? `\nNice to have:\n${hire.niceToHave.map(r => `• ${r}`).join("\n")}` : "",
              hire.responsibilities?.length ? `\nResponsibilities:\n${hire.responsibilities.map(r => `• ${r}`).join("\n")}` : "",
            ].filter(Boolean).join("\n");

            return (
              <div key={i} style={{ background: surf, borderRadius: 10, border: `1px solid ${bdr}`, padding: "14px 16px", marginBottom: 10, borderLeft: `3px solid ${priorityColor[hire.priority] || muted}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{hire.role}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: priorityColor[hire.priority] || muted }}>{hire.priority}</span>
                </div>
                <p style={{ fontSize: 11, color: muted, marginBottom: hire.whyNow ? 6 : 8 }}>{hire.timing}</p>
                {hire.whyNow && <p style={{ fontSize: 12, color: blue, marginBottom: 8 }}>Why now: {hire.whyNow}</p>}
                {hire.salaryRange && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: ink }}>{hire.salaryRange}</span>
                    {hire.equity && <span style={{ fontSize: 12, color: muted }}>{hire.equity} equity</span>}
                  </div>
                )}
                {hire.requirements && hire.requirements.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Requirements</p>
                    {hire.requirements.map((r, ri) => <p key={ri} style={{ fontSize: 11, color: ink, paddingLeft: 8, lineHeight: 1.5 }}>✓ {r}</p>)}
                  </div>
                )}
                {/* Post job links */}
                <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: `1px solid ${bdr}`, flexWrap: "wrap" }}>
                  <a
                    href="https://wellfound.com/jobs/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => navigator.clipboard.writeText(jdText).catch(() => {})}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#F0FDF4", color: green, textDecoration: "none", border: `1px solid #BBF7D0` }}
                    title="JD copied to clipboard — paste into Wellfound"
                  >
                    Post on Wellfound
                  </a>
                  {userId && (
                    <button
                      onClick={() => {
                        const slug = hire.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').slice(0, 40);
                        const url = `${window.location.origin}/apply/${userId}/${slug}`;
                        navigator.clipboard.writeText(url).catch(() => {});
                        alert(`Apply link copied!\n${url}`);
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#EFF6FF", color: blue, border: `1px solid #BFDBFE`, cursor: "pointer" }}
                    >
                      Copy Apply Link
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const slug = userId ? `${window.location.origin}/apply/${userId}/${hire.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}` : '';
                      const hn = [
                        `${hire.role} | [Your Company Name] | [Remote/City] | ${hire.salaryRange ? hire.salaryRange : 'Competitive salary'}${hire.equity ? ` + ${hire.equity} equity` : ''}`,
                        '',
                        hire.whyNow ? `We're hiring because: ${hire.whyNow}` : '',
                        '',
                        'Looking for:',
                        ...(hire.requirements ?? []).slice(0, 4).map(r => `• ${r}`),
                        '',
                        hire.responsibilities?.length ? 'You will:' : '',
                        ...(hire.responsibilities ?? []).slice(0, 3).map(r => `• ${r}`),
                        '',
                        slug ? `Apply: ${slug}` : 'Reply to this comment or email [your@email.com]',
                      ].filter(l => l !== undefined).join('\n').trim();
                      navigator.clipboard.writeText(hn).catch(() => {});
                      alert('HN format copied! Paste it into the monthly "Ask HN: Who is hiring?" thread.');
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#FFF7ED", color: "#EA580C", border: `1px solid #FED7AA`, cursor: "pointer" }}
                    title="Copies the exact HN 'Who is hiring?' comment format"
                  >
                    HN Format
                  </button>
                  <CopyBtn text={jdText} />
                  <button
                    onClick={() => handleGenerateBoards(hire)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", cursor: "pointer" }}
                    title="Generate formatted posts for HN, LinkedIn, Wellfound, Indeed, RemoteOK"
                  >
                    📋 Post to All Boards
                  </button>
                  <button
                    onClick={() => handleSourceCandidates(hire)}
                    disabled={sourcingLoading && sourcingRole === hire.role}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#F0FDF4", color: green, border: "1px solid #BBF7D0", cursor: sourcingLoading ? "not-allowed" : "pointer", opacity: sourcingLoading && sourcingRole === hire.role ? 0.6 : 1 }}
                    title="Harper searches GitHub, LinkedIn & AngelList for matching candidates"
                  >
                    {sourcingLoading && sourcingRole === hire.role ? "Searching…" : "🔍 Source Candidates"}
                  </button>
                </div>

                {/* Inline sourcing results for this role */}
                {showSourcingFor === hire.role && (sourcingResult || sourcingError) && (
                  <div style={{ marginTop: 12, background: "#F0FDF4", borderRadius: 8, padding: "12px 14px", border: "1px solid #BBF7D0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: green }}>Candidate Search Results</p>
                      <button onClick={() => { setShowSourcingFor(null); setSourcingResult(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 13, lineHeight: 1 }}>✕</button>
                    </div>
                    {sourcingError && <p style={{ fontSize: 12, color: red }}>{sourcingError}</p>}
                    {sourcingResult && (() => {
                      const sr = sourcingResult as { candidates?: { name: string; profileUrl: string; platform: string; matchScore: number; skills: string[]; summary: string; outreachAngle: string }[]; searchSummary?: string; recommendedChannels?: string[] };
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {sr.searchSummary && <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{sr.searchSummary}</p>}
                          {(sr.candidates ?? []).slice(0, 5).map((c, ci) => (
                            <div key={ci} style={{ background: "white", borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                <div>
                                  <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: blue, textDecoration: "none" }}>
                                    {c.name !== "Unknown" ? c.name : c.platform + " profile"} ↗
                                  </a>
                                  <span style={{ fontSize: 10, color: muted, marginLeft: 6 }}>{c.platform}</span>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: c.matchScore >= 70 ? green : c.matchScore >= 50 ? amber : muted, background: c.matchScore >= 70 ? "#F0FDF4" : c.matchScore >= 50 ? "#FFFBEB" : surf, padding: "2px 7px", borderRadius: 5 }}>
                                  {c.matchScore}%
                                </span>
                              </div>
                              <p style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 4 }}>{c.summary}</p>
                              {c.outreachAngle && <p style={{ fontSize: 10, color: blue, fontStyle: "italic" }}>Outreach angle: {c.outreachAngle}</p>}
                              {c.skills?.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                  {c.skills.slice(0, 5).map((sk, si) => <span key={si} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: surf, border: `1px solid ${bdr}`, color: muted }}>{sk}</span>)}
                                </div>
                              )}
                            </div>
                          ))}
                          {sr.recommendedChannels && sr.recommendedChannels.length > 0 && (
                            <p style={{ fontSize: 10, color: muted }}>Best channels: {sr.recommendedChannels.join(", ")}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {d.orgRoadmap && d.orgRoadmap.length > 0 && (
        <div>
          <p style={sectionHead}>Org Roadmap</p>
          {d.orgRoadmap.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ink }}>{step.teamSize}</p>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{step.milestone}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {step.newRoles.map((role, ri) => (
                    <span key={ri} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted }}>{role}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.cultureValues && d.cultureValues.length > 0 && (
        <div>
          <p style={sectionHead}>Culture Values</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.cultureValues.map((v, i) => (
              <span key={i} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, background: surf, border: `1px solid ${bdr}`, color: ink }}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Onboarding Kit ── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 4 }}>Generate Onboarding Kit</p>
        <p style={{ fontSize: 11, color: muted, marginBottom: 10 }}>Create a week-1 onboarding plan for a new hire — welcome note, daily schedule, tools, check-ins. Downloads as print-ready HTML.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <input value={onboardingNewHireName} onChange={e => setOnboardingNewHireName(e.target.value)} placeholder="New hire name (optional)" style={{ flex: 1, minWidth: 140, padding: "7px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, boxSizing: "border-box" }} />
          <input type="date" value={onboardingStartDate} onChange={e => setOnboardingStartDate(e.target.value)} style={{ flex: 1, minWidth: 140, padding: "7px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, boxSizing: "border-box" }} />
        </div>
        {d.nextHires && d.nextHires.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.nextHires.map((hire, i) => (
              <button
                key={i}
                onClick={() => handleGenerateOnboarding(hire.role)}
                disabled={generatingOnboarding}
                style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: generatingOnboarding && onboardingRole === hire.role ? bdr : bg, color: generatingOnboarding && onboardingRole === hire.role ? muted : ink, fontSize: 12, fontWeight: 600, cursor: generatingOnboarding ? "not-allowed" : "pointer" }}
              >
                {generatingOnboarding && onboardingRole === hire.role ? "Generating…" : `Kit for ${hire.role}`}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Role name (e.g. Head of Sales)" onChange={e => setOnboardingRole(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, boxSizing: "border-box" }} />
            <button onClick={() => onboardingRole && handleGenerateOnboarding(onboardingRole)} disabled={!onboardingRole || generatingOnboarding} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: !onboardingRole ? bdr : ink, color: !onboardingRole ? muted : bg, fontSize: 12, fontWeight: 600, cursor: !onboardingRole ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {generatingOnboarding ? "Generating…" : "Generate Kit"}
            </button>
          </div>
        )}
        {onboardingError && <p style={{ fontSize: 11, color: red, marginTop: 6 }}>{onboardingError}</p>}
        {showOnboardingFor && onboardingHtml && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 12, color: ink, fontWeight: 600 }}>✓ Onboarding kit downloaded for {showOnboardingFor}</p>
            <button onClick={() => { if (onboardingHtml) { const blob = new Blob([onboardingHtml], { type: 'text/html;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `onboarding-kit.html`; a.click(); URL.revokeObjectURL(url); } }} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Re-download</button>
          </div>
        )}
      </div>

      {/* ── Applications Inbox ──────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 16px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>
              Applications Inbox {!loadingApps && applications.length > 0 && <span style={{ background: ink, color: bg, borderRadius: 999, padding: "1px 7px", fontSize: 10, marginLeft: 4 }}>{applications.length}</span>}
            </p>
            <p style={{ fontSize: 11, color: muted }}>
              {loadingApps ? "Loading…" : applications.length === 0 ? "No applications yet — share your apply link to start receiving candidates." : `${applications.length} candidate${applications.length !== 1 ? "s" : ""} applied`}
            </p>
          </div>
          {applications.length > 0 && (
            <button onClick={() => setShowApps(p => !p)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid #BBF7D0`, background: "white", color: green, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {showApps ? "Hide" : "View All"}
            </button>
          )}
        </div>
        {showApps && applications.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {applications.map(app => (
              <div key={app.id} style={{ background: "white", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{app.applicant_name}</p>
                    <p style={{ fontSize: 11, color: muted }}>{app.applicant_email} · {app.role_title ?? app.role_slug}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {app.score !== null && app.score !== undefined && (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: (app.score ?? 0) >= 70 ? "#F0FDF4" : (app.score ?? 0) >= 50 ? "#FFFBEB" : "#FEF2F2", color: (app.score ?? 0) >= 70 ? green : (app.score ?? 0) >= 50 ? amber : red }}>
                        {app.score}/100
                      </span>
                    )}
                    {/* Reject button — hidden if already sent or status === 'rejected' */}
                    {app.status !== 'rejected' && !rejectSentIds.has(app.id) ? (
                      <button
                        onClick={() => handleSendRejection(app)}
                        disabled={rejectingId === app.id}
                        style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${red}40`, background: "#FEF2F2", fontSize: 11, fontWeight: 600, color: red, cursor: rejectingId === app.id ? "not-allowed" : "pointer", opacity: rejectingId === app.id ? 0.6 : 1 }}
                      >
                        {rejectingId === app.id ? "Sending…" : "Reject"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 10, color: muted, fontWeight: 600 }}>✓ Rejected</span>
                    )}
                    <button
                      onClick={() => { setOfferCandidate(app.applicant_name); setOfferEmail(app.applicant_email); setOfferRole(app.role_title ?? app.role_slug); setShowOfferModal(true); setOfferHtml(null); setOfferError(null); }}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: bg, fontSize: 11, fontWeight: 600, color: ink, cursor: "pointer" }}
                    >
                      Send Offer
                    </button>
                    <button
                      onClick={() => { setScorecardApp(app); setScorecardNotes(""); setScorecardResult(null); setScorecardError(null); }}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid #7C3AED40`, background: "#F5F3FF", fontSize: 11, fontWeight: 600, color: "#7C3AED", cursor: "pointer" }}
                    >
                      Scorecard
                    </button>
                  </div>
                </div>
                {app.score_notes && <p style={{ fontSize: 11, color: muted, marginTop: 6, lineHeight: 1.5 }}>{app.score_notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Interview Scorecard Modal ── */}
      {scorecardApp && (
        <div onClick={e => { if (e.target === e.currentTarget) { setScorecardApp(null); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Interview Scorecard</p>
                <p style={{ fontSize: 12, color: muted }}>{scorecardApp.applicant_name} · {scorecardApp.role_title ?? scorecardApp.role_slug}</p>
              </div>
              <button onClick={() => setScorecardApp(null)} style={{ background: "none", border: "none", fontSize: 18, color: muted, cursor: "pointer" }}>×</button>
            </div>
            {!scorecardResult ? (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Interview Notes *</label>
                  <textarea value={scorecardNotes} onChange={e => setScorecardNotes(e.target.value)} placeholder="Paste your raw interview notes — what they said, how they answered, observations. The more detail, the better the scorecard." rows={7} style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: ink, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                {scorecardError && <p style={{ fontSize: 11, color: red }}>{scorecardError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setScorecardApp(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleGenerateScorecard} disabled={scoringApp || !scorecardNotes.trim()} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: scoringApp ? bdr : "#7C3AED", color: scoringApp ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: scoringApp || !scorecardNotes.trim() ? "not-allowed" : "pointer" }}>
                    {scoringApp ? "Scoring…" : "Generate Scorecard"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: (scorecardResult.overallScore ?? 0) >= 70 ? "#F0FDF4" : (scorecardResult.overallScore ?? 0) >= 50 ? "#FFFBEB" : "#FEF2F2", borderRadius: 10, padding: "14px", border: `1px solid ${(scorecardResult.overallScore ?? 0) >= 70 ? "#BBF7D0" : (scorecardResult.overallScore ?? 0) >= 50 ? "#FDE68A" : "#FECACA"}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, marginBottom: 4 }}>Overall Score</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: (scorecardResult.overallScore ?? 0) >= 70 ? green : (scorecardResult.overallScore ?? 0) >= 50 ? amber : red }}>{scorecardResult.overallScore ?? "—"}<span style={{ fontSize: 14, fontWeight: 400, color: muted }}>/100</span></p>
                  </div>
                  <div style={{ background: surf, borderRadius: 10, padding: "14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, marginBottom: 4 }}>Recommendation</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: scorecardResult.recommendation?.includes("yes") ? green : red, textTransform: "capitalize" }}>{scorecardResult.recommendation?.replace(/_/g, " ") ?? "—"}</p>
                  </div>
                </div>
                {scorecardResult.summary && <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>{scorecardResult.summary}</p>}
                {/* Dimension bars */}
                {scorecardResult.dimensions && scorecardResult.dimensions.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, marginBottom: 8 }}>Dimension Scores</p>
                    {scorecardResult.dimensions.map((dim, di) => {
                      const pct = Math.round((dim.score / dim.maxScore) * 100);
                      const dc = pct >= 70 ? green : pct >= 50 ? amber : red;
                      return (
                        <div key={di} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{dim.name}</p>
                            <span style={{ fontSize: 12, fontWeight: 700, color: dc }}>{dim.score}/{dim.maxScore}</span>
                          </div>
                          <div style={{ height: 6, background: bdr, borderRadius: 999, overflow: "hidden", marginBottom: 4 }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: dc, borderRadius: 999 }} />
                          </div>
                          <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{dim.evidence}</p>
                          {dim.gap && <p style={{ fontSize: 11, color: red, marginTop: 2 }}>⚠ {dim.gap}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Strengths + concerns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {scorecardResult.strengths && scorecardResult.strengths.length > 0 && (
                    <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: `1px solid #BBF7D0` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: green, marginBottom: 6 }}>Strengths</p>
                      {scorecardResult.strengths.map((s, si) => <p key={si} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>+ {s}</p>)}
                    </div>
                  )}
                  {scorecardResult.concerns && scorecardResult.concerns.length > 0 && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: `1px solid #FECACA` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: red, marginBottom: 6 }}>Concerns</p>
                      {scorecardResult.concerns.map((c, ci) => <p key={ci} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>⚠ {c}</p>)}
                    </div>
                  )}
                </div>
                {scorecardResult.suggestedNextSteps && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: `1px solid #BFDBFE` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: blue, marginBottom: 4 }}>Next Steps</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{scorecardResult.suggestedNextSteps}</p>
                  </div>
                )}
                {scorecardResult.referenceCheckFocus && (
                  <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>Reference focus: {scorecardResult.referenceCheckFocus}</p>
                )}
                <button onClick={() => { setScorecardResult(null); setScorecardNotes(""); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  Score Another Candidate
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Offer Letter CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Send an Offer Letter</p>
          <p style={{ fontSize: 11, color: muted }}>Harper generates a ready-to-sign offer letter with salary, equity, and vesting details — download HTML or email directly.</p>
        </div>
        <button onClick={() => { setShowOfferModal(true); setOfferHtml(null); setOfferError(null); setOfferCandidate(""); setOfferEmail(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Create Offer
        </button>
      </div>

      {/* Offer Letter Modal */}
      {showOfferModal && (
        <div onClick={() => { if (!generatingOffer) setShowOfferModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Offer Letter</p>
              <button onClick={() => setShowOfferModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {offerHtml ? (
              <div>
                <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 16px", border: `1px solid #BBF7D0`, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: green, marginBottom: 4 }}>✓ Offer letter ready for {offerCandidate}</p>
                  {offerSendEmail && offerEmail && <p style={{ fontSize: 11, color: muted }}>Email also sent to {offerEmail}</p>}
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setOfferHtml(null); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Edit</button>
                  <button onClick={downloadOffer} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Download HTML</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Candidate Name *</label>
                    <input value={offerCandidate} onChange={e => setOfferCandidate(e.target.value)} placeholder="Alex Johnson" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Email (for sending)</label>
                    <input value={offerEmail} onChange={e => setOfferEmail(e.target.value)} placeholder="alex@gmail.com" type="email" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Role *</label>
                  <input value={offerRole} onChange={e => setOfferRole(e.target.value)} placeholder="Senior Software Engineer" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Base Salary *</label>
                    <input value={offerSalary} onChange={e => setOfferSalary(e.target.value)} placeholder="$150,000 / year" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Equity Grant</label>
                    <input value={offerEquity} onChange={e => setOfferEquity(e.target.value)} placeholder="0.5% (50,000 options)" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Start Date</label>
                  <input value={offerStartDate} onChange={e => setOfferStartDate(e.target.value)} type="date" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                {offerEmail && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: ink, cursor: "pointer" }}>
                    <input type="checkbox" checked={offerSendEmail} onChange={e => setOfferSendEmail(e.target.checked)} />
                    Email this offer letter to {offerEmail}
                  </label>
                )}
                {offerError && <p style={{ fontSize: 12, color: red }}>{offerError}</p>}
                <button onClick={handleGenerateOffer} disabled={!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim() || generatingOffer} style={{ padding: "10px", borderRadius: 8, border: "none", background: (!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim()) ? bdr : blue, color: (!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim()) ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: (!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim()) ? "not-allowed" : "pointer" }}>
                  {generatingOffer ? "Generating…" : "Generate Offer Letter"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Hiring Pipeline Analytics ─────────────────────────────────────── */}
      <div style={{ borderRadius: 12, border: `1px solid ${bdr}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: surf }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Hiring Funnel Analytics</p>
            <p style={{ fontSize: 11, color: muted }}>Track sourced → applied → hired conversion rates</p>
          </div>
          <button onClick={() => { if (showFunnelPanel) { setShowFunnelPanel(false); } else { loadFunnelData(); } }} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showFunnelPanel ? "Close" : "View Funnel"}
          </button>
        </div>
        {showFunnelPanel && (
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {loadingFunnel ? (
              <p style={{ fontSize: 12, color: muted, textAlign: "center" }}>Loading funnel data…</p>
            ) : funnelData ? (
              <>
                {/* Funnel bars */}
                {funnelData.funnel && (() => {
                  const stages = [
                    { label: "Sourced", value: funnelData.funnel!.sourced, color: "#6366F1" },
                    { label: "Outreached", value: funnelData.funnel!.outreached, color: "#7C3AED" },
                    { label: "Applied", value: funnelData.funnel!.applied, color: blue },
                    { label: "Screened", value: funnelData.funnel!.screened, color: "#0891B2" },
                    { label: "Interviewed", value: funnelData.funnel!.interviewed, color: amber },
                    { label: "Offered", value: funnelData.funnel!.offered, color: green },
                    { label: "Hired", value: funnelData.funnel!.hired, color: "#065F46" },
                  ];
                  const maxVal = Math.max(...stages.map(s => s.value), 1);
                  return (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 8 }}>Funnel Breakdown</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {stages.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 10, color: muted, width: 68, flexShrink: 0 }}>{s.label}</span>
                            <div style={{ flex: 1, height: 8, background: bdr, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(s.value / maxVal) * 100}%`, background: s.color, borderRadius: 4, transition: "width 0.4s" }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: s.value > 0 ? ink : muted, width: 20, textAlign: "right" }}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Conversion rates */}
                {funnelData.conversionRates && (() => {
                  const cvrs = [
                    { label: "Outreach → Apply", value: funnelData.conversionRates!.sourceToApply },
                    { label: "Apply → Screen", value: funnelData.conversionRates!.applyToScreen },
                    { label: "Screen → Interview", value: funnelData.conversionRates!.screenToInterview },
                    { label: "Interview → Offer", value: funnelData.conversionRates!.interviewToOffer },
                    { label: "Offer → Hire", value: funnelData.conversionRates!.offerToHire },
                  ].filter(c => c.value !== null);
                  if (cvrs.length === 0) return null;
                  return (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 6 }}>Conversion Rates</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {cvrs.map((c, i) => (
                          <div key={i} style={{ background: surf, borderRadius: 8, padding: "8px 12px", border: `1px solid ${bdr}`, textAlign: "center", minWidth: 100 }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: (c.value ?? 0) >= 50 ? green : (c.value ?? 0) >= 25 ? amber : red }}>{c.value}%</p>
                            <p style={{ fontSize: 10, color: muted }}>{c.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Score distribution */}
                {funnelData.scoreDistribution && (funnelData.scoreDistribution.strong + funnelData.scoreDistribution.good + funnelData.scoreDistribution.weak) > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 6 }}>
                      Candidate Quality {funnelData.avgScore !== null && funnelData.avgScore !== undefined ? `· Avg Score: ${funnelData.avgScore}/100` : ""}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1, background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", textAlign: "center", border: "1px solid #BBF7D0" }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: green }}>{funnelData.scoreDistribution.strong}</p>
                        <p style={{ fontSize: 10, color: green }}>Strong (70+)</p>
                      </div>
                      <div style={{ flex: 1, background: "#FFFBEB", borderRadius: 8, padding: "8px 12px", textAlign: "center", border: "1px solid #FDE68A" }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: amber }}>{funnelData.scoreDistribution.good}</p>
                        <p style={{ fontSize: 10, color: amber }}>Good (50-70)</p>
                      </div>
                      <div style={{ flex: 1, background: "#FEF2F2", borderRadius: 8, padding: "8px 12px", textAlign: "center", border: "1px solid #FECACA" }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: red }}>{funnelData.scoreDistribution.weak}</p>
                        <p style={{ fontSize: 10, color: red }}>Weak (&lt;50)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-role breakdown */}
                {funnelData.byRole && Object.keys(funnelData.byRole).length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 6 }}>By Role</p>
                    {Object.entries(funnelData.byRole).map(([role, stats], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < Object.keys(funnelData!.byRole!).length - 1 ? `1px solid ${bdr}` : "none" }}>
                        <p style={{ fontSize: 12, color: ink }}>{role}</p>
                        <p style={{ fontSize: 11, color: muted }}>{stats.applied} applied · {stats.screened} screened</p>
                      </div>
                    ))}
                  </div>
                )}

                {funnelData.avgDaysToOffer !== null && funnelData.avgDaysToOffer !== undefined && (
                  <p style={{ fontSize: 11, color: muted }}>⏱ Avg time to offer: <strong>{funnelData.avgDaysToOffer} days</strong></p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: muted }}>No pipeline data yet — candidates need to apply first.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Candidate Outreach CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Draft Recruiting Message</p>
          <p style={{ fontSize: 11, color: muted }}>Found a great candidate on LinkedIn, GitHub, or AngelList? Harper drafts a personalized outreach for email, LinkedIn, or Twitter.</p>
        </div>
        <button onClick={() => { setShowOutreachModal(true); setOutreachDraft(null); setOutreachError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          Draft Message
        </button>
      </div>

      {/* ── Candidate Outreach Modal ── */}
      {showOutreachModal && (
        <div onClick={() => { if (!draftingOutreach) setShowOutreachModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Draft Recruiting Message</p>
              <button onClick={() => setShowOutreachModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {!outreachDraft ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Channel selector */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>Channel</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["linkedin", "email", "twitter"] as const).map(ch => (
                      <button key={ch} onClick={() => setOutreachChannel(ch)} style={{ flex: 1, padding: "7px 8px", borderRadius: 8, border: `1px solid ${outreachChannel === ch ? blue : bdr}`, background: outreachChannel === ch ? "#EFF6FF" : bg, color: outreachChannel === ch ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                        {ch === "linkedin" ? "LinkedIn DM" : ch === "email" ? "Email" : "Twitter DM"}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>
                    {outreachChannel === "linkedin" ? "Max 300 chars — connection request note" : outreachChannel === "twitter" ? "Max 280 chars — casual DM" : "Subject + 3 paragraphs (~150 words)"}
                  </p>
                </div>
                {/* Candidate info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Candidate Name *</label>
                    <input value={outreachName} onChange={e => setOutreachName(e.target.value)} placeholder="Alex Chen" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Role Hiring For *</label>
                    <select value={outreachRole} onChange={e => setOutreachRole(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg, boxSizing: "border-box" }}>
                      <option value="">Select role…</option>
                      {(d.nextHires ?? []).map((h, hi) => <option key={hi} value={h.role}>{h.role}</option>)}
                      <option value="_custom">Custom role…</option>
                    </select>
                    {outreachRole === "_custom" && (
                      <input value="" onChange={e => setOutreachRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Their Title / Role</label>
                    <input value={outreachTitle} onChange={e => setOutreachTitle(e.target.value)} placeholder="Staff Engineer at Google" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Current Company</label>
                    <input value={outreachCompany} onChange={e => setOutreachCompany(e.target.value)} placeholder="Google" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Profile URL (optional)</label>
                  <input value={outreachUrl} onChange={e => setOutreachUrl(e.target.value)} placeholder="https://linkedin.com/in/..." style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Why them? (optional)</label>
                  <input value={outreachContext} onChange={e => setOutreachContext(e.target.value)} placeholder="Built the auth system at their last startup, open source React contributor…" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                </div>
                {outreachError && <p style={{ fontSize: 12, color: red }}>{outreachError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowOutreachModal(false)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleDraftOutreach} disabled={draftingOutreach || !outreachName.trim() || !outreachRole.trim() || outreachRole === "_custom"} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: draftingOutreach ? bdr : blue, color: draftingOutreach ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: draftingOutreach ? "not-allowed" : "pointer" }}>
                    {draftingOutreach ? "Drafting…" : "Draft Message"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Hook */}
                {outreachDraft.hook && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: blue, marginBottom: 3 }}>Why They&apos;re a Fit</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{outreachDraft.hook}</p>
                  </div>
                )}
                {/* Subject (email only) */}
                {outreachDraft.subject && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Subject Line</label>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, background: surf, borderRadius: 7, padding: "8px 12px" }}>{outreachDraft.subject}</p>
                  </div>
                )}
                {/* Message */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted }}>Message</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {outreachChannel === "email" && outreachDraft.subject && (
                        <button onClick={() => { const gmailUrl = `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(outreachDraft.subject ?? '')}&body=${encodeURIComponent(outreachDraft.message ?? '')}`; window.open(gmailUrl, "_blank"); }} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer" }}>
                          Open in Gmail
                        </button>
                      )}
                      <button onClick={() => { navigator.clipboard.writeText((outreachDraft.subject ? `Subject: ${outreachDraft.subject}\n\n` : '') + (outreachDraft.message ?? '')).then(() => { setCopiedOutreach(true); setTimeout(() => setCopiedOutreach(false), 1500); }).catch(() => {}); }} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: copiedOutreach ? green : bg, color: copiedOutreach ? "#fff" : muted, fontSize: 11, cursor: "pointer" }}>
                        {copiedOutreach ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
                    <pre style={{ fontSize: 12, color: ink, lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", margin: 0 }}>{outreachDraft.message}</pre>
                  </div>
                  {outreachChannel !== "email" && (
                    <p style={{ fontSize: 10, color: outreachDraft.message && outreachDraft.message.length > (outreachChannel === "linkedin" ? 300 : 280) ? red : muted, marginTop: 4 }}>
                      {outreachDraft.message?.length ?? 0} chars {outreachChannel === "linkedin" ? "(max 300)" : "(max 280)"}
                    </p>
                  )}
                </div>
                {outreachDraft.followUpNote && (
                  <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>💬 Follow-up: {outreachDraft.followUpNote}</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setOutreachDraft(null); setOutreachName(""); setOutreachTitle(""); setOutreachCompany(""); setOutreachUrl(""); setOutreachContext(""); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer" }}>Draft Another</button>
                  <button onClick={() => setShowOutreachModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Multi-Board Job Post Modal ── */}
      {showBoardModal && (
        <div onClick={() => { if (!generatingBoards) setShowBoardModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 580, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink, margin: 0 }}>Post to All Boards</p>
                <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>{boardModalRole}</p>
              </div>
              <button onClick={() => setShowBoardModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>

            {generatingBoards && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 13, color: muted }}>Generating board-optimised formats…</p>
              </div>
            )}

            {boardError && <p style={{ fontSize: 12, color: red, marginBottom: 12 }}>{boardError}</p>}

            {boardPosts && !generatingBoards && (() => {
              const BOARDS: { key: string; label: string; color: string; bg: string; border: string }[] = [
                { key: "hn",       label: "HN Who's Hiring", color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
                { key: "linkedin", label: "LinkedIn",         color: blue,      bg: "#EFF6FF", border: "#BFDBFE" },
                { key: "wellfound",label: "Wellfound",        color: green,     bg: "#F0FDF4", border: "#BBF7D0" },
                { key: "indeed",   label: "Indeed",           color: "#1B4FD8", bg: "#EFF6FF", border: "#C7D2FE" },
                { key: "remoteok", label: "Remote OK",        color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
              ];
              const activeBoard = BOARDS.find(b => b.key === boardTab) || BOARDS[0];
              const post = boardPosts[boardTab];
              return (
                <div>
                  {boardApplyUrl && (
                    <div style={{ background: surf, borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>Apply link:</p>
                      <code style={{ fontSize: 11, color: blue, flex: 1, wordBreak: "break-all" }}>{boardApplyUrl}</code>
                      <button onClick={() => navigator.clipboard.writeText(boardApplyUrl).catch(() => {})} style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${bdr}`, background: bg, fontSize: 10, fontWeight: 600, color: muted, cursor: "pointer" }}>Copy</button>
                    </div>
                  )}

                  {/* Board tabs */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                    {BOARDS.map(b => (
                      <button
                        key={b.key}
                        onClick={() => setBoardTab(b.key)}
                        style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: `1px solid ${boardTab === b.key ? b.border : bdr}`, background: boardTab === b.key ? b.bg : "transparent", color: boardTab === b.key ? b.color : muted, cursor: "pointer", position: "relative" }}
                      >
                        {b.label}
                        {boardCopied[b.key] && <span style={{ position: "absolute", top: -4, right: -4, width: 10, height: 10, borderRadius: 999, background: green }} />}
                      </button>
                    ))}
                  </div>

                  {/* Content area */}
                  {post ? (
                    <div>
                      <textarea
                        readOnly
                        value={post.content}
                        style={{ width: "100%", minHeight: 220, padding: "10px 12px", borderRadius: 8, border: `1px solid ${activeBoard.border}`, background: activeBoard.bg, fontSize: 12, color: ink, resize: "vertical", fontFamily: "monospace", lineHeight: 1.6, boxSizing: "border-box", outline: "none" }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(post.content).catch(() => {});
                            setBoardCopied(prev => ({ ...prev, [boardTab]: true }));
                          }}
                          style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: boardCopied[boardTab] ? green : activeBoard.color, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          {boardCopied[boardTab] ? "✓ Copied!" : "Copy Text"}
                        </button>
                        {post.boardUrl && (
                          <a
                            href={post.boardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setBoardCopied(prev => ({ ...prev, [boardTab]: true }))}
                            style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${activeBoard.border}`, background: "transparent", color: activeBoard.color, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            Open {activeBoard.label} →
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "20px 0" }}>No content generated for this board.</p>
                  )}

                  {/* Status chips */}
                  {Object.keys(boardCopied).length > 0 && (
                    <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginRight: 4 }}>Posted to:</p>
                      {Object.entries(boardCopied).filter(([, v]) => v).map(([k]) => {
                        const b = BOARDS.find(board => board.key === k);
                        return <span key={k} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "#F0FDF4", border: "1px solid #BBF7D0", color: green, fontWeight: 600 }}>✓ {b?.label ?? k}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Reference Check Kit ───────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Reference Check Kit</p>
            <p style={{ fontSize: 11, color: muted }}>Tailored behavioral questions + red flag probes for any candidate and role. STAR-format, legally safe.</p>
          </div>
          <button onClick={() => { if (showRefKitPanel && !generatingRefKit) setShowRefKitPanel(false); else setShowRefKitPanel(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showRefKitPanel ? "Close" : "Generate Kit"}
          </button>
        </div>
        {showRefKitPanel && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {!refKitResult && !generatingRefKit && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Candidate Name *</p>
                    <input value={refCandidateName} onChange={e => setRefCandidateName(e.target.value)} placeholder="Jane Smith" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Role *</p>
                    <input value={refRole} onChange={e => setRefRole(e.target.value)} placeholder="Head of Engineering" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Key experience they claim (optional)</p>
                  <input value={refClaimedExp} onChange={e => setRefClaimedExp(e.target.value)} placeholder="Led 20-person eng team at Series B startup, shipped 3 major features..." style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Areas of concern from interview (optional)</p>
                  <textarea value={refConcerns} onChange={e => setRefConcerns(e.target.value)} placeholder="Seemed unclear about how they handled conflict, gave vague answers about retention..." rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                {refKitError && <p style={{ fontSize: 12, color: red }}>{refKitError}</p>}
                <button onClick={handleGenerateRefKit} disabled={!refCandidateName.trim() || !refRole.trim() || generatingRefKit} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: !refCandidateName.trim() || !refRole.trim() ? bdr : blue, color: !refCandidateName.trim() || !refRole.trim() ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: !refCandidateName.trim() || !refRole.trim() ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
                  Generate Questions
                </button>
              </div>
            )}
            {generatingRefKit && (
              <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>Generating tailored reference check questions for {refCandidateName}…</p>
            )}
            {refKitResult && !generatingRefKit && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Intro script */}
                {refKitResult.intro && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 4 }}>OPENING SCRIPT</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, fontStyle: "italic" }}>{refKitResult.intro}</p>
                  </div>
                )}

                {/* Section tabs */}
                <div style={{ display: "flex", gap: 4 }}>
                  {(["questions", "redflags", "signals"] as const).map(tab => (
                    <button key={tab} onClick={() => setRefActiveSection(tab)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", background: refActiveSection === tab ? blue : surf, color: refActiveSection === tab ? "#fff" : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {tab === "questions" ? `Questions (${refKitResult?.questions?.length ?? 0})` : tab === "redflags" ? "Red Flag Probes" : "Signal Questions"}
                    </button>
                  ))}
                </div>

                {/* Questions tab */}
                {refActiveSection === "questions" && refKitResult.questions && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {refKitResult.questions.map((q, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: "#EFF6FF", color: blue, fontWeight: 700 }}>{(q.category ?? "").replace(/_/g, " ")}</span>
                          <span style={{ fontSize: 10, color: muted, fontWeight: 600 }}>Q{i + 1}</span>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.5, marginBottom: 6 }}>{q.question}</p>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Why it matters: {q.whyItMatters}</p>
                        {q.followUp && (
                          <p style={{ fontSize: 11, color: blue, fontStyle: "italic" }}>↳ Follow up: {q.followUp}</p>
                        )}
                        {q.redFlagAnswer && (
                          <p style={{ fontSize: 10, color: red, marginTop: 4 }}>⚠ Red flag: {q.redFlagAnswer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Red flag probes tab */}
                {refActiveSection === "redflags" && refKitResult.redFlagProbes && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {refKitResult.redFlagProbes.map((p, i) => (
                      <div key={i} style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: red, marginBottom: 4 }}>Concern: {p.concern}</p>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>{p.question}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Signal questions tab */}
                {refActiveSection === "signals" && refKitResult.signalQuestions && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 11, color: muted, lineHeight: 1.6 }}>These indirect questions reveal character and culture fit better than direct questions.</p>
                    {refKitResult.signalQuestions.map((q, i) => (
                      <div key={i} style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{q}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outro + interpretation guide */}
                {refKitResult.outro && (
                  <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 4 }}>CLOSING SCRIPT</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, fontStyle: "italic" }}>{refKitResult.outro}</p>
                  </div>
                )}
                {refKitResult.interpretationGuide && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 4 }}>HOW TO INTERPRET ACROSS REFERENCES</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{refKitResult.interpretationGuide}</p>
                  </div>
                )}

                {/* Copy all button */}
                <button onClick={() => {
                  const text = [
                    refKitResult?.intro ? `OPENING SCRIPT:\n${refKitResult.intro}` : '',
                    refKitResult?.questions ? `\n\nQUESTIONS:\n${refKitResult.questions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}${q.followUp ? `\n   Follow up: ${q.followUp}` : ''}`).join('\n\n')}` : '',
                    refKitResult?.redFlagProbes ? `\n\nRED FLAG PROBES:\n${refKitResult.redFlagProbes.map(p => `${p.concern}: ${p.question}`).join('\n')}` : '',
                    refKitResult?.outro ? `\n\nCLOSING:\n${refKitResult.outro}` : '',
                  ].filter(Boolean).join('');
                  navigator.clipboard.writeText(text).catch(() => {});
                }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                  Copy Full Kit
                </button>

                <button onClick={() => { setRefKitResult(null); setRefCandidateName(""); setRefRole(""); setRefClaimedExp(""); setRefConcerns(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  New Candidate
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Compensation Framework ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: compResult ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Compensation Framework</p>
            <p style={{ fontSize: 11, color: muted }}>Harper builds salary bands, equity ranges, benefits stack, and a negotiation playbook based on your stage, industry, and open roles.</p>
            {compError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{compError}</p>}
          </div>
          <button onClick={handleGenerateComp} disabled={generatingComp} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingComp ? bdr : ink, color: generatingComp ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingComp ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingComp ? "Building…" : "Build Framework"}
          </button>
        </div>
        {compResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {compResult.philosophyStatement && (
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Philosophy</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>&quot;{compResult.philosophyStatement}&quot;</p>
              </div>
            )}
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["salary", "equity", "negotiation"] as const).map(tab => (
                <button key={tab} onClick={() => setCompTab(tab)} style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${compTab === tab ? blue : bdr}`, background: compTab === tab ? "#EFF6FF" : bg, color: compTab === tab ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{tab === 'salary' ? 'Salary Bands' : tab === 'equity' ? 'Equity Bands' : 'Negotiation'}</button>
              ))}
            </div>
            {compTab === 'salary' && compResult.salaryBands && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {compResult.salaryBands.map((band, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: bg, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{band.title}</p>
                      <p style={{ fontSize: 10, color: muted }}>{band.level} · {band.department}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: blue }}>{band.baseSalaryRange?.low ?? ''} – {band.baseSalaryRange?.high ?? band.targetTotalComp ?? ''}</p>
                      <p style={{ fontSize: 10, color: muted }}>{band.benchmarkPercentile ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {compTab === 'equity' && compResult.equityBands && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {compResult.equityBands.map((band, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: bg, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{band.title}</p>
                      <p style={{ fontSize: 12, fontWeight: 800, color: green }}>{band.equityRange}</p>
                    </div>
                    {band.vestingSchedule && <p style={{ fontSize: 11, color: muted }}>Vesting: {band.vestingSchedule}</p>}
                    {band.dilutionNote && <p style={{ fontSize: 10, color: muted, marginTop: 2, fontStyle: "italic" }}>{band.dilutionNote}</p>}
                  </div>
                ))}
              </div>
            )}
            {compTab === 'negotiation' && compResult.negotiationPlaybook && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {compResult.negotiationPlaybook.map((item, i) => (
                  <div key={i} style={{ background: bg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: amber, marginBottom: 4 }}>Scenario: {item.scenario}</p>
                    <p style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>→ {item.response}</p>
                  </div>
                ))}
                {compResult.offerStructure && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 3 }}>Offer Structure</p>
                    <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{compResult.offerStructure}</p>
                  </div>
                )}
              </div>
            )}
            {compResult.keyInsight && (
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Key Insight</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{compResult.keyInsight}</p>
              </div>
            )}
            <button onClick={() => setCompResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Regenerate</button>
          </div>
        )}
      </div>

      {/* ── Job Description Generator ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Job Description Generator</p>
        <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Harper drafts a complete, polished JD — responsibilities, requirements, nice-to-have, what we offer, HN Who&apos;s Hiring post, and LinkedIn intro — as a styled HTML download.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <input value={jdRole} onChange={e => setJdRole(e.target.value)} placeholder="Role (e.g. Senior Engineer) *"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${jdRole ? bdr : red}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
          <input value={jdLevel} onChange={e => setJdLevel(e.target.value)} placeholder="Level (e.g. Senior, IC4)"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
          <input value={jdDepartment} onChange={e => setJdDepartment(e.target.value)} placeholder="Department (e.g. Engineering)"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
        </div>
        {jdError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{jdError}</p>}
        <button onClick={handleGenerateJD} disabled={!jdRole.trim() || generatingJD}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: (!jdRole.trim() || generatingJD) ? bdr : blue, color: (!jdRole.trim() || generatingJD) ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: (!jdRole.trim() || generatingJD) ? "not-allowed" : "pointer" }}>
          {generatingJD ? "Generating…" : "Download JD HTML"}
        </button>
      </div>

      {/* ── Interview Kit ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 2 }}>Interview Kit Generator</p>
        <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Harper builds a complete structured interview kit — scoring rubric, behavioral & technical questions, red/green flags, and a decision framework — for any role.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <input value={ikRole} onChange={e => setIkRole(e.target.value)} placeholder="Role (e.g. Product Manager) *"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${ikRole ? bdr : red}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
          <input value={ikLevel} onChange={e => setIkLevel(e.target.value)} placeholder="Level (e.g. Senior, L4)"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
        </div>
        {ikError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{ikError}</p>}
        <button onClick={handleGenerateInterviewKit} disabled={!ikRole.trim() || generatingIK}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: (!ikRole.trim() || generatingIK) ? bdr : green, color: (!ikRole.trim() || generatingIK) ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: (!ikRole.trim() || generatingIK) ? "not-allowed" : "pointer" }}>
          {generatingIK ? "Building Kit…" : "Build Interview Kit"}
        </button>
        {ikResult && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{ikResult.role as string} Interview Kit</p>
              <span style={{ padding: "2px 8px", borderRadius: 10, background: "#DCFCE7", color: green, fontSize: 10, fontWeight: 700 }}>{ikResult.level as string ?? 'Mid'}</span>
            </div>
            {/* Interview Structure */}
            {(ikResult.interviewStructure as { stage: string; duration: string; interviewer: string; focus: string }[] | undefined)?.length && (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 8 }}>Interview Structure</p>
                {(ikResult.interviewStructure as { stage: string; duration: string; interviewer: string; focus: string }[]).map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: ink, flexShrink: 0 }}>{s.stage}</span>
                    <span style={{ color: muted }}>{s.duration} · {s.interviewer} · {s.focus}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Section tabs */}
            <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${bdr}`, paddingBottom: 8 }}>
              {(['behavioral', 'technical', 'rubric'] as const).map(tab => (
                <button key={tab} onClick={() => setIkSection(tab)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: ikSection === tab ? ink : "transparent", color: ikSection === tab ? "#fff" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {tab}
                </button>
              ))}
            </div>
            {ikSection === 'behavioral' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(ikResult.behavioralQuestions as { question: string; whatYoureTesting: string; strongAnswer: string; probes?: string[] }[] | undefined)?.map((q, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>{q.question}</p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Testing: {q.whatYoureTesting}</p>
                    <p style={{ fontSize: 11, color: green }}>Strong answer includes: {q.strongAnswer}</p>
                    {q.probes && q.probes.length > 0 && <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Probes: {q.probes.join(' · ')}</p>}
                  </div>
                ))}
              </div>
            )}
            {ikSection === 'technical' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(ikResult.technicalQuestions as { question: string; whatYoureTesting: string; evaluationCriteria: string }[] | undefined)?.map((q, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>{q.question}</p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Testing: {q.whatYoureTesting}</p>
                    <p style={{ fontSize: 11, color: blue }}>Evaluate for: {q.evaluationCriteria}</p>
                  </div>
                ))}
                {(ikResult.situationalQuestions as { scenario: string; whatYoureTesting: string }[] | undefined)?.map((q, i) => (
                  <div key={i} style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>Scenario: {q.scenario}</p>
                    <p style={{ fontSize: 11, color: blue }}>Testing: {q.whatYoureTesting}</p>
                  </div>
                ))}
              </div>
            )}
            {ikSection === 'rubric' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(ikResult.scoringRubric as { dimension: string; weight: number; description: string; redFlag: string }[] | undefined)?.map((r, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{r.dimension}</p>
                      <span style={{ fontSize: 11, color: muted }}>Weight: {r.weight}%</span>
                    </div>
                    <p style={{ fontSize: 11, color: ink, marginBottom: 4 }}>{r.description}</p>
                    <p style={{ fontSize: 11, color: red }}>Red flag: {r.redFlag}</p>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Red Flags</p>
                    {(ikResult.redFlags as string[] | undefined)?.map((f, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>✗ {f}</p>)}
                  </div>
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 6 }}>Green Flags</p>
                    {(ikResult.greenFlags as string[] | undefined)?.map((f, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>✓ {f}</p>)}
                  </div>
                </div>
                {!!ikResult.decisionFramework && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Decision Framework</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{ikResult.decisionFramework as string}</p>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setIkResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Rebuild Kit</button>
          </div>
        )}
      </div>

      {/* ── Culture Assessment ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Culture Assessment</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Score your culture health across key dimensions and get a tailored improvement framework.</p>
          </div>
          <button onClick={handleGenerateCultureAssessment} disabled={generatingCultAssess} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingCultAssess ? bdr : blue, color: generatingCultAssess ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingCultAssess ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingCultAssess ? "Assessing…" : "Assess Culture"}
          </button>
        </div>
        {cultAssessError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{cultAssessError}</p>}
        {cultAssessResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: blue + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: blue }}>{String(cultAssessResult.overallScore ?? '–')}</span>
              </div>
              <div>
                {!!cultAssessResult.verdict && <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>{String(cultAssessResult.verdict)}</p>}
                {!!cultAssessResult.cultureArchetype && <span style={{ fontSize: 11, background: green + "22", color: green, borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>{String(cultAssessResult.cultureArchetype)}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
              {(["dimensions", "rituals", "hiring", "remote"] as const).map(t => (
                <button key={t} onClick={() => setCultAssessTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${cultAssessTab === t ? blue : bdr}`, background: cultAssessTab === t ? blue : bg, color: cultAssessTab === t ? "#fff" : ink, fontSize: 11, fontWeight: cultAssessTab === t ? 700 : 400, cursor: "pointer" }}>
                  {t === "dimensions" ? "📊 Dimensions" : t === "rituals" ? "🔁 Rituals" : t === "hiring" ? "🎯 Hiring Filter" : "🌐 Remote Playbook"}
                </button>
              ))}
            </div>
            {cultAssessTab === "dimensions" && !!cultAssessResult.dimensions && (() => {
              const dims = cultAssessResult.dimensions as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {dims.map((d, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}`, cursor: "pointer" }} onClick={() => setCultAssessDimIdx(i === cultAssessDimIdx ? -1 : i)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(d.dimension ?? '')}</p>
                        <span style={{ fontSize: 13, fontWeight: 800, color: Number(d.score ?? 0) >= 70 ? green : Number(d.score ?? 0) >= 50 ? amber : red }}>{String(d.score ?? '–')}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: bdr, marginBottom: 6 }}>
                        <div style={{ height: 4, borderRadius: 4, background: Number(d.score ?? 0) >= 70 ? green : Number(d.score ?? 0) >= 50 ? amber : red, width: `${Math.min(100, Number(d.score ?? 0))}%` }} />
                      </div>
                      {i === cultAssessDimIdx && (
                        <div>
                          {!!d.currentState && <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}><b>Now:</b> {String(d.currentState)}</p>}
                          {!!d.improvement && <p style={{ fontSize: 11, color: blue }}><b>Improve:</b> {String(d.improvement)}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            {cultAssessTab === "rituals" && !!cultAssessResult.rituals && (() => {
              const items = cultAssessResult.rituals as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((r, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(r.ritual ?? '')}</p>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          {!!r.frequency && <span style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 7px", color: muted }}>{String(r.frequency)}</span>}
                          {!!r.effort && <span style={{ fontSize: 10, background: r.effort === 'low' ? green + "22" : r.effort === 'high' ? red + "22" : amber + "22", borderRadius: 20, padding: "2px 7px", color: r.effort === 'low' ? green : r.effort === 'high' ? red : amber, fontWeight: 700 }}>{String(r.effort)}</span>}
                        </div>
                      </div>
                      {!!r.purpose && <p style={{ fontSize: 11, color: muted }}>{String(r.purpose)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {cultAssessTab === "hiring" && !!cultAssessResult.hiringFilter && (() => {
              const items = cultAssessResult.hiringFilter as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((h, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 6 }}>{String(h.value ?? '')}</p>
                      {!!h.interviewQuestion && <p style={{ fontSize: 11, color: blue, marginBottom: 6, fontStyle: "italic" }}>Q: {String(h.interviewQuestion)}</p>}
                      <div style={{ display: "flex", gap: 10 }}>
                        {!!h.greenFlag && <p style={{ fontSize: 11, color: green }}>✓ {String(h.greenFlag)}</p>}
                        {!!h.redFlag && <p style={{ fontSize: 11, color: red }}>✗ {String(h.redFlag)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {cultAssessTab === "remote" && !!cultAssessResult.remotePlaybook && (() => {
              const rp = cultAssessResult.remotePlaybook as Record<string, unknown>;
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {[["asyncNorm", "Async Norm"], ["syncCadence", "Sync Cadence"], ["documentationStandard", "Documentation"], ["connectionRitual", "Connection Ritual"]].map(([key, label]) => (
                    !!rp[key] && (
                      <div key={key} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 12, color: ink }}>{String(rp[key])}</p>
                      </div>
                    )
                  ))}
                </div>
              );
            })()}
            {!!cultAssessResult.priorityAction && (
              <div style={{ marginTop: 12, background: blue + "11", borderRadius: 8, padding: 10, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Priority Action</p>
                <p style={{ fontSize: 12, color: ink }}>{String(cultAssessResult.priorityAction)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Salary Benchmarking ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Salary Benchmarking</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Competitive comp ranges, equity guidance, and budget impact for every role you&apos;re hiring</p>
          </div>
          <button onClick={handleGenerateSalaryBenchmarks} disabled={generatingSalary} style={{ padding: "8px 16px", borderRadius: 8, background: generatingSalary ? surf : ink, color: generatingSalary ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingSalary ? "default" : "pointer" }}>
            {generatingSalary ? "Benchmarking…" : "Run Benchmarks"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <input value={salaryRolesInput} onChange={e => setSalaryRolesInput(e.target.value)} placeholder="Roles (comma-separated, or leave blank for hiring plan)" style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 12, flex: 1, minWidth: 200 }} />
          <input value={salaryLocation} onChange={e => setSalaryLocation(e.target.value)} placeholder="Location (e.g. US remote)" style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 12, width: 180 }} />
        </div>
        {salaryError && <p style={{ color: "#DC2626", fontSize: 12 }}>{salaryError}</p>}
        {salaryResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!salaryResult.overview && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(salaryResult.overview)}</p>}
            {!!salaryResult.compensationPhilosophy && <p style={{ fontSize: 12, color: muted, margin: 0 }}>Philosophy: <strong>{String(salaryResult.compensationPhilosophy)}</strong></p>}
            {!!(salaryResult.roles as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Role Benchmarks</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {(salaryResult.roles as { role: string }[]).map((r, i) => (
                    <button key={i} onClick={() => setSalaryRoleIdx(i)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${salaryRoleIdx===i ? ink : bdr}`, background: salaryRoleIdx===i ? ink : bg, color: salaryRoleIdx===i ? bg : ink, fontSize: 11, cursor: "pointer" }}>{r.role}</button>
                  ))}
                </div>
                {(() => {
                  const r = (salaryResult.roles as Record<string, unknown>[])[salaryRoleIdx];
                  if (!r) return null;
                  const base = r.baseSalaryRange as { low?: number; mid?: number; high?: number } | undefined;
                  return (
                    <div style={{ padding: "12px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: ink, margin: "0 0 2px" }}>{String(r.role)}</p>
                          <p style={{ fontSize: 11, color: muted, margin: 0 }}>{String(r.level ?? '')}</p>
                        </div>
                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: r.hiringDifficulty==="hard" ? "#FEE2E2" : r.hiringDifficulty==="medium" ? "#FEF3C7" : "#D1FAE5", color: r.hiringDifficulty==="hard" ? "#DC2626" : r.hiringDifficulty==="medium" ? "#D97706" : "#16A34A", fontWeight: 600 }}>{String(r.hiringDifficulty ?? "medium")} to hire</span>
                      </div>
                      {base && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                        {[["Low", base.low], ["Mid", base.mid], ["High", base.high]].map(([label, val]) => (
                          <div key={String(label)} style={{ textAlign: "center", padding: "8px 4px", background: bg, borderRadius: 6, border: `1px solid ${bdr}` }}>
                            <p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>{String(label)}</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>${Number(val ?? 0).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>}
                      {!!r.equityPercent && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Equity: <strong>{String(r.equityPercent)}</strong></p>}
                      {!!r.topCandidateMotivator && <p style={{ fontSize: 12, color: muted, margin: "0 0 4px" }}>Motivator: {String(r.topCandidateMotivator)}</p>}
                      {!!r.negotiationTip && <p style={{ fontSize: 11, color: "#2563EB", margin: 0 }}>Tip: {String(r.negotiationTip)}</p>}
                    </div>
                  );
                })()}
              </div>
            )}
            {!!salaryResult.budgetImpact && (
              <div style={{ padding: "10px 14px", background: "#EFF6FF", borderRadius: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 6px" }}>Budget Impact</p>
                {!!(salaryResult.budgetImpact as Record<string, unknown>).estimatedAnnualBurn && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Annual burn: <strong>{String((salaryResult.budgetImpact as Record<string, unknown>).estimatedAnnualBurn)}</strong></p>}
                {!!(salaryResult.budgetImpact as Record<string, unknown>).runwayImpact && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Runway impact: {String((salaryResult.budgetImpact as Record<string, unknown>).runwayImpact)}</p>}
                {!!(salaryResult.budgetImpact as Record<string, unknown>).hiringRecommendation && <p style={{ fontSize: 12, color: muted, margin: 0 }}>{String((salaryResult.budgetImpact as Record<string, unknown>).hiringRecommendation)}</p>}
              </div>
            )}
            {!!(salaryResult.benefitsToOffer as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 6px" }}>Benefits to Offer</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(salaryResult.benefitsToOffer as string[]).map((b, i) => <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: surf, border: `1px solid ${bdr}`, color: ink }}>{b}</span>)}
                </div>
              </div>
            )}
            <button onClick={() => setSalaryResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Performance Review ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Performance Review Framework</p>
            <p style={{ fontSize: 11, color: muted }}>Generate a structured review template with categories, rating descriptors, self-assessment questions, and development plan.</p>
          </div>
          <button onClick={handleGeneratePerformanceReview} disabled={generatingPR} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingPR ? bdr : "#7C3AED", color: generatingPR ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingPR ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingPR ? "Generating…" : "Generate Review"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Employee Name", value: prName, set: setPrName, placeholder: "e.g. Alex Chen" },
            { label: "Role", value: prRole, set: setPrRole, placeholder: "e.g. Lead Engineer" },
            { label: "Review Period", value: prPeriod, set: setPrPeriod, placeholder: "e.g. Q1 2026" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{label}</p>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, background: bg, boxSizing: "border-box" as const }} />
            </div>
          ))}
        </div>
        {prError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{prError}</p>}
        {prResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {/* Categories */}
            {!!(prResult.framework as Record<string,unknown> | undefined)?.categories && !!((prResult.framework as Record<string,unknown>).categories as unknown[])?.length && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Review Categories</p>
                {(prResult.framework.categories as { category: string; weight: number; criteria: string[] }[]).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{c.category}</p>
                      <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{c.criteria?.slice(0, 2).join(' · ')}</p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: blue }}>{c.weight}%</span>
                  </div>
                ))}
              </div>
            )}
            {/* Dev plan */}
            {!!prResult.framework.developmentPlan && (() => {
              const dp = prResult.framework.developmentPlan as { strengthToLeverage?: string; growthArea?: string; successMetric?: string };
              return (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 6 }}>Development Plan</p>
                  {dp.strengthToLeverage && <p style={{ fontSize: 12, color: ink, marginBottom: 4 }}>✦ <strong>Leverage:</strong> {dp.strengthToLeverage}</p>}
                  {dp.growthArea && <p style={{ fontSize: 12, color: ink, marginBottom: 4 }}>↑ <strong>Grow:</strong> {dp.growthArea}</p>}
                  {dp.successMetric && <p style={{ fontSize: 12, color: muted, margin: 0 }}>✓ <strong>Success in 90d:</strong> {dp.successMetric}</p>}
                </div>
              );
            })()}
            <button onClick={handleDownloadPR} style={{ padding: "8px 16px", borderRadius: 8, background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
              Download Review HTML
            </button>
          </div>
        )}
      </div>

      {/* ── Culture Deck ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Culture Deck</p>
            <p style={{ fontSize: 11, color: muted }}>Generate a Stripe/Netflix-style culture deck with values, behaviors, hiring filters, rituals, and honest expectations.</p>
          </div>
          <button onClick={handleGenerateCultureDeck} disabled={generatingCulture}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingCulture ? bdr : "#7C3AED", color: generatingCulture ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingCulture ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingCulture ? "Generating…" : "Generate Culture Deck"}
          </button>
        </div>
        {cultureError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{cultureError}</p>}
        {cultureResult && (() => {
          const deck = cultureResult.deck;
          const values = (deck.values as { value: string; description: string; looksLike: string; doesntLookLike: string }[] | undefined) ?? [];
          const hiringFilters = (deck.hiringFilters as string[] | undefined) ?? [];
          const antiPatterns = (deck.antiPatterns as string[] | undefined) ?? [];
          const rituals = (deck.rituals as { ritual: string; frequency: string; purpose: string }[] | undefined) ?? [];
          return (
            <div>
              {!!deck.cultureHeadline && (
                <p style={{ fontSize: 15, fontWeight: 800, color: ink, marginBottom: 4 }}>{deck.cultureHeadline as string}</p>
              )}
              {!!deck.mission && (
                <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{deck.mission as string}</p>
              )}
              {values.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Values</p>
                  {values.map((v, vi) => (
                    <div key={vi} style={{ padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 4 }}>{v.value}</p>
                      <p style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{v.description}</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1, background: "#F0FDF4", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: green }}>✓ {v.looksLike}</div>
                        <div style={{ flex: 1, background: "#FFF1F2", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: red }}>✗ {v.doesntLookLike}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                {hiringFilters.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>We Always Hire For</p>
                    {hiringFilters.map((f, fi) => (
                      <p key={fi} style={{ fontSize: 11, color: ink, marginBottom: 4 }}>✓ {f}</p>
                    ))}
                  </div>
                )}
                {antiPatterns.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Doesn&apos;t Work Here</p>
                    {antiPatterns.map((a, ai) => (
                      <p key={ai} style={{ fontSize: 11, color: red, marginBottom: 4 }}>✗ {a}</p>
                    ))}
                  </div>
                )}
              </div>
              {rituals.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Our Rituals</p>
                  {rituals.map((r, ri) => (
                    <div key={ri} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: amber, background: "#FFF7ED", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", border: "1px solid #FED7AA" }}>{r.frequency}</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{r.ritual}</p>
                        <p style={{ fontSize: 11, color: muted }}>{r.purpose}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleDownloadCultureDeck}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                Download Culture Deck HTML
              </button>
            </div>
          );
        })()}
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PMF SURVEY RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
