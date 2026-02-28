"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Target, TrendingUp, Zap, Users, DollarSign,
  ArrowLeft, ArrowRight, CheckCircle, Globe, Calendar,
  X, Save, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";

// ─── types ────────────────────────────────────────────────────────────────────
interface StartupData {
  companyName: string; website: string; incorporation: string;
  foundedDate: string; industry: string; oneLiner: string; stage: string;
  problemStatement: string; whyNow: string; solution: string;
  uniquePosition: string; moat: string;
  tamSize: string; marketGrowth: string; customerPersona: string;
  businessModel: string; competitors: string[]; differentiation: string;
  tractionType: string; mrr: string; arr: string; growthRate: string;
  customerCount: string; churnRate: string; cac: string; ltv: string;
  userInterviews: string; lois: string; pilots: string; waitlist: string;
  teamSize: string; advisors: string[]; equitySplit: string; keyHires: string[];
  raisingAmount: string; useOfFunds: string; previousFunding: string;
  runwayRemaining: string; targetCloseDate: string;
}

const EMPTY: StartupData = {
  companyName: "", website: "", incorporation: "", foundedDate: "",
  industry: "", oneLiner: "", stage: "",
  problemStatement: "", whyNow: "", solution: "", uniquePosition: "", moat: "",
  tamSize: "", marketGrowth: "", customerPersona: "", businessModel: "",
  competitors: [], differentiation: "",
  tractionType: "", mrr: "", arr: "", growthRate: "", customerCount: "",
  churnRate: "", cac: "", ltv: "", userInterviews: "", lois: "", pilots: "", waitlist: "",
  teamSize: "", advisors: [], equitySplit: "", keyHires: [],
  raisingAmount: "", useOfFunds: "", previousFunding: "", runwayRemaining: "", targetCloseDate: "",
};

const STEPS = [
  { id: "basics",      title: "Company Basics",      icon: Building2,  color: blue  },
  { id: "solution",    title: "Problem & Solution",  icon: Target,     color: "#D97706" },
  { id: "market",      title: "Market",              icon: TrendingUp, color: green },
  { id: "traction",    title: "Traction",            icon: Zap,        color: "#7C3AED" },
  { id: "team",        title: "Team",                icon: Users,      color: blue  },
  { id: "fundraising", title: "Fundraising",         icon: DollarSign, color: green },
];

const INDUSTRIES = [
  "AI/ML", "SaaS", "FinTech", "HealthTech", "EdTech", "E-commerce",
  "Marketplace", "DevTools", "Cybersecurity", "Climate Tech", "Biotech", "Other",
];
const INCORPORATION_TYPES = [
  { value: "delaware-corp",     label: "Delaware C-Corporation", recommended: true },
  { value: "llc",              label: "LLC" },
  { value: "other-corp",       label: "Other Corporation" },
  { value: "not-incorporated",  label: "Not Yet Incorporated" },
];
const STAGE_OPTIONS = [
  { value: "pre-product", label: "Pre-Product", desc: "Idea validation" },
  { value: "mvp",         label: "MVP",         desc: "Built, not live" },
  { value: "beta",        label: "Beta",         desc: "Testing with users" },
  { value: "launched",    label: "Launched",     desc: "Product is live" },
  { value: "growing",     label: "Growing",      desc: "Scaling & expanding" },
];
const BUSINESS_MODELS = [
  "B2B SaaS", "B2C Subscription", "Marketplace", "E-commerce",
  "Advertising", "Transaction Fees", "Freemium", "Enterprise Licensing", "Usage-based", "Other",
];
const TEAM_SIZES   = ["Just me", "2–3 people", "4–6 people", "7+ people"];
const RUNWAY_OPTS  = ["Less than 3 months", "3–6 months", "6–12 months", "12+ months"];

// ─── style helpers ────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: `1px solid ${bdr}`, background: "#fff",
  color: ink, fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};
const areaSt: React.CSSProperties = { ...inputSt, resize: "vertical", minHeight: 90, lineHeight: 1.6 };
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: muted,
  textTransform: "uppercase", letterSpacing: "0.1em",
  display: "block", marginBottom: 6,
};
const choiceBtn = (active: boolean, accent = blue): React.CSSProperties => ({
  padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left",
  border: `1.5px solid ${active ? accent : bdr}`,
  background: active ? `${accent}18` : "#fff",
  color: active ? accent : ink,
  fontSize: 13, fontFamily: "inherit", transition: "all 0.15s", width: "100%",
});
const chipBtn = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px", borderRadius: 20, cursor: "pointer",
  border: `1.5px solid ${active ? blue : bdr}`,
  background: active ? "#EFF6FF" : "#fff",
  color: active ? blue : ink, fontSize: 12, fontFamily: "inherit",
  transition: "all 0.15s", whiteSpace: "nowrap" as const,
});

// ─── sub-components ───────────────────────────────────────────────────────────
function FG({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 20 }}><p style={labelSt}>{label}</p>{children}</div>;
}
function SI({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputSt} />;
}
function TA({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={areaSt} />;
}

function TagInput({ values, onAdd, onRemove, placeholder }: {
  values: string[]; onAdd: (v: string) => void;
  onRemove: (i: number) => void; placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) { onAdd(v); setDraft(""); }
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ ...inputSt, flex: 1 }}
        />
        <button onClick={add} style={{
          padding: "8px 14px", borderRadius: 8, border: `1px solid ${bdr}`,
          background: surf, color: ink, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>Add</button>
      </div>
      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {values.map((v, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20, background: surf,
              border: `1px solid ${bdr}`, fontSize: 12, color: ink,
            }}>
              {v}
              <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: muted }}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function StartupProfilePage() {
  const router = useRouter();
  const [step, setStep]     = useState(0);
  const [data, setData]     = useState<StartupData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [toast, setToast]   = useState<string | null>(null);

  const u = useCallback(<K extends keyof StartupData>(field: K, value: StartupData[K]) =>
    setData(prev => ({ ...prev, [field]: value })), []);

  // load existing data
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data: fp } = await supabase
          .from("founder_profiles")
          .select("startup_name, industry, stage, startup_profile_data")
          .eq("user_id", user.id)
          .maybeSingle();
        if (fp) {
          const saved = (fp.startup_profile_data ?? {}) as Partial<StartupData>;
          setData({
            ...EMPTY, ...saved,
            companyName: saved.companyName || fp.startup_name || "",
            industry:    saved.industry    || fp.industry    || "",
            stage:       saved.stage       || fp.stage       || "",
          });
        }
      } catch { /* anonymous */ }
      finally { setLoading(false); }
    })();
  }, [router]);

  const persist = useCallback(async (complete = false) => {
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("founder_profiles").update({
        startup_name:              data.companyName || undefined,
        industry:                  data.industry    || undefined,
        stage:                     data.stage       || undefined,
        website:                   data.website     || undefined,
        tagline:                   data.oneLiner    || undefined,
        startup_profile_data:      data,
        startup_profile_completed: complete,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      if (complete) {
        setToast("Profile complete! Redirecting…");
        setTimeout(() => router.push("/founder/profile"), 1200);
      }
    } catch {
      setToast("Save failed — please try again");
      setTimeout(() => setToast(null), 3000);
    } finally { setSaving(false); }
  }, [data, router]);

  const next = () => {
    if (step < STEPS.length - 1) { void persist(false); setStep(s => s + 1); }
    else void persist(true);
  };

  const addItem    = (f: "competitors" | "advisors" | "keyHires", v: string) =>
    setData(prev => ({ ...prev, [f]: [...prev[f], v] }));
  const removeItem = (f: "competitors" | "advisors" | "keyHires", i: number) =>
    setData(prev => ({ ...prev, [f]: prev[f].filter((_, idx) => idx !== i) }));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: bg }}>
        <RefreshCw size={20} style={{ color: muted }} className="animate-spin" />
      </div>
    );
  }

  const cur = STEPS[step];
  const pct = ((step + 1) / STEPS.length) * 100;
  const CurIcon = cur.icon;

  return (
    <div style={{ minHeight: "100vh", background: bg }}>

      {/* sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40, background: bg,
        borderBottom: `1px solid ${bdr}`, padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/founder/profile" style={{ color: muted, display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 12 }}>
            <ArrowLeft size={13} /> Profile
          </Link>
          <span style={{ color: bdr }}>·</span>
          <CurIcon size={14} style={{ color: cur.color }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>{cur.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: muted }}>Step {step + 1}/{STEPS.length}</span>
          <div style={{ width: 100, height: 4, background: surf, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: ink, borderRadius: 4, transition: "width 0.3s ease" }} />
          </div>
          <button
            onClick={() => persist(false)}
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 7, border: `1px solid ${bdr}`,
              background: savedFlash ? "#F0FDF4" : bg,
              color: savedFlash ? green : muted,
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {saving ? <RefreshCw size={10} className="animate-spin" /> : <Save size={10} />}
            {saving ? "Saving…" : savedFlash ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            style={{
              position: "fixed", top: 68, left: "50%", transform: "translateX(-50%)",
              background: ink, color: bg, borderRadius: 8, padding: "10px 18px",
              fontSize: 13, fontWeight: 500, zIndex: 50,
            }}
          >{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* step tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${bdr}`, background: surf, overflowX: "auto" }}>
        {STEPS.map((s, i) => {
          const SIcon = s.icon;
          const done   = i < step;
          const active = i === step;
          return (
            <button key={s.id} onClick={() => setStep(i)} style={{
              flex: 1, minWidth: 80, padding: "10px 4px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              border: "none", borderBottom: active ? `2px solid ${ink}` : "2px solid transparent",
              background: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              {done
                ? <CheckCircle size={14} style={{ color: green }} />
                : <SIcon size={14} style={{ color: active ? ink : muted }} />
              }
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? ink : muted, whiteSpace: "nowrap" }}>
                {s.title.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* form */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 100px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
          >

            {/* step 0 — basics */}
            {step === 0 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <FG label="Company name *"><SI value={data.companyName} onChange={v => u("companyName", v)} placeholder="Acme Inc." /></FG>
                  <FG label="Website">
                    <div style={{ position: "relative" }}>
                      <Globe size={13} style={{ position: "absolute", left: 10, top: 10, color: muted }} />
                      <input value={data.website} onChange={e => u("website", e.target.value)} placeholder="https://acme.com" style={{ ...inputSt, paddingLeft: 30 }} />
                    </div>
                  </FG>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <FG label="Founded date">
                    <div style={{ position: "relative" }}>
                      <Calendar size={13} style={{ position: "absolute", left: 10, top: 10, color: muted }} />
                      <input type="month" value={data.foundedDate} onChange={e => u("foundedDate", e.target.value)} style={{ ...inputSt, paddingLeft: 30 }} />
                    </div>
                  </FG>
                  <div />
                </div>
                <FG label="Incorporation">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {INCORPORATION_TYPES.map(t => (
                      <button key={t.value} onClick={() => u("incorporation", t.value)} style={choiceBtn(data.incorporation === t.value)}>
                        <div style={{ fontWeight: 500, marginBottom: 2 }}>{t.label}</div>
                        {t.recommended && <div style={{ fontSize: 10, color: green, fontWeight: 600 }}>Recommended</div>}
                      </button>
                    ))}
                  </div>
                </FG>
                <FG label="Industry *">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {INDUSTRIES.map(ind => (
                      <button key={ind} onClick={() => u("industry", ind)} style={chipBtn(data.industry === ind)}>{ind}</button>
                    ))}
                  </div>
                </FG>
                <FG label="One-line description *">
                  <SI value={data.oneLiner} onChange={v => u("oneLiner", v)} placeholder="We help SMBs automate accounting with AI-powered bookkeeping" />
                  <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>{data.oneLiner.length}/100 characters</p>
                </FG>
                <FG label="Current stage *">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {STAGE_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => u("stage", s.value)} style={choiceBtn(data.stage === s.value)}>
                        <div style={{ fontWeight: 600 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </FG>
              </div>
            )}

            {/* step 1 — problem & solution */}
            {step === 1 && (
              <div>
                <FG label="What problem are you solving? *">
                  <TA value={data.problemStatement} onChange={v => u("problemStatement", v)} placeholder="Describe the specific problem your target customers face. Be concrete…" />
                </FG>
                <FG label="Why now? What makes this timely?">
                  <TA value={data.whyNow} onChange={v => u("whyNow", v)} placeholder="Recent trends or market changes that make this the right moment…" rows={3} />
                </FG>
                <FG label="Your solution *">
                  <TA value={data.solution} onChange={v => u("solution", v)} placeholder="How your product solves the problem. What makes your approach unique?" />
                </FG>
                <FG label="Why are you uniquely positioned to solve this?">
                  <TA value={data.uniquePosition} onChange={v => u("uniquePosition", v)} placeholder="Background, expertise, or insights that give you an advantage…" rows={3} />
                </FG>
                <FG label="Competitive moat">
                  <TA value={data.moat} onChange={v => u("moat", v)} placeholder="Technology, network effects, data, brand, distribution…" rows={3} />
                </FG>
              </div>
            )}

            {/* step 2 — market */}
            {step === 2 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FG label="TAM (Total Addressable Market) *"><SI value={data.tamSize} onChange={v => u("tamSize", v)} placeholder="e.g., $50B annually" /></FG>
                  <FG label="Market growth rate"><SI value={data.marketGrowth} onChange={v => u("marketGrowth", v)} placeholder="e.g., 25% YoY" /></FG>
                </div>
                <FG label="Customer type *">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {[{ value: "B2B", desc: "Business customers" }, { value: "B2C", desc: "Individual consumers" }, { value: "B2B2C", desc: "Both" }].map(p => (
                      <button key={p.value} onClick={() => u("customerPersona", p.value)} style={choiceBtn(data.customerPersona === p.value)}>
                        <div style={{ fontWeight: 600 }}>{p.value}</div>
                        <div style={{ fontSize: 11, color: muted }}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </FG>
                <FG label="Business model *">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {BUSINESS_MODELS.map(m => <button key={m} onClick={() => u("businessModel", m)} style={chipBtn(data.businessModel === m)}>{m}</button>)}
                  </div>
                </FG>
                <FG label="Direct competitors">
                  <TagInput values={data.competitors} onAdd={v => addItem("competitors", v)} onRemove={i => removeItem("competitors", i)} placeholder="Type competitor name, press Enter" />
                </FG>
                <FG label="Differentiation from competitors">
                  <TA value={data.differentiation} onChange={v => u("differentiation", v)} placeholder="What makes your approach unique vs. existing solutions?" rows={3} />
                </FG>
              </div>
            )}

            {/* step 3 — traction */}
            {step === 3 && (
              <div>
                <FG label="Traction status *">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => u("tractionType", "pre-revenue")} style={choiceBtn(data.tractionType === "pre-revenue")}>
                      <div style={{ fontWeight: 600 }}>Pre-Revenue</div>
                      <div style={{ fontSize: 11, color: muted }}>Validating with users</div>
                    </button>
                    <button onClick={() => u("tractionType", "revenue")} style={choiceBtn(data.tractionType === "revenue")}>
                      <div style={{ fontWeight: 600 }}>Generating Revenue</div>
                      <div style={{ fontSize: 11, color: muted }}>Have paying customers</div>
                    </button>
                  </div>
                </FG>
                {data.tractionType === "pre-revenue" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <FG label="User interviews"><SI value={data.userInterviews} onChange={v => u("userInterviews", v)} placeholder="e.g., 50+" /></FG>
                    <FG label="Letters of Intent"><SI value={data.lois} onChange={v => u("lois", v)} placeholder="e.g., 5 signed" /></FG>
                    <FG label="Pilot customers"><SI value={data.pilots} onChange={v => u("pilots", v)} placeholder="e.g., 3 active" /></FG>
                    <FG label="Waitlist size"><SI value={data.waitlist} onChange={v => u("waitlist", v)} placeholder="e.g., 500 users" /></FG>
                  </div>
                )}
                {data.tractionType === "revenue" && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <FG label="MRR ($)"><SI value={data.mrr} onChange={v => u("mrr", v)} placeholder="e.g., 50000" /></FG>
                      <FG label="MoM growth rate"><SI value={data.growthRate} onChange={v => u("growthRate", v)} placeholder="e.g., 15%" /></FG>
                      <FG label="Customer count"><SI value={data.customerCount} onChange={v => u("customerCount", v)} placeholder="e.g., 150" /></FG>
                      <FG label="Monthly churn"><SI value={data.churnRate} onChange={v => u("churnRate", v)} placeholder="e.g., 3%" /></FG>
                      <FG label="CAC ($)"><SI value={data.cac} onChange={v => u("cac", v)} placeholder="e.g., 250" /></FG>
                      <FG label="LTV ($)"><SI value={data.ltv} onChange={v => u("ltv", v)} placeholder="e.g., 1500" /></FG>
                    </div>
                    <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                      <p style={{ fontSize: 12, color: green, fontWeight: 600, marginBottom: 4 }}>Connect Stripe for live metrics</p>
                      <p style={{ fontSize: 12, color: "#15803D" }}>
                        Ask Felix to sync Stripe data and auto-verify these numbers.{" "}
                        <Link href="/founder/agents/felix" style={{ color: green, fontWeight: 600, textDecoration: "none" }}>Open Felix →</Link>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* step 4 — team */}
            {step === 4 && (
              <div>
                <FG label="Current team size *">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {TEAM_SIZES.map(size => (
                      <button key={size} onClick={() => u("teamSize", size)} style={choiceBtn(data.teamSize === size)}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{size}</span>
                      </button>
                    ))}
                  </div>
                </FG>
                <FG label="Co-founders & key team members">
                  <TagInput values={data.advisors} onAdd={v => addItem("advisors", v)} onRemove={i => removeItem("advisors", i)} placeholder="e.g., Jane Smith — Former VP Eng at Google" />
                </FG>
                <FG label="Equity split">
                  <SI value={data.equitySplit} onChange={v => u("equitySplit", v)} placeholder="e.g., 50/50, or 60/25/15 across 3 co-founders" />
                </FG>
                <FG label="Key hires needed (next 12 months)">
                  <TagInput values={data.keyHires} onAdd={v => addItem("keyHires", v)} onRemove={i => removeItem("keyHires", i)} placeholder="e.g., Head of Sales, Senior Backend Engineer" />
                  <p style={{ fontSize: 11, color: muted, marginTop: 6 }}>
                    Harper can write JDs and screen applicants.{" "}
                    <Link href="/founder/agents/harper" style={{ color: blue, fontWeight: 600, textDecoration: "none" }}>Open Harper →</Link>
                  </p>
                </FG>
              </div>
            )}

            {/* step 5 — fundraising */}
            {step === 5 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <FG label="How much are you raising? *"><SI value={data.raisingAmount} onChange={v => u("raisingAmount", v)} placeholder="e.g., $500,000" /></FG>
                  <FG label="Target close date">
                    <input type="month" value={data.targetCloseDate} onChange={e => u("targetCloseDate", e.target.value)} style={inputSt} />
                  </FG>
                </div>
                <FG label="Use of funds *">
                  <TA
                    value={data.useOfFunds}
                    onChange={v => u("useOfFunds", v)}
                    placeholder={"Example:\n• Product Development (40%) — $200K\n• Sales & Marketing (30%) — $150K\n• Team Expansion (20%) — $100K\n• Operations (10%) — $50K"}
                    rows={6}
                  />
                </FG>
                <FG label="Previous funding raised">
                  <SI value={data.previousFunding} onChange={v => u("previousFunding", v)} placeholder="e.g., $100K from friends & family, or Bootstrapped" />
                </FG>
                <FG label="Current runway">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {RUNWAY_OPTS.map(r => <button key={r} onClick={() => u("runwayRemaining", r)} style={choiceBtn(data.runwayRemaining === r)}>{r}</button>)}
                  </div>
                </FG>
                <div style={{ marginTop: 24, padding: "20px 24px", borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", textAlign: "center" }}>
                  <CheckCircle size={28} style={{ color: blue, margin: "0 auto 10px" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: ink, marginBottom: 6 }}>Almost done!</h3>
                  <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                    Complete your profile to unlock investor matching and AI-powered analysis.
                  </p>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* sticky nav footer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: bg, borderTop: `1px solid ${bdr}`, padding: "14px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 40,
      }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`,
            background: bg, color: step === 0 ? muted : ink,
            fontSize: 13, fontWeight: 500, cursor: step === 0 ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <span style={{ fontSize: 12, color: muted }}>
          {step} of {STEPS.length} sections complete
        </span>

        <button
          onClick={next}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: ink, color: bg, fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          {step === STEPS.length - 1 ? (
            <>
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              {saving ? "Saving…" : "Complete Profile"}
            </>
          ) : (
            <> Continue <ArrowRight size={14} /></>
          )}
        </button>
      </div>
    </div>
  );
}
