'use client';

import { useState } from 'react';

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';
const blue  = '#2563EB';
const green = '#16A34A';
const amber = '#D97706';
const red   = '#DC2626';

interface PitchAnalysis {
  overallScore: number;
  clarity: number;
  market: number;
  traction: number;
  team: number;
  financials: number;
  strengths: string[];
  improvements: string[];
  missingElements: string[];
  redFlags: string[];
  investorPerspective: string;
  summary: string;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = (score / 10) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 700, color }}>{score}<span style={{ fontSize: 11, color: muted }}>/10</span></p>
      </div>
      <div style={{ height: 6, background: bdr, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function scoreColor(n: number) {
  if (n >= 8) return green;
  if (n >= 6) return amber;
  return red;
}

export default function PitchAnalyzer() {
  const [pitchText,    setPitchText]    = useState('');
  const [analysis,     setAnalysis]     = useState<PitchAnalysis | null>(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [charLimitMsg, setCharLimitMsg] = useState(false);

  async function handleAnalyze() {
    if (pitchText.trim().length < 100 || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch('/api/analyze-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitchText: pitchText.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Analysis failed');
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  const DIMENSIONS = [
    { key: 'clarity',    label: 'Clarity & Structure' },
    { key: 'market',     label: 'Market Opportunity'  },
    { key: 'traction',   label: 'Traction & Validation' },
    { key: 'team',       label: 'Team Strength'       },
    { key: 'financials', label: 'Financial Model'     },
  ] as const;

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted, marginBottom: 6 }}>Pitch Analyzer</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: ink, marginBottom: 8 }}>AI Pitch Feedback</h1>
          <p style={{ fontSize: 14, color: muted, lineHeight: 1.6 }}>Paste your elevator pitch or startup description. Get honest, investor-grade feedback across 5 dimensions in seconds.</p>
        </div>

        {/* ── Input card ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${bdr}`, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Your Pitch</p>
            <p style={{ fontSize: 11, color: pitchText.length < 100 ? red : muted }}>
              {pitchText.length} chars {pitchText.length < 100 ? `(min 100)` : ''}
            </p>
          </div>
          <textarea
            value={pitchText}
            onChange={e => { setPitchText(e.target.value); setCharLimitMsg(false); }}
            placeholder="We're building [product] for [target customer] who struggle with [problem]. Unlike [alternatives], we [key differentiator]. We've already [traction/validation]. Our market is [TAM] and we're raising [amount] to [milestones]..."
            rows={8}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          {charLimitMsg && <p style={{ fontSize: 12, color: red, marginTop: 6 }}>Please enter at least 100 characters for a meaningful analysis.</p>}
          {error && <p style={{ fontSize: 12, color: red, marginTop: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <button
              onClick={() => {
                if (pitchText.trim().length < 100) { setCharLimitMsg(true); return; }
                handleAnalyze();
              }}
              disabled={analyzing}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: analyzing ? bdr : ink, color: analyzing ? muted : '#F9F7F2', fontSize: 13, fontWeight: 700, cursor: analyzing ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
            >
              {analyzing ? 'Analyzing…' : 'Analyze Pitch'}
            </button>
            {analysis && (
              <button onClick={() => { setAnalysis(null); setPitchText(''); setError(null); }} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${bdr}`, background: 'transparent', color: muted, fontSize: 13, cursor: 'pointer' }}>
                Clear
              </button>
            )}
            <p style={{ fontSize: 11, color: muted, marginLeft: 'auto' }}>Powered by Claude 3.5 Haiku</p>
          </div>
        </div>

        {/* ── Analyzing state ── */}
        {analyzing && (
          <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${bdr}`, padding: 36, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: ink, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontSize: 22 }}>🧠</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 6 }}>Analyzing your pitch…</p>
            <p style={{ fontSize: 12, color: muted }}>Evaluating clarity, market, traction, team, and financials</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              {['Processing content', 'Scoring dimensions', 'Generating feedback'].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 99, background: blue, animation: `pulse ${0.8 + i * 0.2}s infinite` }} />
                  <p style={{ fontSize: 11, color: muted }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {analysis && !analyzing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Overall score hero */}
            <div style={{ background: ink, borderRadius: 14, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <p style={{ fontSize: 52, fontWeight: 800, color: '#F9F7F2', lineHeight: 1 }}>{analysis.overallScore}</p>
                <p style={{ fontSize: 11, color: 'rgba(249,247,242,0.5)', marginTop: 4 }}>out of 10</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(249,247,242,0.5)', marginBottom: 6 }}>Investor Perspective</p>
                <p style={{ fontSize: 14, color: '#F9F7F2', lineHeight: 1.6 }}>{analysis.investorPerspective}</p>
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${bdr}`, padding: '20px 24px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: muted, marginBottom: 8 }}>AI Analysis Summary</p>
              <p style={{ fontSize: 14, color: ink, lineHeight: 1.7 }}>{analysis.summary}</p>
            </div>

            {/* Dimension scores */}
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${bdr}`, padding: '20px 24px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: muted, marginBottom: 16 }}>Dimension Scores</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0 32px' }}>
                {DIMENSIONS.map(d => (
                  <ScoreBar key={d.key} label={d.label} score={analysis[d.key]} color={scoreColor(analysis[d.key])} />
                ))}
              </div>
            </div>

            {/* Strengths + Improvements grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1px solid #BBF7D0', padding: '18px 20px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: green, marginBottom: 12 }}>Strengths</p>
                {analysis.strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: green, flexShrink: 0 }}>✓</span>
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{s}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#FFFBEB', borderRadius: 14, border: '1px solid #FDE68A', padding: '18px 20px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: amber, marginBottom: 12 }}>Improvements</p>
                {analysis.improvements.map((imp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: amber, flexShrink: 0 }}>→</span>
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{imp}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing elements + Red flags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {analysis.missingElements && analysis.missingElements.length > 0 && (
                <div style={{ background: '#EFF6FF', borderRadius: 14, border: '1px solid #BFDBFE', padding: '18px 20px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: blue, marginBottom: 12 }}>Missing Elements</p>
                  {analysis.missingElements.map((el, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: blue, flexShrink: 0 }}>?</span>
                      <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{el}</p>
                    </div>
                  ))}
                </div>
              )}
              {analysis.redFlags && analysis.redFlags.length > 0 && (
                <div style={{ background: '#FEF2F2', borderRadius: 14, border: '1px solid #FECACA', padding: '18px 20px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: red, marginBottom: 12 }}>Red Flags</p>
                  {analysis.redFlags.map((flag, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: red, flexShrink: 0 }}>⚠</span>
                      <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{flag}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setAnalysis(null); setPitchText(''); setError(null); }}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${bdr}`, background: 'transparent', color: ink, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Analyze Another Pitch
              </button>
              <button
                onClick={() => {
                  const text = `Pitch Analysis\n\nOverall Score: ${analysis.overallScore}/10\n\n${DIMENSIONS.map(d => `${d.label}: ${analysis[d.key]}/10`).join('\n')}\n\nSummary: ${analysis.summary}\n\nStrengths:\n${analysis.strengths.map(s => `• ${s}`).join('\n')}\n\nImprovements:\n${analysis.improvements.map(i => `• ${i}`).join('\n')}`;
                  navigator.clipboard.writeText(text).catch(() => {});
                }}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: ink, color: '#F9F7F2', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Copy Results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
