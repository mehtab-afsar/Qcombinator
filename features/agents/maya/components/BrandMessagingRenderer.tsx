'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Rocket, ChevronRight, Calendar } from 'lucide-react'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

export function BrandMessagingRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    positioningStatement?: string;
    taglines?: { tagline: string; reasoning: string }[];
    elevatorPitch?: { oneLiner?: string; thirtySecond?: string; twoMinute?: string };
    valueProps?: { headline: string; description: string; proof?: string }[];
    voiceGuide?: { personality?: string[]; doSay?: string[]; dontSay?: string[]; examplePhrases?: string[] };
    investorNarrative?: string;
  };

  const [deploying, setDeploying]     = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Blog post state
  const [showBlogModal, setShowBlogModal]   = useState(false);
  const [blogTopic, setBlogTopic]           = useState("");
  const [writingBlog, setWritingBlog]       = useState(false);
  const [blogHtml, setBlogHtml]             = useState<string | null>(null);
  const [blogError, setBlogError]           = useState<string | null>(null);
  const [publishingBlog, setPublishingBlog] = useState(false);
  const [blogPublishedUrl, setBlogPublishedUrl] = useState<string | null>(null);
  const [blogPublishError, setBlogPublishError] = useState<string | null>(null);

  // Buffer scheduler state
  const [showBufferModal, setShowBufferModal] = useState(false);
  const [bufferToken, setBufferToken]         = useState("");
  const [scheduling, setScheduling]           = useState(false);
  const [bufferResult, setBufferResult]       = useState<{ scheduled: number; profiles: string[] } | null>(null);
  const [bufferError, setBufferError]         = useState<string | null>(null);

  // Content repurposing state
  const [repurposing, setRepurposing]           = useState(false);
  const [repurposeResult, setRepurposeResult]   = useState<{
    twitterThread?: { tweets: string[]; hook: string };
    linkedInPost?: { body: string; hook: string };
    newsletterExcerpt?: { subject: string; preheader: string; body: string };
    socialGraphicCopy?: { headline: string; subheadline: string; cta: string };
  } | null>(null);
  const [repurposeError, setRepurposeError]     = useState<string | null>(null);
  const [repurposeTab, setRepurposeTab]         = useState<"twitter" | "linkedin" | "newsletter" | "graphic">("twitter");
  const [copiedRepurpose, setCopiedRepurpose]   = useState<string | null>(null);

  // Brand consistency checker state
  const [showBrandCheck, setShowBrandCheck]   = useState(false);
  const [brandCheckCopy, setBrandCheckCopy]   = useState("");
  const [brandCheckType, setBrandCheckType]   = useState<"website" | "email" | "social" | "deck" | "general">("general");
  const [brandChecking, setBrandChecking]     = useState(false);
  const [brandCheckResult, setBrandCheckResult] = useState<{
    overallScore: number; grade: string;
    dimensions: { name: string; score: number; status: string; feedback: string }[];
    topIssues: string[]; topStrengths: string[]; revisedOpening?: string;
  } | null>(null);
  const [brandCheckError, setBrandCheckError] = useState<string | null>(null);

  // Newsletter state
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [newsletterTopic, setNewsletterTopic]         = useState("");
  const [newsletterSubs, setNewsletterSubs]           = useState("");
  const [newsletterSend, setNewsletterSend]           = useState(false);
  const [newsletterLoading, setNewsletterLoading]     = useState(false);
  const [newsletterResult, setNewsletterResult]       = useState<{ subject?: string; sent?: number; failed?: number; html?: string } | null>(null);
  const [newsletterError, setNewsletterError]         = useState<string | null>(null);

  async function handleSendNewsletter() {
    if (newsletterLoading || !newsletterTopic.trim()) return;
    setNewsletterLoading(true); setNewsletterError(null); setNewsletterResult(null);
    const subscribers = newsletterSubs.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@'));
    try {
      const res = await fetch('/api/agents/maya/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newsletterTopic, subscribers, send: newsletterSend && subscribers.length > 0 }),
      });
      const r = await res.json();
      if (res.ok) setNewsletterResult(r);
      else setNewsletterError(r.error ?? 'Failed to generate newsletter');
    } catch { setNewsletterError('Network error'); }
    finally { setNewsletterLoading(false); }
  }

  // Press kit state
  const [generatingPressKit, setGeneratingPressKit] = useState(false);
  const [pressKitError, setPressKitError]           = useState<string | null>(null);

  // SEO optimizer state
  const [showSEOPanel, setShowSEOPanel]   = useState(false);
  const [seoBlogContent, setSeoBlogContent] = useState("");
  const [seoKeyword, setSeoKeyword]       = useState("");
  const [runningS, setRunningS]     = useState(false);
  const [seoResult, setSeoResult]         = useState<{
    primaryKeyword?: string; secondaryKeywords?: string[]; titleSuggestions?: string[];
    metaDescription?: string; h1Suggestion?: string; h2Suggestions?: string[];
    contentGaps?: string[]; readabilityTips?: string[]; estimatedIntent?: string;
    wordCountAdvice?: string; internalLinkOpportunities?: string[]; tldrSummary?: string;
  } | null>(null);
  const [seoError, setSeoError]           = useState<string | null>(null);

  // Investor narrative state
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [narrativeResult, setNarrativeResult] = useState<{
    hook?: string;
    problem?: { headline?: string; depth?: string; personalStory?: string };
    solution?: { headline?: string; insight?: string; differentiation?: string };
    traction?: { headline?: string; bullets?: string[] };
    marketOpportunity?: { framing?: string; tailwind?: string };
    businessModel?: string;
    competitiveAdvantage?: { moat?: string; whyYouWin?: string };
    team?: { credibility?: string; unfairAdvantage?: string };
    theAsk?: { amount?: string; use?: string; milestone?: string };
    closingVision?: string;
    storyArc?: { beat: string; talkingPoint: string; transitionLine: string }[];
    objectionHandlers?: { objection: string; response: string }[];
  } | null>(null);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [narrativeTab, setNarrativeTab] = useState<'story' | 'objections'>('story');

  async function handleGenerateNarrative() {
    if (generatingNarrative) return;
    setGeneratingNarrative(true); setNarrativeError(null);
    try {
      const res = await fetch('/api/agents/maya/investor-narrative', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.narrative) setNarrativeResult(r.narrative);
      else setNarrativeError(r.error ?? 'Failed to generate investor narrative');
    } catch { setNarrativeError('Network error'); }
    finally { setGeneratingNarrative(false); }
  }

  // Content playbook state
  const [generatingContentPlaybook, setGeneratingContentPlaybook] = useState(false);
  const [contentPlaybookResult, setContentPlaybookResult] = useState<{
    contentPillars?: { pillar: string; why: string; examples: string[] }[];
    contentMix?: { format: string; percentage: number; why: string }[];
    channelStrategy?: { channel: string; contentType: string; frequency: string; goal: string }[];
    cadence?: string;
    topicIdeas?: string[];
    repurposeFlow?: string;
    toneGuide?: string;
    kpis?: string[];
    quickWins?: string[];
  } | null>(null);
  const [contentPlaybookError, setContentPlaybookError] = useState<string | null>(null);
  const [contentPlaybookTab, setContentPlaybookTab] = useState<'pillars' | 'channels' | 'ideas'>('pillars');

  async function handleGenerateContentPlaybook() {
    if (generatingContentPlaybook) return;
    setGeneratingContentPlaybook(true); setContentPlaybookError(null);
    try {
      const res = await fetch('/api/agents/maya/content-playbook', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.playbook) setContentPlaybookResult(r.playbook);
      else setContentPlaybookError(r.error ?? 'Failed to generate content playbook');
    } catch { setContentPlaybookError('Network error'); }
    finally { setGeneratingContentPlaybook(false); }
  }

  // Social Strategy state
  const [generatingSocial, setGeneratingSocial]       = useState(false);
  const [socialResult, setSocialResult]               = useState<Record<string, unknown> | null>(null);
  const [socialError, setSocialError]                 = useState<string | null>(null);
  const [socialPlatformIdx, setSocialPlatformIdx]     = useState(0);
  const [socialTab, setSocialTab]                     = useState<'platforms' | 'content' | 'tactics' | 'kpis'>('platforms');

  async function handleGenerateSocialStrategy() {
    if (generatingSocial) return;
    setGeneratingSocial(true); setSocialError(null); setSocialResult(null);
    try {
      const res = await fetch('/api/agents/maya/social-strategy', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.strategy) setSocialResult(r.strategy);
      else setSocialError(r.error ?? 'Generation failed');
    } catch { setSocialError('Network error'); }
    finally { setGeneratingSocial(false); }
  }

  // Product Launch state
  const [plProductName, setPlProductName]             = useState('');
  const [plLaunchDate, setPlLaunchDate]               = useState('');
  const [plLaunchType, setPlLaunchType]               = useState('Product Hunt');
  const [generatingPL, setGeneratingPL]               = useState(false);
  const [plResult, setPlResult]                       = useState<Record<string, unknown> | null>(null);
  const [plError, setPlError]                         = useState<string | null>(null);
  const [plTab, setPlTab]                             = useState<'phases' | 'channels' | 'checklist' | 'metrics'>('phases');

  async function handleGenerateProductLaunch() {
    if (generatingPL) return;
    setGeneratingPL(true); setPlError(null); setPlResult(null);
    try {
      const res = await fetch('/api/agents/maya/product-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: plProductName, launchDate: plLaunchDate, launchType: plLaunchType }),
      });
      const r = await res.json();
      if (res.ok && r.plan) setPlResult(r.plan);
      else setPlError(r.error ?? 'Generation failed');
    } catch { setPlError('Network error'); }
    finally { setGeneratingPL(false); }
  }

  // Content Calendar state
  const [calWeeks, setCalWeeks]                       = useState('4');
  const [generatingCal, setGeneratingCal]             = useState(false);
  const [calResult, setCalResult]                     = useState<Record<string, unknown> | null>(null);
  const [calError, setCalError]                       = useState<string | null>(null);
  const [calWeekIdx, setCalWeekIdx]                   = useState(0);

  async function handleGenerateContentCalendar() {
    if (generatingCal) return;
    setGeneratingCal(true); setCalError(null); setCalResult(null);
    try {
      const res = await fetch('/api/agents/maya/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks: Number(calWeeks) || 4 }),
      });
      const r = await res.json();
      if (res.ok && r.calendar) setCalResult(r.calendar);
      else setCalError(r.error ?? 'Generation failed');
    } catch { setCalError('Network error'); }
    finally { setGeneratingCal(false); }
  }

  // PR Strategy state
  const [generatingPR_strat, setGeneratingPR_strat]   = useState(false);
  const [prStratResult, setPrStratResult]             = useState<Record<string, unknown> | null>(null);
  const [prStratError, setPrStratError]               = useState<string | null>(null);
  const [prStratMediaIdx, setPrStratMediaIdx]         = useState(0);

  async function handleGeneratePRStrategy() {
    if (generatingPR_strat) return;
    setGeneratingPR_strat(true); setPrStratError(null); setPrStratResult(null);
    try {
      const res = await fetch('/api/agents/maya/pr-strategy', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.strategy) setPrStratResult(r.strategy);
      else setPrStratError(r.error ?? 'Generation failed');
    } catch { setPrStratError('Network error'); }
    finally { setGeneratingPR_strat(false); }
  }

  // Brand Audit state
  const [generatingAudit, setGeneratingAudit]         = useState(false);
  const [auditResult, setAuditResult]                 = useState<Record<string, unknown> | null>(null);
  const [auditError, setAuditError]                   = useState<string | null>(null);
  const [auditDimIdx, setAuditDimIdx]                 = useState(0);

  async function handleRunBrandAudit() {
    if (generatingAudit) return;
    setGeneratingAudit(true); setAuditError(null); setAuditResult(null);
    try {
      const res = await fetch('/api/agents/maya/brand-audit', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.audit) setAuditResult(r.audit);
      else setAuditError(r.error ?? 'Audit failed');
    } catch { setAuditError('Network error'); }
    finally { setGeneratingAudit(false); }
  }

  // One-pager state
  const [generatingOnePager, setGeneratingOnePager] = useState(false);
  const [onePagerError, setOnePagerError]           = useState<string | null>(null);

  async function handleGenerateOnePager() {
    if (generatingOnePager) return;
    setGeneratingOnePager(true); setOnePagerError(null);
    try {
      const res = await fetch('/api/agents/maya/one-pager', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'investor-one-pager.html'; a.click();
        URL.revokeObjectURL(url);
      } else { setOnePagerError(r.error ?? 'Failed to generate one-pager'); }
    } catch { setOnePagerError('Network error'); }
    finally { setGeneratingOnePager(false); }
  }

  async function handleRunSEO() {
    if (runningS || !seoBlogContent.trim()) return;
    setRunningS(true); setSeoError(null);
    try {
      const res = await fetch('/api/agents/maya/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogContent: seoBlogContent, targetKeyword: seoKeyword || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.seo) setSeoResult(r.seo);
      else setSeoError(r.error ?? 'Failed to run SEO analysis');
    } catch { setSeoError('Network error'); }
    finally { setRunningS(false); }
  }

  async function handleGeneratePressKit() {
    if (generatingPressKit) return;
    setGeneratingPressKit(true); setPressKitError(null);
    try {
      const res = await fetch('/api/agents/maya/press-kit', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'press-kit.html';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setPressKitError(r.error ?? 'Failed to generate press kit');
      }
    } catch { setPressKitError('Network error'); }
    finally { setGeneratingPressKit(false); }
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
        body: JSON.stringify({ artifactType: 'brand_messaging', artifactContent: data, siteName: 'brand-site', agentId: 'maya', artifactId }),
      });
      const result = await res.json();
      if (res.ok) setDeployedUrl(result.url);
      else setDeployError(result.error ?? 'Deploy failed — check NETLIFY_API_KEY');
    } catch { setDeployError('Network error'); }
    finally { setDeploying(false); }
  }

  async function handleWriteBlog() {
    if (!blogTopic.trim() || writingBlog) return;
    setWritingBlog(true); setBlogError(null); setBlogHtml(null);
    try {
      const res = await fetch('/api/agents/maya/blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: blogTopic.trim(), artifactId }),
      });
      const result = await res.json();
      if (res.ok) setBlogHtml(result.html);
      else setBlogError(result.error ?? 'Blog generation failed');
    } catch { setBlogError('Network error'); }
    finally { setWritingBlog(false); }
  }

  async function handlePublishBlog() {
    if (!blogHtml || publishingBlog) return;
    setPublishingBlog(true); setBlogPublishError(null);
    try {
      const res = await fetch('/api/agents/maya/blog-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: blogHtml, title: blogTopic.trim(), topic: blogTopic.trim(), artifactId }),
      });
      const result = await res.json();
      if (res.ok) setBlogPublishedUrl(result.url);
      else setBlogPublishError(result.error ?? 'Publish failed');
    } catch { setBlogPublishError('Network error'); }
    finally { setPublishingBlog(false); }
  }

  function downloadBlog() {
    if (!blogHtml) return;
    const fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${blogTopic}</title><style>body{font-family:system-ui,sans-serif;max-width:680px;margin:60px auto;padding:0 24px;line-height:1.7;color:#111}h1{font-size:2rem;font-weight:700;line-height:1.2;margin-bottom:24px}h2{font-size:1.25rem;font-weight:600;margin-top:36px}p{margin-bottom:18px}blockquote{border-left:3px solid #7C3AED;padding-left:18px;color:#555;font-style:italic;margin:24px 0}</style></head><body>${blogHtml}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `blog-${blogTopic.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40)}.html`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function handleBufferSchedule() {
    if (!bufferToken.trim() || scheduling) return;
    setScheduling(true); setBufferError(null); setBufferResult(null);
    try {
      const res = await fetch('/api/agents/maya/buffer-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bufferToken: bufferToken.trim(), platforms: ['linkedin', 'twitter'], artifactId }),
      });
      const r = await res.json();
      if (res.ok) setBufferResult(r);
      else setBufferError(r.error ?? 'Scheduling failed');
    } catch { setBufferError('Network error'); }
    finally { setScheduling(false); }
  }

  async function handleBrandCheck() {
    if (!brandCheckCopy.trim() || brandChecking) return;
    setBrandChecking(true); setBrandCheckError(null); setBrandCheckResult(null);
    try {
      const res = await fetch('/api/agents/maya/brand-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy: brandCheckCopy.trim(), contentType: brandCheckType }),
      });
      const r = await res.json();
      if (res.ok && r.result?.overallScore !== undefined) setBrandCheckResult(r.result);
      else setBrandCheckError(r.error ?? 'Check failed');
    } catch { setBrandCheckError('Network error'); }
    finally { setBrandChecking(false); }
  }

  async function handleRepurpose() {
    if (!blogHtml || repurposing) return;
    setRepurposing(true); setRepurposeError(null); setRepurposeResult(null);
    // Strip HTML tags to get plain text for repurposing
    const plainText = blogHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      const res = await fetch('/api/agents/maya/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: plainText, topic: blogTopic, artifactId }),
      });
      const r = await res.json();
      if (res.ok && r.repurposed) setRepurposeResult(r.repurposed);
      else setRepurposeError(r.error ?? 'Repurposing failed');
    } catch { setRepurposeError('Network error'); }
    finally { setRepurposing(false); }
  }

  function copyRepurpose(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedRepurpose(key);
      setTimeout(() => setCopiedRepurpose(null), 2000);
    }).catch(() => {});
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const purple = "#7C3AED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Deploy Website CTA (Maya P0) ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          {deployedUrl ? (
            <><p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Your website is live!</p>
              <a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: muted, textDecoration: "underline", wordBreak: "break-all" }}>{deployedUrl}</a></>
          ) : (
            <><p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Deploy your brand website</p>
              <p style={{ fontSize: 11, color: muted }}>Turn this brand messaging into a full website — hero, value props, waitlist CTA. Live in seconds.</p></>
          )}
          {deployError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{deployError}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {deployedUrl && <a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>View Site</a>}
          <button onClick={handleDeploy} disabled={deploying} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: deploying ? bdr : ink, color: deploying ? muted : bg, fontSize: 12, fontWeight: 600, cursor: deploying ? "not-allowed" : "pointer" }}>
            {deploying ? "Deploying…" : deployedUrl ? "Redeploy" : "Deploy Website"}
          </button>
        </div>
      </div>
      {d.positioningStatement && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 6 }}>Positioning Statement</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, fontStyle: "italic" }}>{d.positioningStatement}</p>
        </div>
      )}

      {d.taglines && d.taglines.length > 0 && (
        <div>
          <p style={sectionHead}>Tagline Options</p>
          {d.taglines.map((t, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 4 }}>&quot;{t.tagline}&quot;</p>
              <p style={{ fontSize: 11, color: muted }}>{t.reasoning}</p>
            </div>
          ))}
        </div>
      )}

      {d.elevatorPitch && (
        <div>
          <p style={sectionHead}>Elevator Pitch</p>
          {d.elevatorPitch.oneLiner && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>One-liner</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{d.elevatorPitch.oneLiner}</p>
            </div>
          )}
          {d.elevatorPitch.thirtySecond && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>30-Second</p>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.elevatorPitch.thirtySecond}</p>
            </div>
          )}
          {d.elevatorPitch.twoMinute && (
            <div>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>2-Minute</p>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.elevatorPitch.twoMinute}</p>
            </div>
          )}
        </div>
      )}

      {d.valueProps && d.valueProps.length > 0 && (
        <div>
          <p style={sectionHead}>Value Props</p>
          {d.valueProps.map((vp, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{vp.headline}</p>
              <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: vp.proof ? 4 : 0 }}>{vp.description}</p>
              {vp.proof && <p style={{ fontSize: 11, color: green }}>Proof: {vp.proof}</p>}
            </div>
          ))}
        </div>
      )}

      {d.voiceGuide && (
        <div>
          <p style={sectionHead}>Voice Guide</p>
          {d.voiceGuide.personality && d.voiceGuide.personality.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Personality</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {d.voiceGuide.personality.map((p, i) => (
                  <span key={i} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, background: surf, color: ink, border: `1px solid ${bdr}` }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {d.voiceGuide.doSay && d.voiceGuide.doSay.length > 0 && (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: `1px solid #BBF7D0` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>DO SAY</p>
                {d.voiceGuide.doSay.map((s, i) => <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>✓ {s}</p>)}
              </div>
            )}
            {d.voiceGuide.dontSay && d.voiceGuide.dontSay.length > 0 && (
              <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: `1px solid #FECACA` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 6 }}>AVOID</p>
                {d.voiceGuide.dontSay.map((s, i) => <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>✗ {s}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {d.investorNarrative && (
        <div style={{ background: surf, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 6 }}>Investor Narrative</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.investorNarrative}</p>
        </div>
      )}

      {/* ── Figma-ready social media templates ──────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em" }}>Figma-Ready Social Templates</p>
          <button
            onClick={() => {
              const tagline = d.taglines?.[0]?.tagline || "Your tagline here";
              const oneLiner = d.elevatorPitch?.oneLiner || d.positioningStatement || "Transforming how the world works.";
              const brand = d.voiceGuide?.personality?.slice(0, 2).join(" · ") || "Bold · Trustworthy";
              const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Brand Social Templates</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f0f0f0; padding: 32px; display: flex; flex-direction: column; gap: 40px; align-items: center; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin: 0 0 8px; }
  .card { display: block; margin: 0 auto; }
  p.hint { font-size: 11px; color: #aaa; margin: 6px 0 0; text-align: center; }
</style>
</head>
<body>
<h1 style="font-size:24px;font-weight:700;margin-bottom:0">Brand Social Templates</h1>
<p style="color:#666;margin-top:4px">Open in browser · Screenshot or copy SVGs into Figma</p>

<!-- Instagram Square 1080x1080 -->
<section>
  <h2>Instagram Post · 1080×1080</h2>
  <svg class="card" width="540" height="540" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7C3AED"/>
        <stop offset="100%" stop-color="#4F46E5"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1080" fill="url(#grad1)" rx="0"/>
    <rect x="60" y="60" width="960" height="960" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="12"/>
    <text x="540" y="380" font-family="system-ui" font-size="96" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="middle">"${tagline.replace(/"/g, '&quot;')}"</text>
    <text x="540" y="580" font-family="system-ui" font-size="42" fill="rgba(255,255,255,0.85)" text-anchor="middle">${oneLiner.replace(/&/g, '&amp;').substring(0, 80)}</text>
    <text x="540" y="960" font-family="system-ui" font-size="30" fill="rgba(255,255,255,0.5)" text-anchor="middle">${brand}</text>
  </svg>
  <p class="hint">1080×1080 · Copy SVG into Figma or screenshot at 2×</p>
</section>

<!-- Twitter / X Card 1200x628 -->
<section>
  <h2>Twitter / X Card · 1200×628</h2>
  <svg class="card" width="600" height="314" viewBox="0 0 1200 628" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="628" fill="#0F0F0F"/>
    <rect x="0" y="0" width="6" height="628" fill="#7C3AED"/>
    <text x="80" y="220" font-family="system-ui" font-size="72" font-weight="800" fill="white">"${tagline.replace(/"/g, '&quot;').substring(0, 40)}"</text>
    <text x="80" y="330" font-family="system-ui" font-size="34" fill="#aaa">${oneLiner.replace(/&/g, '&amp;').substring(0, 70)}</text>
    <rect x="80" y="420" width="200" height="2" fill="#7C3AED"/>
    <text x="80" y="490" font-family="system-ui" font-size="26" fill="#666">${brand}</text>
  </svg>
  <p class="hint">1200×628 · Ideal for Twitter/X link previews and Open Graph</p>
</section>

<!-- LinkedIn Banner 1584x396 -->
<section>
  <h2>LinkedIn Banner · 1584×396</h2>
  <svg class="card" width="594" height="148" viewBox="0 0 1584 396" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4F46E5"/>
        <stop offset="60%" stop-color="#7C3AED"/>
        <stop offset="100%" stop-color="#9F1239"/>
      </linearGradient>
    </defs>
    <rect width="1584" height="396" fill="url(#grad2)"/>
    <text x="80" y="150" font-family="system-ui" font-size="80" font-weight="800" fill="white">${tagline.replace(/"/g, '&quot;').substring(0, 50)}</text>
    <text x="80" y="260" font-family="system-ui" font-size="38" fill="rgba(255,255,255,0.8)">${oneLiner.replace(/&/g, '&amp;').substring(0, 80)}</text>
    <text x="80" y="340" font-family="system-ui" font-size="28" fill="rgba(255,255,255,0.5)">${brand}</text>
  </svg>
  <p class="hint">1584×396 · LinkedIn company page banner</p>
</section>

</body>
</html>`;
              const blob = new Blob([html], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "brand_social_templates.html";
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ padding: "7px 14px", borderRadius: 8, background: ink, border: "none", fontSize: 12, fontWeight: 600, color: bg, cursor: "pointer" }}
          >
            Download Templates
          </button>
        </div>
        <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
          3 templates (Instagram 1080×1080, Twitter card 1200×628, LinkedIn banner 1584×396) generated from your brand copy. Open the HTML file in a browser, then screenshot or copy the SVGs directly into Figma.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {["Instagram 1:1", "Twitter Card", "LinkedIn Banner"].map((label, i) => (
            <span key={i} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, background: bg, color: muted, border: `1px solid ${bdr}`, fontWeight: 600 }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── Buffer Social Scheduler ───────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Schedule 30 Days of Posts</p>
            <p style={{ fontSize: 11, color: muted }}>Maya generates 30 LinkedIn + Twitter posts from your brand voice and schedules them to Buffer.</p>
          </div>
          <button onClick={() => { setShowBufferModal(true); setBufferResult(null); setBufferError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            Schedule Posts
          </button>
        </div>
      </div>

      {/* Buffer Modal */}
      {showBufferModal && (
        <div onClick={() => { if (!scheduling) setShowBufferModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Schedule 30 Days to Buffer</p>
              <button onClick={() => setShowBufferModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {bufferResult ? (
              <div>
                <div style={{ background: "#FFF7ED", borderRadius: 10, padding: "14px 16px", border: `1px solid #FED7AA`, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#EA580C", marginBottom: 4 }}>✓ {bufferResult.scheduled} posts scheduled!</p>
                  <p style={{ fontSize: 11, color: muted }}>Connected to: {bufferResult.profiles.join(', ')}</p>
                </div>
                <p style={{ fontSize: 12, color: muted, marginBottom: 16, lineHeight: 1.6 }}>Your posts will go live over the next 30 days. View and edit them in your Buffer dashboard.</p>
                <button onClick={() => { setShowBufferModal(false); setBufferResult(null); setBufferToken(""); }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#EA580C", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Buffer Access Token *</label>
                  <input
                    type="password"
                    value={bufferToken}
                    onChange={e => setBufferToken(e.target.value)}
                    placeholder="Token from buffer.com/developers/api/oauth"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }}
                  />
                  <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Get your token at buffer.com → Developers → Access Token. Connect LinkedIn + Twitter to Buffer first.</p>
                </div>
                {bufferError && <p style={{ fontSize: 12, color: red }}>{bufferError}</p>}
                <button onClick={handleBufferSchedule} disabled={!bufferToken.trim() || scheduling} style={{ padding: "10px", borderRadius: 8, border: "none", background: !bufferToken.trim() ? bdr : "#EA580C", color: !bufferToken.trim() ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !bufferToken.trim() ? "not-allowed" : "pointer" }}>
                  {scheduling ? "Generating & Scheduling…" : "Generate & Schedule 30 Posts"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Blog Post Writer ─────────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Write a Blog Post</p>
            <p style={{ fontSize: 11, color: muted }}>Generate a brand-voice article and download as HTML.</p>
          </div>
          <button onClick={() => { setShowBlogModal(true); setBlogHtml(null); setBlogError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            Write Post
          </button>
        </div>
      </div>

      {/* Blog Post Modal */}
      {showBlogModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setShowBlogModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Write Blog Post</p>
              <button onClick={() => setShowBlogModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>

            {!blogHtml ? (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>Blog Topic / Title Idea</label>
                <input
                  value={blogTopic}
                  onChange={e => setBlogTopic(e.target.value)}
                  placeholder="e.g. Why most B2B SaaS onboarding fails (and how we fixed it)"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box", marginBottom: 16 }}
                  onKeyDown={e => { if (e.key === "Enter") handleWriteBlog(); }}
                />
                {blogError && <p style={{ fontSize: 12, color: red, marginBottom: 12 }}>{blogError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowBlogModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleWriteBlog} disabled={writingBlog || !blogTopic.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: writingBlog ? bdr : purple, color: writingBlog ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: writingBlog ? "not-allowed" : "pointer" }}>
                    {writingBlog ? "Writing…" : "Generate Post"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ border: `1px solid ${bdr}`, borderRadius: 10, padding: "20px 24px", marginBottom: 20, lineHeight: 1.75, fontSize: 14, color: ink }} dangerouslySetInnerHTML={{ __html: blogHtml }} />
                {blogPublishedUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#15803D", fontWeight: 500 }}>Live at</span>
                    <a href={blogPublishedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#15803D", fontWeight: 600, wordBreak: "break-all" }}>{blogPublishedUrl} →</a>
                  </div>
                )}
                {blogPublishError && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 12, fontSize: 13, color: "#DC2626" }}>{blogPublishError}</div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button onClick={() => { setBlogHtml(null); setBlogTopic(""); setBlogPublishedUrl(null); setRepurposeResult(null); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Write Another</button>
                  <button onClick={downloadBlog} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>
                    Download HTML
                  </button>
                  <button onClick={handleRepurpose} disabled={repurposing} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: repurposing ? bdr : "#059669", color: repurposing ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: repurposing ? "not-allowed" : "pointer" }}>
                    {repurposing ? "Repurposing…" : "♻ Repurpose"}
                  </button>
                  <button onClick={handlePublishBlog} disabled={publishingBlog || !!blogPublishedUrl} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: publishingBlog ? bdr : blogPublishedUrl ? "#16A34A" : purple, color: publishingBlog ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: publishingBlog || blogPublishedUrl ? "default" : "pointer" }}>
                    {publishingBlog ? "Publishing…" : blogPublishedUrl ? "Published ✓" : "Publish to Site"}
                  </button>
                </div>
                {repurposeError && <p style={{ fontSize: 12, color: red, marginTop: 8 }}>{repurposeError}</p>}
                {/* Repurposed content panel */}
                {repurposeResult && (
                  <div style={{ marginTop: 16, border: `1px solid ${bdr}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", borderBottom: `1px solid ${bdr}` }}>
                      {([
                        { key: "twitter", label: "Twitter Thread" },
                        { key: "linkedin", label: "LinkedIn" },
                        { key: "newsletter", label: "Newsletter" },
                        { key: "graphic", label: "Social Graphic" },
                      ] as const).map(({ key, label }) => (
                        <button key={key} onClick={() => setRepurposeTab(key)} style={{ flex: 1, padding: "8px 4px", border: "none", borderRight: `1px solid ${bdr}`, background: repurposeTab === key ? purple : "transparent", color: repurposeTab === key ? "#fff" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      {repurposeTab === "twitter" && repurposeResult.twitterThread && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {repurposeResult.twitterThread.tweets.map((tweet, i) => (
                            <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: muted, flexShrink: 0, marginTop: 2 }}>{i + 1}/</span>
                              <p style={{ fontSize: 13, color: ink, lineHeight: 1.6, flex: 1 }}>{tweet}</p>
                              <button onClick={() => copyRepurpose(tweet, `tw${i}`)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", fontSize: 10, color: muted, cursor: "pointer", flexShrink: 0 }}>{copiedRepurpose === `tw${i}` ? "✓" : "Copy"}</button>
                            </div>
                          ))}
                          <button onClick={() => copyRepurpose(repurposeResult.twitterThread!.tweets.join('\n\n'), 'twAll')} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid #1DA1F2`, background: "transparent", color: "#1DA1F2", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                            {copiedRepurpose === "twAll" ? "Copied ✓" : "Copy All Tweets"}
                          </button>
                        </div>
                      )}
                      {repurposeTab === "linkedin" && repurposeResult.linkedInPost && (
                        <div>
                          <p style={{ fontSize: 13, color: ink, lineHeight: 1.75, whiteSpace: "pre-wrap", marginBottom: 12 }}>{repurposeResult.linkedInPost.body}</p>
                          <button onClick={() => copyRepurpose(repurposeResult.linkedInPost!.body, 'li')} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #0077B5", background: "transparent", color: "#0077B5", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            {copiedRepurpose === "li" ? "Copied ✓" : "Copy LinkedIn Post"}
                          </button>
                        </div>
                      )}
                      {repurposeTab === "newsletter" && repurposeResult.newsletterExcerpt && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div><p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 3 }}>Subject Line</p><p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{repurposeResult.newsletterExcerpt.subject}</p></div>
                          <div><p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 3 }}>Preheader</p><p style={{ fontSize: 12, color: muted }}>{repurposeResult.newsletterExcerpt.preheader}</p></div>
                          <div><p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 3 }}>Body</p><p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{repurposeResult.newsletterExcerpt.body}</p></div>
                          <button onClick={() => copyRepurpose(`Subject: ${repurposeResult.newsletterExcerpt!.subject}\n\n${repurposeResult.newsletterExcerpt!.body}`, 'nl')} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                            {copiedRepurpose === "nl" ? "Copied ✓" : "Copy Newsletter"}
                          </button>
                        </div>
                      )}
                      {repurposeTab === "graphic" && repurposeResult.socialGraphicCopy && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", borderRadius: 10, padding: "24px", textAlign: "center" }}>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{repurposeResult.socialGraphicCopy.headline}</p>
                            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>{repurposeResult.socialGraphicCopy.subheadline}</p>
                            <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 12, fontWeight: 700 }}>{repurposeResult.socialGraphicCopy.cta}</span>
                          </div>
                          <button onClick={() => copyRepurpose(`Headline: ${repurposeResult.socialGraphicCopy!.headline}\nSubheadline: ${repurposeResult.socialGraphicCopy!.subheadline}\nCTA: ${repurposeResult.socialGraphicCopy!.cta}`, 'sg')} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                            {copiedRepurpose === "sg" ? "Copied ✓" : "Copy Text"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {/* ── Brand Consistency Checker ──────────────────────────────────────── */}
      <div
        style={{
          background: "#FAFAF5",
          borderRadius: 12,
          padding: "16px 18px",
          border: `1px solid ${bdr}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: showBrandCheck ? 14 : 0,
          }}
        >
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>
              Check Brand Consistency
            </p>
            <p style={{ fontSize: 11, color: muted }}>
              Paste any copy — website, email, social post — and Maya scores it against your brand
              guide.
            </p>
          </div>
          <button
            onClick={() => {
              setShowBrandCheck((v) => !v);
              setBrandCheckResult(null);
              setBrandCheckError(null);
            }}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid ${purple}`,
              background: showBrandCheck ? purple : "transparent",
              color: showBrandCheck ? "#fff" : purple,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {showBrandCheck ? "Close" : "Check Copy"}
          </button>
        </div>

        {showBrandCheck && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["general", "website", "email", "social", "deck"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBrandCheckType(t)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    border: `1px solid ${brandCheckType === t ? purple : bdr}`,
                    background: brandCheckType === t ? "#F5F3FF" : "transparent",
                    color: brandCheckType === t ? purple : muted,
                    fontSize: 11,
                    fontWeight: brandCheckType === t ? 700 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={brandCheckCopy}
              onChange={(e) => setBrandCheckCopy(e.target.value)}
              placeholder="Paste your copy here (website headline, email subject + body, social post, deck slide text…)"
              rows={5}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${bdr}`,
                fontSize: 13,
                color: ink,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
            {brandCheckError && <p style={{ fontSize: 12, color: red }}>{brandCheckError}</p>}
            <button
              onClick={handleBrandCheck}
              disabled={brandChecking || !brandCheckCopy.trim()}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "none",
                background: brandChecking || !brandCheckCopy.trim() ? bdr : purple,
                color: brandChecking || !brandCheckCopy.trim() ? muted : "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: brandChecking || !brandCheckCopy.trim() ? "not-allowed" : "pointer",
                alignSelf: "flex-start",
              }}
            >
              {brandChecking ? "Checking…" : "Analyse Copy"}
            </button>
            {brandCheckResult &&
              (() => {
                const scoreColor =
                  brandCheckResult.overallScore >= 70
                    ? green
                    : brandCheckResult.overallScore >= 45
                      ? amber
                      : red;
                const statusColor = (s: string) =>
                  s === "strong" ? green : s === "okay" ? amber : red;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        background: "#fff",
                        borderRadius: 10,
                        border: `1px solid ${bdr}`,
                      }}
                    >
                      <div style={{ textAlign: "center", minWidth: 60 }}>
                        <p
                          style={{
                            fontSize: 32,
                            fontWeight: 800,
                            color: scoreColor,
                            lineHeight: 1,
                          }}
                        >
                          {brandCheckResult.overallScore}
                        </p>
                        <p
                          style={{
                            fontSize: 10,
                            color: muted,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          / 100
                        </p>
                      </div>
                      <div style={{ width: 1, height: 40, background: bdr }} />
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: scoreColor + "18",
                            color: scoreColor,
                            fontSize: 15,
                            fontWeight: 800,
                            marginBottom: 2,
                          }}
                        >
                          Grade {brandCheckResult.grade}
                        </span>
                        <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                          Scored on {brandCheckResult.dimensions?.length ?? 5} dimensions
                        </p>
                      </div>
                    </div>
                    {brandCheckResult.dimensions && brandCheckResult.dimensions.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {brandCheckResult.dimensions.map((dim, i) => (
                          <div
                            key={i}
                            style={{
                              padding: "10px 14px",
                              background: "#fff",
                              borderRadius: 8,
                              border: `1px solid ${bdr}`,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>
                                {dim.name}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: statusColor(dim.status),
                                    fontWeight: 600,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {dim.status}
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: statusColor(dim.status),
                                  }}
                                >
                                  {dim.score}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                height: 4,
                                background: bdr,
                                borderRadius: 2,
                                marginBottom: 6,
                              }}
                            >
                              <div
                                style={{
                                  height: 4,
                                  borderRadius: 2,
                                  background: statusColor(dim.status),
                                  width: `${dim.score}%`,
                                }}
                              />
                            </div>
                            <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>
                              {dim.feedback}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {brandCheckResult.topIssues && brandCheckResult.topIssues.length > 0 && (
                        <div
                          style={{
                            background: "#FEF2F2",
                            borderRadius: 8,
                            padding: "10px 12px",
                            border: "1px solid #FECACA",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: red,
                              marginBottom: 6,
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                            }}
                          >
                            Fix These
                          </p>
                          {brandCheckResult.topIssues.map((issue, i) => (
                            <p
                              key={i}
                              style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 4 }}
                            >
                              • {issue}
                            </p>
                          ))}
                        </div>
                      )}
                      {brandCheckResult.topStrengths && brandCheckResult.topStrengths.length > 0 && (
                        <div
                          style={{
                            background: "#F0FDF4",
                            borderRadius: 8,
                            padding: "10px 12px",
                            border: "1px solid #BBF7D0",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: green,
                              marginBottom: 6,
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                            }}
                          >
                            Strengths
                          </p>
                          {brandCheckResult.topStrengths.map((s, i) => (
                            <p
                              key={i}
                              style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 4 }}
                            >
                              ✓ {s}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    {brandCheckResult.revisedOpening && (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "#F5F3FF",
                          borderRadius: 8,
                          border: `1px solid #DDD6FE`,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: purple,
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          Suggested Opening
                        </p>
                        <p style={{ fontSize: 12, color: ink, fontStyle: "italic", lineHeight: 1.6 }}>
                          &ldquo;{brandCheckResult.revisedOpening}&rdquo;
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setBrandCheckResult(null);
                        setBrandCheckCopy("");
                      }}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 8,
                        border: `1px solid ${bdr}`,
                        background: "transparent",
                        color: muted,
                        fontSize: 12,
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      Check Another
                    </button>
                  </div>
                );
              })()}
          </div>
        )}
      </div>

      {/* ── Newsletter Builder CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Send Product Newsletter</p>
          <p style={{ fontSize: 11, color: muted }}>AI writes a product newsletter in your brand voice — then optionally sends it to your subscriber list via email.</p>
        </div>
        <button onClick={() => setShowNewsletterModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          Write Newsletter
        </button>
      </div>

      {/* ── Newsletter Modal ── */}
      {showNewsletterModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setShowNewsletterModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Product Newsletter</p>
              <button onClick={() => setShowNewsletterModal(false)} style={{ background: "none", border: "none", fontSize: 18, color: muted, cursor: "pointer" }}>×</button>
            </div>
            {!newsletterResult ? (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Newsletter Topic *</label>
                  <input value={newsletterTopic} onChange={e => setNewsletterTopic(e.target.value)} placeholder="e.g. New feature launch, Q1 milestones, tips for your users…" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Subscriber Emails (optional)</label>
                  <textarea value={newsletterSubs} onChange={e => setNewsletterSubs(e.target.value)} placeholder="Paste emails separated by comma or newline&#10;user@example.com, another@test.com" rows={4} style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: ink, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                  <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>Leave blank to preview only — we won&apos;t send without emails.</p>
                </div>
                {newsletterSubs.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@')).length > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: ink, cursor: "pointer" }}>
                    <input type="checkbox" checked={newsletterSend} onChange={e => setNewsletterSend(e.target.checked)} />
                    Send to subscribers now (via Resend)
                  </label>
                )}
                {newsletterError && <p style={{ fontSize: 11, color: red }}>{newsletterError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button onClick={() => setShowNewsletterModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleSendNewsletter} disabled={newsletterLoading || !newsletterTopic.trim()} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: newsletterLoading ? bdr : blue, color: newsletterLoading ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: newsletterLoading || !newsletterTopic.trim() ? "not-allowed" : "pointer" }}>
                    {newsletterLoading ? "Generating…" : "Generate Newsletter"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "12px 14px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: green, marginBottom: 4 }}>Newsletter generated!</p>
                  <p style={{ fontSize: 12, color: ink }}>Subject: <strong>{newsletterResult.subject}</strong></p>
                  {newsletterSend && <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>Sent: {newsletterResult.sent ?? 0} · Failed: {newsletterResult.failed ?? 0}</p>}
                </div>
                {newsletterResult.html && (
                  <button onClick={() => {
                    const blob = new Blob([newsletterResult.html!], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'newsletter.html'; a.click();
                    URL.revokeObjectURL(url);
                  }} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Download HTML
                  </button>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setNewsletterResult(null); setNewsletterTopic(""); setNewsletterSubs(""); setNewsletterSend(false); }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 12, cursor: "pointer" }}>New Newsletter</button>
                  <button onClick={() => setShowNewsletterModal(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: surf, color: muted, fontSize: 12, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Press Kit CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Generate Press Kit</p>
          <p style={{ fontSize: 11, color: muted }}>Downloads a ready-to-share HTML press kit — company boilerplate, founder bio, key stats, logo guidelines, and media contact.</p>
          {pressKitError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{pressKitError}</p>}
        </div>
        <button
          onClick={handleGeneratePressKit}
          disabled={generatingPressKit}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingPressKit ? bdr : ink, color: generatingPressKit ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingPressKit ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {generatingPressKit ? "Generating…" : "Download Press Kit"}
        </button>
      </div>

      {/* ── SEO Optimizer CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showSEOPanel ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>SEO Content Optimizer</p>
            <p style={{ fontSize: 11, color: muted }}>Paste a blog post or page copy — Maya researches the SERP landscape and generates title tags, meta, H2s, keyword strategy, and content gap analysis.</p>
            {seoError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{seoError}</p>}
          </div>
          <button onClick={() => { setShowSEOPanel(!showSEOPanel); setSeoResult(null); setSeoError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {showSEOPanel ? "Close" : "Optimize SEO"}
          </button>
        </div>
        {showSEOPanel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Blog / Page Content *</label>
              <textarea value={seoBlogContent} onChange={e => setSeoBlogContent(e.target.value)} placeholder="Paste your blog post or page copy here (first 1200 chars used for analysis)…" rows={6} style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: ink, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Target Keyword (optional)</label>
              <input value={seoKeyword} onChange={e => setSeoKeyword(e.target.value)} placeholder="e.g. startup pitch deck template" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleRunSEO} disabled={runningS || !seoBlogContent.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: runningS || !seoBlogContent.trim() ? bdr : ink, color: runningS || !seoBlogContent.trim() ? muted : bg, fontSize: 13, fontWeight: 600, cursor: runningS || !seoBlogContent.trim() ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
              {runningS ? "Analyzing…" : "Run SEO Analysis"}
            </button>
            {seoResult && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                {seoResult.tldrSummary && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 12, fontStyle: "italic", color: ink, lineHeight: 1.6 }}>{seoResult.tldrSummary}</p>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {seoResult.primaryKeyword && (
                    <div style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Primary Keyword</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: green }}>{seoResult.primaryKeyword}</p>
                    </div>
                  )}
                  {seoResult.estimatedIntent && (
                    <div style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Search Intent</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: blue, textTransform: "capitalize" }}>{seoResult.estimatedIntent}</p>
                    </div>
                  )}
                </div>
                {seoResult.titleSuggestions && seoResult.titleSuggestions.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Title Options</p>
                    {seoResult.titleSuggestions.map((t, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: bg, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 4 }}>
                        <p style={{ fontSize: 12, color: ink, flex: 1 }}>{t}</p>
                        <button onClick={() => navigator.clipboard.writeText(t).catch(() => {})} style={{ background: "none", border: "none", fontSize: 11, color: muted, cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>Copy</button>
                      </div>
                    ))}
                  </div>
                )}
                {seoResult.metaDescription && (
                  <div style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Meta Description</p>
                      <button onClick={() => navigator.clipboard.writeText(seoResult!.metaDescription!).catch(() => {})} style={{ background: "none", border: "none", fontSize: 11, color: muted, cursor: "pointer" }}>Copy</button>
                    </div>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{seoResult.metaDescription}</p>
                    <p style={{ fontSize: 10, color: seoResult.metaDescription.length > 155 ? red : muted, marginTop: 4 }}>{seoResult.metaDescription.length} chars (target 150–155)</p>
                  </div>
                )}
                {seoResult.h2Suggestions && seoResult.h2Suggestions.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Suggested H2s</p>
                    {seoResult.h2Suggestions.map((h, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 4 }}>## {h}</p>)}
                  </div>
                )}
                {seoResult.contentGaps && seoResult.contentGaps.length > 0 && (
                  <div style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 12px", border: "1px solid #FED7AA" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 6 }}>Content Gaps to Fill</p>
                    {seoResult.contentGaps.map((g, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>→ {g}</p>)}
                  </div>
                )}
                {seoResult.secondaryKeywords && seoResult.secondaryKeywords.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {seoResult.secondaryKeywords.map((k, i) => (
                      <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: ink }}>{k}</span>
                    ))}
                  </div>
                )}
                {seoResult.wordCountAdvice && (
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}><strong>Word count:</strong> {seoResult.wordCountAdvice}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Investor Narrative ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: narrativeResult ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Fundraising Story Arc</p>
            <p style={{ fontSize: 11, color: muted }}>Maya builds your investor narrative — hook, problem, solution, traction arc, and objection handlers — ready for your first investor meeting.</p>
            {narrativeError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{narrativeError}</p>}
          </div>
          <button onClick={handleGenerateNarrative} disabled={generatingNarrative} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingNarrative ? bdr : ink, color: generatingNarrative ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingNarrative ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingNarrative ? "Crafting…" : "Build Narrative"}
          </button>
        </div>
        {narrativeResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["story", "objections"] as const).map(tab => (
                <button key={tab} onClick={() => setNarrativeTab(tab)} style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${narrativeTab === tab ? ink : bdr}`, background: narrativeTab === tab ? ink : bg, color: narrativeTab === tab ? bg : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{tab === 'story' ? 'Story Arc' : 'Objection Handlers'}</button>
              ))}
            </div>
            {narrativeTab === 'story' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Hook */}
                {narrativeResult.hook && (
                  <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "12px 14px", border: "1px solid #DDD6FE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", marginBottom: 4 }}>The Hook</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: ink, lineHeight: 1.5, fontStyle: "italic" }}>&quot;{narrativeResult.hook}&quot;</p>
                  </div>
                )}
                {/* Problem → Solution → Traction */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {narrativeResult.problem && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: "1px solid #FECACA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 4 }}>Problem</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{narrativeResult.problem.headline}</p>
                      <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{narrativeResult.problem.depth}</p>
                    </div>
                  )}
                  {narrativeResult.solution && (
                    <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Solution</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{narrativeResult.solution.headline}</p>
                      <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{narrativeResult.solution.insight}</p>
                    </div>
                  )}
                  {narrativeResult.traction && (
                    <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: "1px solid #BFDBFE" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Traction</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{narrativeResult.traction.headline}</p>
                      {narrativeResult.traction.bullets?.map((b, i) => <p key={i} style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>• {b}</p>)}
                    </div>
                  )}
                </div>
                {/* Story Arc beats */}
                {narrativeResult.storyArc && narrativeResult.storyArc.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 8 }}>Meeting Flow</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {narrativeResult.storyArc.map((beat, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: bg, borderRadius: 8, border: `1px solid ${bdr}` }}>
                          <div style={{ width: 22, height: 22, borderRadius: 999, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, color: "#7C3AED" }}>{i + 1}</p>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 3 }}>{beat.beat}</p>
                            <p style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>{beat.talkingPoint}</p>
                            <p style={{ fontSize: 10, color: muted, fontStyle: "italic" }}>→ {beat.transitionLine}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Closing vision */}
                {narrativeResult.closingVision && (
                  <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #DDD6FE", textAlign: "center" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", marginBottom: 4 }}>Vision Close</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>&quot;{narrativeResult.closingVision}&quot;</p>
                  </div>
                )}
              </div>
            )}
            {narrativeTab === 'objections' && narrativeResult.objectionHandlers && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {narrativeResult.objectionHandlers.map((oh, i) => (
                  <div key={i} style={{ background: bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: red, marginBottom: 5 }}>❓ {oh.objection}</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>→ {oh.response}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setNarrativeResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Regenerate</button>
          </div>
        )}
      </div>

      {/* ── Content Playbook ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: contentPlaybookResult ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Content Playbook</p>
            <p style={{ fontSize: 11, color: muted }}>Maya builds a 90-day content system — pillars, channel strategy, cadence, repurpose flow, topic ideas, and KPIs — based on your ICP and brand.</p>
            {contentPlaybookError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{contentPlaybookError}</p>}
          </div>
          <button onClick={handleGenerateContentPlaybook} disabled={generatingContentPlaybook}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingContentPlaybook ? bdr : ink, color: generatingContentPlaybook ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingContentPlaybook ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingContentPlaybook ? "Building…" : "Build Playbook"}
          </button>
        </div>
        {contentPlaybookResult && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {(['pillars', 'channels', 'ideas'] as const).map(t => (
                <button key={t} onClick={() => setContentPlaybookTab(t)}
                  style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${contentPlaybookTab === t ? ink : bdr}`, background: contentPlaybookTab === t ? ink : "transparent", color: contentPlaybookTab === t ? bg : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t === 'pillars' ? 'Pillars & Mix' : t === 'channels' ? 'Channel Strategy' : 'Topics & KPIs'}
                </button>
              ))}
            </div>
            {contentPlaybookTab === 'pillars' && (
              <div>
                {contentPlaybookResult.toneGuide && <p style={{ fontSize: 12, color: muted, marginBottom: 12, fontStyle: "italic" }}>{contentPlaybookResult.toneGuide}</p>}
                {(contentPlaybookResult.contentPillars ?? []).map((p, i) => (
                  <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{p.pillar}</p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{p.why}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(p.examples ?? []).map((e, j) => <span key={j} style={{ padding: "2px 8px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 10, color: muted }}>{e}</span>)}
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {(contentPlaybookResult.contentMix ?? []).map((m, i) => (
                    <div key={i} style={{ background: "#EFF6FF", borderRadius: 8, padding: "8px 12px", border: "1px solid #BFDBFE", fontSize: 11, color: blue }}>
                      <strong>{m.percentage}%</strong> {m.format}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {contentPlaybookTab === 'channels' && (
              <div>
                {contentPlaybookResult.cadence && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0", marginBottom: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", marginBottom: 4 }}>Weekly Cadence</p>
                    <p style={{ fontSize: 12, color: ink }}>{contentPlaybookResult.cadence}</p>
                  </div>
                )}
                {(contentPlaybookResult.channelStrategy ?? []).map((c, i) => (
                  <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{c.channel}</p>
                      <span style={{ fontSize: 11, color: muted }}>{c.frequency}</span>
                    </div>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{c.contentType}</p>
                    <p style={{ fontSize: 11, color: blue, fontWeight: 600 }}>→ Goal: {c.goal}</p>
                  </div>
                ))}
                {contentPlaybookResult.repurposeFlow && (
                  <div style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 14px", border: "1px solid #FED7AA", marginTop: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 4 }}>Repurpose Flow</p>
                    <p style={{ fontSize: 12, color: ink }}>{contentPlaybookResult.repurposeFlow}</p>
                  </div>
                )}
              </div>
            )}
            {contentPlaybookTab === 'ideas' && (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {(contentPlaybookResult.topicIdeas ?? []).map((idea, i) => (
                    <p key={i} style={{ fontSize: 12, color: ink, padding: "6px 10px", background: "#fff", border: `1px solid ${bdr}`, borderRadius: 6 }}>📝 {idea}</p>
                  ))}
                </div>
                {(contentPlaybookResult.kpis ?? []).length > 0 && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE", marginBottom: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 6 }}>KPIs to Track</p>
                    {(contentPlaybookResult.kpis ?? []).map((k, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {k}</p>)}
                  </div>
                )}
                {(contentPlaybookResult.quickWins ?? []).length > 0 && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", marginBottom: 6 }}>Quick Wins (This Week)</p>
                    {(contentPlaybookResult.quickWins ?? []).map((w, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {w}</p>)}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setContentPlaybookResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", marginTop: 10 }}>Regenerate</button>
          </div>
        )}
      </div>

      {/* ── Investor One-Pager CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Investor One-Pager</p>
            <p style={{ fontSize: 11, color: muted }}>Maya synthesises your brand, financials, GTM strategy, and competitive position into a polished tear sheet — ready to email to cold investor leads.</p>
            {onePagerError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{onePagerError}</p>}
          </div>
          <button
            onClick={handleGenerateOnePager}
            disabled={generatingOnePager}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingOnePager ? bdr : ink, color: generatingOnePager ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingOnePager ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}
          >
            {generatingOnePager ? "Generating…" : "Download One-Pager"}
          </button>
        </div>
      </div>

      {/* ── Social Strategy ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Social Media Strategy</p>
            <p style={{ fontSize: 11, color: muted }}>Get a platform-by-platform strategy, content pillars, posting calendar, and growth tactics designed for your ICP.</p>
          </div>
          <button onClick={handleGenerateSocialStrategy} disabled={generatingSocial} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingSocial ? bdr : ink, color: generatingSocial ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingSocial ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingSocial ? "Building…" : "Build Strategy"}
          </button>
        </div>
        {socialError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{socialError}</p>}
        {socialResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!socialResult.overview && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{String(socialResult.overview)}</p>}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["platforms", "content", "tactics", "kpis"] as const).map(t => (
                <button key={t} onClick={() => setSocialTab(t)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${socialTab === t ? ink : bdr}`, background: socialTab === t ? ink : "transparent", color: socialTab === t ? bg : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
              ))}
            </div>
            {socialTab === "platforms" && !!(socialResult.platforms as unknown[])?.length && (
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                  {(socialResult.platforms as { platform: string }[]).map((p, i) => (
                    <button key={i} onClick={() => setSocialPlatformIdx(i)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${socialPlatformIdx === i ? ink : bdr}`, background: socialPlatformIdx === i ? ink : "transparent", color: socialPlatformIdx === i ? bg : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{p.platform}</button>
                  ))}
                </div>
                {(() => {
                  const pl = (socialResult.platforms as { platform: string; priority: string; why: string; goal: string; postingFrequency: string; contentMix: string; bestTimes: string }[])[socialPlatformIdx];
                  if (!pl) return null;
                  return (
                    <div style={{ background: bg, borderRadius: 8, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontWeight: 700, color: ink, margin: 0 }}>{pl.platform}</p>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: pl.priority === "primary" ? "#FEF3C7" : "#F3F4F6", color: pl.priority === "primary" ? amber : muted, fontWeight: 600 }}>{pl.priority}</span>
                      </div>
                      <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}><strong>Goal:</strong> {pl.goal}</p>
                      <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}><strong>Frequency:</strong> {pl.postingFrequency}</p>
                      <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}><strong>Content Mix:</strong> {pl.contentMix}</p>
                      <p style={{ fontSize: 12, color: muted }}><strong>Best Times:</strong> {pl.bestTimes}</p>
                    </div>
                  );
                })()}
              </div>
            )}
            {socialTab === "content" && !!(socialResult.contentPillars as unknown[])?.length && (
              <div>
                {(socialResult.contentPillars as { pillar: string; description: string; formats: string[]; exampleTopics: string[] }[]).map((cp, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: "0 0 4px" }}>{cp.pillar}</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 6 }}>{cp.description}</p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Formats: {cp.formats?.join(', ')}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      {cp.exampleTopics?.map((t, ti) => <span key={ti} style={{ fontSize: 11, padding: "2px 8px", background: surf, borderRadius: 999, color: ink }}>{t}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {socialTab === "tactics" && !!(socialResult.growthTactics as unknown[])?.length && (
              <div>
                {(socialResult.growthTactics as { tactic: string; platform: string; effort: string; expectedResult: string }[]).map((gt, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{gt.tactic}</p>
                      <span style={{ fontSize: 11, color: muted }}>{gt.effort} effort</span>
                    </div>
                    <p style={{ fontSize: 11, color: muted }}>Platform: {gt.platform} · {gt.expectedResult}</p>
                  </div>
                ))}
                {!!(socialResult.quickWins as string[] | undefined)?.length && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Quick Wins (Days 1-3)</p>
                    {(socialResult.quickWins as string[]).map((w, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 4 }}>Day {i + 1}: {w}</p>)}
                  </div>
                )}
              </div>
            )}
            {socialTab === "kpis" && !!(socialResult.kpis as unknown[])?.length && (
              <div>
                {(socialResult.kpis as { metric: string; platform: string; target30d: string; target90d: string }[]).map((kpi, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{kpi.metric}</p>
                      <p style={{ fontSize: 11, color: muted }}>{kpi.platform}</p>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <p style={{ fontSize: 12, color: ink, margin: 0 }}>30d: {kpi.target30d}</p>
                      <p style={{ fontSize: 11, color: muted }}>90d: {kpi.target90d}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Product Launch ── */}
      <div
        style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ink + "40"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingPL
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: ink }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Rocket size={15} style={{ color: muted }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Product Launch Plan</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Full go-to-market launch plan: phases, channels, launch-day playbook, and metrics.</p>
          </div>
          <button onClick={handleGenerateProductLaunch} disabled={generatingPL}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingPL ? muted : ink, border: `1.5px solid ${generatingPL ? bdr : bdr}`, cursor: generatingPL ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!generatingPL) { e.currentTarget.style.background = surf; e.currentTarget.style.borderColor = ink; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = bdr; }}
          >
            {generatingPL ? "Running…" : "Run"}{!generatingPL && <ChevronRight size={11} />}
          </button>
        </div>
        <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input value={plProductName} onChange={e => setPlProductName(e.target.value)} placeholder="Product/feature name" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }} />
          <input value={plLaunchDate} onChange={e => setPlLaunchDate(e.target.value)} placeholder="Launch date (e.g. March 15)" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }} />
          <select value={plLaunchType} onChange={e => setPlLaunchType(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }}>
            {["Product Hunt", "Press Release", "Community", "Influencer", "Email Campaign", "Cold Outreach", "Hybrid"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {plError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{plError}</p>}
        {plResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!plResult.verdict && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 8 }}>{String(plResult.verdict)}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 12 }}>
              {!!plResult.launchType && <span style={{ fontSize: 11, background: blue + "22", color: blue, borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>{String(plResult.launchType)}</span>}
              {!!plResult.launchGoal && <span style={{ fontSize: 11, background: green + "22", color: green, borderRadius: 20, padding: "2px 10px" }}>Goal: {String(plResult.launchGoal)}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
              {(["phases", "channels", "checklist", "metrics"] as const).map(t => (
                <button key={t} onClick={() => setPlTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${plTab === t ? blue : bdr}`, background: plTab === t ? blue : bg, color: plTab === t ? "#fff" : ink, fontSize: 11, fontWeight: plTab === t ? 700 : 400, cursor: "pointer" }}>
                  {t === "phases" ? "📅 Phases" : t === "channels" ? "📡 Channels" : t === "checklist" ? "✅ Pre-Launch" : "📊 Metrics"}
                </button>
              ))}
            </div>
            {plTab === "phases" && !!plResult.phases && (() => {
              const phases = plResult.phases as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {phases.map((ph, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(ph.phase ?? '')}</p>
                        {!!ph.duration && <span style={{ fontSize: 11, color: muted }}>{String(ph.duration)}</span>}
                      </div>
                      {!!ph.focus && <p style={{ fontSize: 11, color: blue, marginBottom: 4 }}>{String(ph.focus)}</p>}
                      {!!ph.keyActions && <div style={{ paddingLeft: 12 }}>{(ph.keyActions as string[]).map((a, j) => <p key={j} style={{ fontSize: 11, color: muted }}>• {a}</p>)}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {plTab === "channels" && !!plResult.channels && (() => {
              const chs = plResult.channels as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {chs.map((c, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(c.channel ?? '')}</p>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          {!!c.role && <span style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 7px", color: muted }}>{String(c.role)}</span>}
                          {!!c.effort && <span style={{ fontSize: 10, fontWeight: 700, color: c.effort === 'high' ? amber : green }}>{String(c.effort)}</span>}
                        </div>
                      </div>
                      {!!c.launchTactic && <p style={{ fontSize: 11, color: muted }}>{String(c.launchTactic)}</p>}
                      {!!c.expectedReach && <p style={{ fontSize: 11, color: blue }}>{String(c.expectedReach)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {plTab === "checklist" && !!plResult.preLaunchChecklist && (() => {
              const tasks = plResult.preLaunchChecklist as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {tasks.map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: bg, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <span style={{ fontSize: 14, marginTop: 1 }}>{t.critical ? '🔴' : '⚪'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: t.critical ? 700 : 400, color: ink }}>{String(t.task ?? '')}</p>
                        <div style={{ display: "flex", gap: 12 }}>
                          {!!t.dueBy && <span style={{ fontSize: 11, color: amber }}>{String(t.dueBy)}</span>}
                          {!!t.owner && <span style={{ fontSize: 11, color: muted }}>{String(t.owner)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {plTab === "metrics" && !!plResult.metrics && (() => {
              const items = plResult.metrics as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((m, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 6 }}>{String(m.metric ?? '')}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {[["target", "Day 1"], ["weekOneTarget", "Week 1"], ["monthOneTarget", "Month 1"]].map(([key, label]) => (
                          !!m[key] && (
                            <div key={key} style={{ textAlign: "center" as const, background: surf, borderRadius: 6, padding: 8 }}>
                              <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{label}</p>
                              <p style={{ fontSize: 12, fontWeight: 700, color: blue }}>{String(m[key])}</p>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {!!plResult.priorityAction && (
              <div style={{ marginTop: 12, background: blue + "11", borderRadius: 8, padding: 10, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Priority Action</p>
                <p style={{ fontSize: 12, color: ink }}>{String(plResult.priorityAction)}</p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ── Content Calendar ── */}
      <div
        style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ink + "40"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingCal
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: ink }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Calendar size={15} style={{ color: muted }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Content Calendar</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Week-by-week content plan with hooks, angles, and platform-specific posts.</p>
          </div>
          <button onClick={handleGenerateContentCalendar} disabled={generatingCal}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingCal ? muted : ink, border: `1.5px solid ${generatingCal ? bdr : bdr}`, cursor: generatingCal ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!generatingCal) { e.currentTarget.style.background = surf; e.currentTarget.style.borderColor = ink; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = bdr; }}
          >
            {generatingCal ? "Running…" : "Run"}{!generatingCal && <ChevronRight size={11} />}
          </button>
        </div>
        <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <select value={calWeeks} onChange={e => setCalWeeks(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: ink, fontSize: 12 }}>
              {["2","4","6","8"].map(w => <option key={w} value={w}>{w} weeks</option>)}
            </select>
          </div>
        {calError && <p style={{ color: "#DC2626", fontSize: 12 }}>{calError}</p>}
        {calResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!calResult.overview && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(calResult.overview)}</p>}
            {!!(calResult.contentPillars as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Content Pillars</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(calResult.contentPillars as { pillar: string; purpose: string; frequency: string }[]).map((p, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, minWidth: 120 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 2px" }}>{p.pillar}</p>
                      <p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>{p.purpose}</p>
                      <p style={{ fontSize: 10, color: "#2563EB", margin: 0 }}>{p.frequency}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!!(calResult.weeks as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Weekly Posts</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {(calResult.weeks as { week: number; theme: string }[]).map((w, i) => (
                    <button key={i} onClick={() => setCalWeekIdx(i)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${calWeekIdx===i ? ink : bdr}`, background: calWeekIdx===i ? ink : bg, color: calWeekIdx===i ? bg : ink, fontSize: 11, cursor: "pointer" }}>Week {w.week}</button>
                  ))}
                </div>
                {(() => {
                  const week = (calResult.weeks as Record<string, unknown>[])[calWeekIdx];
                  if (!week) return null;
                  return (
                    <div>
                      {!!week.theme && <p style={{ fontSize: 12, color: muted, margin: "0 0 8px" }}>Theme: <strong>{String(week.theme)}</strong></p>}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(week.posts as { day: string; platform: string; hook: string; angle: string; cta: string; effort: string }[] | undefined ?? []).map((post, i) => (
                          <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: ink }}>{post.day}</span>
                                <span style={{ fontSize: 11, color: "#2563EB" }}>{post.platform}</span>
                              </div>
                              <span style={{ fontSize: 10, color: post.effort==="high" ? "#DC2626" : post.effort==="medium" ? "#D97706" : "#16A34A" }}>{post.effort} effort</span>
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{post.hook}</p>
                            <p style={{ fontSize: 12, color: muted, margin: "0 0 4px" }}>{post.angle}</p>
                            <p style={{ fontSize: 11, color: "#16A34A", margin: 0 }}>CTA: {post.cta}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            {!!calResult.batchingStrategy && <div style={{ padding: "10px 14px", background: "#EFF6FF", borderRadius: 8 }}><p style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", margin: "0 0 4px" }}>Batching Strategy</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(calResult.batchingStrategy)}</p></div>}
            <button onClick={() => setCalResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
        </div>
      </div>

      {/* ── PR Strategy ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>PR Strategy</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Pitch angles, target media, press release template, and media outreach playbook</p>
          </div>
          <button onClick={handleGeneratePRStrategy} disabled={generatingPR_strat} style={{ padding: "8px 16px", borderRadius: 8, background: generatingPR_strat ? surf : ink, color: generatingPR_strat ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingPR_strat ? "default" : "pointer" }}>
            {generatingPR_strat ? "Building…" : "Build PR Strategy"}
          </button>
        </div>
        {prStratError && <p style={{ color: "#DC2626", fontSize: 12 }}>{prStratError}</p>}
        {prStratResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!prStratResult.overview && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(prStratResult.overview)}</p>}
            {!!prStratResult.prGoal && <p style={{ fontSize: 12, color: muted, margin: 0 }}>Goal: <strong>{String(prStratResult.prGoal)}</strong></p>}
            {!!(prStratResult.targetMedia as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Target Media</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {(prStratResult.targetMedia as { outlet: string; type: string }[]).map((m, i) => (
                    <button key={i} onClick={() => setPrStratMediaIdx(i)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${prStratMediaIdx===i ? ink : bdr}`, background: prStratMediaIdx===i ? ink : bg, color: prStratMediaIdx===i ? bg : ink, fontSize: 11, cursor: "pointer" }}>{m.outlet}</button>
                  ))}
                </div>
                {(() => {
                  const m = (prStratResult.targetMedia as Record<string, unknown>[])[prStratMediaIdx];
                  if (!m) return null;
                  return (
                    <div style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{String(m.outlet)} <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>({String(m.type)})</span></p>
                      {!!m.angle && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Angle: {String(m.angle)}</p>}
                      {!!m.contactTip && <p style={{ fontSize: 11, color: muted, margin: 0 }}>Contact tip: {String(m.contactTip)}</p>}
                    </div>
                  );
                })()}
              </div>
            )}
            {!!(prStratResult.pitchAngles as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Pitch Angles</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(prStratResult.pitchAngles as { angle: string; hook: string }[]).map((a, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: surf, borderRadius: 8, borderLeft: "3px solid #2563EB" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 2px" }}>{a.angle}</p>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>{a.hook}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!!prStratResult.pressRelease && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 6px" }}>Press Release Template</p>
                <pre style={{ fontSize: 11, color: ink, background: surf, padding: "12px 14px", borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{String(prStratResult.pressRelease)}</pre>
              </div>
            )}
            {!!prStratResult.emailTemplate && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 6px" }}>Journalist Outreach Email</p>
                <pre style={{ fontSize: 11, color: ink, background: "#EFF6FF", padding: "12px 14px", borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{String(prStratResult.emailTemplate)}</pre>
              </div>
            )}
            {!!prStratResult.quickWin && <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}><p style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>Quick Win</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(prStratResult.quickWin)}</p></div>}
            <button onClick={() => setPrStratResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Brand Audit ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Brand Audit</p>
            <p style={{ fontSize: 11, color: muted }}>Assess brand health across clarity, consistency, differentiation, emotional resonance, and visual identity.</p>
          </div>
          <button onClick={handleRunBrandAudit} disabled={generatingAudit}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingAudit ? bdr : amber, color: generatingAudit ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingAudit ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingAudit ? "Auditing…" : "Run Brand Audit"}
          </button>
        </div>
        {auditError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{auditError}</p>}
        {auditResult && (() => {
          const dims = (auditResult.dimensions as { dimension: string; score: number; rating: string; finding: string; gap: string; quickFix: string }[] | undefined) ?? [];
          const ratingColor = (r: string) => r === 'strong' ? green : r === 'good' ? blue : r === 'needs work' ? amber : red;
          const dim = dims[auditDimIdx];
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 32, fontWeight: 800, color: (auditResult.overallScore as number) >= 70 ? green : (auditResult.overallScore as number) >= 50 ? amber : red, margin: 0, lineHeight: 1 }}>{auditResult.overallScore as number}</p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1 }}>Brand Score</p>
                </div>
                {!!auditResult.overallVerdict && <p style={{ fontSize: 12, color: ink, flex: 1, fontStyle: "italic" }}>{auditResult.overallVerdict as string}</p>}
              </div>
              {dims.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Dimension Scores</p>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    {dims.map((d, i) => (
                      <button key={i} onClick={() => setAuditDimIdx(i)}
                        style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${auditDimIdx === i ? ratingColor(d.rating) : bdr}`, background: auditDimIdx === i ? ratingColor(d.rating) + "15" : bg, color: auditDimIdx === i ? ratingColor(d.rating) : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {d.dimension} ({d.score})
                      </button>
                    ))}
                  </div>
                  {dim && (
                    <div style={{ background: surf, borderRadius: 10, padding: 14, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{dim.dimension}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: ratingColor(dim.rating), background: ratingColor(dim.rating) + "15", borderRadius: 6, padding: "3px 8px", textTransform: "capitalize" }}>{dim.rating}</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: ratingColor(dim.rating), marginLeft: "auto" }}>{dim.score}</span>
                      </div>
                      <p style={{ fontSize: 12, color: ink, marginBottom: 6 }}>{dim.finding}</p>
                      {!!dim.gap && <p style={{ fontSize: 11, color: red, marginBottom: 6 }}>Gap: {dim.gap}</p>}
                      {!!dim.quickFix && (
                        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "8px 10px", marginTop: 6 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 2 }}>Quick Fix</p>
                          <p style={{ fontSize: 11, color: ink }}>{dim.quickFix}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!!(auditResult.quickFixes as { fix: string; effort: string; impact: string; why: string }[] | undefined)?.length && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Quick Fixes</p>
                  {(auditResult.quickFixes as { fix: string; effort: string; impact: string; why: string }[]).map((qf, qi) => (
                    <div key={qi} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "8px 10px", background: bg, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{qf.fix}</p>
                        <p style={{ fontSize: 11, color: muted }}>{qf.why}</p>
                      </div>
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: qf.impact === 'high' ? green : amber }}>{qf.impact} impact</span>
                        <span style={{ fontSize: 10, color: muted }}>{qf.effort}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!!auditResult.priorityAction && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Priority Action (Next 30 Days)</p>
                  <p style={{ fontSize: 11, color: ink }}>{auditResult.priorityAction as string}</p>
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
// FINANCIAL SUMMARY RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
