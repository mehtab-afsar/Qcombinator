'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircle, ExternalLink, TrendingUp, CheckCircle, Circle,
  Zap, Users, Target, BarChart2, FileText, ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { CXOConfig } from '@/lib/cxo/cxo-config';
import type { AgentArtifact } from './CXOSidebar';

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';
const green = '#16A34A';
const amber = '#D97706';

// ─── types ────────────────────────────────────────────────────────────────────

interface DealRow {
  id: string;
  company: string;
  stage: string;
  value: string | null;
}

interface ActivityRow {
  id: string;
  event_type: string;
  agent_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface CrossArtifact {
  agentId: string;
  agentName: string;
  artifactType: string;
  title: string;
  createdAt: string;
}

interface DashboardProps {
  config: CXOConfig;
  agentId: string;
  artifacts: AgentArtifact[];
  dimensionScore: number | null;
  onStartChat: (prompt?: string) => void;
}

// ─── per-agent quick actions ──────────────────────────────────────────────────

const QUICK_ACTIONS: Record<string, { label: string; prompt: string; icon: React.ElementType }[]> = {
  patel: [
    { label: 'Refine ICP',         prompt: "Let's refine my ideal customer profile based on recent wins.",        icon: Target },
    { label: 'Build Sequence',     prompt: "Create a 5-step cold outreach sequence for my top ICP segment.",      icon: Zap },
    { label: 'Enrich Leads',       prompt: "Enrich my lead list — find key contacts at my target companies.",      icon: Users },
    { label: 'GTM Audit',          prompt: "Run a GTM audit — where are we leaking in the funnel?",               icon: BarChart2 },
  ],
  susi: [
    { label: 'Review Pipeline',    prompt: "Walk me through my pipeline — what needs attention?",                  icon: BarChart2 },
    { label: 'Write Sales Script', prompt: "Write a discovery call script for my top ICP segment.",               icon: FileText },
    { label: 'Deal Objections',    prompt: "What are the top objections I'll face and how should I handle them?",  icon: Zap },
    { label: 'Follow-up Draft',    prompt: "Draft a follow-up email for a deal that went quiet.",                  icon: MessageCircle },
  ],
  maya: [
    { label: 'Brand Voice',        prompt: "Define my brand voice and messaging pillars.",                         icon: Target },
    { label: 'Blog Post',          prompt: "Write a thought leadership post for my target audience.",               icon: FileText },
    { label: 'Launch Copy',        prompt: "Write launch copy for my landing page.",                               icon: Zap },
    { label: 'Positioning',        prompt: "Help me nail my positioning against the top 3 competitors.",           icon: BarChart2 },
  ],
  felix: [
    { label: 'Unit Economics',     prompt: "Analyze my unit economics — LTV, CAC, payback period.",                icon: BarChart2 },
    { label: 'Runway Model',       prompt: "Build a runway model — at current burn, when do I need to raise?",     icon: TrendingUp },
    { label: 'Investor Update',    prompt: "Draft a YC-style investor update for this month.",                     icon: FileText },
    { label: 'Pricing Strategy',   prompt: "Should I change my pricing? Walk me through the analysis.",            icon: Zap },
  ],
  leo: [
    { label: 'NDA Generator',      prompt: "Generate an NDA for a new partnership discussion.",                    icon: FileText },
    { label: 'SAFE Terms',         prompt: "Explain the SAFE terms I should use for my next raise.",               icon: Target },
    { label: 'IP Checklist',       prompt: "Run me through the IP checklist — what do I need to protect?",         icon: CheckCircle },
    { label: 'Cap Table Review',   prompt: "Review my cap table structure — any red flags for investors?",          icon: BarChart2 },
  ],
  harper: [
    { label: 'Hiring Plan',        prompt: "Build a hiring plan for the next 6 months based on my roadmap.",       icon: Users },
    { label: 'Job Description',    prompt: "Write a compelling JD for my first engineering hire.",                  icon: FileText },
    { label: 'Culture Doc',        prompt: "Help me write a culture and values document for candidates.",           icon: Target },
    { label: 'Comp Benchmarks',    prompt: "What should I pay my first 5 hires? Give me market benchmarks.",        icon: BarChart2 },
  ],
  nova: [
    { label: 'PMF Survey',         prompt: "Design a PMF survey for my current user base.",                        icon: Target },
    { label: 'User Interview',     prompt: "Generate 10 discovery interview questions for my ICP.",                icon: MessageCircle },
    { label: 'Feature Prioritize', prompt: "Help me prioritize my product backlog against user pain points.",       icon: Zap },
    { label: 'Retention Analysis', prompt: "Analyze my retention funnel — where are users dropping off?",           icon: BarChart2 },
  ],
  atlas: [
    { label: 'Competitive Matrix', prompt: "Build a competitive matrix against my top 4 rivals.",                  icon: BarChart2 },
    { label: 'Market Sizing',      prompt: "Help me calculate a defensible TAM/SAM/SOM for my pitch.",             icon: Target },
    { label: 'Track Competitors',  prompt: "Set up competitor tracking for my top 3 rivals.",                      icon: TrendingUp },
    { label: 'Blue Ocean',         prompt: "Where is the whitespace in my market that I can own?",                  icon: Zap },
  ],
  sage: [
    { label: 'Strategic Plan',     prompt: "Build a 12-month strategic plan with OKRs.",                           icon: Target },
    { label: 'Fundraise Prep',     prompt: "Help me prepare for my Series A — what do investors want to see?",     icon: TrendingUp },
    { label: 'Moat Analysis',      prompt: "What is my defensible moat and how do I communicate it?",               icon: Zap },
    { label: 'Board Narrative',    prompt: "Draft a board narrative for our next board meeting.",                   icon: FileText },
  ],
};

// ─── per-agent key metrics labels ─────────────────────────────────────────────

const DIMENSION_LABEL: Record<string, string> = {
  market: 'Market Score', product: 'Product Score',
  goToMarket: 'GTM Score', financial: 'Financial Score',
  team: 'Team Score', traction: 'Traction Score',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

const STAGE_ORDER = ['lead', 'qualified', 'proposal', 'negotiating', 'won', 'lost'];
const STAGE_COLOUR: Record<string, string> = {
  lead: '#8A867C', qualified: '#2563EB', proposal: '#D97706',
  negotiating: '#9333EA', won: '#16A34A', lost: '#DC2626',
};

// ─── component ────────────────────────────────────────────────────────────────

export function CXODashboard({ config, agentId, artifacts, dimensionScore, onStartChat }: DashboardProps) {
  const { user }            = useAuth();
  const [deals, setDeals]   = useState<DealRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [crossArtifacts, setCrossArtifacts] = useState<CrossArtifact[]>([]);

  const userId = user?.id;

  // Fetch deals (for pipeline snapshot)
  useEffect(() => {
    if (!userId) return;
    createClient()
      .from('deals')
      .select('id, company, stage, value')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setDeals((data as DealRow[]) ?? []));
  }, [userId]);

  // Fetch recent agent activity
  useEffect(() => {
    if (!userId) return;
    createClient()
      .from('agent_activity')
      .select('id, event_type, agent_id, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setActivity((data as ActivityRow[]) ?? []));
  }, [userId]);

  // Fetch cross-agent artifacts (connected sources)
  useEffect(() => {
    if (!userId || config.connectedSources.length === 0) return;
    const connectedIds = config.connectedSources.map(s => s.agentId);
    createClient()
      .from('agent_artifacts')
      .select('id, agent_id, artifact_type, title, created_at')
      .eq('user_id', userId)
      .in('agent_id', connectedIds)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (!data) return;
        setCrossArtifacts(data.map(row => ({
          agentId:      row.agent_id,
          agentName:    config.connectedSources.find(s => s.agentId === row.agent_id)?.label.split('—')[0]?.trim() ?? row.agent_id,
          artifactType: row.artifact_type,
          title:        row.title,
          createdAt:    row.created_at,
        })));
      });
  }, [userId, config.connectedSources]);

  // Derived stats
  const doneTypes    = new Set(artifacts.map(a => a.artifact_type));
  const doneCount    = config.deliverables.filter(d => doneTypes.has(d.artifactType)).length;
  const totalCount   = config.deliverables.length;
  const earnedPts    = config.deliverables.filter(d => doneTypes.has(d.artifactType)).reduce((s, d) => s + d.dimensionBoost, 0);
  const remainingPts = config.maxScoreContribution - earnedPts;

  const dimPct      = dimensionScore !== null ? dimensionScore / 100 : null;
  const barColour   = dimPct === null ? bdr : dimPct >= 0.7 ? green : dimPct >= 0.5 ? config.colour : amber;
  const dimLabel    = DIMENSION_LABEL[config.primaryDimension] ?? 'Score';

  // Deal pipeline
  const dealsByStage = STAGE_ORDER.reduce<Record<string, DealRow[]>>((acc, s) => {
    acc[s] = deals.filter(d => d.stage === s);
    return acc;
  }, {} as Record<string, DealRow[]>);
  const pipelineDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));

  const quickActions = QUICK_ACTIONS[agentId] ?? QUICK_ACTIONS.patel;

  return (
    <div style={{
      flex: 1, overflowY: 'auto', background: bg,
      fontFamily: 'system-ui, sans-serif', padding: '32px 40px',
      minHeight: '100vh',
    }}>

      {/* ── Page header ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: config.colour,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff',
            }}>
              {config.role[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.2 }}>
                {config.name}
              </h1>
              <p style={{ fontSize: 12, color: muted, margin: 0 }}>{config.role}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onStartChat()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 10,
            background: config.colour, border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
            boxShadow: `0 1px 6px ${config.colour}44`,
          }}
        >
          <MessageCircle style={{ width: 14, height: 14 }} />
          Chat with {config.name.split(' ')[0]}
        </button>
      </div>

      {/* ── Metric cards row ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>

        {/* Dimension score */}
        <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 11, color: muted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            {dimLabel}
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: ink, margin: '0 0 8px', lineHeight: 1 }}>
            {dimensionScore !== null ? dimensionScore : '—'}
            {dimensionScore !== null && <span style={{ fontSize: 13, fontWeight: 400, color: muted }}>/100</span>}
          </p>
          <div style={{ height: 4, background: surf, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: dimPct !== null ? `${dimPct * 100}%` : '0%',
              background: barColour, borderRadius: 999, transition: 'width 0.5s',
            }} />
          </div>
        </div>

        {/* Deliverables */}
        <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 11, color: muted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Deliverables
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: ink, margin: '0 0 4px', lineHeight: 1 }}>
            {doneCount}<span style={{ fontSize: 13, fontWeight: 400, color: muted }}>/{totalCount}</span>
          </p>
          <p style={{ fontSize: 11, color: earnedPts > 0 ? green : muted, margin: 0 }}>
            +{earnedPts} pts earned{remainingPts > 0 ? ` · ${remainingPts} remaining` : ''}
          </p>
        </div>

        {/* Pipeline (if deals exist, else artifacts count) */}
        <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 11, color: muted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Active Deals
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: ink, margin: '0 0 4px', lineHeight: 1 }}>
            {pipelineDeals.length}
          </p>
          <p style={{ fontSize: 11, color: muted, margin: 0 }}>
            {deals.filter(d => d.stage === 'won').length} won · {deals.filter(d => d.stage === 'lost').length} lost
          </p>
        </div>

        {/* Last activity */}
        <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 11, color: muted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Last Active
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: ink, margin: '0 0 4px', lineHeight: 1 }}>
            {artifacts[0] ? timeAgo(artifacts[0].created_at) : '—'}
          </p>
          <p style={{ fontSize: 11, color: muted, margin: 0 }}>
            {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} built
          </p>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Deliverables checklist */}
          <section style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 20px', borderBottom: `1px solid ${bdr}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>Deliverables</h2>
              <span style={{ fontSize: 11, color: muted }}>{doneCount}/{totalCount} complete</span>
            </div>
            <div>
              {config.deliverables.map(d => {
                const done = doneTypes.has(d.artifactType);
                const artifact = artifacts.find(a => a.artifact_type === d.artifactType);
                return (
                  <div
                    key={d.artifactType}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '11px 20px', gap: 12,
                      borderBottom: `1px solid ${bdr}`,
                      background: done ? `${green}06` : 'transparent',
                    }}
                  >
                    {done
                      ? <CheckCircle style={{ width: 16, height: 16, color: green, flexShrink: 0 }} />
                      : <Circle      style={{ width: 16, height: 16, color: bdr,   flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: done ? ink : muted, margin: 0 }}>
                        {d.label}
                      </p>
                      {artifact && (
                        <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>
                          {timeAgo(artifact.created_at)}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: done ? green : config.colour,
                      padding: '2px 7px', borderRadius: 6,
                      background: done ? `${green}12` : `${config.colour}12`,
                    }}>
                      +{d.dimensionBoost}
                    </span>
                    <Link
                      href={
                        done && artifact
                          ? `/founder/cxo/${agentId}?artifact=${artifact.id}`
                          : `/founder/cxo/${agentId}?prompt=${encodeURIComponent(`Let's create a ${d.label}.`)}`
                      }
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, color: done ? muted : config.colour,
                        textDecoration: 'none', fontWeight: 500,
                      }}
                      onClick={() => { if (!done) onStartChat(`Let's create a ${d.label}.`); }}
                    >
                      {done ? 'View' : 'Build'}
                      <ArrowRight style={{ width: 11, height: 11 }} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pipeline snapshot (deals) */}
          {deals.length > 0 && (
            <section style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{
                padding: '14px 20px', borderBottom: `1px solid ${bdr}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>Pipeline Snapshot</h2>
                <span style={{ fontSize: 11, color: muted }}>{deals.length} total deals</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STAGE_ORDER.filter(s => dealsByStage[s]?.length > 0).map(stage => (
                    <div
                      key={stage}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '10px 14px', borderRadius: 10,
                        background: `${STAGE_COLOUR[stage]}12`,
                        border: `1px solid ${STAGE_COLOUR[stage]}30`,
                        minWidth: 72,
                      }}
                    >
                      <span style={{ fontSize: 18, fontWeight: 700, color: STAGE_COLOUR[stage], lineHeight: 1 }}>
                        {dealsByStage[stage]?.length ?? 0}
                      </span>
                      <span style={{ fontSize: 10, color: muted, marginTop: 3, textTransform: 'capitalize' }}>
                        {stage}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Recent deals */}
                <div style={{ marginTop: 14 }}>
                  {deals.slice(0, 4).map(deal => (
                    <div key={deal.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0', borderBottom: `1px solid ${bdr}`,
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: STAGE_COLOUR[deal.stage] ?? muted,
                      }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: ink }}>{deal.company}</span>
                      {deal.value && (
                        <span style={{ fontSize: 11, color: muted }}>{deal.value}</span>
                      )}
                      <span style={{
                        fontSize: 10, color: STAGE_COLOUR[deal.stage] ?? muted,
                        textTransform: 'capitalize', fontWeight: 500,
                      }}>
                        {deal.stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Cross-agent intelligence */}
          {crossArtifacts.length > 0 && (
            <section style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bdr}` }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>Cross-Agent Intelligence</h2>
                <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>
                  Context from your other advisors that {config.name.split(' ')[0]} can use
                </p>
              </div>
              <div>
                {crossArtifacts.map((ca, i) => {
                  const src = config.connectedSources.find(s => s.agentId === ca.agentId);
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 20px', borderBottom: i < crossArtifacts.length - 1 ? `1px solid ${bdr}` : 'none',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: surf, border: `1px solid ${bdr}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: muted,
                      }}>
                        {ca.agentName[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: ink, margin: 0 }}>
                          {ca.title || ca.artifactType.replace(/_/g, ' ')}
                        </p>
                        <p style={{ fontSize: 11, color: muted, margin: '1px 0 0' }}>
                          {ca.agentName} · {timeAgo(ca.createdAt)}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5,
                        background: src?.relevance === 'high' ? `${config.colour}15` : surf,
                        color: src?.relevance === 'high' ? config.colour : muted,
                        border: `1px solid ${src?.relevance === 'high' ? config.colour + '30' : bdr}`,
                      }}>
                        {src?.relevance ?? 'context'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Quick actions */}
          <section style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${bdr}` }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>Quick Actions</h2>
              <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>Start a focused session</p>
            </div>
            <div style={{ padding: '10px 10px' }}>
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onStartChat(action.prompt)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 9,
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
                      textAlign: 'left', marginBottom: 2,
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = surf)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: `${config.colour}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon style={{ width: 14, height: 14, color: config.colour }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: ink }}>{action.label}</span>
                    <ArrowRight style={{ width: 12, height: 12, color: muted, marginLeft: 'auto' }} />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent activity */}
          {activity.length > 0 && (
            <section style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${bdr}` }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>Recent Activity</h2>
              </div>
              <div style={{ padding: '4px 0' }}>
                {activity.map((ev, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '9px 18px',
                    borderBottom: i < activity.length - 1 ? `1px solid ${bdr}` : 'none',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: config.colour, marginTop: 5,
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: ink, margin: 0, lineHeight: 1.4 }}>
                        {(ev.metadata as Record<string, unknown> | null)?.artifact_type
                          ? `Generated ${String((ev.metadata as Record<string, unknown>).artifact_type).replace(/_/g, ' ')}`
                          : ev.event_type.replace(/_/g, ' ')}
                      </p>
                      <p style={{ fontSize: 10, color: muted, margin: '2px 0 0' }}>
                        {timeAgo(ev.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Resources */}
          {config.resources.length > 0 && (
            <section style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${bdr}` }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>Learning Resources</h2>
              </div>
              <div style={{ padding: '4px 0' }}>
                {config.resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 18px', textDecoration: 'none',
                      borderBottom: i < config.resources.length - 1 ? `1px solid ${bdr}` : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = surf)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: ink, margin: 0 }}>{r.title}</p>
                      <p style={{ fontSize: 11, color: muted, margin: '1px 0 0' }}>{r.source}</p>
                    </div>
                    <ExternalLink style={{ width: 12, height: 12, color: muted, flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
