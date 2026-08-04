"use client";

import { useState } from "react";
import { Calendar, Clock, Users, ArrowRight, ExternalLink, X as XIcon } from "lucide-react";
import { bg, surf, bdr, ink, muted, red } from "@/lib/constants/colors";
import { buildGoogleCalendarUrl } from "@/features/academy/lib/googleCalendarLink";
import type { Workshop } from "@/features/academy/types/academy.types";

const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  "go-to-market": { bg: "#EEF2FF", text: "#3730A3" },
  product:        { bg: "#F0FDF4", text: "#166534" },
  fundraising:    { bg: "#FFF7ED", text: "#9A3412" },
  team:           { bg: "#FDF4FF", text: "#6B21A8" },
  sales:          { bg: "#FFF1F2", text: "#9F1239" },
  operations:     { bg: "#F0FDFA", text: "#134E4A" },
};

export interface RegisterResult { ok: boolean; full?: boolean; error?: string }

interface DayWorkshopPanelProps {
  dateLabel: string;
  workshops: Workshop[];
  registeredIds: Set<string>;
  onRegister: (workshopId: string) => Promise<RegisterResult>;
  onUnregister: (workshopId: string) => Promise<RegisterResult>;
  onClose: () => void;
}

export function DayWorkshopPanel({ dateLabel, workshops, registeredIds, onRegister, onUnregister, onClose }: DayWorkshopPanelProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [fullIds, setFullIds]     = useState<Set<string>>(new Set());

  async function handleRegister(id: string) {
    setPendingId(id);
    const result = await onRegister(id);
    if (!result.ok && result.full) {
      setFullIds(prev => new Set(prev).add(id));
    }
    setPendingId(null);
  }

  async function handleUnregister(id: string) {
    setPendingId(id);
    await onUnregister(id);
    setPendingId(null);
  }

  return (
    <div style={{ marginTop: 16, background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
          {dateLabel}
        </h4>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4, display: "flex" }}
        >
          <XIcon style={{ width: 15, height: 15 }} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {workshops.map(w => {
          const topicStyle = TOPIC_COLORS[w.topic] ?? { bg, text: muted };
          const isRegistered = registeredIds.has(w.id);
          const isFull = fullIds.has(w.id) || (!isRegistered && w.spotsLeft <= 0);
          const isPending = pendingId === w.id;
          const pct = w.capacity > 0 ? Math.round((w.registered / w.capacity) * 100) : 0;

          return (
            <div key={w.id} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "3px 9px", borderRadius: 99, background: topicStyle.bg, color: topicStyle.text,
                }}>
                  {w.topic.replace("-", " ")}
                </span>
                <span style={{ fontSize: 11, color: isFull ? red : muted, fontWeight: isFull ? 600 : 400, whiteSpace: "nowrap" }}>
                  {isFull ? "Workshop full" : `${w.spotsLeft} spots left`}
                </span>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 500, color: ink, marginBottom: 8 }}>{w.title}</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {[
                  { icon: Calendar, text: w.time },
                  { icon: Clock,    text: w.duration },
                  { icon: Users,    text: `${w.instructor} · ${w.instructorTitle}` },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: muted }}>
                    <Icon style={{ width: 12, height: 12, flexShrink: 0 }} />
                    {text}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 3, background: bdr, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: pct > 80 ? red : ink }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isRegistered ? (
                  <>
                    <button
                      onClick={() => handleUnregister(w.id)}
                      disabled={isPending}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 9, border: `1px solid ${bdr}`,
                        background: bg, color: ink, fontSize: 13, fontWeight: 400,
                        cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
                      }}
                    >
                      {isPending ? "Updating…" : "You're registered — Unregister"}
                    </button>
                    <a
                      href={buildGoogleCalendarUrl(w)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 7, padding: "10px 0", borderRadius: 9, border: "none",
                        background: ink, color: bg, fontSize: 13, fontWeight: 500,
                        textDecoration: "none", boxSizing: "border-box",
                      }}
                    >
                      Add to Google Calendar
                      <ExternalLink style={{ width: 13, height: 13 }} />
                    </a>
                  </>
                ) : (
                  <button
                    onClick={() => handleRegister(w.id)}
                    disabled={isPending || isFull}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 8, padding: "11px 0", borderRadius: 9, border: "none",
                      background: isFull ? bdr : ink, color: isFull ? muted : bg,
                      fontSize: 13, fontWeight: 500,
                      cursor: isFull || isPending ? "not-allowed" : "pointer",
                      opacity: isPending ? 0.7 : 1,
                    }}
                  >
                    {isFull ? "Workshop full" : isPending ? "Registering…" : "Reserve My Spot"}
                    {!isFull && !isPending && <ArrowRight style={{ width: 14, height: 14 }} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
