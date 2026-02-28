'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, FileText, Play, Lightbulb, RefreshCw, BarChart3, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';
const blue  = '#2563EB';
const green = '#16A34A';
const amber = '#D97706';
const red   = '#DC2626';

type TabId = 'analysis' | 'materials' | 'practice' | 'recommendations';

interface QScoreData {
  overallScore: number;
  teamScore: number;
  marketScore: number;
  tractionScore: number;
  gtmScore: number;
  productScore: number;
  startupName: string;
}

const PRACTICE_QUESTIONS_BY_DIM: Record<string, { question: string; difficulty: 'easy' | 'medium' | 'hard' }[]> = {
  market: [
    { question: 'How do you plan to compete with established players in this space?', difficulty: 'hard' },
    { question: 'What is your total addressable market and how did you size it?', difficulty: 'medium' },
    { question: 'Why is now the right time for this market?', difficulty: 'medium' },
  ],
  traction: [
    { question: 'What metrics prove that customers will pay for this solution?', difficulty: 'hard' },
    { question: 'What is your current revenue run rate and month-over-month growth?', difficulty: 'medium' },
    { question: 'How did you acquire your first 10 customers?', difficulty: 'easy' },
  ],
  team: [
    { question: 'Why is your team uniquely positioned to win this market?', difficulty: 'easy' },
    { question: 'What do you do better than anyone else on the planet?', difficulty: 'medium' },
    { question: 'How will you attract top talent with limited capital?', difficulty: 'hard' },
  ],
  gtm: [
    { question: 'Walk me through your go-to-market motion step by step.', difficulty: 'medium' },
    { question: 'What is your customer acquisition cost and payback period?', difficulty: 'hard' },
    { question: 'What channel drives your most efficient growth?', difficulty: 'medium' },
  ],
  product: [
    { question: 'What is your core defensible insight that competitors cannot copy?', difficulty: 'hard' },
    { question: 'Describe your product roadmap for the next 18 months.', difficulty: 'medium' },
    { question: 'How do you know users actually want this feature?', difficulty: 'easy' },
  ],
};

const DIMENSION_LABELS: Record<string, string> = {
  market: 'Market', traction: 'Traction', team: 'Team', gtm: 'GTM', product: 'Product',
};

const DIMENSION_COLORS: Record<string, string> = {
  market: blue, traction: green, team: '#7C3AED', gtm: amber, product: '#0891B2',
};

const MATERIALS = [
  { id: 'pitch-deck',   icon: FileText,  label: 'Pitch Deck',       sub: '10-slide AI deck',       href: '/founder/pitch-deck',            color: '#7C3AED' },
  { id: 'financial',    icon: BarChart3, label: 'Financial Model',   sub: 'Felix AI financials',    href: '/founder/agents/felix',          color: green },
  { id: 'gtm-playbook', icon: Lightbulb, label: 'GTM Playbook',      sub: 'Patel AI strategy',      href: '/founder/agents/patel',          color: blue },
];

export default function AIEnhancementStation() {
  const router = useRouter();
  const [activeTab,  setActiveTab]  = useState<TabId>('analysis');
  const [loading,    setLoading]    = useState(true);
  const [qScore,     setQScore]     = useState<QScoreData | null>(null);
  const [practiceQ,  setPracticeQ]  = useState<{ category: string; question: string; difficulty: 'easy' | 'medium' | 'hard' }[]>([]);
  const [activeQ,    setActiveQ]    = useState<number | null>(null);
  const [answer,     setAnswer]     = useState('');
  const [gettingFeedback, setGettingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<{
    rating: string; score: number; headline: string;
    strengths: string[]; gaps: string[];
    suggestion: string; rewrittenOpener?: string;
  } | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Fetch latest Q-Score row
        const { data: qs } = await supabase
          .from('qscore_history')
          .select('overall_score, team_score, market_score, traction_score, gtm_score, product_score')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Fetch startup name
        const { data: fp } = await supabase
          .from('founder_profiles')
          .select('startup_name')
          .eq('user_id', user.id)
          .single();

        if (qs) {
          const data: QScoreData = {
            overallScore: qs.overall_score ?? 0,
            teamScore:    qs.team_score    ?? 0,
            marketScore:  qs.market_score  ?? 0,
            tractionScore: qs.traction_score ?? 0,
            gtmScore:     qs.gtm_score     ?? 0,
            productScore: qs.product_score ?? 0,
            startupName:  fp?.startup_name || 'Your Startup',
          };
          setQScore(data);

          // Build practice questions from the 2 lowest-scoring dimensions
          const dims = [
            { key: 'market',   score: data.marketScore },
            { key: 'traction', score: data.tractionScore },
            { key: 'team',     score: data.teamScore },
            { key: 'gtm',      score: data.gtmScore },
            { key: 'product',  score: data.productScore },
          ].sort((a, b) => a.score - b.score);

          const questions = [
            ...((PRACTICE_QUESTIONS_BY_DIM[dims[0].key] ?? []).slice(0, 2).map(q => ({ ...q, category: DIMENSION_LABELS[dims[0].key] }))),
            ...((PRACTICE_QUESTIONS_BY_DIM[dims[1].key] ?? []).slice(0, 1).map(q => ({ ...q, category: DIMENSION_LABELS[dims[1].key] }))),
          ];
          setPracticeQ(questions);
        }
      } catch {
        // silently fail — show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const dims = qScore ? [
    { key: 'market',   label: 'Market',   score: qScore.marketScore },
    { key: 'traction', label: 'Traction', score: qScore.tractionScore },
    { key: 'team',     label: 'Team',     score: qScore.teamScore },
    { key: 'gtm',      label: 'GTM',      score: qScore.gtmScore },
    { key: 'product',  label: 'Product',  score: qScore.productScore },
  ] : [];

  const strengths       = dims.filter(d => d.score >= 60).sort((a, b) => b.score - a.score);
  const improvements    = dims.filter(d => d.score < 60).sort((a, b) => a.score - b.score);
  const recommendations = improvements.map(d => ({
    dim:  d.label,
    text: d.key === 'market'   ? `Deepen market sizing with bottom-up TAM analysis and customer segmentation data` :
          d.key === 'traction' ? `Add quantified traction metrics — MRR, growth rate, NPS, or pilot results` :
          d.key === 'team'     ? `Highlight team credentials, domain expertise, and any relevant exits or builds` :
          d.key === 'gtm'      ? `Document CAC, payback period, and primary acquisition channel with real numbers` :
                                 `Articulate product defensibility — moat, switching costs, or proprietary data`,
    impact: Math.max(5, Math.round((70 - d.score) / 3)),
  }));

  async function handleGetFeedback(question: string, category: string) {
    if (!answer.trim() || gettingFeedback) return;
    const answerAtRequest = answer;
    setGettingFeedback(true); setFeedback(null); setFeedbackError(null);
    try {
      const dimScore = qScore ? {
        'Market': qScore.marketScore, 'Traction': qScore.tractionScore,
        'Team': qScore.teamScore, 'GTM': qScore.gtmScore, 'Product': qScore.productScore,
      }[category] : undefined;
      const res = await fetch('/api/ai-enhancement/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, category, answer: answerAtRequest, dimensionScore: dimScore }),
      });
      const data = await res.json();
      if (res.ok) setFeedback(data);
      else setFeedbackError(data.error ?? 'Feedback failed');
    } catch { setFeedbackError('Network error'); }
    finally { setGettingFeedback(false); }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: ink, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Brain style={{ height: 24, width: 24, color: bg }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 6 }}>Loading your AI analysis…</p>
          <p style={{ fontSize: 12, color: muted }}>Analysing your Q-Score across 5 dimensions</p>
          <RefreshCw style={{ height: 16, width: 16, color: muted, margin: '16px auto 0', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '36px 28px 72px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── header ── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted, marginBottom: 6 }}>
            AI Enhancement Station
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: ink, marginBottom: 6 }}>
            {qScore ? `${qScore.startupName} — AI Analysis` : 'AI Enhancement Station'}
          </h1>
          <p style={{ fontSize: 14, color: muted }}>
            Deep analysis across 5 dimensions · Practice mode · Curated resources
          </p>
        </div>

        {/* ── Q-Score hero ── */}
        {qScore ? (
          <div style={{ background: ink, borderRadius: 18, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(249,247,242,0.5)', marginBottom: 4 }}>Q-Score</p>
              <p style={{ fontSize: 56, fontWeight: 900, color: '#F9F7F2', lineHeight: 1 }}>{qScore.overallScore}</p>
              <p style={{ fontSize: 11, color: 'rgba(249,247,242,0.4)', marginTop: 4 }}>out of 100</p>
            </div>
            <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {dims.map(d => (
                  <div key={d.key} style={{ textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${DIMENSION_COLORS[d.key]}22`, border: `1px solid ${DIMENSION_COLORS[d.key]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: DIMENSION_COLORS[d.key] }}>{d.score}</p>
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(249,247,242,0.5)', fontWeight: 500 }}>{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: surf, borderRadius: 18, padding: '24px 28px', marginBottom: 24, border: `1px solid ${bdr}`, textAlign: 'center' }}>
            <Brain style={{ height: 32, width: 32, color: muted, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 6 }}>No Q-Score yet</p>
            <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>Complete your assessment to unlock AI analysis</p>
            <button
              onClick={() => router.push('/founder/assessment')}
              style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: ink, color: bg, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Start Assessment
            </button>
          </div>
        )}

        {/* ── Tab nav ── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${bdr}`, marginBottom: 24 }}>
          {([
            { id: 'analysis' as TabId,        label: 'AI Analysis',          icon: Brain },
            { id: 'materials' as TabId,        label: 'Materials',            icon: FileText },
            { id: 'practice' as TabId,         label: 'Practice Mode',        icon: Play },
            { id: 'recommendations' as TabId,  label: 'Recommendations',      icon: Lightbulb },
          ]).map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? ink : muted,
                  background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${ink}` : '2px solid transparent',
                  marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <Icon style={{ height: 13, width: 13 }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── AI Analysis tab ── */}
        {activeTab === 'analysis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Dimension bars */}
            {qScore && (
              <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${bdr}`, padding: '20px 24px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: muted, marginBottom: 16 }}>Score Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {dims.map(d => (
                    <div key={d.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{d.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: DIMENSION_COLORS[d.key] }}>
                          {d.score}<span style={{ fontSize: 11, color: muted }}>/100</span>
                        </p>
                      </div>
                      <div style={{ height: 6, background: bdr, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d.score}%`, background: DIMENSION_COLORS[d.key], borderRadius: 99, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths + Areas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1px solid #BBF7D0', padding: '18px 20px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: green, marginBottom: 12 }}>Strong Dimensions</p>
                {strengths.length > 0 ? strengths.map(d => (
                  <div key={d.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <CheckCircle style={{ height: 13, width: 13, color: green, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: ink }}>{d.label} — <strong>{d.score}</strong>/100</p>
                  </div>
                )) : (
                  <p style={{ fontSize: 13, color: muted }}>Complete your assessment to see strengths</p>
                )}
              </div>
              <div style={{ background: '#FFFBEB', borderRadius: 14, border: '1px solid #FDE68A', padding: '18px 20px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: amber, marginBottom: 12 }}>Areas to Improve</p>
                {improvements.length > 0 ? improvements.map(d => (
                  <div key={d.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <AlertCircle style={{ height: 13, width: 13, color: amber, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: ink }}>{d.label} — <strong>{d.score}</strong>/100</p>
                  </div>
                )) : (
                  qScore ? <p style={{ fontSize: 13, color: green, fontWeight: 600 }}>All dimensions scoring well!</p>
                         : <p style={{ fontSize: 13, color: muted }}>Complete your assessment to see areas to improve</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Materials tab ── */}
        {activeTab === 'materials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: muted, marginBottom: 4 }}>
              Access AI-generated materials built by your agent advisors. Each links to the live agent so you can generate and refine.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {MATERIALS.map(m => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.id}
                    onClick={() => router.push(m.href)}
                    style={{
                      background: '#fff', borderRadius: 14, border: `1px solid ${bdr}`,
                      padding: '20px 22px', cursor: 'pointer', transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${m.color}15`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                      <Icon style={{ height: 18, width: 18, color: m.color }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 4 }}>{m.label}</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 16 }}>{m.sub}</p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: m.color }}>
                      Open agent <ArrowRight style={{ height: 12, width: 12 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quality strip */}
            <div style={{ background: surf, borderRadius: 14, border: `1px solid ${bdr}`, padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 4 }}>
              {[
                { icon: CheckCircle, color: green, label: 'VC-Grade Content', sub: 'Prompts tuned by real YC partners' },
                { icon: Brain,       color: blue,  label: 'AI-Enhanced',      sub: 'Claude 3.5 Haiku under the hood' },
                { icon: BarChart3,   color: amber, label: 'Data-Driven',      sub: 'Scores inform every artifact' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <Icon style={{ height: 16, width: 16, color: item.color }} />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: muted }}>{item.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Practice Mode tab ── */}
        {activeTab === 'practice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${bdr}`, padding: '20px 24px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: muted, marginBottom: 4 }}>Mock Investor Q&A</p>
              <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
                Questions are generated from your {improvements.length > 0 ? `lowest-scoring dimensions (${improvements.map(d => d.label).join(', ')})` : 'profile'} — the areas investors will probe hardest.
              </p>

              {(practiceQ.length > 0 ? practiceQ : [
                { category: 'Market',   question: 'What is your total addressable market and how did you size it?',            difficulty: 'medium' as const },
                { category: 'Traction', question: 'What metrics prove that customers will pay for this solution?',              difficulty: 'hard'   as const },
                { category: 'Team',     question: 'Why is your team uniquely positioned to succeed in this space?',             difficulty: 'easy'   as const },
              ]).map((q, i) => {
                const diffColor = q.difficulty === 'easy' ? green : q.difficulty === 'medium' ? amber : red;
                const isOpen    = activeQ === i;
                return (
                  <div key={i} style={{ border: `1px solid ${bdr}`, borderRadius: 12, padding: '16px 18px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: isOpen ? 14 : 0 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${blue}15`, color: blue }}>{q.category}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${diffColor}15`, color: diffColor, textTransform: 'capitalize' }}>{q.difficulty}</span>
                        </div>
                        <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{q.question}</p>
                      </div>
                      <button
                        onClick={() => { setActiveQ(isOpen ? null : i); setAnswer(''); setFeedback(null); setFeedbackError(null); }}
                        style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${bdr}`, background: 'transparent', color: ink, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {isOpen ? 'Close' : 'Practice'}
                      </button>
                    </div>
                    {isOpen && (
                      <div>
                        <textarea
                          value={answer}
                          onChange={e => { setAnswer(e.target.value); setFeedback(null); }}
                          placeholder="Type your answer here — practice responding concisely in under 90 seconds…"
                          rows={5}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          <p style={{ fontSize: 11, color: muted }}>
                            {answer.trim().split(/\s+/).filter(Boolean).length} words · ~{Math.ceil(answer.trim().split(/\s+/).filter(Boolean).length / 140)}min spoken
                          </p>
                          <button
                            onClick={() => handleGetFeedback(q.question, q.category)}
                            disabled={!answer.trim() || gettingFeedback}
                            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: !answer.trim() ? bdr : blue, color: !answer.trim() ? muted : '#fff', fontSize: 12, fontWeight: 600, cursor: !answer.trim() ? 'not-allowed' : 'pointer', opacity: gettingFeedback ? 0.7 : 1 }}
                          >
                            {gettingFeedback ? 'Analysing…' : 'Get AI Feedback'}
                          </button>
                        </div>
                        {feedbackError && <p style={{ fontSize: 12, color: red, marginTop: 8 }}>{feedbackError}</p>}

                        {feedback && (
                          <div style={{ marginTop: 16, border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden' }}>
                            {/* Rating header */}
                            <div style={{
                              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                              background: feedback.rating === 'strong' ? '#F0FDF4' : feedback.rating === 'good' ? '#EFF6FF' : '#FFFBEB',
                              borderBottom: `1px solid ${bdr}`,
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                                    padding: '2px 8px', borderRadius: 999,
                                    background: feedback.rating === 'strong' ? '#16A34A' : feedback.rating === 'good' ? '#2563EB' : feedback.rating === 'weak' ? '#DC2626' : '#D97706',
                                    color: '#fff',
                                  }}>{feedback.rating} · {feedback.score}/10</span>
                                </div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{feedback.headline}</p>
                              </div>
                            </div>
                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {/* Strengths */}
                              {feedback.strengths.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>What Worked</p>
                                  {feedback.strengths.map((s, si) => (
                                    <div key={si} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                                      <span style={{ color: green, fontSize: 13, flexShrink: 0 }}>✓</span>
                                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{s}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Gaps */}
                              {feedback.gaps.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>What Was Missing</p>
                                  {feedback.gaps.map((g, gi) => (
                                    <div key={gi} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                                      <span style={{ color: red, fontSize: 13, flexShrink: 0 }}>✗</span>
                                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{g}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Suggestion */}
                              <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px' }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Do This Instead</p>
                                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{feedback.suggestion}</p>
                              </div>
                              {/* Rewritten opener */}
                              {feedback.rewrittenOpener && (
                                <div style={{ background: surf, borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${blue}` }}>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Strong Opening Example</p>
                                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>&quot;{feedback.rewrittenOpener}&quot;</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recommendations tab ── */}
        {activeTab === 'recommendations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recommendations.length > 0 ? recommendations.map((r, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${bdr}`, padding: '18px 22px', display: 'flex', gap: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${blue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: blue }}>{i + 1}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.6, marginBottom: 10 }}>{r.text}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${blue}15`, color: blue }}>{r.dim}</span>
                    <span style={{ fontSize: 11, color: muted }}>Priority: {i === 0 ? 'High' : 'Medium'}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: green }}>+{r.impact} Q points</span>
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ background: surf, borderRadius: 14, border: `1px solid ${bdr}`, padding: '28px', textAlign: 'center' }}>
                <CheckCircle style={{ height: 28, width: 28, color: green, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 6 }}>All dimensions scoring well</p>
                <p style={{ fontSize: 13, color: muted }}>
                  {qScore ? 'Focus on adding evidence to your score to maintain investor confidence.'
                           : 'Complete your assessment to get personalized recommendations.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── CTA strip ── */}
        <div style={{ background: surf, borderRadius: 14, border: `1px solid ${bdr}`, padding: '20px 24px', marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 4 }}>Ready to improve your score?</p>
            <p style={{ fontSize: 12, color: muted }}>Work with your AI agents or take the detailed assessment</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => router.push('/founder/improve-qscore')}
              style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${bdr}`, background: 'transparent', color: ink, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Improve Q-Score
            </button>
            <button
              onClick={() => router.push('/founder/dashboard')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: 'none', background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Dashboard <ArrowRight style={{ height: 13, width: 13 }} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
