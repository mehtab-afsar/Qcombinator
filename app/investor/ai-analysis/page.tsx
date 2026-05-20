'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, TrendingUp, Users, BarChart3, RefreshCw, MessageSquare, X, Activity } from 'lucide-react'
import Link from 'next/link'
import { bg, surf, bdr, ink, muted, blue, green, amber } from '@/lib/constants/colors'

// ─── types ────────────────────────────────────────────────────────────────────
interface Insight {
  id: string
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  category: string
}

interface PortfolioStats {
  totalFounders: number
  avgQScore: number
  highQCount: number
  acceptedConnections: number
  pendingConnections: number
  uniqueSectors: number
}

interface TopFounder {
  id: string
  name: string
  founder: string
  sector: string
  stage: string
  qScore: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const INSIGHT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  opportunity:    { bg: '#ECFDF5', text: '#166534', dot: green },
  risk:           { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
  trend:          { bg: '#EFF6FF', text: '#1D4ED8', dot: blue },
  recommendation: { bg: '#F5F3FF', text: '#5B21B6', dot: '#8B5CF6' },
}

const IMPACT_LABEL: Record<string, string> = { high: 'High', medium: 'Med', low: 'Low' }

const SUGGESTED_PROMPTS = [
  'Who are my top deal opportunities right now?',
  'Which sectors have the most activity in my pipeline?',
  'Which founders should I prioritize outreach to this week?',
  'What is the average Q-Score across my deal flow?',
]

// ─── component ────────────────────────────────────────────────────────────────
export default function AIAnalysisPage() {
  const [stats,     setStats]     = useState<PortfolioStats | null>(null)
  const [insights,  setInsights]  = useState<Insight[]>([])
  const [topFounders, setTopFounders] = useState<TopFounder[]>([])
  const [loading,   setLoading]   = useState(true)

  // Chat state
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [typing,    setTyping]    = useState(false)
  const history = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Outreach modal state
  const [outreachFounder, setOutreachFounder] = useState<{ id: string; name: string } | null>(null)
  const [outreachMsg,     setOutreachMsg]     = useState('')
  const [outreachSending, setOutreachSending] = useState(false)
  const [outreachDone,    setOutreachDone]    = useState(false)

  // Load portfolio analytics
  useEffect(() => {
    fetch('/api/investor/ai-analysis')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setStats(d.stats)
        setInsights(d.insights ?? [])
        setTopFounders(d.topFounders ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || typing) return

    setInput('')
    setTyping(true)
    setMessages(prev => [...prev, { role: 'user', content: msg }])

    // Optimistically add a streaming assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const res = await fetch('/api/investor/ai-analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: history.current }),
      })

      if (!res.body) throw new Error('no body')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (!payload || payload === '[DONE]') continue
          try {
            const evt = JSON.parse(payload)
            if (evt.type === 'delta') {
              full += evt.text as string
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: full } : m))
            }
          } catch { /* skip malformed */ }
        }
      }

      // Finalise streaming flag
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
      history.current = [...history.current, { role: 'user', content: msg }, { role: 'assistant', content: full }]
    } catch {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: 'Something went wrong. Try again.', streaming: false } : m))
    } finally {
      setTyping(false)
    }
  }, [input, typing])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  async function handleSendOutreach() {
    if (!outreachFounder || !outreachMsg.trim() || outreachSending) return
    setOutreachSending(true)
    try {
      const res = await fetch('/api/investor/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: outreachFounder.id, message: outreachMsg.trim() }),
      })
      if (res.ok) setOutreachDone(true)
    } finally { setOutreachSending(false) }
  }

  const STAT_CARDS = stats ? [
    { icon: Users,      label: 'Total Companies',    value: stats.totalFounders,  color: blue },
    { icon: BarChart3,  label: 'Avg Q-Score',        value: stats.avgQScore,      color: green },
    { icon: TrendingUp, label: 'High Q-Score (70+)', value: stats.highQCount,     color: amber },
    { icon: Activity,   label: 'Sectors Covered',    value: stats.uniqueSectors,  color: '#8B5CF6' },
  ] : []

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, display: 'flex', flexDirection: 'column' }}>

      {/* ── header ─────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${bdr}`, padding: '20px 32px', background: bg }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ height: 36, width: 36, borderRadius: 10, background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={16} color="#7C3AED" />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: ink, lineHeight: 1.1 }}>Portfolio Intelligence</h1>
              <p style={{ fontSize: 12, color: muted, marginTop: 1 }}>AI-powered deal flow analysis</p>
            </div>
          </div>

          {/* stat chips */}
          {stats && (
            <div style={{ display: 'flex', gap: 6 }}>
              {STAT_CARDS.map(({ icon: Icon, label, value, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10, fontSize: 12 }}>
                  <Icon size={12} color={color} />
                  <span style={{ fontWeight: 600, color: ink }}>{value}</span>
                  <span style={{ color: muted }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── body ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%', padding: '24px 32px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: insights + top founders ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Insights */}
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>Live Insights</span>
              <button
                onClick={() => { setLoading(true); fetch('/api/investor/ai-analysis').then(r => r.json()).then(d => { setInsights(d.insights ?? []); setTopFounders(d.topFounders ?? []); setStats(d.stats) }).finally(() => setLoading(false)) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, borderRadius: 6 }}
              >
                <RefreshCw size={11} />
              </button>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                <div style={{ padding: 16, textAlign: 'center' }}><Loader2 size={16} color={muted} style={{ animation: 'spin 1s linear infinite' }} /></div>
              ) : insights.length === 0 ? (
                <p style={{ fontSize: 12, color: muted, padding: '8px 0', textAlign: 'center' }}>No insights yet — add founders to your deal flow.</p>
              ) : insights.map(ins => {
                const c = INSIGHT_COLORS[ins.type] ?? INSIGHT_COLORS.trend
                return (
                  <div key={ins.id} style={{ padding: '11px 13px', background: c.bg, borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 12, fontWeight: 600, color: c.text, lineHeight: 1.3 }}>{ins.title}</p>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: c.text, flexShrink: 0, fontWeight: 500 }}>{IMPACT_LABEL[ins.impact]}</span>
                    </div>
                    <p style={{ fontSize: 11, color: c.text, lineHeight: 1.5, opacity: 0.85, paddingLeft: 12 }}>{ins.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Founders */}
          {topFounders.length > 0 && (
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${bdr}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>Top Q-Score</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {topFounders.map((f, i) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px 10px 18px', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = bg}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <Link href={`/investor/startup/${f.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ width: 20, fontSize: 11, color: muted, fontWeight: 600, flexShrink: 0 }}>#{i + 1}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                          <p style={{ fontSize: 11, color: muted }}>{f.sector} · {f.stage}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: f.qScore >= 70 ? green : f.qScore >= 50 ? amber : muted, flexShrink: 0, marginLeft: 8 }}>{f.qScore}</span>
                    </Link>
                    <button
                      onClick={() => { setOutreachFounder({ id: f.id, name: f.name }); setOutreachMsg(''); setOutreachDone(false) }}
                      style={{ padding: '5px 7px', borderRadius: 7, border: `1px solid ${bdr}`, background: 'transparent', cursor: 'pointer', color: muted, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      title="Message founder"
                    >
                      <MessageSquare size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Chat ─────────────────────────────────────────────── */}
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', position: 'sticky', top: 24 }}>

          {/* chat header */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: green }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Deal Scout AI</p>
            <span style={{ fontSize: 11, color: muted, marginLeft: 'auto' }}>Answers from your live deal flow</span>
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <MessageSquare size={20} color="#7C3AED" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 6 }}>Ask about your deal flow</p>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>I have context on all your companies, Q-Scores, and pipeline stages.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 480 }}>
                  {SUGGESTED_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s', textAlign: 'left', lineHeight: 1.4 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = surf; (e.currentTarget as HTMLElement).style.borderColor = blue }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = bg; (e.currentTarget as HTMLElement).style.borderColor = bdr }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: msg.role === 'user' ? ink : bg,
                  border: msg.role === 'assistant' ? `1px solid ${bdr}` : 'none',
                  fontSize: 13,
                  color: msg.role === 'user' ? '#fff' : ink,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                  {msg.streaming && (
                    <span style={{ display: 'inline-block', width: 8, height: 14, background: blue, borderRadius: 2, marginLeft: 3, animation: 'pulse 0.7s infinite', verticalAlign: 'middle' }} />
                  )}
                </div>
              </div>
            ))}

            {typing && messages[messages.length - 1]?.streaming !== true && (
              <div style={{ display: 'flex', gap: 5, padding: '10px 14px', width: 56, background: bg, border: `1px solid ${bdr}`, borderRadius: '4px 16px 16px 16px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: muted, animation: `bounce 0.6s ${i * 0.15}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* input */}
          <div style={{ borderTop: `1px solid ${bdr}`, padding: '12px 14px', flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about deals, founders, sectors…"
              disabled={typing}
              rows={1}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: `1px solid ${bdr}`,
                background: bg,
                fontSize: 13,
                color: ink,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                maxHeight: 120,
                overflow: 'auto',
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || typing}
              style={{
                height: 38,
                width: 38,
                borderRadius: 10,
                border: 'none',
                background: input.trim() && !typing ? ink : bdr,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              {typing
                ? <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={14} color="#fff" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Outreach modal ─────────────────────────────────────────── */}
      {outreachFounder && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setOutreachFounder(null)}
        >
          <div
            style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: 28, width: 460, maxWidth: '90vw', boxShadow: '0 16px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: ink }}>Message {outreachFounder.name}</h3>
                <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>Start a conversation with this founder</p>
              </div>
              <button onClick={() => setOutreachFounder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, borderRadius: 6 }}>
                <X size={16} />
              </button>
            </div>
            {outreachDone ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: green, marginBottom: 6 }}>Message sent!</div>
                <p style={{ fontSize: 12, color: muted }}>The founder will receive your message.</p>
                <button onClick={() => setOutreachFounder(null)} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none', background: ink, color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
              </div>
            ) : (
              <>
                <textarea
                  value={outreachMsg}
                  onChange={e => setOutreachMsg(e.target.value)}
                  placeholder="Write your message…"
                  rows={5}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: `1px solid ${bdr}`, background: surf, fontSize: 13, color: ink, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                  <button onClick={() => setOutreachFounder(null)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'none', fontSize: 13, color: ink, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button
                    onClick={handleSendOutreach}
                    disabled={!outreachMsg.trim() || outreachSending}
                    style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: !outreachMsg.trim() || outreachSending ? bdr : ink, color: '#fff', fontSize: 13, cursor: !outreachMsg.trim() || outreachSending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}
                  >
                    {outreachSending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    {outreachSending ? 'Sending…' : 'Send Message'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
