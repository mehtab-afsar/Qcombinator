"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { bg, bdr, ink, muted } from "@/lib/constants/colors";
import { monthLabel } from "@/features/academy/lib/calendarDate";

interface CalendarHeaderProps {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarHeader({ month, onPrev, onNext, onToday }: CalendarHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 500, color: ink, margin: 0 }}>
        {monthLabel(month)}
      </h3>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={onToday}
          style={{
            fontSize: 12, fontWeight: 400, color: muted, background: bg,
            border: `1px solid ${bdr}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer",
          }}
        >
          Today
        </button>
        <button
          onClick={onPrev}
          aria-label="Previous month"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 8, border: `1px solid ${bdr}`,
            background: bg, cursor: "pointer", color: ink,
          }}
        >
          <ChevronLeft style={{ width: 15, height: 15 }} />
        </button>
        <button
          onClick={onNext}
          aria-label="Next month"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 8, border: `1px solid ${bdr}`,
            background: bg, cursor: "pointer", color: ink,
          }}
        >
          <ChevronRight style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  );
}
