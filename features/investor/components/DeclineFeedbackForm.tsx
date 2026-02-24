"use client";

import { useState } from "react";
import { X, Send, Check } from "lucide-react";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const red   = "#DC2626";

// ─── types ────────────────────────────────────────────────────────────────────
interface DeclineFeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reasons: string[], feedback: string) => void;
  founderName: string;
  startupName: string;
}

const DECLINE_REASONS = [
  { id: "stage",     label: "Not at the right stage for our fund" },
  { id: "sector",    label: "Outside our investment focus area" },
  { id: "geography", label: "Geographic mismatch" },
  { id: "portfolio", label: "Conflict with existing portfolio company" },
  { id: "capacity",  label: "Currently at capacity for new investments" },
  { id: "thesis",    label: "Does not align with our investment thesis" },
  { id: "other",     label: "Other reason" },
];

// ─── component ────────────────────────────────────────────────────────────────
export function DeclineFeedbackForm({
  isOpen, onClose, onSubmit, founderName, startupName,
}: DeclineFeedbackFormProps) {
  const [selectedReasons,    setSelectedReasons]    = useState<string[]>([]);
  const [additionalFeedback, setAdditionalFeedback] = useState("");
  const [isSubmitting,       setIsSubmitting]       = useState(false);

  if (!isOpen) return null;

  const toggleReason = (id: string) => {
    setSelectedReasons(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    onSubmit(selectedReasons, additionalFeedback);
    setIsSubmitting(false);
    setSelectedReasons([]);
    setAdditionalFeedback("");
  };

  const handleSkip = () => {
    onSubmit([], "");
    setSelectedReasons([]);
    setAdditionalFeedback("");
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(24,22,15,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: bg, border: `1px solid ${bdr}`, borderRadius: 18,
        maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>

        {/* ── header ──────────────────────────────────────────────────── */}
        <div style={{
          padding: "22px 24px 18px", borderBottom: `1px solid ${bdr}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 500, color: ink, letterSpacing: "-0.02em", marginBottom: 2 }}>
              Decline Request
            </p>
            <p style={{ fontSize: 12, color: muted }}>{founderName} · {startupName}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              height: 32, width: 32, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: surf, border: `1px solid ${bdr}`, borderRadius: 8, cursor: "pointer",
            }}
          >
            <X style={{ height: 13, width: 13, color: muted }} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* ── info banner ─────────────────────────────────────────── */}
          <div style={{ padding: "10px 14px", background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>
              Providing feedback (optional) helps founders improve. Your identity will be shared anonymously.
            </p>
          </div>

          {/* ── reasons checklist ───────────────────────────────────── */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 10 }}>
              Reason for declining{" "}
              <span style={{ color: muted, fontWeight: 400 }}>(optional)</span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DECLINE_REASONS.map(reason => {
                const checked = selectedReasons.includes(reason.id);
                return (
                  <div
                    key={reason.id}
                    onClick={() => toggleReason(reason.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px",
                      background: checked ? surf : "transparent",
                      border: `1px solid ${checked ? bdr : "transparent"}`,
                      borderRadius: 8, cursor: "pointer", transition: "all 0.12s",
                    }}
                  >
                    <div style={{
                      height: 16, width: 16, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${checked ? ink : bdr}`,
                      background: checked ? ink : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.12s",
                    }}>
                      {checked && <Check style={{ height: 10, width: 10, color: bg }} />}
                    </div>
                    <p style={{ fontSize: 13, color: checked ? ink : muted }}>{reason.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── additional feedback ─────────────────────────────────── */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6 }}>
              Additional feedback{" "}
              <span style={{ color: muted, fontWeight: 400 }}>(optional)</span>
            </p>
            <textarea
              placeholder="Constructive feedback for the founder..."
              value={additionalFeedback}
              onChange={e => setAdditionalFeedback(e.target.value)}
              rows={4}
              maxLength={500}
              style={{
                width: "100%", padding: "10px 12px", fontSize: 12, color: ink,
                background: surf, border: `1px solid ${bdr}`, borderRadius: 10,
                outline: "none", fontFamily: "inherit", resize: "none",
                boxSizing: "border-box", transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = muted)}
              onBlur={e  => (e.currentTarget.style.borderColor = bdr)}
            />
            <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>{additionalFeedback.length}/500</p>
          </div>

          {/* ── privacy note ────────────────────────────────────────── */}
          <div style={{ padding: "9px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 8 }}>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>
              <strong style={{ color: ink }}>Privacy:</strong>{" "}
              Feedback is shared anonymously. The founder will not see your name or firm.
            </p>
          </div>

          {/* ── actions ─────────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingTop: 4, borderTop: `1px solid ${bdr}`,
          }}>
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              style={{
                fontSize: 12, color: muted, background: "none", border: "none",
                cursor: "pointer", padding: "9px 4px", fontFamily: "inherit",
              }}
            >
              Skip &amp; Decline
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "9px 16px", fontSize: 12, fontWeight: 500,
                  color: muted, background: surf, border: `1px solid ${bdr}`,
                  borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <X style={{ height: 12, width: 12 }} />
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "9px 16px", fontSize: 12, fontWeight: 700,
                  color: "#fff", background: isSubmitting ? muted : red,
                  border: "none", borderRadius: 8,
                  cursor: isSubmitting ? "default" : "pointer",
                  fontFamily: "inherit", transition: "background 0.15s",
                }}
              >
                {isSubmitting ? "Submitting…" : (
                  <>
                    <Send style={{ height: 12, width: 12 }} />
                    Decline with Feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
