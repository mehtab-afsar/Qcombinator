"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  BarChart3, CheckCircle, AlertCircle, RefreshCw,
  ArrowRight, Minus, Activity, Edit3, X, Save,
} from "lucide-react";
import { useMetrics } from "@/features/founder/hooks/useFounderData";
import Link from "next/link";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const green = "#16A34A";
const amber = "#D97706";
const red   = "#DC2626";
const blue  = "#2563EB";

// ─── helpers ──────────────────────────────────────────────────────────────────
function trendColor(v: number) { return v > 0 ? green : v < 0 ? red : muted; }
function trendIcon(v: number)  { return v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus; }

// ─── Mini sparkline bars (visual only) ────────────────────────────────────────
function Sparkline({ color = ink }: { color?: string }) {
  const bars = [0.45, 0.62, 0.55, 0.78, 0.65, 0.85, 1.0];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28 }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          style={{
            width: 4, height: h * 28, borderRadius: 2,
            background: color, opacity: 0.15 + h * 0.7,
            transformOrigin: "bottom",
          }}
        />
      ))}
    </div>
  );
}

// ─── Big KPI card ─────────────────────────────────────────────────────────────
function KpiCard({
  label, value, change, sub, icon: Icon, delay = 0,
}: {
  label: string; value: string; change?: number;
  sub?: string; icon: React.ElementType; delay?: number;
}) {
  const TrendIcon = change !== undefined ? trendIcon(change) : null;
  const tc = change !== undefined ? trendColor(change) : muted;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      style={{
        background: bg, border: `1px solid ${bdr}`,
        borderRadius: 16, padding: "22px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: surf,
          border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ width: 15, height: 15, color: muted }} />
        </div>
        <Sparkline />
      </div>

      <p style={{ fontSize: 11, fontWeight: 600, color: "#B5B0A8", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 300, color: ink, lineHeight: 1, marginBottom: 8 }}>
        {value}
      </p>

      {change !== undefined && TrendIcon && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <TrendIcon style={{ width: 12, height: 12, color: tc }} />
          <span style={{ fontSize: 12, fontWeight: 400, color: tc }}>{Math.abs(change)}% MoM</span>
        </div>
      )}
      {sub && !change && (
        <p style={{ fontSize: 12, fontWeight: 300, color: muted }}>{sub}</p>
      )}
    </motion.div>
  );
}

// ─── Unit economics block ─────────────────────────────────────────────────────
function UnitBlock({
  label, value, desc, good, delay = 0,
}: {
  label: string; value: string; desc: string; good?: boolean; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: good ? "#F0FDF4" : bg,
        border: `1px solid ${good ? "#BBF7D0" : bdr}`,
        borderRadius: 14, padding: "18px 20px",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: "#B5B0A8", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 30, fontWeight: 300, color: good ? green : ink, marginBottom: 4, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 12, fontWeight: 300, color: good ? "#16A34A" : muted }}>{desc}</p>
    </motion.div>
  );
}

// ─── Metric row with optional bar ─────────────────────────────────────────────
function MetricRow({
  label, value, progress, trend, delay = 0,
}: {
  label: string; value: string; progress?: number; trend?: "up" | "down" | "neutral"; delay?: number;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const tc = trend === "up" ? green : trend === "down" ? red : muted;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      style={{ paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${bdr}` }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: progress !== undefined ? 8 : 0 }}>
        <span style={{ fontSize: 13, fontWeight: 300, color: muted }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: ink }}>{value}</span>
          {trend && <TrendIcon style={{ width: 13, height: 13, color: tc }} />}
        </div>
      </div>
      {progress !== undefined && (
        <div style={{ height: 3, background: bdr, borderRadius: 99 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.8, delay: delay + 0.3 }}
            style={{
              height: "100%", borderRadius: 99,
              background: progress >= 60 ? green : progress >= 30 ? amber : red,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Number input helper ───────────────────────────────────────────────────────
function NumInput({
  label, value, onChange, prefix = "", suffix = "", placeholder = "0",
}: {
  label: string; value: string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${bdr}`, borderRadius: 9, background: bg, overflow: "hidden" }}>
        {prefix && (
          <span style={{ padding: "0 10px", fontSize: 13, color: muted, borderRight: `1px solid ${bdr}`, height: 38, display: "flex", alignItems: "center" }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            padding: "0 12px", height: 38, fontSize: 14, color: ink,
            fontFamily: "inherit",
          }}
        />
        {suffix && (
          <span style={{ padding: "0 10px", fontSize: 13, color: muted, borderLeft: `1px solid ${bdr}`, height: 38, display: "flex", alignItems: "center" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Default form state ────────────────────────────────────────────────────────
const EMPTY_FORM = {
  mrr: "", monthlyBurn: "", customers: "",
  ltv: "", cac: "", grossMargin: "",
  tam: "", runway: "", mrrGrowth: "", conversionRate: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function MetricsTracker() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { metrics, healthStatus, loading } = useMetrics(refreshKey);

  const [editing, setEditing]  = useState(false);
  const [saving,  setSaving]   = useState(false);
  const [saveErr, setSaveErr]  = useState<string | null>(null);
  const [form,    setForm]     = useState<typeof EMPTY_FORM>(EMPTY_FORM);

  function openEditor() {
    // Pre-fill from existing metrics if available
    setForm({
      mrr:           metrics ? String(metrics.mrr)            : "",
      monthlyBurn:   metrics ? String(metrics.burn)           : "",
      customers:     metrics ? String(metrics.customers)      : "",
      ltv:           metrics ? String(metrics.ltv)            : "",
      cac:           metrics ? String(metrics.cac)            : "",
      grossMargin:   metrics ? String(metrics.grossMargin)    : "",
      tam:           metrics ? String(metrics.tam / 1_000_000): "",
      runway:        metrics ? String(metrics.runway)         : "",
      mrrGrowth:     metrics ? String(metrics.mrrGrowth)      : "",
      conversionRate:metrics ? String(metrics.conversionRate) : "",
    });
    setSaveErr(null);
    setEditing(true);
  }

  async function handleSave() {
    const mrr = Number(form.mrr) || 0;
    if (mrr === 0 && !form.monthlyBurn) {
      setSaveErr("Enter at least MRR to save metrics.");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const tamVal = (Number(form.tam) || 0) * 1_000_000;
      const content = {
        mrr,
        arr:          mrr * 12,
        monthlyBurn:  Number(form.monthlyBurn)   || 0,
        customers:    Number(form.customers)     || 0,
        ltv:          Number(form.ltv)           || 0,
        cac:          Number(form.cac)           || 0,
        grossMargin:  Number(form.grossMargin)   || 0,
        tam:          tamVal,
        sam:          tamVal * 0.3,
        runway:       Number(form.runway)        || 0,
        mrrGrowth:    Number(form.mrrGrowth)     || 0,
        conversionRate: Number(form.conversionRate) || 0,
        source:       "manual",
      };

      const { error } = await supabase.from("agent_artifacts").insert({
        user_id:       user.id,
        agent_id:      "felix",
        artifact_type: "financial_summary",
        title:         `Manual metrics update — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        content,
        version:       1,
      });
      if (error) throw error;

      setEditing(false);
      setRefreshKey(k => k + 1);
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : "Failed to save — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: bg }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw style={{ width: 28, height: 28, color: muted, margin: "0 auto 12px" }} className="animate-spin" />
          <p style={{ fontSize: 14, fontWeight: 300, color: muted }}>Loading metrics…</p>
        </div>
      </div>
    );
  }

  if (!metrics && !editing) {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: bg, border: `1px solid ${bdr}`, borderRadius: 20,
            padding: 48, maxWidth: 420, width: "100%", textAlign: "center",
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: surf,
            border: `1px solid ${bdr}`, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
          }}>
            <BarChart3 style={{ width: 28, height: 28, color: muted }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 300, color: ink, marginBottom: 10 }}>No metrics yet</h2>
          <p style={{ fontSize: 14, fontWeight: 300, color: muted, marginBottom: 28, lineHeight: 1.6 }}>
            Complete your assessment or enter your numbers manually to unlock your KPI dashboard.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <button
              onClick={openEditor}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              style={{
                padding: "12px 28px", borderRadius: 10, border: "none",
                background: blue, color: "#fff", fontSize: 14, fontWeight: 500,
                cursor: "pointer", transition: "opacity 0.15s",
                display: "inline-flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center",
              }}
            >
              <Edit3 style={{ width: 15, height: 15 }} /> Enter metrics manually
            </button>
            <Link href="/founder/assessment" style={{ textDecoration: "none", width: "100%" }}>
              <button
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                style={{
                  padding: "12px 28px", borderRadius: 10, border: `1px solid ${bdr}`,
                  background: surf, color: ink, fontSize: 14, fontWeight: 500,
                  cursor: "pointer", transition: "opacity 0.15s",
                  display: "inline-flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center",
                }}
              >
                Start assessment <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
            </Link>
          </div>
        </motion.div>

        {/* manual entry form shown inline below the empty state */}
        <AnimatePresence>
          {editing && <ManualEntryForm form={form} setForm={setForm} saving={saving} saveErr={saveErr} onSave={handleSave} onClose={() => setEditing(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  const healthOk   = healthStatus?.overall === "healthy";
  const healthWarn = healthStatus?.overall === "warning";

  return (
    <div style={{ background: bg, minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 28 }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: muted, marginBottom: 8 }}>
            Metrics
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 300, color: ink }}>KPI Dashboard</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {metrics && (
                <p style={{ fontSize: 12, fontWeight: 300, color: muted }}>
                  Updated {new Date(metrics.calculatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              )}
              <button
                onClick={openEditor}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 9,
                  border: `1px solid ${bdr}`, background: surf,
                  color: ink, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", transition: "opacity 0.15s",
                }}
              >
                <Edit3 style={{ width: 13, height: 13, color: muted }} /> Update metrics
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Manual entry form ──────────────────────────────────────── */}
        <AnimatePresence>
          {editing && (
            <ManualEntryForm
              form={form} setForm={setForm}
              saving={saving} saveErr={saveErr}
              onSave={handleSave} onClose={() => setEditing(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Health banner ──────────────────────────────────────────── */}
        {healthStatus && metrics && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              border: `1px solid ${healthOk ? "#BBF7D0" : healthWarn ? "#FDE68A" : "#FECACA"}`,
              background: healthOk ? "#F0FDF4" : healthWarn ? "#FFFBEB" : "#FFF5F5",
              borderRadius: 14, padding: "16px 20px", marginBottom: 24,
              display: "flex", alignItems: "flex-start", gap: 14,
            }}
          >
            {healthOk
              ? <CheckCircle style={{ width: 20, height: 20, color: green, flexShrink: 0, marginTop: 2 }} />
              : <AlertCircle style={{ width: 20, height: 20, color: healthWarn ? amber : red, flexShrink: 0, marginTop: 2 }} />
            }
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 6 }}>
                {healthOk ? "Metrics look healthy" : healthWarn ? "Some areas need attention" : "Critical issues detected"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {healthStatus.strengths.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: green, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Strengths</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {healthStatus.strengths.map((s: string, i: number) => (
                        <li key={i} style={{ fontSize: 13, fontWeight: 300, color: "#166534", marginBottom: 2 }}>· {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {healthStatus.issues.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: amber, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Improve</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {healthStatus.issues.map((s: string, i: number) => (
                        <li key={i} style={{ fontSize: 13, fontWeight: 300, color: "#92400E", marginBottom: 2 }}>· {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {metrics && (
          <>
            {/* ── KPI row ───────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              <KpiCard label="MRR"      value={`$${metrics.mrr.toLocaleString()}`}      change={metrics.mrrGrowth}    icon={DollarSign} delay={0}    />
              <KpiCard label="ARR"      value={`$${metrics.arr.toLocaleString()}`}      sub="Annual recurring"         icon={TrendingUp} delay={0.06} />
              <KpiCard label="Customers" value={metrics.customers.toString()}             icon={Users}    delay={0.12} />
              <KpiCard label="Runway"   value={`${metrics.runway} mo`}                  icon={BarChart3} delay={0.18}
                sub={metrics.runway >= 18 ? "Strong runway" : metrics.runway >= 12 ? "Adequate" : "Extend soon"} />
            </div>

            {/* ── Unit Economics ────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ marginBottom: 20 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Activity style={{ width: 14, height: 14, color: muted }} />
                <h2 style={{ fontSize: 13, fontWeight: 500, color: ink }}>Unit economics</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <UnitBlock
                  label="LTV"
                  value={`$${metrics.ltv.toLocaleString()}`}
                  desc="Customer lifetime value"
                  delay={0.22}
                />
                <UnitBlock
                  label="CAC"
                  value={`$${metrics.cac.toLocaleString()}`}
                  desc="Customer acquisition cost"
                  delay={0.28}
                />
                <UnitBlock
                  label="LTV:CAC"
                  value={`${metrics.ltvCacRatio}:1`}
                  desc={metrics.ltvCacRatio >= 3 ? "Healthy — above 3:1 target ✓" : `Below 3:1 target — ${(3 - metrics.ltvCacRatio).toFixed(1)}x gap`}
                  good={metrics.ltvCacRatio >= 3}
                  delay={0.34}
                />
              </div>
            </motion.div>

            {/* ── Two-col detail ────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
              {/* Financial */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}
              >
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}`, background: surf }}>
                  <h3 style={{ fontSize: 13, fontWeight: 500, color: ink }}>Financial metrics</h3>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <MetricRow label="Monthly burn rate" value={`$${metrics.burn.toLocaleString()}`}             delay={0.32} />
                  <MetricRow label="Gross margin"       value={`${metrics.grossMargin}%`}  progress={metrics.grossMargin}              delay={0.35} />
                  <MetricRow label="MRR growth"         value={`${metrics.mrrGrowth > 0 ? "+" : ""}${metrics.mrrGrowth}%`}
                    trend={metrics.mrrGrowth > 0 ? "up" : metrics.mrrGrowth < 0 ? "down" : "neutral"} delay={0.38} />
                </div>
              </motion.div>

              {/* Market */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34 }}
                style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}
              >
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}`, background: surf }}>
                  <h3 style={{ fontSize: 13, fontWeight: 500, color: ink }}>Market opportunity</h3>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <MetricRow label="Total addressable market" value={`$${(metrics.tam / 1_000_000).toFixed(1)}M`}  delay={0.36} />
                  <MetricRow label="Serviceable market (30%)" value={`$${(metrics.sam / 1_000_000).toFixed(1)}M`}  delay={0.39} />
                  <MetricRow label="Conversion rate"          value={`${metrics.conversionRate}%`} progress={metrics.conversionRate}  delay={0.42} />
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* ── Footer cta ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: surf, borderRadius: 12, border: `1px solid ${bdr}` }}
        >
          <p style={{ fontSize: 13, fontWeight: 300, color: muted }}>
            Metrics update automatically when Felix generates a financial summary, or you can enter them manually above.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={openEditor}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 9, border: `1px solid ${bdr}`,
                background: surf, color: ink, fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "opacity 0.15s",
              }}
            >
              <Edit3 style={{ width: 13, height: 13 }} /> Update manually
            </button>
            <Link href="/founder/agents/felix" style={{ textDecoration: "none" }}>
              <button
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 16px", borderRadius: 9, border: "none",
                  background: ink, color: bg, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "opacity 0.15s",
                }}
              >
                Open Felix <ArrowRight style={{ width: 13, height: 13 }} />
              </button>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

type FormState = typeof EMPTY_FORM;

// ─── ManualEntryForm ─────────────────────────────────────────────────────────
function ManualEntryForm({
  form, setForm, saving, saveErr, onSave, onClose,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  saving: boolean;
  saveErr: string | null;
  onSave: () => void;
  onClose: () => void;
}) {
  function set(k: keyof FormState, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  return (
    <motion.div
      key="manual-form"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      style={{
        border: `1px solid ${blue}33`, background: "#EFF6FF",
        borderRadius: 16, padding: "24px 24px 20px",
        marginBottom: 24,
      }}
    >
      {/* form header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>Update metrics manually</p>
          <p style={{ fontSize: 12, fontWeight: 300, color: muted, marginTop: 2 }}>
            Changes are saved as a snapshot — previous data is preserved.
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", color: muted }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Revenue & burn */}
      <p style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Revenue &amp; burn</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <NumInput label="MRR" prefix="$" value={form.mrr} onChange={v => set("mrr", v)} placeholder="12400" />
        <NumInput label="Monthly Burn" prefix="$" value={form.monthlyBurn} onChange={v => set("monthlyBurn", v)} placeholder="8000" />
        <NumInput label="Runway" suffix="mo" value={form.runway} onChange={v => set("runway", v)} placeholder="18" />
      </div>

      {/* Unit economics */}
      <p style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Unit economics</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <NumInput label="LTV" prefix="$" value={form.ltv} onChange={v => set("ltv", v)} placeholder="2400" />
        <NumInput label="CAC" prefix="$" value={form.cac} onChange={v => set("cac", v)} placeholder="800" />
        <NumInput label="Gross Margin" suffix="%" value={form.grossMargin} onChange={v => set("grossMargin", v)} placeholder="72" />
      </div>

      {/* Growth & market */}
      <p style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Growth &amp; market</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <NumInput label="Customers" value={form.customers} onChange={v => set("customers", v)} placeholder="42" />
        <NumInput label="MRR Growth" suffix="%" value={form.mrrGrowth} onChange={v => set("mrrGrowth", v)} placeholder="12" />
        <NumInput label="TAM" prefix="$" suffix="M" value={form.tam} onChange={v => set("tam", v)} placeholder="500" />
        <NumInput label="Conversion Rate" suffix="%" value={form.conversionRate} onChange={v => set("conversionRate", v)} placeholder="2.4" />
      </div>

      {/* Error */}
      {saveErr && (
        <p style={{ fontSize: 12, color: red, marginBottom: 14 }}>{saveErr}</p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            padding: "10px 18px", borderRadius: 9, border: `1px solid ${bdr}`,
            background: "transparent", color: muted, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          onMouseEnter={e => !saving && (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 20px", borderRadius: 9, border: "none",
            background: blue, color: "#fff", fontSize: 13, fontWeight: 500,
            cursor: saving ? "not-allowed" : "pointer", transition: "opacity 0.15s",
            opacity: saving ? 0.6 : 1, fontFamily: "inherit",
          }}
        >
          {saving ? <RefreshCw style={{ width: 13, height: 13 }} className="animate-spin" /> : <Save style={{ width: 13, height: 13 }} />}
          {saving ? "Saving…" : "Save metrics"}
        </button>
      </div>
    </motion.div>
  );
}
