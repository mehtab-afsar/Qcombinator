'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, CheckCircle2, PlayCircle, Loader2, Upload } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { CopyBtn } from '../../shared/components/CopyBtn'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'
import type { OutreachContact } from '../../types/agent.types'

// ═══════════════════════════════════════════════════════════════════════════════
// OUTREACH SEQUENCE RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function parseCSV(text: string): OutreachContact[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  // Auto-detect header: if first line has no @ it's a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = !firstLine.includes('@') || firstLine.includes('email') || firstLine.includes('name');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map(line => {
    // Handle quoted CSV values
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const [name = '', email = '', company = '', title = ''] = cols;
    return { name: name || email.split('@')[0], email, company, title };
  }).filter(c => c.email.includes('@'));
}

export function OutreachRenderer({ data, artifactId, sequenceName }: { data: Record<string, unknown>; artifactId?: string; sequenceName?: string }) {
  const d = data as {
    targetICP?: string;
    sequence?: { step: number; channel: string; timing: string; subject?: string | null; body: string; goal: string; tips: string[] }[];
  };

  const emailSteps = (d.sequence || []).filter(s => s.channel === 'email');

  // ── send panel state ──────────────────────────────────────────────────────
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [contacts,      setContacts]      = useState<OutreachContact[]>([]);
  const [csvText,       setCsvText]       = useState('');
  const [csvError,      setCsvError]      = useState('');
  const [selectedStep,  setSelectedStep]  = useState(0);
  const [fromName,      setFromName]      = useState('');
  const [fromEmail,     setFromEmail]     = useState('');
  const [sending,       setSending]       = useState(false);
  const [sendResult,    setSendResult]    = useState<{ sent: number; failed: number } | null>(null);
  const [previewIdx,    setPreviewIdx]    = useState(0);
  const [totalSent,     setTotalSent]     = useState(0);
  const [totalOpened,   setTotalOpened]   = useState(0);
  const [totalReplied,  setTotalReplied]  = useState(0);
  const [loadingStats,  setLoadingStats]  = useState(false);

  // Load total sent count + engagement stats on mount + after send
  useEffect(() => {
    setLoadingStats(true);
    fetch('/api/agents/outreach/send')
      .then(r => r.json())
      .then(d => {
        if (d.stats) {
          setTotalSent(d.stats.total);
          setTotalOpened(d.stats.opened ?? 0);
          setTotalReplied(d.stats.replied ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
    // Pre-fill contacts from Hunter enrichment (set via sessionStorage)
    const stored = sessionStorage.getItem('patel_enriched_leads');
    if (stored) {
      const parsed = parseCSV(stored);
      if (parsed.length) {
        setCsvText(stored);
        setContacts(parsed);
        setShowSendPanel(true);
      }
      sessionStorage.removeItem('patel_enriched_leads');
    }
  }, [sendResult]);

  function handleCSVInput(text: string) {
    setCsvText(text);
    setCsvError('');
    const parsed = parseCSV(text);
    if (text.trim() && !parsed.length) {
      setCsvError('No valid emails found. Expected: name, email, company, title');
    } else {
      setContacts(parsed);
    }
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      handleCSVInput(text);
    };
    reader.readAsText(file);
  }

  // Personalize a template for preview contact
  function personalize(text: string, contact: OutreachContact) {
    const firstName = contact.name.split(' ')[0] || contact.name;
    return text
      .replace(/\{\{firstName\}\}/gi, firstName)
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{name\}\}/gi, contact.name)
      .replace(/\{\{company\}\}/gi, contact.company || 'your company')
      .replace(/\{\{title\}\}/gi, contact.title || 'your role');
  }

  async function handleSend() {
    if (!contacts.length || !fromEmail || sending) return;
    const step = emailSteps[selectedStep];
    if (!step) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/agents/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts,
          steps: emailSteps.map(s => ({ subject: s.subject || '', body: s.body })),
          stepIndex: selectedStep,
          fromName,
          fromEmail,
          artifactId,
          sequenceName: sequenceName || d.targetICP || 'Outreach Sequence',
        }),
      });
      const result = await res.json();
      setSendResult({ sent: result.sent ?? 0, failed: result.failed ?? 0 });
      if (result.sent > 0) {
        setContacts([]);
        setCsvText('');
      }
    } catch {
      setSendResult({ sent: 0, failed: contacts.length });
    } finally {
      setSending(false);
    }
  }

  const _chColor: Record<string, string> = { email: blue, linkedin: "#0A66C2", call: amber };
  const chLabel: Record<string, string> = { email: "Email", linkedin: "LinkedIn", call: "Call" };
  const previewContact = contacts[previewIdx] || { name: 'Alex Johnson', email: 'alex@acme.com', company: 'Acme Corp', title: 'Head of Operations' };
  const previewStep    = emailSteps[selectedStep];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Send Emails CTA bar ─────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ height: 36, width: 36, borderRadius: 9, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {sendResult?.sent
              ? <CheckCircle2 size={16} color={green} />
              : <PlayCircle size={16} color={muted} />
            }
          </div>
          <div>
            {sendResult?.sent ? (
              <p style={{ fontSize: 13, fontWeight: 600, color: green }}>
                Patel sent {sendResult.sent} email{sendResult.sent !== 1 ? 's' : ''} {sendResult.failed > 0 ? `· ${sendResult.failed} failed` : ''}
              </p>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>
                {emailSteps.length} email step{emailSteps.length !== 1 ? 's' : ''} ready to send
              </p>
            )}
            <p style={{ fontSize: 11, color: muted, marginTop: 1 }}>
              {loadingStats ? '…' : totalSent > 0
                ? `${totalSent} sent · ${totalOpened} opened · ${totalReplied} replied${totalSent > 0 ? ` (${Math.round(totalOpened / totalSent * 100)}% open rate)` : ''}`
                : 'Add contacts and send — Patel personalizes each one'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowSendPanel(v => !v); setSendResult(null); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: ink, color: bg, border: "none", transition: "opacity .15s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <Send size={12} /> {showSendPanel ? 'Close' : 'Send Emails'}
        </button>
        </div>
        </CardContent>
      </Card>

      {/* ── Send Panel ─────────────────────────────────────────────── */}
      {showSendPanel && (
        <Card><CardContent className="pt-5 pb-5">
          <div className="flex flex-col gap-4">
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: muted }}>Outreach Campaign</p>

          {/* Step selector */}
          {emailSteps.length > 1 && (
            <div>
              <p style={{ fontSize: 11, color: muted, marginBottom: 8 }}>Which step?</p>
              <Tabs value={String(selectedStep)} onValueChange={v => setSelectedStep(Number(v))}>
                <TabsList>
                  {emailSteps.map((s, i) => (
                    <TabsTrigger key={i} value={String(i)}>Step {i + 1} · {s.timing}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* From fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Your name (shows as sender)</p>
              <input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Alex Chen"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${bdr}`, borderRadius: 7, fontSize: 13, color: ink, background: bg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Your email (reply-to)</p>
              <input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="alex@yourstartup.com" type="email"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${bdr}`, borderRadius: 7, fontSize: 13, color: ink, background: bg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Contact upload */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: muted }}>Contact list <span style={{ color: muted }}>(CSV: name, email, company, title)</span></p>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${bdr}`, background: bg, color: ink }}>
                <Upload size={11} /> Upload CSV
                <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleCSVFile} />
              </label>
            </div>
            <textarea
              value={csvText}
              onChange={e => handleCSVInput(e.target.value)}
              placeholder={"Alex Johnson, alex@acme.com, Acme Corp, Head of Operations\nSarah Park, sarah@techflow.io, TechFlow, VP Engineering\n..."}
              rows={4}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${csvError ? red : bdr}`, borderRadius: 8, fontSize: 12, color: ink, background: bg, resize: "vertical", outline: "none", fontFamily: "monospace", boxSizing: "border-box", lineHeight: 1.6 }}
            />
            {csvError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{csvError}</p>}
            {contacts.length > 0 && !csvError && (
              <p style={{ fontSize: 11, color: green, marginTop: 4 }}>
                <CheckCircle2 size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} ready · max 200 per send
              </p>
            )}
          </div>

          {/* Preview */}
          {contacts.length > 0 && previewStep && (
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Preview — {contacts[previewIdx]?.name || 'Contact 1'}
                </p>
                {contacts.length > 1 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))} disabled={previewIdx === 0}
                      style={{ padding: "2px 8px", fontSize: 11, border: `1px solid ${bdr}`, borderRadius: 5, cursor: "pointer", background: bg, color: muted, opacity: previewIdx === 0 ? 0.4 : 1 }}>←</button>
                    <span style={{ fontSize: 11, color: muted, lineHeight: "22px" }}>{previewIdx + 1}/{contacts.length}</span>
                    <button onClick={() => setPreviewIdx(Math.min(contacts.length - 1, previewIdx + 1))} disabled={previewIdx === contacts.length - 1}
                      style={{ padding: "2px 8px", fontSize: 11, border: `1px solid ${bdr}`, borderRadius: 5, cursor: "pointer", background: bg, color: muted, opacity: previewIdx === contacts.length - 1 ? 0.4 : 1 }}>→</button>
                  </div>
                )}
              </div>
              {previewStep.subject && (
                <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6 }}>
                  Subject: {personalize(previewStep.subject, previewContact)}
                </p>
              )}
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {personalize(previewStep.body, previewContact)}
              </p>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!contacts.length || !fromEmail || sending || !!sendResult?.sent}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: (!contacts.length || !fromEmail || sending || !!sendResult?.sent) ? "not-allowed" : "pointer",
              background: sendResult?.sent ? green : ink,
              color: bg, border: "none",
              opacity: (!contacts.length || !fromEmail) ? 0.5 : 1,
              transition: "all .15s",
            }}
          >
            {sending ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending {contacts.length} emails…</>
            ) : sendResult?.sent ? (
              <><CheckCircle2 size={14} /> Sent {sendResult.sent} emails</>
            ) : (
              <><Send size={14} /> Send Step {selectedStep + 1} to {contacts.length || '—'} contact{contacts.length !== 1 ? 's' : ''}</>
            )}
          </button>
          {!fromEmail && contacts.length > 0 && (
            <p style={{ fontSize: 11, color: amber, textAlign: "center", marginTop: -10 }}>Enter your email above to enable sending</p>
          )}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        </CardContent></Card>
      )}

      {d.targetICP && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 4 }}>Target</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{d.targetICP}</p>
        </CardContent></Card>
      )}

      {(d.sequence || []).map((step, i) => (
        <div key={i} className="relative pl-5">
          {i < (d.sequence?.length ?? 0) - 1 && (
            <div style={{ position: "absolute", left: 6, top: 20, bottom: -14, width: 1, background: bdr }} />
          )}
          <div style={{
            position: "absolute", left: 0, top: 8,
            width: 12, height: 12, borderRadius: "50%",
            background: muted,
            border: `2px solid ${bg}`,
          }} />

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{step.timing}</span>
                  <Badge variant="outline">{chLabel[step.channel] || step.channel}</Badge>
                </div>
                <CopyBtn text={step.body} />
              </div>

              {step.subject && (
                <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6 }}>
                  Subject: {step.subject}
                </p>
              )}
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>{step.body}</p>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}><strong>Goal:</strong> {step.goal}</p>
              {step.tips && step.tips.map((tip, ti) => (
                <p key={ti} style={{ fontSize: 11, color: muted, paddingLeft: 8 }}>💡 {tip}</p>
              ))}

              {step.channel === "email" && (
                <>
                  <Separator className="my-2.5" />
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1${step.subject ? `&su=${encodeURIComponent(step.subject)}` : ""}&body=${encodeURIComponent(step.body)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: surf, color: ink, textDecoration: "none", border: `1px solid ${bdr}` }}
                  >
                    <Mail size={11} /> Send one in Gmail
                  </a>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
