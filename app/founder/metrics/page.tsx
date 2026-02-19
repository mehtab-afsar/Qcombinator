"use client";

import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  BarChart3, CheckCircle, AlertCircle, RefreshCw,
  ArrowRight, Minus, Activity,
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function MetricsTracker() {
  const { metrics, healthStatus, loading } = useMetrics();

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

  if (!metrics) {
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
            Complete your assessment to unlock your startup's key performance indicators.
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

  const healthOk = healthStatus?.overall === "healthy";
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
            <p style={{ fontSize: 12, fontWeight: 300, color: muted }}>
              Updated {new Date(metrics.calculatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </motion.div>

        {/* ── Health banner ──────────────────────────────────────────── */}
        {healthStatus && (
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

        {/* ── Footer cta ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: surf, borderRadius: 12, border: `1px solid ${bdr}` }}
        >
          <p style={{ fontSize: 13, fontWeight: 300, color: muted }}>
            Metrics update when you retake your assessment.
          </p>
          <Link href="/founder/assessment" style={{ textDecoration: "none" }}>
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
              Refresh metrics <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
