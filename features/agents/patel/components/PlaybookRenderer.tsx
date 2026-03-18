'use client'

import { Fragment, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Globe, ChevronRight, Calendar, Users, Send, Crosshair, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

export function PlaybookRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    companyContext?: string;
    icp?: { summary?: string; segments?: string[] };
    positioning?: { statement?: string; differentiators?: string[] };
    channels?: { channel: string; priority: string; budget: string; expectedCAC: string }[];
    messaging?: { audience: string; headline: string; valueProps: string[] }[];
    metrics?: { metric: string; target: string; currentBaseline: string }[];
    ninetyDayPlan?: { phase: string; weeks: string; objectives: string[]; keyActions: string[]; successCriteria: string }[];
  };

  const [deploying, setDeploying]   = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Launch copy state
  const [showLaunchCopy, setShowLaunchCopy] = useState(false);
  const [launchCopyLoading, setLaunchCopyLoading] = useState(false);
  const [launchCopyResult, setLaunchCopyResult] = useState<Record<string, Record<string, string>> | null>(null);
  const [launchCopyError, setLaunchCopyError] = useState<string | null>(null);
  const [copiedLaunch, setCopiedLaunch] = useState<string | null>(null);

  // Directory submissions state
  const [directoriesLoading, setDirectoriesLoading] = useState(false);
  const [directoriesResult, setDirectoriesResult]   = useState<{
    productHunt?: { name: string; tagline: string; description: string; topics: string[]; firstComment: string; hunterNote: string };
    hackerNews?: { title: string; body: string; timing: string };
    betaList?: { headline: string; description: string; callToAction: string };
    indieHackers?: { title: string; description: string; milestone: string };
    verticalDirectories?: { directory: string; url: string; submissionTip: string }[];
    launchChecklist?: string[];
  } | null>(null);
  const [directoriesError, setDirectoriesError]     = useState<string | null>(null);
  const [showDirectories, setShowDirectories]       = useState(false);
  const [activeDirectory, setActiveDirectory]       = useState<"productHunt" | "hackerNews" | "betaList" | "indieHackers" | "verticalDirectories">("productHunt");
  const [copiedDir, setCopiedDir]                   = useState<string | null>(null);

  async function handleGenerateDirectories() {
    if (directoriesLoading) return;
    setDirectoriesLoading(true); setDirectoriesError(null);
    try {
      const res = await fetch('/api/agents/patel/directories', { method: 'POST' });
      const r = await res.json();
      if (res.ok) { setDirectoriesResult(r.result); setShowDirectories(true); }
      else setDirectoriesError(r.error ?? 'Failed to generate submissions');
    } catch { setDirectoriesError('Network error'); }
    finally { setDirectoriesLoading(false); }
  }

  // Content calendar state
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarResult, setCalendarResult] = useState<{
    weeks?: { week: number; theme: string; objective: string; posts: { day: string; platform: string; type: string; hook: string; body: string; cta?: string; hashtags: string[] }[] }[];
    contentPillars?: string[];
    growthTip?: string;
  } | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // ICP validation state
  const [runningIcpValidation, setRunningIcpValidation] = useState(false);
  const [icpValidationResult, setIcpValidationResult]   = useState<{
    totalSent?: number; overallOpenRate?: number; overallReplyRate?: number;
    segments?: { segment: string; sent: number; openRate: number; replyRate: number; verdict: string }[];
    verdict?: string; bestSegment?: string; worstSegment?: string;
    icpRefinements?: string[]; messagingInsight?: string; nextTest?: string; projectedImpact?: string;
  } | null>(null);
  const [icpValidationError, setIcpValidationError]     = useState<string | null>(null);
  const [showIcpValidation, setShowIcpValidation]       = useState(false);

  // Outreach sequence state
  const [showSequencePanel, setShowSequencePanel]     = useState(false);
  const [seqTargetRole, setSeqTargetRole]             = useState("");
  const [seqTargetIndustry, setSeqTargetIndustry]     = useState("");
  const [seqPainPoint, setSeqPainPoint]               = useState("");
  const [seqValueProp, setSeqValueProp]               = useState("");
  const [generatingSequence, setGeneratingSequence]   = useState(false);
  const [sequenceResult, setSequenceResult]           = useState<{
    sequenceStrategy?: string;
    sequence?: { step: number; day: number; subject: string; body: string; cta: string; toneNote: string }[];
  } | null>(null);
  const [_sequenceError, setSequenceError]             = useState<string | null>(null);
  const [copiedSeqStep, setCopiedSeqStep]             = useState<number | null>(null);

  async function handleGenerateSequence() {
    if (generatingSequence || !seqTargetRole.trim() || !seqPainPoint.trim()) return;
    setGeneratingSequence(true); setSequenceError(null);
    try {
      const res = await fetch('/api/agents/patel/sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: seqTargetRole, targetIndustry: seqTargetIndustry, painPoint: seqPainPoint, valueProposition: seqValueProp }),
      });
      const r = await res.json();
      if (res.ok && r.sequence) setSequenceResult(r);
      else setSequenceError(r.error ?? 'Failed to generate sequence');
    } catch { setSequenceError('Network error'); }
    finally { setGeneratingSequence(false); }
  }

  function copySeqStep(step: number, text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopiedSeqStep(step); setTimeout(() => setCopiedSeqStep(null), 1500); }).catch(() => {});
  }

  // Launch plan state
  const [generatingLaunchPlan, setGeneratingLaunchPlan] = useState(false);
  const [launchPlanError, setLaunchPlanError]           = useState<string | null>(null);

  async function handleGenerateLaunchPlan() {
    if (generatingLaunchPlan) return;
    setGeneratingLaunchPlan(true); setLaunchPlanError(null);
    try {
      const res = await fetch('/api/agents/patel/launch-plan', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'launch-plan.html'; a.click();
        URL.revokeObjectURL(url);
      } else { setLaunchPlanError(r.error ?? 'Failed to generate launch plan'); }
    } catch { setLaunchPlanError('Network error'); }
    finally { setGeneratingLaunchPlan(false); }
  }

  // Landing copy state
  const [generatingLandingCopy, setGeneratingLandingCopy] = useState(false);
  const [landingCopyResult, setLandingCopyResult] = useState<{ heroHeadline?: string; heroSubheadline?: string; heroCTA?: string; valueProps?: { icon?: string; headline?: string; body?: string }[]; socialProof?: string; howItWorks?: { step?: number; action?: string; description?: string }[]; faq?: { question?: string; answer?: string }[]; closingCTA?: { headline?: string; body?: string; button?: string }; metaTitle?: string; metaDescription?: string } | null>(null);
  const [landingCopyError, setLandingCopyError] = useState<string | null>(null);
  const [landingCopyTab, setLandingCopyTab] = useState<'hero' | 'features' | 'faq'>('hero');

  async function handleGenerateLandingCopy() {
    if (generatingLandingCopy) return;
    setGeneratingLandingCopy(true); setLandingCopyError(null);
    try {
      const res = await fetch('/api/agents/patel/landing-copy', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.copy) { setLandingCopyResult(r.copy); }
      else { setLandingCopyError(r.error ?? 'Failed to generate landing copy'); }
    } catch { setLandingCopyError('Network error'); }
    finally { setGeneratingLandingCopy(false); }
  }

  // ABM Strategy state
  const [abmAccounts, setAbmAccounts]                     = useState('');
  const [generatingABM, setGeneratingABM]                 = useState(false);
  const [abmResult, setAbmResult]                         = useState<Record<string, unknown> | null>(null);
  const [abmError, setAbmError]                           = useState<string | null>(null);
  const [abmTab, setAbmTab]                               = useState<'targets' | 'playbook' | 'content' | 'metrics'>('targets');

  async function handleGenerateABMStrategy() {
    if (generatingABM) return;
    setGeneratingABM(true); setAbmError(null); setAbmResult(null);
    const targetAccounts = abmAccounts ? abmAccounts.split(',').map(a => a.trim()).filter(Boolean) : undefined;
    try {
      const res = await fetch('/api/agents/patel/account-based-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAccounts }),
      });
      const r = await res.json();
      if (res.ok && r.strategy) setAbmResult(r.strategy);
      else setAbmError(r.error ?? 'Generation failed');
    } catch { setAbmError('Network error'); }
    finally { setGeneratingABM(false); }
  }

  // Referral Program state
  const [generatingReferral, setGeneratingReferral]       = useState(false);
  const [referralResult, setReferralResult]               = useState<Record<string, unknown> | null>(null);
  const [referralError, setReferralError]                 = useState<string | null>(null);
  const [referralTab, setReferralTab]                     = useState<'mechanics' | 'viral' | 'launch' | 'templates'>('mechanics');

  async function handleGenerateReferralProgram() {
    if (generatingReferral) return;
    setGeneratingReferral(true); setReferralError(null); setReferralResult(null);
    try {
      const res = await fetch('/api/agents/patel/referral-program', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.program) setReferralResult(r.program);
      else setReferralError(r.error ?? 'Generation failed');
    } catch { setReferralError('Network error'); }
    finally { setGeneratingReferral(false); }
  }

  // Partnership Strategy state
  const [generatingPartnership, setGeneratingPartnership] = useState(false);
  const [partnershipResult, setPartnershipResult]         = useState<Record<string, unknown> | null>(null);
  const [partnershipError, setPartnershipError]           = useState<string | null>(null);
  const [partnershipTab, setPartnershipTab]               = useState<'types' | 'targets' | 'outreach' | 'integrations'>('types');

  async function handleGeneratePartnership() {
    if (generatingPartnership) return;
    setGeneratingPartnership(true); setPartnershipError(null); setPartnershipResult(null);
    try {
      const res = await fetch('/api/agents/patel/partnership-strategy', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.strategy) setPartnershipResult(r.strategy);
      else setPartnershipError(r.error ?? 'Generation failed');
    } catch { setPartnershipError('Network error'); }
    finally { setGeneratingPartnership(false); }
  }

  // Customer Journey state
  const [generatingJourney, setGeneratingJourney] = useState(false);
  const [journeyResult, setJourneyResult]         = useState<Record<string, unknown> | null>(null);
  const [journeyError, setJourneyError]           = useState<string | null>(null);
  const [journeyStageIdx, setJourneyStageIdx]     = useState(0);

  async function handleGenerateJourney() {
    if (generatingJourney) return;
    setGeneratingJourney(true); setJourneyError(null); setJourneyResult(null);
    try {
      const res = await fetch('/api/agents/patel/customer-journey', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.journey) setJourneyResult(r.journey);
      else setJourneyError(r.error ?? 'Generation failed');
    } catch { setJourneyError('Network error'); }
    finally { setGeneratingJourney(false); }
  }

  // A/B Test Designer state
  const [abtElement, setAbtElement]             = useState('');
  const [abtCurrent, setAbtCurrent]             = useState('');
  const [abtGoal, setAbtGoal]                   = useState('');
  const [generatingABT, setGeneratingABT]       = useState(false);
  const [abtResult, setAbtResult]               = useState<Record<string, unknown> | null>(null);
  const [abtError, setAbtError]                 = useState<string | null>(null);
  const [activeVariant, setActiveVariant]       = useState(0);

  async function handleDesignABTest() {
    if (!abtElement.trim() || !abtCurrent.trim() || generatingABT) return;
    setGeneratingABT(true); setAbtError(null); setAbtResult(null);
    try {
      const res = await fetch('/api/agents/patel/ab-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ element: abtElement, currentVersion: abtCurrent, goal: abtGoal || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.test) { setAbtResult(r.test); setActiveVariant(0); }
      else setAbtError(r.error ?? 'Failed to design A/B test');
    } catch { setAbtError('Network error'); }
    finally { setGeneratingABT(false); }
  }

  const [calendarWeek, setCalendarWeek] = useState(1);
  const [copiedPost, setCopiedPost] = useState<string | null>(null);

  async function handleGenerateCalendar() {
    if (calendarLoading) return;
    setCalendarLoading(true); setCalendarError(null);
    try {
      const res = await fetch('/api/agents/patel/content-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const r = await res.json();
      if (res.ok) { setCalendarResult(r.calendar); setShowCalendar(true); }
      else setCalendarError(r.error ?? 'Failed to generate calendar');
    } catch { setCalendarError('Network error'); }
    finally { setCalendarLoading(false); }
  }

  function copyPost(key: string, text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopiedPost(key); setTimeout(() => setCopiedPost(null), 1500); }).catch(() => {});
  }

  async function handleGenerateLaunchCopy() {
    if (launchCopyLoading) return;
    setLaunchCopyLoading(true); setLaunchCopyError(null); setLaunchCopyResult(null);
    // Pull context from the playbook data
    const targeting = d.icp?.summary || d.icp?.segments?.join(", ") || "early-stage startups";
    const positioning = d.positioning?.statement || d.companyContext || "";
    const channels = (d.channels ?? []).map(c => c.channel).slice(0, 3).join(", ");
    try {
      const res = await fetch('/api/agents/patel/launch-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startupName: "My Startup",
          tagline: d.positioning?.statement?.slice(0, 60),
          problem: targeting,
          solution: positioning || channels || "a better way",
          targetUser: targeting,
        }),
      });
      const r = await res.json();
      if (res.ok) setLaunchCopyResult(r.copy as Record<string, Record<string, string>>);
      else setLaunchCopyError(r.error ?? 'Failed to generate launch copy');
    } catch { setLaunchCopyError('Network error'); }
    finally { setLaunchCopyLoading(false); }
  }

  function copyLaunchText(key: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLaunch(key);
      setTimeout(() => setCopiedLaunch(null), 1500);
    }).catch(() => {});
  }

  async function handleRunIcpValidation() {
    if (runningIcpValidation) return;
    setRunningIcpValidation(true); setIcpValidationError(null);
    try {
      const res = await fetch('/api/agents/patel/icp-validation', { method: 'POST' });
      const r = await res.json();
      if (res.ok) { setIcpValidationResult(r); setShowIcpValidation(true); }
      else setIcpValidationError(r.error ?? 'ICP validation failed');
    } catch { setIcpValidationError('Network error'); }
    finally { setRunningIcpValidation(false); }
  }

  useEffect(() => {
    if (!artifactId) return;
    fetch(`/api/agents/landingpage/deploy?artifactId=${artifactId}`)
      .then(r => r.json())
      .then(d => { if (d.site?.url) setDeployedUrl(d.site.url); })
      .catch(() => {});
  }, [artifactId]);

  async function handleDeploy() {
    if (deploying) return;
    setDeploying(true); setDeployError(null);
    try {
      const res = await fetch('/api/agents/landingpage/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactType: 'gtm_playbook', artifactContent: data, siteName: 'startup-landing', agentId: 'patel', artifactId }),
      });
      const result = await res.json();
      if (res.ok) setDeployedUrl(result.url);
      else setDeployError(result.error ?? 'Deploy failed — check NETLIFY_API_KEY');
    } catch { setDeployError('Network error'); }
    finally { setDeploying(false); }
  }

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  const priColor: Record<string, string> = { primary: blue, secondary: amber, experimental: muted };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Deploy Landing Page CTA ── */}
      <div
        style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.07)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${green}12`, border: `1px solid ${green}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {deploying
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: green }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Globe size={15} style={{ color: green }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Deploy Landing Page</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Turn this GTM strategy into a live Netlify landing page in seconds.</p>
          </div>
          <button onClick={handleDeploy} disabled={deploying}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: deploying ? muted : green, border: `1.5px solid ${deploying ? bdr : green}40`, cursor: deploying ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!deploying) { e.currentTarget.style.background = `${green}10`; e.currentTarget.style.borderColor = green; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = `${green}40`; }}
          >
            {deploying ? "Running…" : "Run"}{!deploying && <ChevronRight size={11} />}
          </button>
        </div>
        {(deployedUrl || deployError) && (
          <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            {deployedUrl && <><p style={{ fontSize: 12, fontWeight: 600, color: green, marginBottom: 2 }}>Live:</p><a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: green, textDecoration: "underline", wordBreak: "break-all", flex: 1 }}>{deployedUrl}</a><a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${green}`, background: "transparent", color: green, fontSize: 11, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>View Live</a></>}
            {deployError && <p style={{ fontSize: 11, color: red }}>{deployError}</p>}
          </div>
        )}
      </div>
      {/* ── Launch Copy CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Get Launch Copy</p>
          <p style={{ fontSize: 11, color: muted }}>Product Hunt tagline, HN post, BetaList pitch, Twitter announcement — all generated from your GTM strategy.</p>
          {launchCopyError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{launchCopyError}</p>}
        </div>
        <button onClick={() => { setShowLaunchCopy(p => !p); if (!launchCopyResult) handleGenerateLaunchCopy(); }} disabled={launchCopyLoading} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: launchCopyLoading ? bdr : ink, color: launchCopyLoading ? muted : bg, fontSize: 12, fontWeight: 600, cursor: launchCopyLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {launchCopyLoading ? "Generating…" : launchCopyResult ? (showLaunchCopy ? "Hide" : "Show Copy") : "Generate Copy"}
        </button>
      </div>

      {/* ── Launch Copy inline display ── */}
      {showLaunchCopy && launchCopyResult && (() => {
        const PLATFORMS: { key: string; label: string; icon: string; fields: string[] }[] = [
          { key: "productHunt", label: "Product Hunt", icon: "🐱", fields: ["tagline", "description", "firstComment"] },
          { key: "hackerNews", label: "Hacker News", icon: "🗞", fields: ["title", "body"] },
          { key: "twitter", label: "Twitter / X", icon: "𝕏", fields: ["announcement"] },
          { key: "betaList", label: "BetaList", icon: "🅱", fields: ["description"] },
          { key: "redditIntro", label: "Reddit", icon: "🤖", fields: ["title", "body"] },
        ];
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PLATFORMS.map(({ key, label, icon, fields }) => {
              const platform = (launchCopyResult as Record<string, Record<string, string>>)[key];
              if (!platform) return null;
              return (
                <div key={key} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 10 }}>{icon} {label}</p>
                  {fields.map(f => {
                    const text = String(platform[f] ?? "");
                    const copyKey = `${key}-${f}`;
                    return (
                      <div key={f} style={{ marginBottom: 8 }}>
                        {fields.length > 1 && <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "capitalize", marginBottom: 3 }}>{f}</p>}
                        <div style={{ position: "relative" }}>
                          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, background: surf, padding: "8px 40px 8px 10px", borderRadius: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text}</p>
                          <button onClick={() => copyLaunchText(copyKey, text)} style={{ position: "absolute", top: 6, right: 6, padding: "2px 8px", borderRadius: 4, border: `1px solid ${bdr}`, background: copiedLaunch === copyKey ? green : bg, color: copiedLaunch === copyKey ? "#fff" : muted, fontSize: 10, cursor: "pointer" }}>
                            {copiedLaunch === copyKey ? "✓" : "Copy"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Content Calendar CTA ── */}
      <div
        style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ink + "40"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {calendarLoading
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: ink }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Calendar size={15} style={{ color: muted }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Content Calendar</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>4-week LinkedIn + Twitter posts — awareness → solution → social proof → CTA.</p>
          </div>
          <button onClick={() => { if (!calendarResult) handleGenerateCalendar(); else setShowCalendar(p => !p); }} disabled={calendarLoading}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: calendarLoading ? muted : ink, border: `1.5px solid ${bdr}`, cursor: calendarLoading ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!calendarLoading) { e.currentTarget.style.background = surf; e.currentTarget.style.borderColor = ink; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = bdr; }}
          >
            {calendarLoading ? "Running…" : calendarResult ? (showCalendar ? "Hide" : "Show") : "Run"}{!calendarLoading && !showCalendar && <ChevronRight size={11} />}
          </button>
        </div>
        {calendarError && <div style={{ borderTop: `1px solid ${bdr}`, padding: "8px 14px" }}><p style={{ fontSize: 11, color: red }}>{calendarError}</p></div>}
      </div>

      {/* ── Content Calendar inline display ── */}
      {showCalendar && calendarResult && (() => {
        const weeks = calendarResult.weeks ?? [];
        const activeWeekData = weeks.find(w => w.week === calendarWeek);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Week tabs */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {weeks.map(w => (
                <button key={w.week} onClick={() => setCalendarWeek(w.week)} style={{ padding: "5px 14px", borderRadius: 999, border: `1px solid ${calendarWeek === w.week ? green : bdr}`, background: calendarWeek === w.week ? green : bg, color: calendarWeek === w.week ? "#fff" : ink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Week {w.week}
                </button>
              ))}
            </div>
            {/* Week header */}
            {activeWeekData && (
              <>
                <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 8, padding: "10px 14px" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: green, marginBottom: 2 }}>{activeWeekData.theme}</p>
                  <p style={{ fontSize: 11, color: muted }}>{activeWeekData.objective}</p>
                </div>
                {/* Posts */}
                {activeWeekData.posts.map((post, pi) => {
                  const postKey = `w${calendarWeek}-p${pi}`;
                  const fullText = `${post.hook}\n\n${post.body}${post.cta ? `\n\n${post.cta}` : ''}${post.hashtags?.length ? `\n\n${post.hashtags.join(' ')}` : ''}`;
                  return (
                    <div key={pi} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: muted }}>{post.day}</span>
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: post.platform === "LinkedIn" ? "#DBEAFE" : "#F3F4F6", color: post.platform === "LinkedIn" ? blue : ink }}>{post.platform}</span>
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, background: surf, color: muted }}>{post.type?.replace(/_/g, " ")}</span>
                        </div>
                        <button onClick={() => copyPost(postKey, fullText)} style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: copiedPost === postKey ? green : bg, color: copiedPost === postKey ? "#fff" : muted, fontSize: 10, cursor: "pointer" }}>
                          {copiedPost === postKey ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 6, lineHeight: 1.4 }}>{post.hook}</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: post.cta || post.hashtags?.length ? 8 : 0 }}>{post.body}</p>
                      {post.cta && <p style={{ fontSize: 12, fontWeight: 600, color: blue }}>{post.cta}</p>}
                      {post.hashtags?.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                          {post.hashtags.map((h, hi) => <span key={hi} style={{ fontSize: 10, color: blue, background: "#EFF6FF", padding: "2px 6px", borderRadius: 4 }}>{h}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            {/* Content pillars + growth tip */}
            {(calendarResult.contentPillars?.length || calendarResult.growthTip) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {calendarResult.contentPillars && calendarResult.contentPillars.length > 0 && (
                  <div style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Content Pillars</p>
                    {calendarResult.contentPillars.map((p, pi) => <p key={pi} style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>• {p}</p>)}
                  </div>
                )}
                {calendarResult.growthTip && (
                  <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "12px 14px", border: `1px solid #FDE68A` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Growth Tip</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{calendarResult.growthTip}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Company Context */}
      {d.companyContext && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.companyContext}</p>
        </CardContent></Card>
      )}

      {/* Positioning */}
      {d.positioning?.statement && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Positioning</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>{d.positioning.statement}</p>
          {d.positioning.differentiators && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {d.positioning.differentiators.map((diff, i) => (
                <Badge key={i} variant="outline">{diff}</Badge>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {/* ICP Segments */}
      {d.icp?.segments && d.icp.segments.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>ICP Segments</p>
          {d.icp.summary && <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{d.icp.summary}</p>}
          <div className="flex flex-wrap gap-1.5">
            {d.icp.segments.map((seg, i) => (
              <Badge key={i} variant="outline">{seg}</Badge>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Channels */}
      {d.channels && d.channels.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Channel Strategy</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 70px", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {["Channel", "Priority", "Budget", "CAC"].map(h => (
              <div key={h} style={{ background: surf, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
            {d.channels.map((ch, i) => (
              <Fragment key={i}>
                <div style={{ background: bg, padding: "10px", fontSize: 12, fontWeight: 600, color: ink }}>{ch.channel}</div>
                <div style={{ background: bg, padding: "10px", display: "flex", alignItems: "center" }}>
                  <Badge variant="outline" style={{ fontSize: 9, color: priColor[ch.priority] || muted, borderColor: priColor[ch.priority] || muted }}>
                    {ch.priority}
                  </Badge>
                </div>
                <div style={{ background: bg, padding: "10px", fontSize: 11, color: ink }}>{ch.budget}</div>
                <div style={{ background: bg, padding: "10px", fontSize: 11, color: ink }}>{ch.expectedCAC}</div>
              </Fragment>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Messaging */}
      {d.messaging && d.messaging.length > 0 && (
        <div>
          <p style={sectionHead}>Messaging</p>
          <div className="flex flex-col gap-2">
            {d.messaging.map((msg, i) => (
              <Card key={i}><CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{msg.audience}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 6 }}>{msg.headline}</p>
                {msg.valueProps.map((vp, vi) => (
                  <p key={vi} style={{ fontSize: 12, color: muted, lineHeight: 1.6, paddingLeft: 8 }}>• {vp}</p>
                ))}
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      {d.metrics && d.metrics.length > 0 && (
        <div>
          <p style={sectionHead}>Key Metrics</p>
          <div className="grid grid-cols-2 gap-2">
            {d.metrics.map((m, i) => (
              <Card key={i}><CardContent className="pt-3 pb-3">
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.metric}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>{m.target}</p>
                <p style={{ fontSize: 10, color: muted }}>Baseline: {m.currentBaseline}</p>
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {/* 90-Day Plan */}
      {d.ninetyDayPlan && d.ninetyDayPlan.length > 0 && (
        <div>
          <p style={sectionHead}>90-Day Plan</p>
          <Accordion type="multiple" defaultValue={["phase-0"]} className="flex flex-col gap-1">
            {d.ninetyDayPlan.map((phase, i) => (
              <AccordionItem key={i} value={`phase-${i}`} className="border rounded-xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>{phase.phase}</span>
                    <Badge variant="secondary" className="mr-2">{phase.weeks}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="mb-3">
                    <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Objectives</p>
                    {phase.objectives.map((o, oi) => <p key={oi} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8 }}>→ {o}</p>)}
                  </div>
                  <div className="mb-3">
                    <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Key Actions</p>
                    {phase.keyActions.map((a, ai) => <p key={ai} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8 }}>• {a}</p>)}
                  </div>
                  <div style={{ background: surf, borderRadius: 6, padding: "8px 10px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, color: muted }}>✓ {phase.successCriteria}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* ── Directory Submissions ─────────────────────────────────────────────── */}
      <Card><CardContent className="pt-4 pb-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Directory Submissions</p>
            <p style={{ fontSize: 11, color: muted }}>Launch-ready copy for Product Hunt, HackerNews Show HN, BetaList, and Indie Hackers — tailored per platform.</p>
          </div>
          <button onClick={() => { if (showDirectories && !directoriesLoading) { setShowDirectories(false); } else if (!directoriesResult) { handleGenerateDirectories(); } else setShowDirectories(true); }} disabled={directoriesLoading} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: directoriesLoading ? bdr : blue, color: directoriesLoading ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: directoriesLoading ? "not-allowed" : "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
            {directoriesLoading ? "Generating…" : directoriesResult ? (showDirectories ? "Hide" : "Show Submissions") : "Generate"}
          </button>
        </div>
        {directoriesError && <p style={{ fontSize: 12, color: red, marginTop: 8 }}>{directoriesError}</p>}
        {showDirectories && directoriesResult && (
          <div style={{ marginTop: 14 }}>
            {/* Platform tabs */}
            <Tabs value={activeDirectory} onValueChange={(v) => setActiveDirectory(v as typeof activeDirectory)} className="mb-3">
              <TabsList>
                <TabsTrigger value="productHunt">Product Hunt</TabsTrigger>
                <TabsTrigger value="hackerNews">HackerNews</TabsTrigger>
                <TabsTrigger value="betaList">BetaList</TabsTrigger>
                <TabsTrigger value="indieHackers">Indie Hackers</TabsTrigger>
                <TabsTrigger value="verticalDirectories">Directories</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Product Hunt */}
            {activeDirectory === "productHunt" && directoriesResult.productHunt && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#FF6154", marginBottom: 4 }}>🐱 PRODUCT HUNT</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: ink }}>{directoriesResult.productHunt.name}</p>
                  <p style={{ fontSize: 13, color: muted, marginTop: 2 }}>{directoriesResult.productHunt.tagline}</p>
                  {directoriesResult.productHunt.topics && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {directoriesResult.productHunt.topics.map((t, i) => (
                        <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#FFF1EE", color: "#FF6154", fontWeight: 600 }}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                {[
                  { label: "Page Description", text: directoriesResult.productHunt.description },
                  { label: "First Comment (Launch Day)", text: directoriesResult.productHunt.firstComment },
                  { label: "Hunter Pitch", text: directoriesResult.productHunt.hunterNote },
                ].map(({ label, text }, i) => (
                  <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase" }}>{label}</p>
                      <button onClick={() => { navigator.clipboard.writeText(text); setCopiedDir(label); setTimeout(() => setCopiedDir(null), 1500); }} style={{ fontSize: 10, color: blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        {copiedDir === label ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* HackerNews */}
            {activeDirectory === "hackerNews" && directoriesResult.hackerNews && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#FF6600", marginBottom: 6 }}>Y COMBINATOR HACKER NEWS</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 4 }}>{directoriesResult.hackerNews.title}</p>
                  {directoriesResult.hackerNews.timing && <p style={{ fontSize: 11, color: green }}>Best time to post: {directoriesResult.hackerNews.timing}</p>}
                </div>
                <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Post Body</p>
                    <button onClick={() => { navigator.clipboard.writeText(directoriesResult!.hackerNews!.title + '\n\n' + directoriesResult!.hackerNews!.body); setCopiedDir('hn'); setTimeout(() => setCopiedDir(null), 1500); }} style={{ fontSize: 10, color: blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                      {copiedDir === 'hn' ? "Copied!" : "Copy All"}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{directoriesResult.hackerNews.body}</p>
                </div>
              </div>
            )}

            {/* BetaList */}
            {activeDirectory === "betaList" && directoriesResult.betaList && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "BetaList Headline", text: directoriesResult.betaList.headline },
                  { label: "Description", text: directoriesResult.betaList.description },
                  { label: "Call to Action", text: directoriesResult.betaList.callToAction },
                ].map(({ label, text }, i) => (
                  <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase" }}>{label}</p>
                      <button onClick={() => { navigator.clipboard.writeText(text); setCopiedDir(label); setTimeout(() => setCopiedDir(null), 1500); }} style={{ fontSize: 10, color: blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        {copiedDir === label ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Indie Hackers */}
            {activeDirectory === "indieHackers" && directoriesResult.indieHackers && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#6366F1", marginBottom: 6 }}>INDIE HACKERS</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{directoriesResult.indieHackers.title}</p>
                </div>
                {[
                  { label: "Product Description", text: directoriesResult.indieHackers.description },
                  { label: "Milestone Post Angle", text: directoriesResult.indieHackers.milestone },
                ].map(({ label, text }, i) => (
                  <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase" }}>{label}</p>
                      <button onClick={() => { navigator.clipboard.writeText(text); setCopiedDir(label); setTimeout(() => setCopiedDir(null), 1500); }} style={{ fontSize: 10, color: blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        {copiedDir === label ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Vertical Directories */}
            {activeDirectory === "verticalDirectories" && directoriesResult.verticalDirectories && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {directoriesResult.verticalDirectories.map((dir, i) => (
                  <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>{dir.directory}</p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{dir.submissionTip}</p>
                    {dir.url && <p style={{ fontSize: 10, color: blue }}>{dir.url}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Launch checklist */}
            {directoriesResult.launchChecklist && directoriesResult.launchChecklist.length > 0 && (
              <div style={{ marginTop: 14, background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>48-HOUR LAUNCH CHECKLIST</p>
                {directoriesResult.launchChecklist.map((item, i) => (
                  <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, marginBottom: 3 }}>☐ {item}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent></Card>

      {/* ── ICP Validation ── */}
      <Card className="overflow-hidden">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${blue}12`, border: `1px solid ${blue}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {runningIcpValidation
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: blue }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Users size={15} style={{ color: blue }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>ICP Validation</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Analyze outreach to identify which ICP segments actually respond.</p>
          </div>
          <button onClick={handleRunIcpValidation} disabled={runningIcpValidation}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: runningIcpValidation ? muted : blue, border: `1.5px solid ${runningIcpValidation ? bdr : blue}40`, cursor: runningIcpValidation ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!runningIcpValidation) { e.currentTarget.style.background = `${blue}10`; e.currentTarget.style.borderColor = blue; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = `${blue}40`; }}
          >
            {runningIcpValidation ? "Running…" : icpValidationResult ? (showIcpValidation ? "Refresh" : "Show") : "Run"}{!runningIcpValidation && !showIcpValidation && <ChevronRight size={11} />}
          </button>
        </div>
        {(icpValidationError || (showIcpValidation && icpValidationResult)) && (
          <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
            {icpValidationError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{icpValidationError}</p>}
        {showIcpValidation && icpValidationResult && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <div style={{ background: bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", marginBottom: 2 }}>Emails Sent</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: ink }}>{icpValidationResult.totalSent ?? 0}</p>
              </div>
              <div style={{ background: bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", marginBottom: 2 }}>Open Rate</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: blue }}>{icpValidationResult.overallOpenRate ?? 0}%</p>
              </div>
              <div style={{ background: bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", marginBottom: 2 }}>Reply Rate</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: green }}>{icpValidationResult.overallReplyRate ?? 0}%</p>
              </div>
            </div>
            {icpValidationResult.verdict && (
              <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                <p style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>{icpValidationResult.verdict}</p>
              </div>
            )}
            {icpValidationResult.segments && icpValidationResult.segments.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 6 }}>SEGMENT BREAKDOWN</p>
                {icpValidationResult.segments.map((seg, i) => (
                  <div key={i} style={{ background: bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{seg.segment}</p>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: seg.verdict === "strong" ? "#F0FDF4" : seg.verdict === "weak" ? "#FEF2F2" : "#FFFBEB", color: seg.verdict === "strong" ? green : seg.verdict === "weak" ? red : amber, fontWeight: 700 }}>{seg.verdict}</span>
                    </div>
                    <p style={{ fontSize: 11, color: muted }}>{seg.sent} sent · {seg.openRate}% open · {seg.replyRate}% reply</p>
                  </div>
                ))}
              </div>
            )}
            {icpValidationResult.icpRefinements && icpValidationResult.icpRefinements.length > 0 && (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>ICP REFINEMENTS</p>
                {icpValidationResult.icpRefinements.map((r, i) => (
                  <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, marginBottom: 3 }}>→ {r}</p>
                ))}
              </div>
            )}
            {icpValidationResult.nextTest && (
              <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>Next test: {icpValidationResult.nextTest}</p>
            )}
          </div>
        )}
          </div>
        )}
      </Card>

      {/* ── Launch Plan CTA ── */}
      <Card><CardContent className="pt-4 pb-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>30-Day Launch Plan</p>
            <p style={{ fontSize: 11, color: muted }}>Patel generates a printable 3-phase launch checklist — Pre-Launch (14 days), Launch Day (by time block), and Post-Launch Weeks 1–2 — in HTML you can print.</p>
            {launchPlanError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{launchPlanError}</p>}
          </div>
          <button
            onClick={handleGenerateLaunchPlan}
            disabled={generatingLaunchPlan}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingLaunchPlan ? bdr : ink, color: generatingLaunchPlan ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingLaunchPlan ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}
          >
            {generatingLaunchPlan ? "Generating…" : "Download Launch Plan"}
          </button>
        </div>
      </CardContent></Card>

      {/* ── Landing Page Copy ── */}
      <Card><CardContent className="pt-4 pb-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: landingCopyResult ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Landing Page Copy</p>
            <p style={{ fontSize: 11, color: muted }}>Patel generates conversion-optimised copy — hero headline, value props, how-it-works, FAQ, meta title, and closing CTA — based on your ICP and brand.</p>
            {landingCopyError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{landingCopyError}</p>}
          </div>
          <button onClick={handleGenerateLandingCopy} disabled={generatingLandingCopy}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingLandingCopy ? bdr : blue, color: generatingLandingCopy ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingLandingCopy ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingLandingCopy ? "Generating…" : "Generate Copy"}
          </button>
        </div>
        {landingCopyResult && (
          <div>
            <Tabs value={landingCopyTab} onValueChange={(v) => setLandingCopyTab(v as typeof landingCopyTab)} className="mb-3">
              <TabsList>
                <TabsTrigger value="hero">Hero & Value Props</TabsTrigger>
                <TabsTrigger value="features">How It Works</TabsTrigger>
                <TabsTrigger value="faq">FAQ & Meta</TabsTrigger>
              </TabsList>
            </Tabs>
            {landingCopyTab === 'hero' && (
              <div>
                <div style={{ background: "#18160F", borderRadius: 8, padding: "16px 18px", marginBottom: 12 }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{landingCopyResult.heroHeadline ?? ''}</p>
                  <p style={{ fontSize: 13, color: "#8A867C", marginBottom: 10 }}>{landingCopyResult.heroSubheadline ?? ''}</p>
                  <span style={{ background: blue, color: "#fff", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{landingCopyResult.heroCTA ?? ''}</span>
                </div>
                {landingCopyResult.socialProof && <p style={{ fontSize: 12, color: muted, marginBottom: 12, fontStyle: "italic" }}>{landingCopyResult.socialProof}</p>}
                {(landingCopyResult.valueProps ?? []).map((vp, i) => (
                  <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{vp.icon} {vp.headline}</p>
                    <p style={{ fontSize: 11, color: muted }}>{vp.body}</p>
                  </div>
                ))}
              </div>
            )}
            {landingCopyTab === 'features' && (
              <div>
                {(landingCopyResult.howItWorks ?? []).map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{step.step ?? i + 1}</div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{step.action}</p>
                      <p style={{ fontSize: 11, color: muted }}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {landingCopyTab === 'faq' && (
              <div>
                {(landingCopyResult.faq ?? []).map((q, i) => (
                  <div key={i} style={{ borderBottom: `1px solid ${bdr}`, paddingBottom: 10, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{q.question}</p>
                    <p style={{ fontSize: 11, color: muted }}>{q.answer}</p>
                  </div>
                ))}
                {landingCopyResult.metaTitle && (
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginTop: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", marginBottom: 4 }}>SEO Meta</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{landingCopyResult.metaTitle}</p>
                    <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>{landingCopyResult.metaDescription}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent></Card>

      {/* ── A/B Test Designer ── */}
      <Card><CardContent className="pt-4 pb-4">
        <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>A/B Test Designer</p>
        <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Paste any element (headline, CTA, email subject, etc.) and Patel designs 3 challenger variants — each grounded in a different conversion psychology principle — with sample size, success criteria, and win conditions.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
          <input value={abtElement} onChange={e => setAbtElement(e.target.value)} placeholder="Element to test (e.g. Hero headline) *"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${abtElement ? bdr : '#DC2626'}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
          <input value={abtCurrent} onChange={e => setAbtCurrent(e.target.value)} placeholder="Current version / Control A (paste exact text) *"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${abtCurrent ? bdr : '#DC2626'}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
        </div>
        <input value={abtGoal} onChange={e => setAbtGoal(e.target.value)} placeholder="Conversion goal (optional — e.g. increase sign-up rate)"
          style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
        {abtError && <p style={{ fontSize: 11, color: '#DC2626', marginBottom: 8 }}>{abtError}</p>}
        <button onClick={handleDesignABTest} disabled={!abtElement.trim() || !abtCurrent.trim() || generatingABT}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: (!abtElement.trim() || !abtCurrent.trim() || generatingABT) ? bdr : amber, color: (!abtElement.trim() || !abtCurrent.trim() || generatingABT) ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: (!abtElement.trim() || !abtCurrent.trim() || generatingABT) ? "not-allowed" : "pointer" }}>
          {generatingABT ? "Designing…" : "Design A/B Test"}
        </button>
        {abtResult && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
              {!!abtResult.successMetric && <span style={{ color: muted }}>Metric: <strong style={{ color: ink }}>{abtResult.successMetric as string}</strong></span>}
              {!!abtResult.sampleSizeEstimate && <span style={{ color: muted }}>Sample/variant: <strong style={{ color: ink }}>{abtResult.sampleSizeEstimate as string}</strong></span>}
              {!!abtResult.testDuration && <span style={{ color: muted }}>Duration: <strong style={{ color: ink }}>{abtResult.testDuration as string}</strong></span>}
            </div>
            {!!abtResult.hypothesis && (
              <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "8px 12px", border: "1px solid #FDE68A" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 2 }}>Hypothesis</p>
                <p style={{ fontSize: 11, color: ink }}>{abtResult.hypothesis as string}</p>
              </div>
            )}
            {/* Variant tabs */}
            <div style={{ display: "flex", gap: 6 }}>
              {(abtResult.variants as { label: string; name: string }[] | undefined)?.map((v, i) => (
                <button key={i} onClick={() => setActiveVariant(i)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: activeVariant === i ? ink : "transparent", color: activeVariant === i ? "#fff" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {v.label}: {v.name}
                </button>
              ))}
            </div>
            {!!(abtResult.variants as { label: string; name: string; content: string; principle: string; hypothesis: string; expectedLift: string }[] | undefined)?.[activeVariant] && (
              (({ label, name, content, principle, hypothesis, expectedLift }) => (
                <div style={{ background: label === 'A' ? bg : "#EFF6FF", borderRadius: 8, padding: "14px 16px", border: `1px solid ${label === 'A' ? bdr : "#BFDBFE"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{label === 'A' ? 'Control' : `Variant ${label}`}: {name}</p>
                    {expectedLift !== 'baseline' && <span style={{ padding: "2px 8px", borderRadius: 10, background: green, color: "#fff", fontSize: 10, fontWeight: 700 }}>{expectedLift}</span>}
                  </div>
                  <div style={{ background: "#fff", borderRadius: 6, padding: "10px 12px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>&quot;{content}&quot;</p>
                  </div>
                  <p style={{ fontSize: 11, color: blue, marginBottom: 4 }}>Principle: {principle}</p>
                  <p style={{ fontSize: 11, color: muted }}>{hypothesis}</p>
                  <button onClick={() => navigator.clipboard.writeText(content)}
                    style={{ marginTop: 8, padding: "4px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer" }}>
                    Copy
                  </button>
                </div>
              ))((abtResult.variants as { label: string; name: string; content: string; principle: string; hypothesis: string; expectedLift: string }[])[activeVariant])
            )}
            {!!abtResult.winCriteria && (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 2 }}>Win Criteria</p>
                <p style={{ fontSize: 11, color: ink }}>{abtResult.winCriteria as string}</p>
              </div>
            )}
            <button onClick={() => { setAbtResult(null); setAbtElement(''); setAbtCurrent(''); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
              New Test
            </button>
          </div>
        )}
      </CardContent></Card>

      {/* ── Outreach Sequence Builder ── */}
      <Card className="overflow-hidden">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${blue}12`, border: `1px solid ${blue}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingSequence
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: blue }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Send size={15} style={{ color: blue }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Outreach Sequence</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>4-step cold sequence — Day 0 intro, Day 3 follow-up, Day 7 value-add, Day 14 breakup.</p>
          </div>
          <button onClick={() => { setShowSequencePanel(!showSequencePanel); setSequenceResult(null); setSequenceError(null); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: blue, border: `1.5px solid ${blue}40`, cursor: "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${blue}10`; e.currentTarget.style.borderColor = blue; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = `${blue}40`; }}
          >
            {showSequencePanel ? "Close" : "Run"}{!showSequencePanel && <ChevronRight size={11} />}
          </button>
        </div>
        {showSequencePanel && (
          <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Target Role *</label>
                <input value={seqTargetRole} onChange={e => setSeqTargetRole(e.target.value)} placeholder="e.g. Head of Marketing" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Target Industry</label>
                <input value={seqTargetIndustry} onChange={e => setSeqTargetIndustry(e.target.value)} placeholder="e.g. B2B SaaS startups" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Pain Point *</label>
              <input value={seqPainPoint} onChange={e => setSeqPainPoint(e.target.value)} placeholder="e.g. manually tracking outreach in spreadsheets wastes 5 hours/week" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Your Value Proposition</label>
              <input value={seqValueProp} onChange={e => setSeqValueProp(e.target.value)} placeholder="e.g. automate follow-ups, cut outreach time by 80%" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleGenerateSequence} disabled={generatingSequence || !seqTargetRole.trim() || !seqPainPoint.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: generatingSequence || !seqTargetRole.trim() || !seqPainPoint.trim() ? bdr : blue, color: generatingSequence || !seqTargetRole.trim() || !seqPainPoint.trim() ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: generatingSequence || !seqTargetRole.trim() || !seqPainPoint.trim() ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
              {generatingSequence ? "Writing sequence…" : "Generate 4-Step Sequence"}
            </button>
            {sequenceResult && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sequenceResult.sequenceStrategy && (
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.6, fontStyle: "italic" }}>Strategy: {sequenceResult.sequenceStrategy}</p>
                )}
                {(sequenceResult.sequence ?? []).map((step, i) => (
                  <div key={i} style={{ background: bg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{step.step}</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: ink }}>Day {step.day} — {step.toneNote}</p>
                        <p style={{ fontSize: 11, color: muted }}>CTA: {step.cta}</p>
                      </div>
                      <button onClick={() => copySeqStep(step.step, `Subject: ${step.subject}\n\n${step.body}`)} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: copiedSeqStep === step.step ? green : bg, color: copiedSeqStep === step.step ? "#fff" : muted, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                        {copiedSeqStep === step.step ? "✓" : "Copy"}
                      </button>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 4 }}>Subject: {step.subject}</p>
                    <pre style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{step.body}</pre>
                  </div>
                ))}
                <button onClick={() => setSequenceResult(null)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>New Sequence</button>
              </div>
            )}
          </div>
          </div>
        )}
      </Card>

      {/* ── ABM Strategy ── */}
      <Card className="overflow-hidden">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: "#7C3AED12", border: "1px solid #7C3AED25", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingABM
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: "#7C3AED" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Crosshair size={15} style={{ color: "#7C3AED" }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>ABM Strategy</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Target list, engagement playbook, and channel mix for high-value accounts.</p>
          </div>
          <button onClick={handleGenerateABMStrategy} disabled={generatingABM}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingABM ? muted : "#7C3AED", border: `1.5px solid ${generatingABM ? bdr : "#7C3AED40"}`, cursor: generatingABM ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!generatingABM) { e.currentTarget.style.background = "#7C3AED10"; e.currentTarget.style.borderColor = "#7C3AED"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#7C3AED40"; }}
          >
            {generatingABM ? "Running…" : "Run"}{!generatingABM && <ChevronRight size={11} />}
          </button>
        </div>
        <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
          <input value={abmAccounts} onChange={e => setAbmAccounts(e.target.value)} placeholder="Target accounts (optional, e.g. Stripe, Notion, Figma)" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg, boxSizing: "border-box" as const, marginBottom: 10 }} />
          {abmError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{abmError}</p>}
        {abmResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!abmResult.overview && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 10 }}>{String(abmResult.overview)}</p>}
            {!!abmResult.abmTier && <span style={{ fontSize: 11, background: blue + "22", color: blue, borderRadius: 20, padding: "2px 10px", fontWeight: 700, marginBottom: 12, display: "inline-block" }}>{String(abmResult.abmTier)}</span>}
            <Tabs value={abmTab} onValueChange={(v) => setAbmTab(v as typeof abmTab)} className="mb-3">
              <TabsList>
                <TabsTrigger value="targets">Target List</TabsTrigger>
                <TabsTrigger value="playbook">Playbook</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
              </TabsList>
            </Tabs>
            {abmTab === "targets" && !!abmResult.targetList && (() => {
              const list = abmResult.targetList as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {list.map((t, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 4 }}>{String(t.accountType ?? '')}</p>
                      <p style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{String(t.why ?? '')}</p>
                      <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
                        {!!t.estimatedCount && <span style={{ fontSize: 11, color: blue }}><b>Size:</b> {String(t.estimatedCount)}</span>}
                        {!!t.avgDealSize && <span style={{ fontSize: 11, color: green }}><b>Deal:</b> {String(t.avgDealSize)}</span>}
                      </div>
                      {!!t.criteria && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                          {(t.criteria as string[]).map((c, j) => <span key={j} style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 8px", color: muted }}>{c}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            {abmTab === "playbook" && !!abmResult.engagementPlaybook && (() => {
              const stages = abmResult.engagementPlaybook as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                  {stages.map((s, i) => (
                    <div key={i}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 6 }}>{String(s.stage ?? '').toUpperCase()}</p>
                      {!!s.plays && (s.plays as Record<string, unknown>[]).map((p, j) => (
                        <div key={j} style={{ background: bg, borderRadius: 8, padding: 10, marginBottom: 6, border: `1px solid ${bdr}` }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{String(p.play ?? '')}</p>
                          <div style={{ display: "flex", gap: 12 }}>
                            {!!p.channel && <span style={{ fontSize: 11, color: muted }}><b>Channel:</b> {String(p.channel)}</span>}
                            {!!p.trigger && <span style={{ fontSize: 11, color: muted }}><b>When:</b> {String(p.trigger)}</span>}
                          </div>
                          {!!p.content && <p style={{ fontSize: 11, color: muted, marginTop: 4 }}><b>Content:</b> {String(p.content)}</p>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
            {abmTab === "content" && !!abmResult.contentByStage && (() => {
              const items = abmResult.contentByStage as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((c, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(c.buyerStage ?? '')}</p>
                        {!!c.contentType && <span style={{ fontSize: 11, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 8px", color: muted }}>{String(c.contentType)}</span>}
                      </div>
                      {!!c.personalization && <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}><b>Personalize:</b> {String(c.personalization)}</p>}
                      {!!c.cta && <p style={{ fontSize: 11, color: blue }}><b>CTA:</b> {String(c.cta)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {abmTab === "metrics" && !!abmResult.metrics && (() => {
              const items = abmResult.metrics as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((m, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>{String(m.metric ?? '')}</p>
                      {!!m.target && <p style={{ fontSize: 11, color: green }}><b>Target:</b> {String(m.target)}</p>}
                      {!!m.how && <p style={{ fontSize: 11, color: muted }}><b>Measure:</b> {String(m.how)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {!!abmResult.priorityAction && (
              <div style={{ marginTop: 12, background: blue + "11", borderRadius: 8, padding: 10, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Priority Action</p>
                <p style={{ fontSize: 12, color: ink }}>{String(abmResult.priorityAction)}</p>
              </div>
            )}
          </div>
        )}
        </div>
      </Card>

      {/* ── Referral Program ── */}
      <Card className="overflow-hidden">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${amber}12`, border: `1px solid ${amber}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingReferral
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: amber }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Share2 size={15} style={{ color: amber }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Referral Program</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Design a viral loop with incentive structure, mechanics, email templates, and launch plan.</p>
          </div>
          <button onClick={handleGenerateReferralProgram} disabled={generatingReferral}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingReferral ? muted : amber, border: `1.5px solid ${generatingReferral ? bdr : amber + "40"}`, cursor: generatingReferral ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!generatingReferral) { e.currentTarget.style.background = amber + "10"; e.currentTarget.style.borderColor = amber; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = amber + "40"; }}
          >
            {generatingReferral ? "Running…" : "Run"}{!generatingReferral && <ChevronRight size={11} />}
          </button>
        </div>
        {(referralResult || referralError) && (
          <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
        {referralError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{referralError}</p>}
        {referralResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!referralResult.programName && <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 4 }}>{String(referralResult.programName)}</p>}
            {!!referralResult.overview && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{String(referralResult.overview)}</p>}
            <Tabs value={referralTab} onValueChange={(v) => setReferralTab(v as typeof referralTab)} className="mb-3">
              <TabsList>
                <TabsTrigger value="mechanics">Mechanics</TabsTrigger>
                <TabsTrigger value="viral">Viral Loops</TabsTrigger>
                <TabsTrigger value="launch">Launch</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
            </Tabs>
            {referralTab === "mechanics" && !!referralResult.incentiveStructure && (() => {
              const is = referralResult.incentiveStructure as { referrerIncentive?: string; referreeIncentive?: string; incentiveType?: string; minimumQualification?: string; payoutTiming?: string };
              const mech = referralResult.mechanics as { howItWorks?: string; trackingMethod?: string; minimumViableVersion?: string } | undefined;
              return (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    {[["Referrer Gets", is.referrerIncentive], ["New Customer Gets", is.referreeIncentive], ["Type", is.incentiveType], ["Payout Timing", is.payoutTiming]].map(([l, v]) => (
                      <div key={String(l)} style={{ background: bg, borderRadius: 8, padding: 10 }}>
                        <p style={{ fontSize: 11, color: muted, margin: "0 0 2px" }}>{String(l)}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{String(v ?? "—")}</p>
                      </div>
                    ))}
                  </div>
                  {mech?.howItWorks && <p style={{ fontSize: 12, color: muted }}><strong>How it works:</strong> {mech.howItWorks}</p>}
                  {mech?.minimumViableVersion && (
                    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 10, marginTop: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>MVP This Week</p>
                      <p style={{ fontSize: 12, color: ink }}>{mech.minimumViableVersion}</p>
                    </div>
                  )}
                </div>
              );
            })()}
            {referralTab === "viral" && !!(referralResult.viralLoops as unknown[])?.length && (
              <div>
                {(referralResult.viralLoops as { loop: string; trigger: string; channel: string; estimatedViralCoefficient: string }[]).map((vl, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{vl.loop}</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 2 }}>Trigger: {vl.trigger}</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 2 }}>Channel: {vl.channel}</p>
                    <p style={{ fontSize: 12, color: green }}>k-factor: {vl.estimatedViralCoefficient}</p>
                  </div>
                ))}
              </div>
            )}
            {referralTab === "launch" && !!(referralResult.launchPlan as unknown[])?.length && (
              <div>
                {(referralResult.launchPlan as { week: string; action: string; expected: string }[]).map((lp, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 2 }}>{lp.week}</p>
                    <p style={{ fontSize: 12, color: ink, marginBottom: 2 }}>{lp.action}</p>
                    <p style={{ fontSize: 11, color: muted }}>→ {lp.expected}</p>
                  </div>
                ))}
              </div>
            )}
            {referralTab === "templates" && !!(referralResult.templates as unknown[])?.length && (
              <div>
                {(referralResult.templates as { type: string; template: string }[]).map((t, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>{t.type}</p>
                    <div style={{ background: bg, borderRadius: 6, padding: 10, fontSize: 12, color: ink, whiteSpace: "pre-wrap" as const }}>{t.template}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </div>
        )}
      </Card>

      {/* ── Partnership Strategy ── */}
      <Card><CardContent className="pt-4 pb-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Partnership Strategy</p>
            <p style={{ fontSize: 11, color: muted }}>Identify partner types, target companies, outreach templates, and integration priorities to accelerate distribution.</p>
          </div>
          <button onClick={handleGeneratePartnership} disabled={generatingPartnership} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingPartnership ? bdr : blue, color: generatingPartnership ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingPartnership ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingPartnership ? "Building…" : "Build Strategy"}
          </button>
        </div>
        {partnershipError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{partnershipError}</p>}
        {partnershipResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!partnershipResult.overview && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{String(partnershipResult.overview)}</p>}
            <Tabs value={partnershipTab} onValueChange={(v) => setPartnershipTab(v as typeof partnershipTab)} className="mb-3">
              <TabsList>
                <TabsTrigger value="types">Types</TabsTrigger>
                <TabsTrigger value="targets">Targets</TabsTrigger>
                <TabsTrigger value="outreach">Outreach</TabsTrigger>
                <TabsTrigger value="integrations">Integrations</TabsTrigger>
              </TabsList>
            </Tabs>
            {partnershipTab === "types" && !!(partnershipResult.partnerTypes as unknown[])?.length && (
              <div>
                {(partnershipResult.partnerTypes as { type: string; priority: string; rationale: string; examplePartners: string[]; valueExchange: string; timeToRevenue: string }[]).map((pt, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{pt.type}</p>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: pt.priority === "high" ? "#DCFCE7" : pt.priority === "medium" ? "#FEF3C7" : "#F3F4F6", color: pt.priority === "high" ? "#16A34A" : pt.priority === "medium" ? amber : muted, fontWeight: 600 }}>{pt.priority}</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 2 }}>{pt.rationale}</p>
                    <p style={{ fontSize: 11, color: muted }}>e.g. {pt.examplePartners?.join(', ')} · Revenue in: {pt.timeToRevenue}</p>
                  </div>
                ))}
              </div>
            )}
            {partnershipTab === "targets" && !!(partnershipResult.targetPartners as unknown[])?.length && (
              <div>
                {(partnershipResult.targetPartners as { partner: string; category: string; audience: string; approachStrategy: string; dealStructure: string }[]).map((tp, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{tp.partner}</p>
                      <span style={{ fontSize: 11, color: muted, background: surf, padding: "2px 8px", borderRadius: 999 }}>{tp.category}</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 2 }}>{tp.audience}</p>
                    <p style={{ fontSize: 11, color: blue }}>Deal: {tp.dealStructure}</p>
                  </div>
                ))}
              </div>
            )}
            {partnershipTab === "outreach" && !!(partnershipResult.outreachTemplates as unknown[])?.length && (
              <div>
                {(partnershipResult.outreachTemplates as { partnerType: string; subject: string; opening: string; valueHook: string; cta: string }[]).map((ot, i) => (
                  <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, color: muted, margin: "0 0 4px" }}>{ot.partnerType}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: "0 0 6px" }}>Subject: {ot.subject}</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{ot.opening}</p>
                    <p style={{ fontSize: 12, color: ink, fontStyle: "italic", marginBottom: 4 }}>&quot;{ot.valueHook}&quot;</p>
                    <p style={{ fontSize: 11, color: blue }}>CTA: {ot.cta}</p>
                  </div>
                ))}
              </div>
            )}
            {partnershipTab === "integrations" && !!(partnershipResult.integrationPriorities as unknown[])?.length && (
              <div>
                {(partnershipResult.integrationPriorities as { integration: string; reason: string; effort: string; distributionPotential: string }[]).map((ip, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{ip.integration}</p>
                      <span style={{ fontSize: 11, color: muted }}>{ip.effort} effort</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 2 }}>{ip.reason}</p>
                    <p style={{ fontSize: 11, color: green }}>Potential: {ip.distributionPotential}</p>
                  </div>
                ))}
              </div>
            )}
            {!!partnershipResult.priorityMove && (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, margin: "0 0 2px" }}>Priority Move (Next 30 Days)</p>
                <p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(partnershipResult.priorityMove)}</p>
              </div>
            )}
          </div>
        )}
      </CardContent></Card>

      {/* ── Customer Journey Map ── */}
      <Card><CardContent className="pt-4 pb-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Customer Journey Map</p>
            <p style={{ fontSize: 11, color: muted }}>Map the full customer journey from first touch to advocacy — with touchpoints, emotions, friction, and optimizations at each stage.</p>
          </div>
          <button onClick={handleGenerateJourney} disabled={generatingJourney}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingJourney ? bdr : blue, color: generatingJourney ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingJourney ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingJourney ? "Mapping…" : "Map Customer Journey"}
          </button>
        </div>
        {journeyError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{journeyError}</p>}
        {journeyResult && (() => {
          const stages = (journeyResult.stages as { stage: string; customerGoal: string; touchpoints: string[]; customerEmotion: string; companyAction: string; keyMetric: string; successLooksLike: string; frictionPoints: string[]; optimization: string }[] | undefined) ?? [];
          const criticalMoments = (journeyResult.criticalMoments as { moment: string; stage: string; description: string; howToNail: string }[] | undefined) ?? [];
          const stage = stages[journeyStageIdx];
          const emotionColors: Record<string, string> = { confused: red, frustrated: red, curious: blue, excited: green, anxious: amber, satisfied: green, neutral: muted, happy: green };
          return (
            <div>
              {!!journeyResult.journeyStatement && (
                <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{journeyResult.journeyStatement as string}</p>
              )}
              {stages.length > 0 && (
                <div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
                    {stages.map((s, i) => (
                      <button key={i} onClick={() => setJourneyStageIdx(i)}
                        style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${journeyStageIdx === i ? blue : bdr}`, background: journeyStageIdx === i ? "#EFF6FF" : bg, color: journeyStageIdx === i ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {i + 1}. {s.stage}
                      </button>
                    ))}
                  </div>
                  {stage && (
                    <div style={{ background: surf, borderRadius: 10, padding: 14, border: `1px solid ${bdr}`, marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{stage.stage}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: (emotionColors[stage.customerEmotion?.toLowerCase()] ?? muted) + "15", color: emotionColors[stage.customerEmotion?.toLowerCase()] ?? muted, textTransform: "capitalize" }}>Feeling: {stage.customerEmotion}</span>
                      </div>
                      <p style={{ fontSize: 12, color: muted, marginBottom: 8, fontStyle: "italic" }}>Goal: {stage.customerGoal}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Touchpoints</p>
                          {stage.touchpoints?.map((tp, ti) => <p key={ti} style={{ fontSize: 11, color: ink, marginBottom: 2 }}>→ {tp}</p>)}
                        </div>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Friction</p>
                          {stage.frictionPoints?.map((fp, fi) => <p key={fi} style={{ fontSize: 11, color: red, marginBottom: 2 }}>⚠ {fp}</p>)}
                        </div>
                      </div>
                      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 2 }}>Optimization</p>
                        <p style={{ fontSize: 11, color: ink }}>{stage.optimization}</p>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <span style={{ fontSize: 10, color: muted }}>Key metric: <strong>{stage.keyMetric}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {criticalMoments.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Critical Moments</p>
                  {criticalMoments.map((m, mi) => (
                    <div key={mi} style={{ padding: "8px 12px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, marginBottom: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: amber, marginBottom: 2 }}>{m.moment} <span style={{ fontSize: 10, color: muted, fontWeight: 400 }}>({m.stage})</span></p>
                      <p style={{ fontSize: 11, color: ink, marginBottom: 4 }}>{m.description}</p>
                      <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>→ {m.howToNail}</p>
                    </div>
                  ))}
                </div>
              )}
              {!!(journeyResult.quickWins as string[] | undefined)?.length && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 4 }}>Quick Wins</p>
                  {(journeyResult.quickWins as string[]).map((w, wi) => (
                    <p key={wi} style={{ fontSize: 11, color: ink, marginBottom: 2 }}>→ {w}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </CardContent></Card>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES SCRIPT RENDERER  (Susi — proposals + pipeline CRM)
// ═══════════════════════════════════════════════════════════════════════════════
