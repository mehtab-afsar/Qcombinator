"use client";

import { Check, X, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { useState } from "react";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const red   = "#DC2626";
const amber = "#D97706";

// ─── types ────────────────────────────────────────────────────────────────────
interface ConnectionRequest {
  id: string;
  founderName: string;
  startupName: string;
  oneLiner: string;
  qScore: number;
  qScorePercentile: number;
  qScoreBreakdown: {
    market: number;
    product: number;
    goToMarket: number;
    financial: number;
    team: number;
    traction: number;
  };
  personalMessage?: string;
  requestedDate: string;
  stage: string;
  industry: string;
  fundingTarget: string;
}

interface ConnectionRequestCardProps {
  request: ConnectionRequest;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

function qScoreColor(score: number): string {
  if (score >= 80) return green;
  if (score >= 70) return blue;
  if (score >= 60) return amber;
  return red;
}

const DIMENSION_LABELS: Record<string, string> = {
  market: "Market", product: "Product", goToMarket: "GTM",
  financial: "Financial", team: "Team", traction: "Traction",
};

// ─── component ────────────────────────────────────────────────────────────────
export function ConnectionRequestCard({ request, onAccept, onDecline }: ConnectionRequestCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const qColor = qScoreColor(request.qScore);
  const initials = request.founderName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ padding: "20px 20px", background: bg }}>

      {/* ── top row ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>

        {/* avatar */}
        <div style={{
          height: 44, width: 44, borderRadius: 12, flexShrink: 0,
          background: surf, border: `1px solid ${bdr}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: muted,
        }}>
          {initials}
        </div>

        {/* info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>{request.founderName}</p>
            <span style={{ fontSize: 13, color: muted }}>·</span>
            <p style={{ fontSize: 13, color: muted, fontWeight: 500 }}>{request.startupName}</p>
          </div>
          <p style={{ fontSize: 12, color: muted, marginBottom: 8, lineHeight: 1.5 }}>{request.oneLiner}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[request.stage, request.industry].map(tag => (
              <span key={tag} style={{
                padding: "2px 9px", fontSize: 11, color: muted,
                background: surf, border: `1px solid ${bdr}`, borderRadius: 999,
              }}>
                {tag}
              </span>
            ))}
            <span style={{
              padding: "2px 9px", fontSize: 11, color: muted,
              background: surf, border: `1px solid ${bdr}`, borderRadius: 999,
              display: "inline-flex", alignItems: "center", gap: 3,
            }}>
              <DollarSign style={{ height: 9, width: 9 }} />
              {request.fundingTarget}
            </span>
          </div>
        </div>

        {/* Q-Score badge */}
        <div style={{
          textAlign: "center", padding: "10px 14px", flexShrink: 0,
          border: `2px solid ${qColor}30`,
          background: `${qColor}08`,
          borderRadius: 12,
        }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: qColor, lineHeight: 1 }}>{request.qScore}</p>
          <p style={{ fontSize: 10, color: muted, fontWeight: 600, marginTop: 2 }}>Q-Score</p>
          <p style={{ fontSize: 9, color: muted, marginTop: 1 }}>{request.qScorePercentile}th %ile</p>
        </div>
      </div>

      {/* ── personal message ────────────────────────────────────────────── */}
      {request.personalMessage && (
        <div style={{
          background: surf, borderLeft: `3px solid ${bdr}`,
          borderRadius: "0 8px 8px 0", padding: "9px 12px", marginBottom: 14,
        }}>
          <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, fontStyle: "italic" }}>
            &ldquo;{request.personalMessage}&rdquo;
          </p>
        </div>
      )}

      {/* ── Q-Score breakdown toggle ─────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => setShowDetails(v => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", fontSize: 12, fontWeight: 500, color: ink,
            background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
            cursor: "pointer", fontFamily: "inherit", transition: "background 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = bdr)}
          onMouseLeave={e => (e.currentTarget.style.background = surf)}
        >
          <span>Q-Score Breakdown</span>
          {showDetails
            ? <ChevronUp style={{ height: 13, width: 13, color: muted }} />
            : <ChevronDown style={{ height: 13, width: 13, color: muted }} />
          }
        </button>

        {showDetails && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8,
            marginTop: 8, padding: "12px 12px",
            background: surf, border: `1px solid ${bdr}`, borderRadius: 10,
          }}>
            {Object.entries(request.qScoreBreakdown).map(([key, value]) => {
              const col = qScoreColor(value);
              return (
                <div key={key} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: col }}>{value}</p>
                  <p style={{ fontSize: 10, color: muted }}>{DIMENSION_LABELS[key] || key}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── footer: date + actions ──────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 12, borderTop: `1px solid ${bdr}`,
      }}>
        <p style={{ fontSize: 11, color: muted }}>
          Requested {new Date(request.requestedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onDecline(request.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 16px", fontSize: 12, fontWeight: 500,
              color: red, background: "transparent",
              border: "1px solid #FCA5A5", borderRadius: 8,
              cursor: "pointer", fontFamily: "inherit", transition: "background 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <X style={{ height: 12, width: 12 }} />
            Decline
          </button>

          <button
            onClick={() => onAccept(request.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 16px", fontSize: 12, fontWeight: 700,
              color: bg, background: ink,
              border: "none", borderRadius: 8,
              cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Check style={{ height: 12, width: 12 }} />
            Accept &amp; Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
