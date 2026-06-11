"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Upload, Send, MoreHorizontal, Trash2, RefreshCw,
  CheckCircle, Clock, Mail, X, Loader2, ChevronDown, Search,
  Building2, Users, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from "@/lib/constants/colors";
import { NotificationBell } from "@/features/investor/components/InvestorSidebar";

// ─── types ────────────────────────────────────────────────────────────────────
interface PortfolioCompany {
  id: string;
  company_name: string;
  founder_name: string | null;
  founder_email: string | null;
  sector: string | null;
  stage: string | null;
  invested_at: string | null;
  investment_note: string | null;
  invite_status: "not_sent" | "pending" | "accepted";
  invite_sent_at: string | null;
  joined_at: string | null;
  founder_user_id: string | null;
  created_at: string;
}

interface AddCompanyForm {
  company_name: string;
  founder_name: string;
  founder_email: string;
  sector: string;
  stage: string;
  investment_note: string;
  send_invite: boolean;
}

const SECTORS = ["AI / ML", "SaaS", "FinTech", "HealthTech", "CleanTech", "EdTech", "BioTech", "Hardware", "Consumer", "Other"];
const STAGES  = ["Idea", "MVP", "Pre-Seed", "Seed", "Series A", "Series B+", "Bootstrapped"];

const EMPTY_FORM: AddCompanyForm = {
  company_name: "", founder_name: "", founder_email: "",
  sector: "", stage: "", investment_note: "", send_invite: false,
};

// ─── status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PortfolioCompany["invite_status"] }) {
  const cfg = {
    accepted:  { label: "On Platform ✓", bg: "#F0FDF4", color: green,  border: "#BBF7D0" },
    pending:   { label: "Invite Pending", bg: "#FFFBEB", color: amber,  border: "#FDE68A" },
    not_sent:  { label: "Not Invited",   bg: "#F9F7F2", color: muted,  border: bdr },
  }[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {status === "accepted" ? <CheckCircle style={{ width: 10, height: 10 }} /> :
       status === "pending"  ? <Clock       style={{ width: 10, height: 10 }} /> :
                               <Mail        style={{ width: 10, height: 10 }} />}
      {cfg.label}
    </span>
  );
}

// ─── modal backdrop ──────────────────────────────────────────────────────────
function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: bg, borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.15)", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── add company modal ────────────────────────────────────────────────────────
function AddCompanyModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState<AddCompanyForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof AddCompanyForm, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) { setError("Company name is required"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/investor/portfolio-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name:    form.company_name.trim(),
          founder_name:    form.founder_name.trim() || null,
          founder_email:   form.founder_email.trim() || null,
          sector:          form.sector || null,
          stage:           form.stage || null,
          investment_note: form.investment_note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add company");

      // optionally send invite right away
      if (form.send_invite && form.founder_email.trim() && data.company?.id) {
        await fetch("/api/investor/portfolio-companies/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: data.company.id }),
        });
      }
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13, color: ink,
    border: `1px solid ${bdr}`, background: surf, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: muted, display: "block", marginBottom: 5 };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: ink }}>Add Portfolio Company</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4 }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Company Name *</label>
          <input style={inputStyle} value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Acme Inc." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Founder Name</label>
            <input style={inputStyle} value={form.founder_name} onChange={e => set("founder_name", e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <label style={labelStyle}>Founder Email</label>
            <input style={inputStyle} type="email" value={form.founder_email} onChange={e => set("founder_email", e.target.value)} placeholder="jane@acme.com" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Sector</label>
            <select style={{ ...inputStyle, appearance: "none" }} value={form.sector} onChange={e => set("sector", e.target.value)}>
              <option value="">Select sector</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stage</label>
            <select style={{ ...inputStyle, appearance: "none" }} value={form.stage} onChange={e => set("stage", e.target.value)}>
              <option value="">Select stage</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Investment Note (internal)</label>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            value={form.investment_note}
            onChange={e => set("investment_note", e.target.value)}
            placeholder="e.g. Lead investor, $500K SAFE at $4M cap, Round closed Jan 2025"
          />
        </div>

        {form.founder_email && (
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", border: `1px solid ${bdr}`, borderRadius: 8, background: form.send_invite ? "#EFF6FF" : surf }}>
            <input
              type="checkbox" checked={form.send_invite} onChange={e => set("send_invite", e.target.checked)}
              style={{ width: 15, height: 15, accentColor: blue }}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Send invite email now</p>
              <p style={{ fontSize: 11, color: muted }}>Founder receives a branded invite to join Edge Alpha</p>
            </div>
          </label>
        )}

        {error && <p style={{ fontSize: 12, color: red, background: "#FEF2F2", padding: "8px 12px", borderRadius: 6 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${bdr}`, background: "white", color: ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ flex: 2, padding: "10px 0", borderRadius: 8, border: "none", background: blue, color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {saving ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Saving…</> : "Add Company"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── csv import modal ─────────────────────────────────────────────────────────
interface CsvRow { company_name: string; founder_name: string; founder_email: string; sector: string; stage: string; invested_at: string; investment_note: string }

function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): CsvRow[] {
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    const lines = text.trim().split("\n");
    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, "").replace(/^"|"$/g, ""));
    return lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      const obj: Record<string, string> = {};
      header.forEach((h, i) => { obj[h] = (cols[i] ?? "").replace(/^"|"$/g, ""); });
      return {
        company_name:    obj.company || obj.company_name || "",
        founder_name:    obj.founder_name || obj.founder || "",
        founder_email:   obj.email || obj.founder_email || "",
        sector:          obj.sector || "",
        stage:           obj.stage || "",
        invested_at:     obj.invested_at || obj.invested_date || obj.date || "",
        investment_note: obj.note || obj.investment_note || "",
      };
    }).filter(r => r.company_name);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        setRows(parseCSV(ev.target?.result as string));
        setError(null);
      } catch {
        setError("Could not parse CSV. Check the file format.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!rows.length) return;
    setImporting(true); setError(null);
    try {
      const res = await fetch("/api/investor/portfolio-companies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setDone({ imported: data.imported });
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={{ padding: 28, minWidth: 480 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: ink }}>Import from CSV</h2>
          <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>Columns: Company, Founder Name, Email, Sector, Stage, Invested Date, Note</p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4 }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {done ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <CheckCircle style={{ width: 40, height: 40, color: green, margin: "0 auto 12px" }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: ink }}>{done.imported} companies imported</p>
          <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>You can now send invites to all companies with an email address.</p>
          <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: blue, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Done
          </button>
        </div>
      ) : (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${rows.length ? blue : bdr}`,
              borderRadius: 12, padding: "28px 20px", textAlign: "center",
              cursor: "pointer", marginBottom: rows.length ? 16 : 0,
              background: rows.length ? "#EFF6FF" : surf,
              transition: "all .15s",
            }}
          >
            <Upload style={{ width: 24, height: 24, color: rows.length ? blue : muted, margin: "0 auto 8px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: rows.length ? blue : ink }}>
              {rows.length ? `${rows.length} rows ready to import` : "Click to upload CSV"}
            </p>
            <p style={{ fontSize: 12, color: muted }}>
              {rows.length ? "Click again to replace file" : "Max 200 companies per import"}
            </p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
          </div>

          {rows.length > 0 && (
            <div style={{ border: `1px solid ${bdr}`, borderRadius: 10, overflow: "hidden", marginBottom: 16, maxHeight: 240, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: surf, borderBottom: `1px solid ${bdr}` }}>
                    {["Company", "Founder", "Email", "Sector", "Stage"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: muted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${bdr}` }}>
                      <td style={{ padding: "6px 10px", color: ink, fontWeight: 500 }}>{r.company_name}</td>
                      <td style={{ padding: "6px 10px", color: muted }}>{r.founder_name || "—"}</td>
                      <td style={{ padding: "6px 10px", color: muted }}>{r.founder_email || "—"}</td>
                      <td style={{ padding: "6px 10px", color: muted }}>{r.sector || "—"}</td>
                      <td style={{ padding: "6px 10px", color: muted }}>{r.stage || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: red, background: "#FEF2F2", padding: "8px 12px", borderRadius: 6, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${bdr}`, background: "white", color: ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleImport} disabled={!rows.length || importing} style={{ flex: 2, padding: "10px 0", borderRadius: 8, border: "none", background: rows.length ? blue : bdr, color: rows.length ? "white" : muted, fontSize: 13, fontWeight: 600, cursor: rows.length && !importing ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {importing ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Importing…</> : `Import ${rows.length} Companies`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── row actions menu ─────────────────────────────────────────────────────────
function RowMenu({ company, onSendInvite, onDelete, onRefresh }: {
  company: PortfolioCompany;
  onSendInvite: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleInvite() {
    setSending(true);
    await onSendInvite(company.id);
    setSending(false);
    setOpen(false);
    onRefresh();
  }

  const canInvite = company.invite_status !== "accepted" && !!company.founder_email;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: "none", border: `1px solid ${bdr}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: muted, display: "flex", alignItems: "center" }}
      >
        <MoreHorizontal style={{ width: 14, height: 14 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", minWidth: 180, background: bg, border: `1px solid ${bdr}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: "4px 0", zIndex: 50 }}>
          {company.founder_user_id && (
            <Link
              href={`/investor/startup/${company.founder_user_id}`}
              onClick={() => setOpen(false)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: 13, color: ink, textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = surf)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <ExternalLink style={{ width: 13, height: 13, color: muted }} /> View Profile
            </Link>
          )}
          {canInvite && (
            <button
              onClick={handleInvite} disabled={sending}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: 13, color: ink, background: "none", border: "none", width: "100%", cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = surf)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              {sending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Send style={{ width: 13, height: 13, color: muted }} />}
              {company.invite_status === "pending" ? "Resend Invite" : "Send Invite"}
            </button>
          )}
          <div style={{ height: 1, background: bdr, margin: "4px 0" }} />
          <button
            onClick={() => { onDelete(company.id); setOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: 13, color: red, background: "none", border: "none", width: "100%", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#FEF2F2")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <Trash2 style={{ width: 13, height: 13 }} /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function PortfolioCompaniesPage() {
  const [tab, setTab]         = useState<"portfolio" | "connected">("portfolio");
  const [companies, setCompanies] = useState<PortfolioCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PortfolioCompany["invite_status"]>("all");

  const [showAdd, setShowAdd]     = useState(false);
  const [showCsv, setShowCsv]     = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult]   = useState<{ sent: number; failed: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/investor/portfolio-companies");
      if (res.ok) setCompanies(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSendInvite(companyId: string) {
    await fetch("/api/investor/portfolio-companies/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
  }

  async function handleDelete(companyId: string) {
    if (!confirm("Remove this company from your portfolio? This does not delete any founder account.")) return;
    await fetch(`/api/investor/portfolio-companies/${companyId}`, { method: "DELETE" });
    setCompanies(cs => cs.filter(c => c.id !== companyId));
  }

  async function handleBulkInvite() {
    const notSent = companies.filter(c => c.invite_status === "not_sent" && c.founder_email);
    if (!notSent.length) return;
    if (!confirm(`Send invites to ${notSent.length} companies?`)) return;
    setBulkSending(true); setBulkResult(null);
    try {
      const res = await fetch("/api/investor/portfolio-companies/bulk-invite", { method: "POST" });
      const data = await res.json();
      setBulkResult({ sent: data.sent, failed: data.failed });
      load();
    } finally {
      setBulkSending(false);
    }
  }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.company_name.toLowerCase().includes(q) || (c.founder_name ?? "").toLowerCase().includes(q) || (c.founder_email ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.invite_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const notSentCount = companies.filter(c => c.invite_status === "not_sent" && c.founder_email).length;

  const counts = {
    all:      companies.length,
    not_sent: companies.filter(c => c.invite_status === "not_sent").length,
    pending:  companies.filter(c => c.invite_status === "pending").length,
    accepted: companies.filter(c => c.invite_status === "accepted").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: bg }}>
      {/* ── header ──────────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: bg, borderBottom: `1px solid ${bdr}`, padding: "0 28px", display: "flex", alignItems: "center", height: 56, gap: 16 }}>
        <Building2 style={{ width: 18, height: 18, color: blue }} />
        <h1 style={{ fontSize: 16, fontWeight: 700, color: ink }}>Portfolio Companies</h1>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <NotificationBell />
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── tab selector ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${bdr}`, marginBottom: 24 }}>
          {(["portfolio", "connected"] as const).map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              style={{
                padding: "10px 18px", fontSize: 13, fontWeight: 600,
                border: "none", background: "none", cursor: "pointer", fontFamily: "inherit",
                color: tab === t ? blue : muted,
                borderBottom: `2px solid ${tab === t ? blue : "transparent"}`,
                marginBottom: -1, transition: "color .12s",
              }}
            >
              {t === "portfolio" ? `My Portfolio (${companies.length})` : "Connected Founders"}
            </button>
          ))}
        </div>

        {tab === "portfolio" && (
          <>
            {/* ── toolbar ──────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              {/* search */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200, border: `1px solid ${bdr}`, borderRadius: 8, padding: "7px 12px", background: "white" }}>
                <Search style={{ width: 14, height: 14, color: muted, flexShrink: 0 }} />
                <input
                  placeholder="Search companies or founders…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ border: "none", outline: "none", background: "none", fontSize: 13, color: ink, width: "100%", fontFamily: "inherit" }}
                />
              </div>

              {/* status filter */}
              <div style={{ position: "relative" }}>
                <select
                  value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                  style={{ padding: "7px 32px 7px 12px", border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 13, color: ink, background: "white", appearance: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <option value="all">All ({counts.all})</option>
                  <option value="not_sent">Not Invited ({counts.not_sent})</option>
                  <option value="pending">Invite Pending ({counts.pending})</option>
                  <option value="accepted">On Platform ({counts.accepted})</option>
                </select>
                <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: muted, pointerEvents: "none" }} />
              </div>

              <div style={{ height: 32, width: 1, background: bdr }} />

              {/* actions */}
              {notSentCount > 0 && (
                <button
                  onClick={handleBulkInvite} disabled={bulkSending}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#D97706", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {bulkSending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Send style={{ width: 14, height: 14 }} />}
                  Send All Invites ({notSentCount})
                </button>
              )}
              <button onClick={() => setShowCsv(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "white", color: ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Upload style={{ width: 14, height: 14, color: muted }} /> Import CSV
              </button>
              <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: blue, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Plus style={{ width: 14, height: 14 }} /> Add Company
              </button>
            </div>

            {/* ── bulk invite result banner ─────────────────────────────── */}
            {bulkResult && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: bulkResult.failed ? "#FFFBEB" : "#F0FDF4", border: `1px solid ${bulkResult.failed ? "#FDE68A" : "#BBF7D0"}` }}
              >
                <p style={{ fontSize: 13, color: bulkResult.failed ? "#92400E" : "#166534", fontWeight: 500 }}>
                  ✓ {bulkResult.sent} invites sent{bulkResult.failed > 0 ? ` · ${bulkResult.failed} failed` : ""}
                </p>
                <button onClick={() => setBulkResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: muted }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </motion.div>
            )}

            {/* ── stats strip ──────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Companies", value: counts.all,      icon: Building2, color: blue  },
                { label: "On Platform",     value: counts.accepted, icon: CheckCircle, color: green },
                { label: "Invite Pending",  value: counts.pending,  icon: Clock,      color: amber },
              ].map(s => (
                <div key={s.label} style={{ border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px", background: "white", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <s.icon style={{ width: 16, height: 16, color: s.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 700, color: ink, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── table ────────────────────────────────────────────────── */}
            <div style={{ border: `1px solid ${bdr}`, borderRadius: 12, overflow: "hidden", background: "white" }}>
              {loading ? (
                <div style={{ padding: "48px 0", textAlign: "center" }}>
                  <Loader2 style={{ width: 24, height: 24, color: muted, margin: "0 auto 8px" }} className="animate-spin" />
                  <p style={{ fontSize: 13, color: muted }}>Loading portfolio…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "56px 0", textAlign: "center" }}>
                  <Building2 style={{ width: 32, height: 32, color: bdr, margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>
                    {companies.length === 0 ? "No portfolio companies yet" : "No matches"}
                  </p>
                  <p style={{ fontSize: 13, color: muted, maxWidth: 280, margin: "0 auto 20px" }}>
                    {companies.length === 0 ? "Add your first company or import from a CSV file." : "Try adjusting your search or filter."}
                  </p>
                  {companies.length === 0 && (
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                      <button onClick={() => setShowCsv(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "white", color: ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        <Upload style={{ width: 14, height: 14, color: muted }} /> Import CSV
                      </button>
                      <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: blue, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        <Plus style={{ width: 14, height: 14 }} /> Add Company
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: surf, borderBottom: `1px solid ${bdr}` }}>
                      {["Company", "Founder", "Sector / Stage", "Status", "Added", ""].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: muted, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: `1px solid ${bdr}` }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#FAFAF9")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${blue}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: blue, flexShrink: 0 }}>
                              {c.company_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{c.company_name}</p>
                              {c.investment_note && (
                                <p style={{ fontSize: 11, color: muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.investment_note}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {c.founder_name || c.founder_email ? (
                            <div>
                              <p style={{ fontSize: 13, color: ink }}>{c.founder_name || "—"}</p>
                              {c.founder_email && <p style={{ fontSize: 11, color: muted }}>{c.founder_email}</p>}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: muted }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {(c.sector || c.stage) ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {c.sector && <span style={{ fontSize: 12, color: ink }}>{c.sector}</span>}
                              {c.stage  && <span style={{ fontSize: 11, color: muted }}>{c.stage}</span>}
                            </div>
                          ) : <span style={{ fontSize: 12, color: muted }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <StatusBadge status={c.invite_status} />
                          {c.joined_at && (
                            <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>
                              Joined {new Date(c.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <p style={{ fontSize: 12, color: muted }}>
                            {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <RowMenu company={c} onSendInvite={handleSendInvite} onDelete={handleDelete} onRefresh={load} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── refresh ──────────────────────────────────────────────── */}
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: muted, background: "none", border: "none", cursor: "pointer" }}>
                <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
              </button>
            </div>
          </>
        )}

        {tab === "connected" && (
          <ConnectedFounders />
        )}
      </div>

      {/* ── modals ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <Backdrop onClose={() => setShowAdd(false)}>
            <AddCompanyModal onClose={() => setShowAdd(false)} onAdded={load} />
          </Backdrop>
        )}
        {showCsv && (
          <Backdrop onClose={() => setShowCsv(false)}>
            <CsvImportModal onClose={() => setShowCsv(false)} onImported={load} />
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── connected founders tab ───────────────────────────────────────────────────
function ConnectedFounders() {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<{
    id: string; founderName: string; startupName: string; industry: string; stage: string;
    qScore: number; status: string; requestedDate: string; personalMessage?: string;
    avatarUrl: string | null;
  }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/investor/portfolio");
        if (res.ok) {
          const data = await res.json();
          setConnections(data.connections ?? data ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <Loader2 style={{ width: 24, height: 24, color: muted, margin: "0 auto 8px" }} className="animate-spin" />
      <p style={{ fontSize: 13, color: muted }}>Loading…</p>
    </div>
  );

  if (!connections.length) return (
    <div style={{ padding: "56px 0", textAlign: "center" }}>
      <Users style={{ width: 32, height: 32, color: bdr, margin: "0 auto 12px" }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>No connected founders yet</p>
      <p style={{ fontSize: 13, color: muted }}>Founders who reach out to you will appear here once accepted.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {connections.map((c, i) => (
        <motion.div
          key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          style={{ border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px", background: "white", display: "flex", alignItems: "center", gap: 16 }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${blue}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: blue, flexShrink: 0 }}>
            {(c.startupName || c.founderName).charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{c.startupName || c.founderName}</p>
            <p style={{ fontSize: 12, color: muted }}>{c.founderName} · {c.industry} · {c.stage}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.qScore >= 70 ? green : c.qScore >= 50 ? amber : red }}>{c.qScore}</div>
            <div style={{ fontSize: 10, color: muted }}>Q-Score</div>
          </div>
          <Link href={`/investor/startup/${c.id}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, color: ink, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            View <ExternalLink style={{ width: 12, height: 12, color: muted }} />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
