"use client";

/**
 * WeeklyCheckin — YC-style Monday morning accountability modal.
 *
 * Shown when:
 *   1. It is Monday and the founder has not checked in this week, OR
 *   2. The founder has never set a weekly goal (weekly_checkin_at is null).
 *
 * Collects:
 *   - Primary metric + current value (self-reported)
 *   - Last week's goal outcome (hit / missed / partial)
 *   - This week's #1 goal (free text)
 *
 * Saves to: founder_profiles.weekly_goal, weekly_metric_value, weekly_checkin_at
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  bg, surf, bdr, ink, muted, blue, green, amber, red, alpha,
} from "@/lib/constants/colors";

interface Props {
  userId: string;
  lastGoal: string | null;
  onComplete: (goal: string, metric: string) => void;
  onDismiss: () => void;
}

type Outcome = "hit" | "partial" | "missed" | null;

const METRIC_LABELS = [
  "MRR (Monthly Recurring Revenue)",
  "Weekly Active Users",
  "Customer calls this week",
  "Signups / leads",
  "Daily Active Users",
  "Conversion rate",
  "Churn rate",
  "NPS score",
  "Other",
];

const OUTCOME_OPTIONS: { value: Outcome; label: string; color: string }[] = [
  { value: "hit",     label: "✅  Hit it",     color: green },
  { value: "partial", label: "⚠️  Partial",    color: amber },
  { value: "missed",  label: "❌  Missed it",   color: red   },
];

export function WeeklyCheckin({ userId, lastGoal, onComplete, onDismiss }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(lastGoal ? 1 : 2);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [metric, setMetric] = useState(METRIC_LABELS[0]);
  const [metricValue, setMetricValue] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!goal.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const metricStr = `${metric}: ${metricValue.trim() || "not set"}`;
    const { error: dbErr } = await supabase
      .from("founder_profiles")
      .update({
        weekly_goal: goal.trim(),
        weekly_metric_value: metricStr,
        weekly_checkin_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (dbErr) {
      setError("Could not save — please try again.");
      setSaving(false);
      return;
    }
    onComplete(goal.trim(), metricStr);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(24,22,15,0.55)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          style={{
            background: bg, borderRadius: 16, border: `1px solid ${bdr}`,
            width: "100%", maxWidth: 480, padding: "32px",
            position: "relative",
          }}
        >
          {/* Close */}
          <button
            onClick={onDismiss}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "none", border: "none", cursor: "pointer",
              color: muted, padding: 4,
            }}
          >
            <X style={{ height: 16, width: 16 }} />
          </button>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: alpha(blue, 0.08), borderRadius: 20,
              padding: "4px 12px", marginBottom: 12,
            }}>
              <Target style={{ height: 12, width: 12, color: blue }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: blue, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Weekly check-in
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.3 }}>
              {step === 1
                ? "How did last week go?"
                : step === 2
                ? "Where are you right now?"
                : "What's your #1 goal this week?"}
            </h2>
            <p style={{ fontSize: 13, color: muted, marginTop: 6, marginBottom: 0 }}>
              {step === 1
                ? `Last week you said: "${lastGoal}"`
                : step === 2
                ? "Pick your primary metric and its current value."
                : "One goal. Not three. Just the thing that matters most."}
            </p>
          </div>

          {/* Step 1 — last week outcome */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {OUTCOME_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setOutcome(o.value)}
                  style={{
                    padding: "12px 16px", borderRadius: 10,
                    border: `1.5px solid ${outcome === o.value ? o.color : bdr}`,
                    background: outcome === o.value ? alpha(o.color, 0.06) : surf,
                    cursor: "pointer", textAlign: "left",
                    fontSize: 14, fontWeight: outcome === o.value ? 600 : 500,
                    color: outcome === o.value ? o.color : ink,
                    transition: "all 0.15s",
                  }}
                >
                  {o.label}
                </button>
              ))}
              <button
                onClick={() => setStep(2)}
                disabled={!outcome}
                style={{
                  marginTop: 8, padding: "12px 20px", borderRadius: 10,
                  background: outcome ? blue : alpha(ink, 0.08),
                  border: "none", color: outcome ? "#fff" : muted,
                  fontWeight: 600, fontSize: 14, cursor: outcome ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 — primary metric */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>
                  PRIMARY METRIC
                </label>
                <select
                  value={metric}
                  onChange={e => setMetric(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: `1px solid ${bdr}`, background: surf,
                    fontSize: 14, color: ink, outline: "none",
                  }}
                >
                  {METRIC_LABELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>
                  CURRENT VALUE
                </label>
                <input
                  type="text"
                  value={metricValue}
                  onChange={e => setMetricValue(e.target.value)}
                  placeholder="e.g. $2,400 MRR, 47 DAUs, 3 calls"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: `1px solid ${bdr}`, background: surf,
                    fontSize: 14, color: ink, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                onClick={() => setStep(3)}
                style={{
                  marginTop: 4, padding: "12px 20px", borderRadius: 10,
                  background: blue, border: "none", color: "#fff",
                  fontWeight: 600, fontSize: 14, cursor: "pointer",
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 3 — this week's goal */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>
                  THIS WEEK&apos;S #1 GOAL
                </label>
                <textarea
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="e.g. Close 2 paying customers, ship onboarding flow, do 5 customer calls"
                  rows={3}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: `1px solid ${bdr}`, background: surf,
                    fontSize: 14, color: ink, outline: "none",
                    resize: "vertical", boxSizing: "border-box", fontFamily: "inherit",
                  }}
                />
                <p style={{ fontSize: 11, color: muted, marginTop: 6 }}>
                  Be specific. &quot;Do customer calls&quot; → &quot;Complete 5 discovery calls with B2B SaaS CTOs.&quot;
                </p>
              </div>
              {error && (
                <p style={{ fontSize: 12, color: red, margin: 0 }}>{error}</p>
              )}
              <button
                onClick={submit}
                disabled={saving || !goal.trim()}
                style={{
                  padding: "13px 20px", borderRadius: 10,
                  background: goal.trim() && !saving ? blue : alpha(ink, 0.08),
                  border: "none", color: goal.trim() && !saving ? "#fff" : muted,
                  fontWeight: 600, fontSize: 14,
                  cursor: goal.trim() && !saving ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {saving ? "Saving…" : (
                  <>
                    <CheckCircle2 style={{ height: 15, width: 15 }} />
                    Set this week&apos;s goal
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step indicator */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 6, marginTop: 24,
          }}>
            {([1, 2, 3] as const).map(s => (
              <div
                key={s}
                style={{
                  height: 4, width: s === step ? 20 : 4, borderRadius: 2,
                  background: s === step ? blue : alpha(ink, 0.12),
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
