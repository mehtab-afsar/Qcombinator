"use client";

import { motion } from "framer-motion";
import {
  Building2, Users, TrendingUp, Target,
  CheckCircle, Circle, Edit, Eye, Share2,
  RefreshCw, ArrowRight, ChevronRight, Sparkles,
} from "lucide-react";
import { useFounderData } from "@/features/founder/hooks/useFounderData";
import Link from "next/link";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";

// ─── SVG completion ring (like the Q-Score ring in dashboard) ─────────────────
function CompletionRing({ pct }: { pct: number }) {
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={bdr} strokeWidth={6} />
      {/* Fill */}
      <motion.circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke={ink} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.3 }}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={ink} fontSize={22} fontWeight={300}>{pct}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={muted} fontSize={11} fontWeight={400}>% done</text>
    </svg>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px", borderBottom: `1px solid ${bdr}`, background: surf,
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 500, color: ink, letterSpacing: "0.01em" }}>{title}</h3>
        {action}
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </motion.div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "#B5B0A8", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 14, fontWeight: 300, color: value ? ink : "#C8C3BB", lineHeight: 1.6 }}>
        {value || "Not provided"}
      </p>
    </div>
  );
}

// ─── Check item ───────────────────────────────────────────────────────────────
function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
      {done
        ? <CheckCircle style={{ width: 15, height: 15, color: "#16A34A", flexShrink: 0 }} />
        : <Circle      style={{ width: 15, height: 15, color: "#C8C3BB", flexShrink: 0 }} />
      }
      <span style={{ fontSize: 13, fontWeight: 300, color: done ? ink : muted }}>{label}</span>
      {done && <span style={{ marginLeft: "auto", fontSize: 10, color: "#16A34A", fontWeight: 500 }}>✓</span>}
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 0", borderBottom: `1px solid ${bdr}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: surf,
          border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ width: 13, height: 13, color: muted }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 300, color: muted }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, color: ink }}>{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileBuilder() {
  const { profile, assessment, metrics, loading } = useFounderData();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: bg }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw style={{ width: 28, height: 28, color: muted, margin: "0 auto 12px" }} className="animate-spin" />
          <p style={{ fontSize: 14, fontWeight: 300, color: muted }}>Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!profile || !assessment) {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: bg, border: `1px solid ${bdr}`, borderRadius: 20,
            padding: 48, maxWidth: 440, width: "100%", textAlign: "center",
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: surf,
            border: `1px solid ${bdr}`, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
          }}>
            <Building2 style={{ width: 28, height: 28, color: muted }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 300, color: ink, marginBottom: 10 }}>Complete your profile</h2>
          <p style={{ fontSize: 14, fontWeight: 300, color: muted, marginBottom: 28, lineHeight: 1.6 }}>
            Run your assessment first — it powers every section of your investor profile.
          </p>
          <Link href="/founder/assessment" style={{ textDecoration: "none" }}>
            <button
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              style={{
                padding: "12px 28px", borderRadius: 10, border: "none",
                background: ink, color: bg, fontSize: 14, fontWeight: 500,
                cursor: "pointer", transition: "opacity 0.15s",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              Start assessment <ArrowRight style={{ width: 15, height: 15 }} />
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const pctFields = [
    profile.startupName, profile.industry, profile.description,
    assessment.problemStory, assessment.icpDescription,
    assessment.mrr !== undefined, assessment.channelsTried?.length,
  ];
  const completion = Math.round((pctFields.filter(Boolean).length / pctFields.length) * 100);

  return (
    <div style={{ background: bg, minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}
        >
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>
              Profile
            </p>
            <h1 style={{ fontSize: 30, fontWeight: 300, color: ink, marginBottom: 6 }}>
              {profile.startupName || "Your profile"}
            </h1>
            <p style={{ fontSize: 14, fontWeight: 300, color: muted }}>
              Your investor-ready founder profile built from your assessment data.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { icon: Eye,    label: "Preview" },
              { icon: Share2, label: "Share"   },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                onMouseEnter={e => (e.currentTarget.style.background = surf)}
                onMouseLeave={e => (e.currentTarget.style.background = bg)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 16px", borderRadius: 10,
                  border: `1px solid ${bdr}`, background: bg,
                  color: muted, fontSize: 13, fontWeight: 400,
                  cursor: "pointer", transition: "background 0.15s",
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Layout ────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

          {/* Left – main sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Company basics */}
            <Section
              title="Company basics"
              action={
                <button
                  onMouseEnter={e => (e.currentTarget.style.background = bdr)}
                  onMouseLeave={e => (e.currentTarget.style.background = surf)}
                  style={{
                    padding: "5px 12px", borderRadius: 7, border: `1px solid ${bdr}`,
                    background: surf, color: muted, fontSize: 12, fontWeight: 400,
                    cursor: "pointer", display: "flex", alignItems: "center",
                    gap: 6, transition: "background 0.15s",
                  }}
                >
                  <Edit style={{ width: 11, height: 11 }} /> Edit
                </button>
              }
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                <Field label="Company name" value={profile.startupName} />
                <Field label="Industry"     value={profile.industry} />
                <Field label="Stage"        value={profile.stage} />
                <Field label="Founded"      value="2024" />
              </div>
              {profile.description && (
                <div style={{ paddingTop: 12, borderTop: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#B5B0A8", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Description</p>
                  <p style={{ fontSize: 14, fontWeight: 300, color: ink, lineHeight: 1.7 }}>{profile.description}</p>
                </div>
              )}
            </Section>

            {/* Problem & Solution */}
            <Section title="Problem & solution">
              <Field label="Problem statement" value={assessment.problemStory} />
              {assessment.advantageExplanation && (
                <Field label="Unique advantage" value={assessment.advantageExplanation} />
              )}
            </Section>

            {/* Market & Customers */}
            <Section title="Market & customers">
              {assessment.icpDescription && (
                <Field label="Ideal customer profile" value={assessment.icpDescription} />
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                {assessment.targetCustomers && (
                  <Field label="Target market size" value={`${assessment.targetCustomers.toLocaleString()} customers`} />
                )}
                {assessment.conversationCount && (
                  <Field label="Customer interviews" value={`${assessment.conversationCount} conversations`} />
                )}
              </div>
            </Section>

            {/* Financial metrics */}
            {metrics && (
              <Section title="Financial snapshot">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  {[
                    { label: "MRR",     value: `$${metrics.mrr.toLocaleString()}` },
                    { label: "ARR",     value: `$${metrics.arr.toLocaleString()}` },
                    { label: "Burn",    value: `$${metrics.burn.toLocaleString()}/mo` },
                    { label: "Runway",  value: `${metrics.runway} mo` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      background: surf, border: `1px solid ${bdr}`, borderRadius: 12,
                      padding: "14px 16px",
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: "#B5B0A8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
                      <p style={{ fontSize: 20, fontWeight: 300, color: ink }}>{value}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Right – sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>

            {/* Completion card */}
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}
            >
              <div style={{ padding: "18px 20px", borderBottom: `1px solid ${bdr}`, background: surf }}>
                <h3 style={{ fontSize: 13, fontWeight: 500, color: ink }}>Profile strength</h3>
              </div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <CompletionRing pct={completion} />
                <div style={{ width: "100%", marginTop: 16 }}>
                  {[
                    { done: !!profile.startupName,          label: "Company name" },
                    { done: !!profile.industry,             label: "Industry" },
                    { done: !!assessment.problemStory,      label: "Problem statement" },
                    { done: !!assessment.icpDescription,    label: "ICP description" },
                    { done: assessment.mrr !== undefined,   label: "Financial metrics" },
                    { done: !!assessment.advantageExplanation, label: "Unique advantage" },
                  ].map(({ done, label }) => (
                    <CheckItem key={label} done={done} label={label} />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Quick stats */}
            {metrics && (
              <motion.div
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}
              >
                <div style={{ padding: "18px 20px", borderBottom: `1px solid ${bdr}`, background: surf }}>
                  <h3 style={{ fontSize: 13, fontWeight: 500, color: ink }}>Key metrics</h3>
                </div>
                <div style={{ padding: "12px 20px" }}>
                  <StatPill icon={Users}     label="Customers"  value={metrics.customers.toString()} />
                  <StatPill icon={TrendingUp} label="MRR growth" value={`+${metrics.mrrGrowth}%`} />
                  <StatPill icon={Target}     label="LTV:CAC"    value={`${metrics.ltvCacRatio}:1`} />
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}
            >
              <div style={{ padding: "18px 20px", borderBottom: `1px solid ${bdr}`, background: surf }}>
                <h3 style={{ fontSize: 13, fontWeight: 500, color: ink }}>Next steps</h3>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { href: "/founder/assessment", label: "Update assessment", icon: Edit },
                  { href: "/founder/dashboard",  label: "View dashboard",    icon: Target },
                  { href: "/founder/matching",   label: "Explore investors", icon: Sparkles },
                ].map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} style={{ textDecoration: "none" }}>
                    <div
                      onMouseEnter={e => (e.currentTarget.style.background = surf)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", borderRadius: 9,
                        cursor: "pointer", transition: "background 0.14s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Icon style={{ width: 13, height: 13, color: muted }} />
                        <span style={{ fontSize: 13, fontWeight: 300, color: ink }}>{label}</span>
                      </div>
                      <ChevronRight style={{ width: 13, height: 13, color: "#C8C3BB" }} />
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
