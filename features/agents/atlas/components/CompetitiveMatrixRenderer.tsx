'use client'

import { useState, useEffect } from 'react'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

export function CompetitiveMatrixRenderer({ data, artifactId: _artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    ourProduct?: string;
    marketOverview?: string;
    competitors?: { name: string; positioning: string; pricing: string; targetCustomer: string; strengths: string[]; weaknesses: string[] }[];
    featureComparison?: { features: string[]; rows: { name: string; scores: Record<string, string> }[] };
    swot?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
    positioningStatement?: string;
    whiteSpace?: string[];
  };

  const [trackName, setTrackName]     = useState("");
  const [trackUrl, setTrackUrl]       = useState("");
  const [tracking, setTracking]       = useState(false);
  const [tracked, setTracked]         = useState<{ id: string; name: string; url?: string }[]>([]);
  const [trackDone, setTrackDone]     = useState(false);

  // Review analysis state
  const [showReviewModal, setShowReviewModal]   = useState(false);
  const [reviewCompetitor, setReviewCompetitor] = useState("");
  const [reviewText, setReviewText]             = useState("");
  const [analyzingReviews, setAnalyzingReviews] = useState(false);
  const [reviewAnalysis, setReviewAnalysis]     = useState<{
    topComplaints?: { complaint: string; frequency: string; quote?: string; salesAngle: string }[];
    topPraise?: { praise: string; implication: string }[];
    featureGaps?: { feature: string; evidence: string; opportunity: string }[];
    battleCardSummary?: string;
    keyQuote?: string;
  } | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Price change alerts state
  const [priceAlerts, setPriceAlerts] = useState<{ id: string; description: string; metadata: Record<string, unknown>; created_at: string }[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Job posting tracker state
  const [showJobModal, setShowJobModal]   = useState(false);
  const [jobCompetitor, setJobCompetitor] = useState("");
  const [jobText, setJobText]             = useState("");
  const [analyzingJobs, setAnalyzingJobs] = useState(false);
  const [jobAnalysis, setJobAnalysis]     = useState<{
    competitor?: string;
    totalRoles?: number;
    signals?: { pattern: string; roles: string[]; count: number; inference: string; urgency: string }[];
    strategicSummary?: string;
    recommendedActions?: string[];
  } | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  // Competitor monitor state
  const [showMonitorPanel, setShowMonitorPanel] = useState(false);
  const [runningMonitor, setRunningMonitor]     = useState(false);
  const [monitorResult, setMonitorResult]       = useState<{
    digest?: { competitor: string; signals: { type: string; signal: string; implication: string; urgency: string }[]; overallMovement: string; actionable: string }[];
    summary?: string; mostUrgent?: string; recommendedResponse?: string;
  } | null>(null);
  const [monitorError, setMonitorError] = useState<string | null>(null);

  // Pricing monitor state
  const [runningPricing, setRunningPricing] = useState(false);
  const [pricingResult, setPricingResult]   = useState<{
    pricing?: { competitor: string; pricingModel: string; tiers?: { name: string; price: string; keyFeature: string }[]; startingPrice: string; hasFree: boolean; hasEnterprise: boolean; signals?: string[]; lastScraped: string }[];
    insights?: { cheapest?: string; mostExpensive?: string; averageStartingPrice?: string; yourPositioning?: string; pricingGap?: string; opportunity?: string; recommendation?: string };
    competitorsAnalyzed?: number;
  } | null>(null);
  const [pricingError, setPricingError]     = useState<string | null>(null);

  // Market size state
  const [runningMarketSize, setRunningMarketSize] = useState(false);
  const [marketSizeResult, setMarketSizeResult] = useState<{
    tam?: string; sam?: string; som?: string;
    tamRationale?: string; samRationale?: string; somRationale?: string;
    methodology?: string;
    competitorRevenues?: { name: string; estimatedARR: string; funding: string; signal: string }[];
    combinedCompetitorRevenue?: string; marketGrowthRate?: string; marketMaturity?: string;
    keyInsight?: string; yourTargetShare?: string; confidence?: string;
  } | null>(null);
  const [marketSizeError, setMarketSizeError] = useState<string | null>(null);

  // Battle cards state
  const [runningBattleCards, setRunningBattleCards] = useState(false);
  const [battleCardsResult, setBattleCardsResult] = useState<{
    battleCards?: {
      competitor: string; positioning?: string; theirStrengths?: string[]; theirWeaknesses?: string[];
      whereYouWin?: string[]; whereYouLose?: string[];
      objectionHandlers?: { objection: string; response: string }[];
      talkTrack?: string; disqualifiers?: string[]; winSignals?: string[]; landmine?: string;
    }[];
    competitorCount?: number;
  } | null>(null);
  const [battleCardsError, setBattleCardsError] = useState<string | null>(null);
  const [activeBattleCard, setActiveBattleCard] = useState<number>(0);

  async function handleRunBattleCards() {
    if (runningBattleCards) return;
    setRunningBattleCards(true); setBattleCardsError(null);
    try {
      const res = await fetch('/api/agents/atlas/battle-cards', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.battleCards) setBattleCardsResult(r);
      else setBattleCardsError(r.error ?? 'Failed to generate battle cards');
    } catch { setBattleCardsError('Network error'); }
    finally { setRunningBattleCards(false); }
  }

  async function handleRunMarketSize() {
    if (runningMarketSize) return;
    setRunningMarketSize(true); setMarketSizeError(null);
    try {
      const res = await fetch('/api/agents/atlas/market-size', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.tam) setMarketSizeResult(r);
      else setMarketSizeError(r.error ?? 'Failed to estimate market size');
    } catch { setMarketSizeError('Network error'); }
    finally { setRunningMarketSize(false); }
  }

  async function handleRunPricingMonitor() {
    if (runningPricing) return;
    setRunningPricing(true); setPricingError(null);
    try {
      const res = await fetch('/api/agents/atlas/pricing', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.pricing) setPricingResult(r);
      else setPricingError(r.error ?? 'Pricing monitor failed');
    } catch { setPricingError('Network error'); }
    finally { setRunningPricing(false); }
  }

  async function handleRunMonitor() {
    if (runningMonitor) return;
    setRunningMonitor(true); setMonitorError(null);
    try {
      const res = await fetch('/api/agents/atlas/monitor', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.digest) setMonitorResult(r.digest);
      else setMonitorError(r.error ?? 'Monitor failed');
    } catch { setMonitorError('Network error'); }
    finally { setRunningMonitor(false); }
  }

  async function handleAnalyzeJobs() {
    if (!jobCompetitor.trim() || jobText.trim().length < 10 || analyzingJobs) return;
    setAnalyzingJobs(true); setJobError(null); setJobAnalysis(null);
    try {
      const res = await fetch('/api/agents/atlas/job-postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorName: jobCompetitor.trim(), jobListings: jobText }),
      });
      const result = await res.json();
      if (res.ok) setJobAnalysis(result.analysis);
      else setJobError(result.error ?? 'Analysis failed');
    } catch { setJobError('Network error'); }
    finally { setAnalyzingJobs(false); }
  }

  async function handleAnalyzeReviews() {
    if (!reviewCompetitor.trim() || reviewText.trim().length < 50 || analyzingReviews) return;
    setAnalyzingReviews(true); setReviewError(null); setReviewAnalysis(null);
    try {
      const res = await fetch('/api/agents/atlas/review-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorName: reviewCompetitor.trim(), reviews: reviewText }),
      });
      const result = await res.json();
      if (res.ok) setReviewAnalysis(result.analysis);
      else setReviewError(result.error ?? 'Analysis failed');
    } catch { setReviewError('Network error'); }
    finally { setAnalyzingReviews(false); }
  }

  // Social listening state
  const [showSocialPanel, setShowSocialPanel]     = useState(false);
  const [socialCompetitors, setSocialCompetitors] = useState("");
  const [socialTopics, setSocialTopics]           = useState("");
  const [runningSocial, setRunningSocial]         = useState(false);
  const [socialResult, setSocialResult]           = useState<{
    overallSentiment?: string;
    topComplaints?: { complaint: string; frequency: string; quote?: string | null; opportunity: string }[];
    topPraise?: { praise: string; implication: string }[];
    emergingThemes?: string[];
    battleCardUpdates?: string[];
    earlyWarning?: string | null;
    recommendedAction?: string;
    mentionCount?: number;
  } | null>(null);
  const [socialMentions, setSocialMentions]       = useState<{ title: string; url: string; content: string; source: string }[]>([]);
  const [socialError, setSocialError]             = useState<string | null>(null);

  async function handleSocialListen() {
    const names = socialCompetitors.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    if (names.length === 0 || runningSocial) return;
    setRunningSocial(true); setSocialError(null); setSocialResult(null); setSocialMentions([]);
    try {
      const res = await fetch('/api/agents/atlas/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitors: names,
          topics: socialTopics.split(/[,\n]+/).map(s => s.trim()).filter(Boolean),
        }),
      });
      const r = await res.json();
      if (res.ok) { setSocialResult(r.analysis); setSocialMentions(r.mentions ?? []); }
      else setSocialError(r.error ?? 'Social listening failed');
    } catch { setSocialError('Network error'); }
    finally { setRunningSocial(false); }
  }

  useEffect(() => {
    fetch('/api/agents/atlas/track')
      .then(r => r.json())
      .then(d => { if (d.competitors) setTracked(d.competitors); })
      .catch(() => {});
    fetch('/api/agents/atlas/alerts')
      .then(r => r.json())
      .then(d => { if (d.alerts) setPriceAlerts(d.alerts); })
      .catch(() => {});
  }, []);

  async function handleTrack() {
    if (!trackName || tracking) return;
    setTracking(true);
    try {
      const res = await fetch('/api/agents/atlas/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trackName, url: trackUrl || undefined }),
      });
      if (res.ok) {
        const d = await res.json();
        setTracked(prev => [...prev, d.competitor ?? { id: '', name: trackName }]);
        setTrackName(""); setTrackUrl(""); setTrackDone(true);
        setTimeout(() => setTrackDone(false), 3000);
      }
    } catch {} finally { setTracking(false); }
  }

  // Weekly competitive scan state
  const [runningWeeklyScan, setRunningWeeklyScan] = useState(false);
  const [weeklyScanResult, setWeeklyScanResult]   = useState<{
    headline?: string;
    topMoves?: { competitor: string; move: string; implication: string; urgency: string }[];
    pricingAlerts?: string[];
    hiringSignals?: string[];
    opportunities?: string[];
    recommendedActions?: string[];
    quietCompetitors?: string[];
    scannedAt?: string;
    competitorsScanned?: number;
    competitorsWithChanges?: number;
  } | null>(null);
  const [weeklyScanError, setWeeklyScanError]     = useState<string | null>(null);

  async function handleWeeklyScan() {
    if (runningWeeklyScan) return;
    setRunningWeeklyScan(true); setWeeklyScanError(null); setWeeklyScanResult(null);
    try {
      const res = await fetch('/api/agents/atlas/weekly-scan', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.digest) setWeeklyScanResult(r.digest);
      else setWeeklyScanError(r.error ?? 'Scan failed');
    } catch { setWeeklyScanError('Network error'); }
    finally { setRunningWeeklyScan(false); }
  }

  // Tech stack detection state
  const [showTechStackPanel, setShowTechStackPanel] = useState(false);
  const [techCompetitor, setTechCompetitor]         = useState("");
  const [techCompetitorUrl, setTechCompetitorUrl]   = useState("");
  const [detectingStack, setDetectingStack]         = useState(false);
  const [techStackResult, setTechStackResult]       = useState<{
    competitorName?: string; confidence?: string; summary?: string;
    categories?: Record<string, string[]>;
    keyInsights?: string[]; competitiveImplications?: string;
    recentChanges?: string | null; sources?: string[];
  } | null>(null);
  const [techStackError, setTechStackError] = useState<string | null>(null);
  const [techStackCompetitorName, setTechStackCompetitorName] = useState<string | null>(null);

  async function handleDetectTechStack() {
    if (!techCompetitor.trim() || detectingStack) return;
    const name = techCompetitor.trim();
    setDetectingStack(true); setTechStackError(null); setTechStackResult(null); setTechStackCompetitorName(name);
    try {
      const res = await fetch('/api/agents/atlas/techstack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorName: name, competitorUrl: techCompetitorUrl.trim() || undefined }),
      });
      const r = await res.json();
      if (res.ok) setTechStackResult(r.techstack);
      else setTechStackError(r.error ?? 'Detection failed');
    } catch { setTechStackError('Network error'); }
    finally { setDetectingStack(false); }
  }

  // Market Map state
  const [winLossTab, setWinLossTab]                 = useState<'wins' | 'losses' | 'competitors' | 'coaching'>('wins');

  async function handleRunWinLossAnalysis() {
    if (runningWinLoss) return;
    setRunningWinLoss(true); setWinLossError(null); setWinLossResult(null);
    try {
      const res = await fetch('/api/agents/atlas/win-loss-analysis', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.analysis) setWinLossResult(r.analysis);
      else setWinLossError(r.error ?? 'Analysis failed');
    } catch { setWinLossError('Network error'); }
    finally { setRunningWinLoss(false); }
  }

  // Feature Comparison state
  const [runningFeatComp, setRunningFeatComp]       = useState(false);
  const [featCompResult, setFeatCompResult]         = useState<Record<string, unknown> | null>(null);
  const [featCompError, setFeatCompError]           = useState<string | null>(null);
  const [featCompCatIdx, setFeatCompCatIdx]         = useState(0);

  async function handleRunFeatureComparison() {
    if (runningFeatComp) return;
    setRunningFeatComp(true); setFeatCompError(null); setFeatCompResult(null);
    try {
      const res = await fetch('/api/agents/atlas/feature-comparison', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.comparison) setFeatCompResult(r.comparison);
      else setFeatCompError(r.error ?? 'Generation failed');
    } catch { setFeatCompError('Network error'); }
    finally { setRunningFeatComp(false); }
  }

  // Positioning Map state
  const [runningPosMap, setRunningPosMap]           = useState(false);
  const [posMapResult, setPosMapResult]             = useState<Record<string, unknown> | null>(null);
  const [posMapError, setPosMapError]               = useState<string | null>(null);
  const [posMapPlayerIdx, setPosMapPlayerIdx]       = useState(0);

  async function handleRunPositioningMap() {
    if (runningPosMap) return;
    setRunningPosMap(true); setPosMapError(null); setPosMapResult(null);
    try {
      const res = await fetch('/api/agents/atlas/positioning-map', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.map) setPosMapResult(r.map);
      else setPosMapError(r.error ?? 'Map generation failed');
    } catch { setPosMapError('Network error'); }
    finally { setRunningPosMap(false); }
  }

  // Trend Radar state
  const [runningTrend, setRunningTrend]             = useState(false);
  const [trendResult, setTrendResult]               = useState<Record<string, unknown> | null>(null);
  const [trendError, setTrendError]                 = useState<string | null>(null);
  const [trendTab, setTrendTab]                     = useState<'tailwinds' | 'headwinds' | 'threats' | 'opportunities'>('tailwinds');

  async function handleRunTrendRadar() {
    if (runningTrend) return;
    setRunningTrend(true); setTrendError(null); setTrendResult(null);
    try {
      const res = await fetch('/api/agents/atlas/trend-radar', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.radar) setTrendResult(r.radar);
      else setTrendError(r.error ?? 'Radar scan failed');
    } catch { setTrendError('Network error'); }
    finally { setRunningTrend(false); }
  }

  const [runningMM, setRunningMM]                   = useState(false);
  const [mmResult, setMmResult]                     = useState<Record<string, unknown> | null>(null);
  const [mmError, setMmError]                       = useState<string | null>(null);

  async function handleRunMarketMap() {
    if (runningMM) return;
    setRunningMM(true); setMmError(null); setMmResult(null);
    try {
      const res = await fetch('/api/agents/atlas/market-map', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.map) setMmResult(r.map);
      else setMmError(r.error ?? 'Market map generation failed');
    } catch { setMmError('Network error'); }
    finally { setRunningMM(false); }
  }

  // Win/Loss Analysis state
  const [runningWinLoss, setRunningWinLoss]         = useState(false);
  const [winLossResult, setWinLossResult]           = useState<Record<string, unknown> | null>(null);
  const [winLossError, setWinLossError]             = useState<string | null>(null);

  async function handleRunWinLoss() {
    if (runningWinLoss) return;
    setRunningWinLoss(true); setWinLossError(null); setWinLossResult(null);
    try {
      const res = await fetch('/api/agents/atlas/win-loss', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.analysis) setWinLossResult(r.analysis);
      else setWinLossError(r.error ?? 'Win/loss analysis failed');
    } catch { setWinLossError('Network error'); }
    finally { setRunningWinLoss(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const scoreColor: Record<string, string> = { yes: green, no: red, partial: amber };
  const scoreLabel: Record<string, string> = { yes: "✓", no: "✗", partial: "~" };

  // Harper→Atlas cross-agent hook
  const [harperUpdate, setHarperUpdate] = useState<{ description: string } | null>(null);
  useEffect(() => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/agents/context?agentId=atlas&since=${since}&limit=10`)
      .then(r => r.json())
      .then(d => {
        const ev = (d.events ?? []).find((e: { agent_id: string; action_type: string }) =>
          e.agent_id === "harper" && ["job_posting_prepared", "competitor_hiring_cue"].includes(e.action_type)
        );
        if (ev) setHarperUpdate(ev);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Price Change Alerts banner ── */}
      {priceAlerts.filter(a => !dismissedAlerts.has(a.id)).map(alert => (
        <div key={alert.id} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>
              Pricing change detected — {(alert.metadata?.competitor_name as string) ?? "competitor"}
            </p>
            <p style={{ fontSize: 11, color: muted, margin: "3px 0 0", lineHeight: 1.5 }}>{alert.description}</p>
            {(alert.metadata?.pricing_url as string) && (
              <a href={alert.metadata.pricing_url as string} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: ink, fontWeight: 600, textDecoration: "none" }}>
                View their pricing page →
              </a>
            )}
          </div>
          <button
            onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.id]))}
            style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
          >✕</button>
        </div>
      ))}

      {/* ── Harper→Atlas cross-agent banner ── */}
      {harperUpdate && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🧑‍💼</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>Harper posted a job — check if competitors are hiring for similar roles?</p>
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{harperUpdate.description}</p>
          </div>
          <button
            onClick={() => { setShowJobModal(true); setHarperUpdate(null); }}
            style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: ink, color: bg, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Analyze Competitor Hiring
          </button>
          <button onClick={() => setHarperUpdate(null)} style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Track Competitor ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 8 }}>Track a Competitor</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={trackName} onChange={e => setTrackName(e.target.value)} placeholder="Competitor name" style={{ flex: "1 1 140px", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink }} />
          <input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="URL (optional)" style={{ flex: "1 1 160px", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink }} />
          <button onClick={handleTrack} disabled={!trackName || tracking} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: !trackName ? bdr : ink, color: !trackName ? muted : bg, fontSize: 12, fontWeight: 600, cursor: !trackName ? "not-allowed" : "pointer" }}>
            {tracking ? "Adding…" : trackDone ? "Added!" : "Track"}
          </button>
        </div>
        {tracked.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tracked.map((c, i) => {
              const hasAlert = priceAlerts.some(a =>
                !dismissedAlerts.has(a.id) &&
                (a.metadata?.competitor_name as string)?.toLowerCase() === c.name.toLowerCase()
              );
              return (
                <span key={i} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: hasAlert ? "#FEF3C7" : "#DBEAFE", color: hasAlert ? "#92400E" : blue, fontWeight: 600, border: hasAlert ? "1px solid #FDE68A" : "none", display: "flex", alignItems: "center", gap: 4 }}>
                  {hasAlert && <span style={{ fontSize: 10 }}>🔔</span>}
                  {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: hasAlert ? "#92400E" : blue, textDecoration: "none" }}>{c.name} ↗</a> : c.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
      {d.marketOverview && (
        <div style={{ background: surf, borderRadius: 10, padding: "12px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.marketOverview}</p>
        </div>
      )}

      {d.featureComparison && d.featureComparison.features && d.featureComparison.rows && (
        <div>
          <p style={sectionHead}>Feature Comparison</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: surf }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: `1px solid ${bdr}`, color: muted, fontWeight: 600 }}>Product</th>
                  {d.featureComparison.features.map((f, i) => (
                    <th key={i} style={{ padding: "8px 8px", textAlign: "center", borderBottom: `1px solid ${bdr}`, color: muted, fontWeight: 600, fontSize: 10 }}>{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.featureComparison.rows.map((row, i) => (
                  <tr key={i} style={{ background: row.name === "Us" ? "#F0FDF4" : i % 2 === 0 ? "#fff" : surf }}>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${bdr}`, fontWeight: row.name === "Us" ? 700 : 400, color: row.name === "Us" ? green : ink }}>{row.name}</td>
                    {(d.featureComparison?.features ?? []).map((f, fi) => {
                      const score = row.scores[f] || "no";
                      return (
                        <td key={fi} style={{ padding: "8px", textAlign: "center", borderBottom: `1px solid ${bdr}` }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor[score] || muted }}>{scoreLabel[score] || score}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {d.competitors && d.competitors.length > 0 && (
        <div>
          <p style={sectionHead}>Competitor Profiles</p>
          {d.competitors.map((comp, i) => (
            <div key={i} style={{ background: surf, borderRadius: 10, border: `1px solid ${bdr}`, padding: "14px 16px", marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 4 }}>{comp.name}</p>
              <p style={{ fontSize: 12, color: muted, marginBottom: 8 }}>{comp.positioning}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: green, marginBottom: 4 }}>STRENGTHS</p>
                  {comp.strengths.map((s, si) => <p key={si} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>+ {s}</p>)}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: red, marginBottom: 4 }}>WEAKNESSES</p>
                  {comp.weaknesses.map((w, wi) => <p key={wi} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>− {w}</p>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.swot && (
        <div>
          <p style={sectionHead}>SWOT</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { key: "strengths", label: "Strengths", color: green, bg: "#F0FDF4", bdr2: "#BBF7D0" },
              { key: "weaknesses", label: "Weaknesses", color: red, bg: "#FEF2F2", bdr2: "#FECACA" },
              { key: "opportunities", label: "Opportunities", color: blue, bg: "#EFF6FF", bdr2: "#BFDBFE" },
              { key: "threats", label: "Threats", color: amber, bg: "#FFFBEB", bdr2: "#FED7AA" },
            ].map(({ key, label, color, bg, bdr2 }) => (
              <div key={key} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr2}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
                {(d.swot![key as keyof typeof d.swot] as string[] || []).map((item, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>• {item}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {d.positioningStatement && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 16px", border: `1px solid #BFDBFE` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: blue, marginBottom: 6 }}>Our Positioning</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.positioningStatement}</p>
        </div>
      )}

      {/* ── Google Alerts (PHASE2: one-click competitor monitoring) ────── */}
      {d.competitors && d.competitors.length > 0 && (
        <div style={{ background: surf, borderRadius: 12, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>Monitor competitors — set up Google Alerts</p>
              <p style={{ fontSize: 11, color: muted }}>Get notified when any competitor raises funding, launches, or makes news</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.competitors.map((comp, i) => (
              <a
                key={i}
                href={`https://www.google.com/alerts?q=${encodeURIComponent(`"${comp.name}" funding OR launch OR news OR product`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: "#DCFCE7", color: "#166534", textDecoration: "none",
                  border: `1px solid #BBF7D0`, transition: "background .12s",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#BBF7D0")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#DCFCE7")}
              >
                🔔 Alert: {comp.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Live Competitor Monitor ───────────────────────────────────────────── */}
      <div style={{ background: showMonitorPanel && monitorResult ? "#0F172A" : surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${showMonitorPanel && monitorResult ? "#334155" : bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: showMonitorPanel && monitorResult ? "#94A3B8" : ink, marginBottom: 2 }}>Live Competitive Monitor</p>
            <p style={{ fontSize: 11, color: muted }}>Atlas scans your tracked competitors for new job posts, funding, product launches, and market moves via live search.</p>
            {monitorError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{monitorError}</p>}
          </div>
          <button onClick={() => { setShowMonitorPanel(!showMonitorPanel); if (!monitorResult && !showMonitorPanel) handleRunMonitor(); }} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #334155", background: runningMonitor ? bdr : "#1E293B", color: runningMonitor ? muted : "#94A3B8", fontSize: 12, fontWeight: 600, cursor: runningMonitor ? "not-allowed" : "pointer", flexShrink: 0, marginLeft: 12 }}>
            {runningMonitor ? "Scanning…" : showMonitorPanel ? "Hide" : "Run Monitor"}
          </button>
        </div>
        {showMonitorPanel && (
          <div style={{ marginTop: 14 }}>
            {runningMonitor ? (
              <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", padding: "20px 0" }}>Scanning competitors via live search…</p>
            ) : monitorResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {monitorResult.mostUrgent && (
                  <div style={{ background: "#1E293B", borderRadius: 8, padding: "12px 14px", border: "1px solid #EF4444" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", marginBottom: 4 }}>Most Urgent Signal</p>
                    <p style={{ fontSize: 12, color: "#F8FAFC", lineHeight: 1.6 }}>{monitorResult.mostUrgent}</p>
                  </div>
                )}
                {monitorResult.summary && (
                  <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{monitorResult.summary}</p>
                )}
                {(monitorResult.digest as { competitor: string; signals: { type: string; signal: string; implication: string; urgency: string }[]; overallMovement: string; actionable: string }[] | undefined)?.map((item, i) => (
                  <div key={i} style={{ background: "#1E293B", borderRadius: 10, padding: "12px 14px", border: "1px solid #334155" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>{item.competitor}</p>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: item.overallMovement === 'expanding' ? "#166534" : item.overallMovement === 'contracting' ? "#7F1D1D" : "#1E3A5F", color: "#fff", textTransform: "capitalize" }}>{item.overallMovement}</span>
                    </div>
                    {item.signals.map((sig, j) => (
                      <div key={j} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: j < item.signals.length - 1 ? "1px solid #334155" : "none" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: sig.urgency === 'high' ? "#7F1D1D" : sig.urgency === 'medium' ? "#78350F" : "#1E3A5F", color: "#fff", textTransform: "capitalize" }}>{sig.urgency}</span>
                          <span style={{ fontSize: 10, color: "#64748B", textTransform: "capitalize" }}>{sig.type.replace('_', ' ')}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 3 }}>{sig.signal}</p>
                        <p style={{ fontSize: 11, color: "#64748B", fontStyle: "italic" }}>→ {sig.implication}</p>
                      </div>
                    ))}
                    {item.actionable && (
                      <div style={{ marginTop: 8, background: "#0F172A", borderRadius: 6, padding: "8px 10px" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", marginBottom: 3 }}>Recommended Action</p>
                        <p style={{ fontSize: 11, color: "#94A3B8" }}>{item.actionable}</p>
                      </div>
                    )}
                  </div>
                ))}
                {monitorResult.recommendedResponse && (
                  <div style={{ background: "#1E293B", borderRadius: 8, padding: "12px 14px", border: "1px solid #3B82F6" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", marginBottom: 4 }}>Atlas Recommends</p>
                    <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{monitorResult.recommendedResponse}</p>
                  </div>
                )}
                <button onClick={handleRunMonitor} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #334155", background: "#1E293B", color: "#94A3B8", fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-scan</button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Competitor Review Analysis ───────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 16px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Competitor Review Analysis</p>
            <p style={{ fontSize: 11, color: muted }}>Paste G2 / Capterra / TrustPilot reviews → get clustered complaints, gaps, and sales angles.</p>
          </div>
          <button onClick={() => { setShowReviewModal(true); setReviewAnalysis(null); setReviewError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
            Analyze Reviews
          </button>
        </div>
      </div>

      {/* ── Job Posting Tracker (Hiring Signals) ─────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 16px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Hiring Signal Tracker</p>
            <p style={{ fontSize: 11, color: muted }}>Paste competitor job listings → Atlas extracts strategic signals like &quot;5 AI roles → building an AI product layer&quot;.</p>
          </div>
          <button
            onClick={() => { setShowJobModal(true); setJobAnalysis(null); setJobError(null); }}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}
          >
            Analyze Jobs
          </button>
        </div>
        {/* Quick search links for tracked competitors */}
        {(tracked.length > 0 || (d.competitors && d.competitors.length > 0)) && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...tracked.map(c => c.name), ...(d.competitors ?? []).map(c => c.name)]
              .filter((name, i, arr) => arr.indexOf(name) === i)
              .slice(0, 6)
              .map((name, i) => (
                <a
                  key={i}
                  href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name)}&f_C=`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                    background: surf, color: ink, textDecoration: "none",
                    border: `1px solid ${bdr}`,
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = bdr)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = surf)}
                >
                  {name} jobs ↗
                </a>
              ))}
          </div>
        )}
      </div>

      {/* Job Modal */}
      {showJobModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !analyzingJobs) setShowJobModal(false); }}
        >
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Hiring Signal Tracker</p>
              <button onClick={() => setShowJobModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>

            {!jobAnalysis ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Competitor Name *</label>
                  <input
                    value={jobCompetitor}
                    onChange={e => setJobCompetitor(e.target.value)}
                    placeholder="e.g. Salesforce, Linear, Notion…"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>
                    Paste Job Titles / Listings * <span style={{ fontWeight: 400 }}>(from LinkedIn, Indeed, their careers page, or just job titles)</span>
                  </label>
                  <textarea
                    value={jobText}
                    onChange={e => setJobText(e.target.value)}
                    placeholder={"Senior ML Engineer\nAI Research Lead\nHead of Enterprise Sales (New York)\nSenior Product Manager — AI Features\nSite Reliability Engineer\n..."}
                    rows={10}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                {jobError && <p style={{ fontSize: 12, color: red }}>{jobError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowJobModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={handleAnalyzeJobs}
                    disabled={analyzingJobs || !jobCompetitor.trim() || jobText.trim().length < 10}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: analyzingJobs ? bdr : "#7C3AED", color: analyzingJobs ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: analyzingJobs ? "not-allowed" : "pointer" }}
                  >
                    {analyzingJobs ? "Analyzing…" : "Extract Signals"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Summary */}
                <div style={{ background: "#F5F3FF", border: `1px solid #DDD6FE`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase" }}>Strategic Summary — {jobAnalysis.competitor}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED" }}>{jobAnalysis.totalRoles ?? 0} roles detected</span>
                  </div>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{jobAnalysis.strategicSummary}</p>
                </div>

                {/* Signals */}
                {jobAnalysis.signals && jobAnalysis.signals.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: ink, textTransform: "uppercase", marginBottom: 8 }}>Hiring Signals ({jobAnalysis.signals.length})</p>
                    {jobAnalysis.signals.map((sig, i) => {
                      const urgencyColor = sig.urgency === "high" ? red : sig.urgency === "medium" ? amber : muted;
                      return (
                        <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{sig.pattern}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: urgencyColor, textTransform: "uppercase" }}>{sig.urgency}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "#EDE9FE", padding: "1px 7px", borderRadius: 999 }}>{sig.count} role{sig.count !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                            {sig.roles.map((r, ri) => (
                              <span key={ri} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "#F5F3FF", color: "#7C3AED", border: `1px solid #DDD6FE` }}>{r}</span>
                            ))}
                          </div>
                          <p style={{ fontSize: 12, color: blue, lineHeight: 1.5 }}>→ {sig.inference}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recommended Actions */}
                {jobAnalysis.recommendedActions && jobAnalysis.recommendedActions.length > 0 && (
                  <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "14px 16px", border: `1px solid #BBF7D0` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 8 }}>Recommended Actions</p>
                    {jobAnalysis.recommendedActions.map((action, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, marginBottom: 4 }}>• {action}</p>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setJobAnalysis(null); setJobText(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Analyze Another</button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(jobAnalysis, null, 2)).catch(() => {}); }}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >Copy as JSON</button>
                  <button onClick={() => setShowJobModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Analysis Modal */}
      {showReviewModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget && !analyzingReviews) setShowReviewModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Competitor Review Analysis</p>
              <button onClick={() => setShowReviewModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>

            {!reviewAnalysis ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Competitor Name *</label>
                    <input value={reviewCompetitor} onChange={e => setReviewCompetitor(e.target.value)} placeholder="e.g. Salesforce, HubSpot, Notion…" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Paste Reviews *</label>
                    <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Paste 5-20 reviews from G2, Capterra, TrustPilot, or App Store. Include the review text — star ratings help but aren't required." rows={10} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box" }} />
                  </div>
                  {reviewError && <p style={{ fontSize: 12, color: red }}>{reviewError}</p>}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowReviewModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleAnalyzeReviews} disabled={analyzingReviews || !reviewCompetitor.trim() || reviewText.trim().length < 50} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: analyzingReviews ? bdr : amber, color: analyzingReviews ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: analyzingReviews ? "not-allowed" : "pointer" }}>
                      {analyzingReviews ? "Analyzing…" : "Analyze Reviews"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {reviewAnalysis.keyQuote && (
                  <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Key Quote</p>
                    <p style={{ fontSize: 13, color: ink, fontStyle: "italic", lineHeight: 1.6 }}>&quot;{reviewAnalysis.keyQuote}&quot;</p>
                  </div>
                )}
                {reviewAnalysis.battleCardSummary && (
                  <div style={{ background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 6 }}>Battle Card Summary</p>
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{reviewAnalysis.battleCardSummary}</p>
                  </div>
                )}
                {reviewAnalysis.topComplaints && reviewAnalysis.topComplaints.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 8 }}>Top Complaints ({reviewAnalysis.topComplaints.length})</p>
                    {reviewAnalysis.topComplaints.map((c, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{c.complaint}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, color: c.frequency === 'high' ? red : c.frequency === 'medium' ? amber : muted, textTransform: "uppercase" }}>{c.frequency}</span>
                        </div>
                        {c.quote && <p style={{ fontSize: 11, color: muted, fontStyle: "italic", marginBottom: 6 }}>&quot;{c.quote}&quot;</p>}
                        <p style={{ fontSize: 11, color: blue }}>Sales angle: {c.salesAngle}</p>
                      </div>
                    ))}
                  </div>
                )}
                {reviewAnalysis.featureGaps && reviewAnalysis.featureGaps.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 8 }}>Feature Gaps / Opportunities</p>
                    {reviewAnalysis.featureGaps.map((g, i) => (
                      <div key={i} style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: `1px solid #BBF7D0`, marginBottom: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 3 }}>{g.feature}</p>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{g.evidence}</p>
                        <p style={{ fontSize: 11, color: green }}>Opportunity: {g.opportunity}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setReviewAnalysis(null); setReviewText(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Analyze Another</button>
                  <button onClick={() => {
                    const text = JSON.stringify(reviewAnalysis, null, 2);
                    navigator.clipboard.writeText(text).catch(() => {});
                  }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: amber, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Copy as JSON</button>
                  <button onClick={() => setShowReviewModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Weekly Competitive Scan ─────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: weeklyScanResult ? 14 : 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Run Weekly Competitive Scan</p>
            <p style={{ fontSize: 11, color: muted }}>Re-scrapes all {tracked.length > 0 ? `${tracked.length} tracked` : "your tracked"} competitors, detects changes, and generates an actionable digest.</p>
          </div>
          <button
            onClick={handleWeeklyScan}
            disabled={runningWeeklyScan || tracked.length === 0}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningWeeklyScan || tracked.length === 0 ? bdr : ink, color: runningWeeklyScan || tracked.length === 0 ? muted : bg, fontSize: 12, fontWeight: 600, cursor: runningWeeklyScan || tracked.length === 0 ? "not-allowed" : "pointer", flexShrink: 0 }}
          >
            {runningWeeklyScan ? "Scanning…" : tracked.length === 0 ? "Track competitors first" : "Run Scan"}
          </button>
        </div>
        {weeklyScanError && <p style={{ fontSize: 12, color: red, marginTop: 8 }}>{weeklyScanError}</p>}
        {weeklyScanResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {weeklyScanResult.headline && (
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: blue }}>{weeklyScanResult.headline}</p>
                {weeklyScanResult.competitorsScanned && (
                  <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Scanned {weeklyScanResult.competitorsScanned} competitors · {weeklyScanResult.competitorsWithChanges} with changes</p>
                )}
              </div>
            )}
            {weeklyScanResult.topMoves && weeklyScanResult.topMoves.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Top Moves This Week</p>
                {weeklyScanResult.topMoves.map((move, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: "#fff", borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{move.competitor}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: move.urgency === "high" ? "#FEF2F2" : move.urgency === "medium" ? "#FFFBEB" : surf, color: move.urgency === "high" ? red : move.urgency === "medium" ? amber : muted }}>{move.urgency}</span>
                    </div>
                    <p style={{ fontSize: 12, color: ink, marginBottom: 3 }}>{move.move}</p>
                    <p style={{ fontSize: 11, color: muted }}>→ {move.implication}</p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {weeklyScanResult.opportunities && weeklyScanResult.opportunities.length > 0 && (
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Opportunities</p>
                  {weeklyScanResult.opportunities.map((o, i) => <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>• {o}</p>)}
                </div>
              )}
              {weeklyScanResult.recommendedActions && weeklyScanResult.recommendedActions.length > 0 && (
                <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Act This Week</p>
                  {weeklyScanResult.recommendedActions.map((a, i) => <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>→ {a}</p>)}
                </div>
              )}
            </div>
            {(weeklyScanResult.pricingAlerts?.length ?? 0) > 0 && (
              <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 12px", border: "1px solid #FDE68A" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Pricing Alerts</p>
                {weeklyScanResult.pricingAlerts?.map((a, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>⚠ {a}</p>)}
              </div>
            )}
            {(weeklyScanResult.hiringSignals?.length ?? 0) > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Hiring Signals</p>
                {weeklyScanResult.hiringSignals?.map((s, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>👥 {s}</p>)}
              </div>
            )}
            <button onClick={() => setWeeklyScanResult(null)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Tech Stack Detection ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: showTechStackPanel ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Tech Stack Detection</p>
            <p style={{ fontSize: 11, color: muted }}>Identifies a competitor&apos;s frontend, backend, database, cloud, and marketing stack — reveals their scale and strategy.</p>
          </div>
          <button onClick={() => setShowTechStackPanel(p => !p)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {showTechStackPanel ? "Hide" : "Detect Stack"}
          </button>
        </div>
        {showTechStackPanel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!techStackResult ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={techCompetitor} onChange={e => setTechCompetitor(e.target.value)} placeholder="Competitor name *" style={{ border: `1px solid ${bdr}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: ink, outline: "none" }} />
                  <input value={techCompetitorUrl} onChange={e => setTechCompetitorUrl(e.target.value)} placeholder="Their URL (optional)" style={{ border: `1px solid ${bdr}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: ink, outline: "none" }} />
                </div>
                {/* Quick-fill from tracked competitors */}
                {tracked.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: muted, alignSelf: "center" }}>Quick fill:</span>
                    {tracked.slice(0, 5).map(t => (
                      <button key={t.id} onClick={() => { setTechCompetitor(t.name); setTechCompetitorUrl(t.url ?? ""); }} style={{ padding: "3px 10px", borderRadius: 999, border: `1px solid ${bdr}`, background: bg, fontSize: 11, color: ink, cursor: "pointer" }}>{t.name}</button>
                    ))}
                  </div>
                )}
                {techStackError && <p style={{ fontSize: 11, color: red }}>{techStackError}</p>}
                <button onClick={handleDetectTechStack} disabled={detectingStack || !techCompetitor.trim()} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: detectingStack ? bdr : ink, color: detectingStack ? muted : bg, fontSize: 12, fontWeight: 600, cursor: detectingStack || !techCompetitor.trim() ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
                  {detectingStack ? "Detecting…" : "Analyze Stack"}
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{techStackResult.competitorName ?? techStackCompetitorName}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: techStackResult.confidence === "high" ? "#F0FDF4" : techStackResult.confidence === "medium" ? "#FFFBEB" : "#FEF2F2", color: techStackResult.confidence === "high" ? green : techStackResult.confidence === "medium" ? amber : red, border: `1px solid ${techStackResult.confidence === "high" ? "#BBF7D0" : techStackResult.confidence === "medium" ? "#FDE68A" : "#FECACA"}` }}>
                    {techStackResult.confidence} confidence
                  </span>
                </div>
                {techStackResult.summary && <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, background: "#EDE9FE", borderRadius: 8, padding: "10px 14px" }}>{techStackResult.summary}</p>}
                {/* Stack categories */}
                {techStackResult.categories && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {Object.entries(techStackResult.categories).filter(([, tools]) => Array.isArray(tools) && tools.length > 0).map(([cat, tools]) => (
                      <div key={cat} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 12px" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "capitalize", color: muted, marginBottom: 6 }}>{cat}</p>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(tools as string[]).map((t, ti) => <span key={ti} style={{ fontSize: 11, background: surf, padding: "2px 8px", borderRadius: 4, color: ink }}>{t}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Insights */}
                {techStackResult.keyInsights && techStackResult.keyInsights.length > 0 && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: `1px solid #BFDBFE` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: blue, marginBottom: 6 }}>What This Reveals</p>
                    {techStackResult.keyInsights.map((ins, ii) => <p key={ii} style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>→ {ins}</p>)}
                  </div>
                )}
                {techStackResult.competitiveImplications && (
                  <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: `1px solid #FDE68A` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: amber, marginBottom: 4 }}>Competitive Implications</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{techStackResult.competitiveImplications}</p>
                  </div>
                )}
                {techStackResult.recentChanges && (
                  <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>Recent changes: {techStackResult.recentChanges}</p>
                )}
                <button onClick={() => { setTechStackResult(null); setTechCompetitor(""); setTechCompetitorUrl(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
                  ← Detect Another
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Social Listening ─────────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Social Listening</p>
            <p style={{ fontSize: 11, color: muted }}>Search Reddit, Twitter/X, and HN for competitor mentions. Surfaces complaints, praise, and battle card updates.</p>
          </div>
          <button onClick={() => { if (showSocialPanel && !runningSocial) setShowSocialPanel(false); else setShowSocialPanel(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showSocialPanel ? "Close" : "Listen"}
          </button>
        </div>
        {showSocialPanel && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {!socialResult ? (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Competitors to monitor *</label>
                  <input
                    value={socialCompetitors}
                    onChange={e => setSocialCompetitors(e.target.value)}
                    placeholder={tracked.length > 0 ? tracked.map(t => t.name).join(', ') : "Competitor A, Competitor B"}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }}
                  />
                  {tracked.length > 0 && !socialCompetitors && (
                    <button onClick={() => setSocialCompetitors(tracked.map(t => t.name).join(', '))} style={{ fontSize: 10, color: "#7C3AED", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
                      Use tracked competitors ↑
                    </button>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Focus topics (optional)</label>
                  <input value={socialTopics} onChange={e => setSocialTopics(e.target.value)} placeholder="pricing, onboarding, support, recent news..." style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                </div>
                {socialError && <p style={{ fontSize: 12, color: red }}>{socialError}</p>}
                <button onClick={handleSocialListen} disabled={runningSocial || !socialCompetitors.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: runningSocial || !socialCompetitors.trim() ? bdr : "#7C3AED", color: runningSocial || !socialCompetitors.trim() ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: runningSocial || !socialCompetitors.trim() ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
                  {runningSocial ? "Searching…" : "Search Social & Forums"}
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Sentiment + early warning */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {socialResult.overallSentiment && (
                    <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, fontWeight: 700, background: socialResult.overallSentiment === "negative" ? "#FEF2F2" : socialResult.overallSentiment === "positive" ? "#F0FDF4" : "#FFFBEB", color: socialResult.overallSentiment === "negative" ? red : socialResult.overallSentiment === "positive" ? green : amber }}>
                      {socialResult.overallSentiment === "negative" ? "🔴 Negative sentiment" : socialResult.overallSentiment === "positive" ? "🟢 Positive sentiment" : socialResult.overallSentiment === "mixed" ? "🟡 Mixed sentiment" : "—"}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: muted }}>{socialResult.mentionCount ?? socialMentions.length} mentions found</span>
                </div>

                {socialResult.earlyWarning && (
                  <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: amber, marginBottom: 4 }}>⚡ EARLY WARNING</p>
                    <p style={{ fontSize: 12, color: ink }}>{socialResult.earlyWarning}</p>
                  </div>
                )}

                {/* Top complaints */}
                {socialResult.topComplaints && socialResult.topComplaints.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 8 }}>Top Complaints (Exploit These)</p>
                    {socialResult.topComplaints.map((c, i) => (
                      <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{c.complaint}</p>
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: c.frequency === "high" ? "#FEF2F2" : "#FFFBEB", color: c.frequency === "high" ? red : amber, fontWeight: 700, flexShrink: 0 }}>{c.frequency?.toUpperCase()}</span>
                        </div>
                        {c.quote && <p style={{ fontSize: 11, color: muted, fontStyle: "italic", margin: "4px 0" }}>&#34;{c.quote}&#34;</p>}
                        <p style={{ fontSize: 11, color: green, marginTop: 4 }}>💡 {c.opportunity}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Battle card updates */}
                {socialResult.battleCardUpdates && socialResult.battleCardUpdates.length > 0 && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: `1px solid #BFDBFE` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: blue, marginBottom: 6 }}>Add to Battle Card</p>
                    {socialResult.battleCardUpdates.map((u, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>• {u}</p>
                    ))}
                  </div>
                )}

                {/* Emerging themes */}
                {socialResult.emergingThemes && socialResult.emergingThemes.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 6 }}>Emerging Themes</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {socialResult.emergingThemes.map((t, i) => (
                        <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: ink }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {socialResult.recommendedAction && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 4 }}>RECOMMENDED ACTION</p>
                    <p style={{ fontSize: 12, color: ink }}>{socialResult.recommendedAction}</p>
                  </div>
                )}

                <button onClick={() => { setSocialResult(null); setSocialMentions([]); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
                  ← New Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Market Size CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: marketSizeResult ? 16 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>TAM / SAM / SOM Estimator</p>
            <p style={{ fontSize: 11, color: muted }}>Atlas researches competitor funding and ARR signals to estimate your total addressable, serviceable, and obtainable market size.</p>
            {marketSizeError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{marketSizeError}</p>}
          </div>
          <button
            onClick={handleRunMarketSize}
            disabled={runningMarketSize}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningMarketSize ? bdr : ink, color: runningMarketSize ? muted : bg, fontSize: 12, fontWeight: 600, cursor: runningMarketSize ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}
          >
            {runningMarketSize ? "Researching…" : "Estimate Market"}
          </button>
        </div>
        {marketSizeResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "TAM", value: marketSizeResult.tam, rationale: marketSizeResult.tamRationale, color: green },
                { label: "SAM", value: marketSizeResult.sam, rationale: marketSizeResult.samRationale, color: blue },
                { label: "SOM", value: marketSizeResult.som, rationale: marketSizeResult.somRationale, color: amber },
              ].map(({ label, value, rationale, color }) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: ink, marginBottom: 4 }}>{value ?? '—'}</p>
                  {rationale && <p style={{ fontSize: 10, color: muted, lineHeight: 1.4 }}>{rationale}</p>}
                </div>
              ))}
            </div>
            {marketSizeResult.competitorRevenues && marketSizeResult.competitorRevenues.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Competitor Revenue Estimates</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {marketSizeResult.competitorRevenues.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{c.name}</p>
                        <p style={{ fontSize: 10, color: muted }}>{c.signal}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: green }}>{c.estimatedARR}</p>
                        <p style={{ fontSize: 10, color: muted }}>{c.funding} raised</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {marketSizeResult.marketGrowthRate && (
                <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 3 }}>Growth Rate</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: ink }}>{marketSizeResult.marketGrowthRate}</p>
                  {marketSizeResult.marketMaturity && <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>{marketSizeResult.marketMaturity} market</p>}
                </div>
              )}
              {marketSizeResult.yourTargetShare && (
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 3 }}>Your 3-Year Target</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: ink }}>{marketSizeResult.yourTargetShare}</p>
                  <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>of SAM · {marketSizeResult.confidence ?? ''} confidence</p>
                </div>
              )}
            </div>
            {marketSizeResult.keyInsight && (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Key Insight</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{marketSizeResult.keyInsight}</p>
              </div>
            )}
            <button onClick={() => setMarketSizeResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Refresh</button>
          </div>
        )}
      </div>

      {/* ── Pricing Monitor CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: pricingResult ? 16 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Competitor Pricing Monitor</p>
            <p style={{ fontSize: 11, color: muted }}>Pulls live pricing for your tracked competitors via web search — extracts tiers, models, and pricing strategy gaps for your startup.</p>
            {pricingError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{pricingError}</p>}
          </div>
          <button onClick={handleRunPricingMonitor} disabled={runningPricing} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningPricing ? bdr : ink, color: runningPricing ? muted : bg, fontSize: 12, fontWeight: 600, cursor: runningPricing ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {runningPricing ? "Scanning…" : "Scan Pricing"}
          </button>
        </div>
        {pricingResult && pricingResult.pricing && pricingResult.pricing.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pricingResult.insights && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { label: "Cheapest", value: pricingResult.insights.cheapest ?? "—" },
                  { label: "Most Expensive", value: pricingResult.insights.mostExpensive ?? "—" },
                  { label: "Avg Starting", value: pricingResult.insights.averageStartingPrice ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{value}</p>
                    <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pricingResult.pricing.map((p, i) => (
                <div key={i} style={{ background: bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{p.competitor}</p>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted }}>{p.pricingModel}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: green, marginLeft: "auto" }}>{p.startingPrice}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    {p.hasFree && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#F0FDF4", border: "1px solid #BBF7D0", color: green, fontWeight: 600 }}>Free tier</span>}
                    {p.hasEnterprise && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#EFF6FF", border: "1px solid #BFDBFE", color: blue, fontWeight: 600 }}>Enterprise</span>}
                  </div>
                  {p.tiers && p.tiers.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {p.tiers.map((t, ti) => (
                        <div key={ti} style={{ background: surf, borderRadius: 6, padding: "5px 10px", border: `1px solid ${bdr}` }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: ink }}>{t.name}</p>
                          <p style={{ fontSize: 10, color: muted }}>{t.price}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {p.signals && p.signals.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {p.signals.map((s, si) => <p key={si} style={{ fontSize: 11, color: muted }}>• {s}</p>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {pricingResult.insights && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pricingResult.insights.pricingGap && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Pricing Gap</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{pricingResult.insights.pricingGap}</p>
                  </div>
                )}
                {pricingResult.insights.recommendation && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Recommendation</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{pricingResult.insights.recommendation}</p>
                  </div>
                )}
                {pricingResult.insights.yourPositioning && (
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}><strong>Your positioning:</strong> {pricingResult.insights.yourPositioning}</p>
                )}
              </div>
            )}
            <button onClick={() => setPricingResult(null)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
              Refresh Pricing
            </button>
          </div>
        )}
      </div>

      {/* ── Battle Cards ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: battleCardsResult ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Sales Battle Cards</p>
            <p style={{ fontSize: 11, color: muted }}>Atlas researches each competitor and generates per-deal battle cards — where you win, objection handlers, and the one landmine question to use against them.</p>
            {battleCardsError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{battleCardsError}</p>}
          </div>
          <button onClick={handleRunBattleCards} disabled={runningBattleCards} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningBattleCards ? bdr : ink, color: runningBattleCards ? muted : bg, fontSize: 12, fontWeight: 600, cursor: runningBattleCards ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {runningBattleCards ? "Researching…" : "Generate Cards"}
          </button>
        </div>
        {battleCardsResult && battleCardsResult.battleCards && battleCardsResult.battleCards.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Competitor tab strip */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {battleCardsResult.battleCards.map((bc, i) => (
                <button key={i} onClick={() => setActiveBattleCard(i)} style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${activeBattleCard === i ? red : bdr}`, background: activeBattleCard === i ? "#FEF2F2" : bg, color: activeBattleCard === i ? red : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{bc.competitor}</button>
              ))}
            </div>
            {(() => {
              const bc = battleCardsResult.battleCards![activeBattleCard];
              if (!bc) return null;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {bc.positioning && <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}><strong>Their positioning:</strong> {bc.positioning}</p>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {bc.whereYouWin && bc.whereYouWin.length > 0 && (
                      <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 5 }}>Where You Win</p>
                        {bc.whereYouWin.map((w, wi) => <p key={wi} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>✓ {w}</p>)}
                      </div>
                    )}
                    {bc.theirWeaknesses && bc.theirWeaknesses.length > 0 && (
                      <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: "1px solid #FECACA" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 5 }}>Their Weaknesses</p>
                        {bc.theirWeaknesses.map((w, wi) => <p key={wi} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>⚠ {w}</p>)}
                      </div>
                    )}
                  </div>
                  {bc.talkTrack && (
                    <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 4 }}>Talk Track</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>&quot;{bc.talkTrack}&quot;</p>
                    </div>
                  )}
                  {bc.objectionHandlers && bc.objectionHandlers.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Objection Handlers</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {bc.objectionHandlers.map((oh, oi) => (
                          <div key={oi} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: red, marginBottom: 3 }}>&quot;{oh.objection}&quot;</p>
                            <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>→ {oh.response}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {bc.landmine && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 4 }}>The Landmine Question</p>
                      <p style={{ fontSize: 12, color: ink, fontStyle: "italic", fontWeight: 600 }}>&quot;{bc.landmine}&quot;</p>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12 }}>
                    {bc.winSignals && bc.winSignals.length > 0 && (
                      <div style={{ flex: 1, background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", border: "1px solid #BBF7D0" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Win Signals</p>
                        {bc.winSignals.map((s, si) => <p key={si} style={{ fontSize: 10, color: ink, lineHeight: 1.4 }}>• {s}</p>)}
                      </div>
                    )}
                    {bc.disqualifiers && bc.disqualifiers.length > 0 && (
                      <div style={{ flex: 1, background: "#FEF2F2", borderRadius: 8, padding: "8px 12px", border: "1px solid #FECACA" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 4 }}>Walk Away If</p>
                        {bc.disqualifiers.map((d, di) => <p key={di} style={{ fontSize: 10, color: ink, lineHeight: 1.4 }}>• {d}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            <button onClick={() => setBattleCardsResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Refresh Cards</button>
          </div>
        )}
      </div>

      {/* ── Market Map ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Market Map</p>
        <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Atlas maps your total addressable market — TAM/SAM/SOM sizing, market segments, key players by category, whitespace opportunities, entry points, and competitive intensity.</p>
        {mmError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{mmError}</p>}
        <button onClick={handleRunMarketMap} disabled={runningMM}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningMM ? bdr : ink, color: runningMM ? muted : bg, fontSize: 12, fontWeight: 600, cursor: runningMM ? "not-allowed" : "pointer" }}>
          {runningMM ? "Mapping market…" : "Generate Market Map"}
        </button>
        {mmResult && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {!!mmResult.marketOverview && (
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{mmResult.marketOverview as string}</p>
            )}
            {/* TAM/SAM/SOM grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "TAM", data: mmResult.totalAddressableMarket as { size?: string; growth?: string } | undefined },
                { label: "SAM", data: mmResult.serviceableAddressableMarket as { size?: string; segment?: string } | undefined },
                { label: "SOM", data: mmResult.serviceableObtainableMarket as { size?: string; horizon?: string } | undefined },
              ].map(({ label, data }) => (
                <div key={label} style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0", textAlign: "center" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#059669", textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: ink, margin: 0 }}>{data?.size ?? '—'}</p>
                  <p style={{ fontSize: 10, color: muted, margin: 0 }}>{(data as Record<string, string> | undefined)?.growth ?? (data as Record<string, string> | undefined)?.horizon ?? (data as Record<string, string> | undefined)?.segment ?? ''}</p>
                </div>
              ))}
            </div>
            {/* Segments */}
            {(mmResult.marketSegments as { segment: string; size: string; growth: string; competition: string; ourFit: string }[] | undefined)?.length && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Market Segments</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(mmResult.marketSegments as { segment: string; size: string; growth: string; competition: string; ourFit: string }[]).map((s, i) => {
                    const fitColor = s.ourFit === 'strong' ? green : s.ourFit === 'moderate' ? amber : muted;
                    return (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", background: "#fff", borderRadius: 6, padding: "6px 10px", border: `1px solid ${bdr}` }}>
                        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: ink }}>{s.segment}</span>
                        <span style={{ fontSize: 10, color: muted }}>{s.size}</span>
                        <span style={{ padding: "2px 6px", borderRadius: 10, background: fitColor, color: "#fff", fontSize: 9, fontWeight: 700 }}>{s.ourFit}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Whitespace + Entry Points */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {!!(mmResult.whitespaceOpportunities as { gap: string; difficulty: string }[] | undefined)?.length && (
                <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 6 }}>Whitespace</p>
                  {(mmResult.whitespaceOpportunities as { gap: string; difficulty: string }[]).slice(0, 3).map((w, i) => (
                    <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {w.gap} <span style={{ color: muted }}>({w.difficulty})</span></p>
                  ))}
                </div>
              )}
              {!!(mmResult.entryPoints as { vertical: string; rationale: string }[] | undefined)?.length && (
                <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #DDD6FE" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", marginBottom: 6 }}>Entry Points</p>
                  {(mmResult.entryPoints as { vertical: string; rationale: string }[]).slice(0, 3).map((e, i) => (
                    <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {e.vertical}</p>
                  ))}
                </div>
              )}
            </div>
            {/* Market dynamics */}
            {!!(mmResult.marketDynamics as { tailwinds?: string[]; headwinds?: string[] } | undefined) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {!!(mmResult.marketDynamics as { tailwinds?: string[] }).tailwinds?.length && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Tailwinds</p>
                    {(mmResult.marketDynamics as { tailwinds: string[] }).tailwinds.map((t, i) => <p key={i} style={{ fontSize: 10, color: ink, marginBottom: 2 }}>↑ {t}</p>)}
                  </div>
                )}
                {!!(mmResult.marketDynamics as { headwinds?: string[] }).headwinds?.length && (
                  <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "8px 12px", border: "1px solid #FECACA" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 4 }}>Headwinds</p>
                    {(mmResult.marketDynamics as { headwinds: string[] }).headwinds.map((h, i) => <p key={i} style={{ fontSize: 10, color: ink, marginBottom: 2 }}>↓ {h}</p>)}
                  </div>
                )}
              </div>
            )}
            {!!mmResult.bottomLine && (
              <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 4 }}>Bottom Line</p>
                <p style={{ fontSize: 12, color: ink, fontWeight: 600 }}>{mmResult.bottomLine as string}</p>
              </div>
            )}
            <button onClick={() => setMmResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Regenerate</button>
          </div>
        )}
      </div>

      {/* ── Win / Loss Analysis ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Win / Loss Analysis</p>
        <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Atlas analyzes your competitive positioning to surface why you win, why you lose, competitor head-to-head breakdowns, and messaging adjustments to improve win rates.</p>
        {winLossError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{winLossError}</p>}
        <button onClick={handleRunWinLoss} disabled={runningWinLoss}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningWinLoss ? bdr : ink, color: runningWinLoss ? muted : bg, fontSize: 12, fontWeight: 600, cursor: runningWinLoss ? "not-allowed" : "pointer" }}>
          {runningWinLoss ? "Analyzing…" : "Run Win/Loss Analysis"}
        </button>
        {winLossResult && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA", flex: 1, textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Estimated Win Rate</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: ink }}>{winLossResult.winRateEstimate as string}</p>
              </div>
            </div>
            {!!winLossResult.keyInsight && (
              <div style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 14px", border: "1px solid #FED7AA" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 4 }}>Key Insight</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{winLossResult.keyInsight as string}</p>
              </div>
            )}
            {/* Win / Loss reasons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 6 }}>Why We Win</p>
                {(winLossResult.winReasons as { reason: string; frequency: string; competitorYouBeat: string }[] | undefined)?.map((w, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: ink, margin: 0 }}>{w.reason}</p>
                    <p style={{ fontSize: 10, color: muted }}>vs. {w.competitorYouBeat} · {w.frequency}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Why We Lose</p>
                {(winLossResult.lossReasons as { reason: string; frequency: string; competitorYouLoseTo: string; rootCause: string }[] | undefined)?.map((l, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: ink, margin: 0 }}>{l.reason}</p>
                    <p style={{ fontSize: 10, color: muted }}>vs. {l.competitorYouLoseTo} · Root: {l.rootCause}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Competitor breakdown */}
            {(winLossResult.competitorBreakdown as { competitor: string; headToHeadVerdict: string; theirBestScenario: string; yourBestScenario: string; dealBreaker: string }[] | undefined)?.length && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 8 }}>Head-to-Head Breakdown</p>
                {(winLossResult.competitorBreakdown as { competitor: string; headToHeadVerdict: string; theirBestScenario: string; yourBestScenario: string; dealBreaker: string }[]).map((c, i) => {
                  const verdictColor = c.headToHeadVerdict === 'win' ? green : c.headToHeadVerdict === 'lose' ? red : amber;
                  return (
                    <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{c.competitor}</p>
                        <span style={{ padding: "2px 8px", borderRadius: 10, background: verdictColor, color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{c.headToHeadVerdict}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10 }}>
                        <p style={{ color: ink, margin: 0 }}><span style={{ color: green, fontWeight: 700 }}>We win when:</span> {c.yourBestScenario}</p>
                        <p style={{ color: ink, margin: 0 }}><span style={{ color: red, fontWeight: 700 }}>They win when:</span> {c.theirBestScenario}</p>
                      </div>
                      <p style={{ fontSize: 10, color: muted, marginTop: 4, margin: 0 }}>Deal breaker: <span style={{ color: ink }}>{c.dealBreaker}</span></p>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Messaging adjustments */}
            {(winLossResult.messagingAdjustments as string[] | undefined)?.length && (
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 6 }}>Messaging Adjustments</p>
                {(winLossResult.messagingAdjustments as string[]).map((m, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 4 }}>→ {m}</p>
                ))}
              </div>
            )}
            {/* Action plan */}
            {(winLossResult.actionPlan as { action: string; owner: string; impact: string; timeline: string }[] | undefined)?.length && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Action Plan</p>
                {(winLossResult.actionPlan as { action: string; owner: string; impact: string; timeline: string }[]).map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 11 }}>
                    <span style={{ padding: "2px 6px", borderRadius: 6, background: a.impact === 'high' ? green : a.impact === 'medium' ? amber : muted, color: "#fff", fontSize: 9, fontWeight: 700, flexShrink: 0, height: "fit-content", marginTop: 2 }}>{a.impact}</span>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: ink, margin: 0 }}>{a.action}</p>
                      <p style={{ fontSize: 10, color: muted, margin: 0 }}>{a.owner} · {a.timeline}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setWinLossResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-analyze</button>
          </div>
        )}
      </div>

      {/* ── Win/Loss Analysis ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Win/Loss Analysis</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Understand why deals are won or lost and what to fix in your sales motion</p>
          </div>
          <button onClick={handleRunWinLossAnalysis} disabled={runningWinLoss} style={{ padding: "8px 16px", borderRadius: 8, background: runningWinLoss ? surf : ink, color: runningWinLoss ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: runningWinLoss ? "default" : "pointer" }}>
            {runningWinLoss ? "Analyzing…" : "Run Analysis"}
          </button>
        </div>
        {winLossError && <p style={{ color: "#DC2626", fontSize: 12 }}>{winLossError}</p>}
        {winLossResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!winLossResult.verdict && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(winLossResult.verdict)}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {!!winLossResult.estimatedWinRate && <div style={{ padding: "10px 12px", background: "#F0FDF4", borderRadius: 8 }}><p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>Est. Win Rate</p><p style={{ fontSize: 18, fontWeight: 700, color: "#16A34A", margin: 0 }}>{String(winLossResult.estimatedWinRate)}</p></div>}
              {!!winLossResult.priorityFix && <div style={{ padding: "10px 12px", background: "#FEF2F2", borderRadius: 8 }}><p style={{ fontSize: 10, color: muted, margin: "0 0 4px" }}>Priority Fix</p><p style={{ fontSize: 11, color: "#DC2626", margin: 0 }}>{String(winLossResult.priorityFix)}</p></div>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["wins","losses","competitors","coaching"] as const).map(t => (
                <button key={t} onClick={() => setWinLossTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${winLossTab===t ? ink : bdr}`, background: winLossTab===t ? ink : bg, color: winLossTab===t ? bg : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t==="wins" ? "✅ Win Themes" : t==="losses" ? "❌ Loss Themes" : t==="competitors" ? "⚔️ vs Competitors" : "🎯 Coaching"}
                </button>
              ))}
            </div>
            {winLossTab === "wins" && !!(winLossResult.winThemes as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(winLossResult.winThemes as { theme: string; frequency: string; reinforce: string }[]).map((w, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{w.theme}</p>
                    <p style={{ fontSize: 11, color: muted, margin: "0 0 4px" }}>Frequency: {w.frequency}</p>
                    <p style={{ fontSize: 12, color: "#16A34A", margin: 0 }}>Reinforce: {w.reinforce}</p>
                  </div>
                ))}
              </div>
            )}
            {winLossTab === "losses" && !!(winLossResult.lossThemes as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(winLossResult.lossThemes as { theme: string; frequency: string; fix: string; urgency: string }[]).map((l, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #DC2626" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{l.theme}</p>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: l.urgency==="high" ? "#DC2626" : "#D97706", color: "#fff", fontWeight: 700 }}>{l.urgency}</span>
                    </div>
                    <p style={{ fontSize: 11, color: muted, margin: "0 0 4px" }}>Frequency: {l.frequency}</p>
                    <p style={{ fontSize: 12, color: "#16A34A", margin: 0 }}>Fix: {l.fix}</p>
                  </div>
                ))}
              </div>
            )}
            {winLossTab === "competitors" && !!(winLossResult.competitorWinRate as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(winLossResult.competitorWinRate as { competitor: string; winRateAgainst: string; theirAdvantage: string; yourCounter: string }[]).map((c, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{c.competitor}</p>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>{c.winRateAgainst} win rate</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 4px" }}>Their edge: {c.theirAdvantage}</p>
                    <p style={{ fontSize: 12, color: "#2563EB", margin: 0 }}>Counter: {c.yourCounter}</p>
                  </div>
                ))}
              </div>
            )}
            {winLossTab === "coaching" && !!(winLossResult.coachingInsights as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(winLossResult.coachingInsights as { insight: string; drill: string; metric: string }[]).map((c, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#EFF6FF", borderRadius: 8, borderLeft: "3px solid #2563EB" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{c.insight}</p>
                    <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Drill: {c.drill}</p>
                    <p style={{ fontSize: 11, color: "#2563EB", margin: 0 }}>Metric: {c.metric}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setWinLossResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Feature Comparison ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Feature Comparison</p>
            <p style={{ fontSize: 11, color: muted }}>Deep feature-by-feature analysis vs competitors — where you win, where they win, and what to build next.</p>
          </div>
          <button onClick={handleRunFeatureComparison} disabled={runningFeatComp} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningFeatComp ? bdr : blue, color: runningFeatComp ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: runningFeatComp ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {runningFeatComp ? "Comparing…" : "Run Feature Comparison"}
          </button>
        </div>
        {featCompError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{featCompError}</p>}
        {featCompResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!featCompResult.verdict && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{String(featCompResult.verdict)}</p>}
            {/* Where we win / where they win */}
            {!!(featCompResult.youWin as unknown[])?.length && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div style={{ background: "#DCFCE7", borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", marginBottom: 8 }}>Where You Win</p>
                  {(featCompResult.youWin as { area: string; advantage: string }[]).map((w, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{w.area}</p>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>{w.advantage}</p>
                    </div>
                  ))}
                </div>
                {!!(featCompResult.theyWin as unknown[])?.length && (
                  <div style={{ background: "#FEE2E2", borderRadius: 8, padding: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: red, marginBottom: 8 }}>Where They Win</p>
                    {(featCompResult.theyWin as { competitor: string; area: string; response: string }[]).map((w, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{w.area}</p>
                        <p style={{ fontSize: 11, color: muted, margin: 0 }}>{w.competitor} · {w.response}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Feature categories */}
            {!!(featCompResult.featureCategories as unknown[])?.length && (
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                  {(featCompResult.featureCategories as { category: string }[]).map((c, i) => (
                    <button key={i} onClick={() => setFeatCompCatIdx(i)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${featCompCatIdx === i ? blue : bdr}`, background: featCompCatIdx === i ? "#EFF6FF" : "transparent", color: featCompCatIdx === i ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{c.category}</button>
                  ))}
                </div>
                {(() => {
                  const cat = (featCompResult.featureCategories as { category: string; features: { feature: string; us: string; competitor1: string; importance: string; buyerNote: string }[] }[])[featCompCatIdx];
                  if (!cat) return null;
                  const statusColor = (s: string) => s === "full" ? "#16A34A" : s === "partial" ? amber : s === "roadmap" ? blue : red;
                  return (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {["Feature", "You", "Competitor", "Importance"].map(h => (
                            <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${bdr}`, color: muted, fontWeight: 600, textAlign: "left" as const }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cat.features?.map((f, fi) => (
                          <tr key={fi} style={{ background: fi % 2 === 0 ? "transparent" : bg }}>
                            <td style={{ padding: "6px 8px", color: ink }}>{f.feature}</td>
                            <td style={{ padding: "6px 8px", color: statusColor(f.us), fontWeight: 700 }}>{f.us}</td>
                            <td style={{ padding: "6px 8px", color: statusColor(f.competitor1) }}>{f.competitor1}</td>
                            <td style={{ padding: "6px 8px" }}><span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 999, background: f.importance === "critical" ? "#FEE2E2" : f.importance === "high" ? "#FEF3C7" : "#F3F4F6", color: f.importance === "critical" ? red : f.importance === "high" ? amber : muted }}>{f.importance}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}
            {/* Gap analysis */}
            {!!(featCompResult.gapAnalysis as unknown[])?.length && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Gap Analysis — Build Priority</p>
                {(featCompResult.gapAnalysis as { gap: string; reason: string; urgency: string }[]).map((g, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{g.gap}</p>
                      <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{g.reason}</p>
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: g.urgency === "immediate" ? "#FEE2E2" : "#FEF3C7", color: g.urgency === "immediate" ? red : amber, fontWeight: 600, height: "fit-content" }}>{g.urgency}</span>
                  </div>
                ))}
              </div>
            )}
            {!!featCompResult.salesNarrative && (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12, marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 4 }}>Sales Narrative</p>
                <p style={{ fontSize: 12, color: ink }}>{String(featCompResult.salesNarrative)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Positioning Map ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Competitive Positioning Map</p>
            <p style={{ fontSize: 11, color: muted }}>Find white space, craft your positioning statement, and identify strategic moves.</p>
          </div>
          <button onClick={handleRunPositioningMap} disabled={runningPosMap} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningPosMap ? bdr : blue, color: runningPosMap ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: runningPosMap ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {runningPosMap ? "Mapping…" : "Build Positioning Map"}
          </button>
        </div>
        {posMapError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{posMapError}</p>}
        {posMapResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {/* Axes */}
            {!!posMapResult.xAxis && !!posMapResult.yAxis && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[posMapResult.xAxis, posMapResult.yAxis].map((axis, i) => {
                  const a = axis as { label: string; low: string; high: string };
                  return (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 10 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{a.label}</p>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>← {a.low} · {a.high} →</p>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Positioning statement */}
            {!!posMapResult.positioningStatement && (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, margin: "0 0 4px" }}>Positioning Statement</p>
                <p style={{ fontSize: 12, color: ink, margin: 0, fontStyle: "italic" }}>{String(posMapResult.positioningStatement)}</p>
              </div>
            )}
            {/* Players */}
            {!!(posMapResult.players as unknown[])?.length && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Competitors</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 8 }}>
                  {(posMapResult.players as { name: string }[]).map((p, i) => (
                    <button key={i} onClick={() => setPosMapPlayerIdx(i)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${posMapPlayerIdx === i ? blue : bdr}`, background: posMapPlayerIdx === i ? "#EFF6FF" : "transparent", color: posMapPlayerIdx === i ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{p.name}</button>
                  ))}
                </div>
                {(() => {
                  const pl = (posMapResult.players as { name: string; type: string; strength: string; weakness: string; x: number; y: number }[])[posMapPlayerIdx];
                  if (!pl) return null;
                  return (
                    <div style={{ background: bg, borderRadius: 8, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <p style={{ fontWeight: 700, color: ink, margin: 0 }}>{pl.name}</p>
                        <span style={{ fontSize: 11, color: muted, background: surf, padding: "2px 8px", borderRadius: 999 }}>{pl.type}</span>
                      </div>
                      <p style={{ fontSize: 12, color: green, marginBottom: 4 }}>✓ {pl.strength}</p>
                      <p style={{ fontSize: 12, color: red }}>✗ {pl.weakness}</p>
                    </div>
                  );
                })()}
              </div>
            )}
            {/* White Space */}
            {!!(posMapResult.whiteSpace as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>White Space Opportunities</p>
                {(posMapResult.whiteSpace as { area: string; opportunity: string; customerSegment: string }[]).map((w, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{w.area}</p>
                    <p style={{ fontSize: 11, color: muted, margin: "2px 0" }}>{w.opportunity}</p>
                    <p style={{ fontSize: 11, color: blue }}>For: {w.customerSegment}</p>
                  </div>
                ))}
              </div>
            )}
            {!!posMapResult.verdict && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginTop: 10 }}>{String(posMapResult.verdict)}</p>}
          </div>
        )}
      </div>

      {/* ── Trend Radar ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Market Trend Radar</p>
            <p style={{ fontSize: 11, color: muted }}>Scan tailwinds, headwinds, emerging threats, and opportunity windows in your market.</p>
          </div>
          <button onClick={handleRunTrendRadar} disabled={runningTrend}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningTrend ? bdr : blue, color: runningTrend ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: runningTrend ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {runningTrend ? "Scanning…" : "Run Trend Radar"}
          </button>
        </div>
        {trendError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{trendError}</p>}
        {trendResult && (() => {
          const tailwinds = (trendResult.tailwinds as { trend: string; description: string; timeHorizon: string; magnitude: string; howToRide: string }[] | undefined) ?? [];
          const headwinds = (trendResult.headwinds as { trend: string; description: string; timeHorizon: string; severity: string; mitigation: string }[] | undefined) ?? [];
          const threats = (trendResult.emergingThreats as { threat: string; source: string; probability: string; impactIfMaterializes: string; earlyWarningSign: string }[] | undefined) ?? [];
          const opportunities = (trendResult.opportunityWindows as { opportunity: string; description: string; timeLimit: string; requiredAction: string }[] | undefined) ?? [];
          const magColor = (m: string) => m === 'high' ? red : m === 'medium' ? amber : green;
          return (
            <div>
              {!!trendResult.verdict && (
                <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{trendResult.verdict as string}</p>
              )}
              <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1px solid ${bdr}`, paddingBottom: 8 }}>
                {([
                  { key: 'tailwinds' as const, label: `↑ Tailwinds (${tailwinds.length})`, color: green },
                  { key: 'headwinds' as const, label: `↓ Headwinds (${headwinds.length})`, color: red },
                  { key: 'threats' as const, label: `⚠ Threats (${threats.length})`, color: amber },
                  { key: 'opportunities' as const, label: `✦ Opportunities (${opportunities.length})`, color: blue },
                ]).map(t => (
                  <button key={t.key} onClick={() => setTrendTab(t.key)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${trendTab === t.key ? t.color : bdr}`, background: trendTab === t.key ? t.color + "15" : bg, color: trendTab === t.key ? t.color : muted, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {trendTab === 'tailwinds' && tailwinds.map((t, ti) => (
                <div key={ti} style={{ padding: "10px 12px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: green }}>{t.trend}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: magColor(t.magnitude), textTransform: "uppercase" }}>{t.magnitude}</span>
                    <span style={{ fontSize: 10, color: muted, marginLeft: "auto" }}>{t.timeHorizon}</span>
                  </div>
                  <p style={{ fontSize: 11, color: ink, marginBottom: 4 }}>{t.description}</p>
                  <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>→ {t.howToRide}</p>
                </div>
              ))}
              {trendTab === 'headwinds' && headwinds.map((h, hi) => (
                <div key={hi} style={{ padding: "10px 12px", background: "#FFF1F2", borderRadius: 8, border: "1px solid #FECDD3", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: red }}>{h.trend}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: magColor(h.severity), textTransform: "uppercase" }}>{h.severity}</span>
                    <span style={{ fontSize: 10, color: muted, marginLeft: "auto" }}>{h.timeHorizon}</span>
                  </div>
                  <p style={{ fontSize: 11, color: ink, marginBottom: 4 }}>{h.description}</p>
                  <p style={{ fontSize: 11, color: amber, fontWeight: 600 }}>Mitigation: {h.mitigation}</p>
                </div>
              ))}
              {trendTab === 'threats' && threats.map((t, ti) => (
                <div key={ti} style={{ padding: "10px 12px", background: "#FFF7ED", borderRadius: 8, border: "1px solid #FED7AA", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: amber }}>{t.threat}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: magColor(t.probability), textTransform: "uppercase" }}>{t.probability} prob</span>
                  </div>
                  <p style={{ fontSize: 11, color: muted, marginBottom: 2 }}>Source: {t.source}</p>
                  <p style={{ fontSize: 11, color: red, marginBottom: 2 }}>If materializes: {t.impactIfMaterializes}</p>
                  <p style={{ fontSize: 11, color: amber }}>Watch for: {t.earlyWarningSign}</p>
                </div>
              ))}
              {trendTab === 'opportunities' && opportunities.map((o, oi) => (
                <div key={oi} style={{ padding: "10px 12px", background: "#EFF6FF", borderRadius: 8, border: "1px solid #BFDBFE", marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 4 }}>{o.opportunity}</p>
                  <p style={{ fontSize: 11, color: ink, marginBottom: 4 }}>{o.description}</p>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 10, color: muted }}>Window: {o.timeLimit}</span>
                  </div>
                  <p style={{ fontSize: 11, color: blue, fontWeight: 600, marginTop: 4 }}>Action: {o.requiredAction}</p>
                </div>
              ))}
              {!!(trendResult.strategicImplications as string[] | undefined)?.length && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Strategic Implications</p>
                  {(trendResult.strategicImplications as string[]).map((imp, ii) => (
                    <p key={ii} style={{ fontSize: 11, color: ink, marginBottom: 4 }}>→ {imp}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGIC PLAN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
