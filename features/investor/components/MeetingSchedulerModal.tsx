"use client";

import { useState } from "react";
import { Calendar, Clock, Video, Send, X } from "lucide-react";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";

// ─── types ────────────────────────────────────────────────────────────────────
interface MeetingSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (date: string, time: string, notes: string) => void;
  founderName: string;
  startupName: string;
}

const TIME_SLOTS = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM",  "2:00 PM",  "3:00 PM",  "4:00 PM", "5:00 PM",
];

// ─── component ────────────────────────────────────────────────────────────────
export function MeetingSchedulerModal({
  isOpen, onClose, onSchedule, founderName, startupName,
}: MeetingSchedulerModalProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes,        setNotes]        = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  if (!isOpen) return null;

  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsScheduling(true);
    await new Promise(r => setTimeout(r, 800));
    onSchedule(selectedDate, selectedTime, notes);
    setIsScheduling(false);
    setSelectedDate("");
    setSelectedTime("");
    setNotes("");
  };

  const canSchedule = !!(selectedDate && selectedTime && !isScheduling);

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
        maxWidth: 580, width: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>

        {/* ── header ──────────────────────────────────────────────────── */}
        <div style={{
          padding: "22px 24px 18px", borderBottom: `1px solid ${bdr}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 500, color: ink, letterSpacing: "-0.02em", marginBottom: 2 }}>
              Schedule with {founderName}
            </p>
            <p style={{ fontSize: 12, color: muted }}>{startupName}</p>
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

        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── date picker ─────────────────────────────────────────── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Calendar style={{ height: 12, width: 12, color: muted }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>Select Date</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {availableDates.map(date => {
                const dateStr  = date.toISOString().split("T")[0];
                const selected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      padding: "10px 8px", textAlign: "center", borderRadius: 10,
                      border: `2px solid ${selected ? blue : bdr}`,
                      background: selected ? "#EEF2FF" : surf,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    <p style={{ fontSize: 10, color: selected ? blue : muted, fontWeight: 600 }}>
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: selected ? blue : ink, marginTop: 2 }}>
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── time slots ──────────────────────────────────────────── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Clock style={{ height: 12, width: 12, color: muted }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>Select Time (Your Timezone)</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {TIME_SLOTS.map(time => {
                const selected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    style={{
                      padding: "8px 6px", textAlign: "center", borderRadius: 8,
                      border: `2px solid ${selected ? blue : bdr}`,
                      background: selected ? "#EEF2FF" : surf,
                      fontSize: 12, fontWeight: selected ? 600 : 400, color: selected ? blue : ink,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── meeting format ──────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", background: "#EEF2FF",
            border: "1px solid #C7D2FE", borderRadius: 10,
          }}>
            <Video style={{ height: 16, width: 16, color: blue, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Video Call</p>
              <p style={{ fontSize: 11, color: muted }}>A Zoom link will be sent to both parties</p>
            </div>
            <span style={{
              padding: "2px 9px", fontSize: 10, fontWeight: 700,
              color: blue, background: "#DBEAFE", border: "1px solid #BFDBFE", borderRadius: 999,
            }}>
              Recommended
            </span>
          </div>

          {/* ── notes ───────────────────────────────────────────────── */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6 }}>
              Meeting Notes{" "}
              <span style={{ color: muted, fontWeight: 400 }}>(optional)</span>
            </p>
            <textarea
              placeholder="Topics to discuss, questions, context..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              maxLength={300}
              style={{
                width: "100%", padding: "10px 12px", fontSize: 12, color: ink,
                background: surf, border: `1px solid ${bdr}`, borderRadius: 10,
                outline: "none", fontFamily: "inherit", resize: "none",
                boxSizing: "border-box", transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = muted)}
              onBlur={e  => (e.currentTarget.style.borderColor = bdr)}
            />
            <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>{notes.length}/300</p>
          </div>

          {/* ── summary ─────────────────────────────────────────────── */}
          {selectedDate && selectedTime && (
            <div style={{ padding: "12px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6 }}>Meeting Summary</p>
              {[
                `${founderName} from ${startupName}`,
                new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
                selectedTime,
                "Video call via Zoom",
              ].map((line, i) => (
                <p key={i} style={{ fontSize: 12, color: muted }}>· {line}</p>
              ))}
            </div>
          )}

          {/* ── actions ─────────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
            paddingTop: 4, borderTop: `1px solid ${bdr}`,
          }}>
            <button
              onClick={onClose}
              disabled={isScheduling}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "9px 18px", fontSize: 12, fontWeight: 500,
                color: muted, background: surf, border: `1px solid ${bdr}`,
                borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <X style={{ height: 12, width: 12 }} />
              Cancel
            </button>

            <button
              onClick={handleSchedule}
              disabled={!canSchedule}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 18px", fontSize: 12, fontWeight: 700,
                color: "#fff", background: canSchedule ? green : muted,
                border: "none", borderRadius: 8,
                cursor: canSchedule ? "pointer" : "default",
                fontFamily: "inherit", transition: "background 0.15s",
              }}
            >
              {isScheduling ? "Scheduling…" : (
                <>
                  <Send style={{ height: 12, width: 12 }} />
                  Confirm &amp; Send Invitation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
