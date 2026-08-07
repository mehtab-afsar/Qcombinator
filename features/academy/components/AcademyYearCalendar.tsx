"use client";

import { useMemo } from "react";
import { bg, bdr, ink } from "@/lib/constants/colors";
import { CalendarGrid } from "@/features/academy/components/CalendarGrid";
import { monthLabel } from "@/features/academy/lib/calendarDate";
import type { Workshop } from "@/features/academy/types/academy.types";

interface AcademyYearCalendarProps {
  year: number;
  workshops: Workshop[];
  /** A day with an event was clicked — hand off to the month view rather than
   *  cramming a detail panel under a compact 12-up cell. */
  onSelectDate: (dateKey: string, monthAnchor: Date) => void;
}

export function AcademyYearCalendar({ year, workshops, onSelectDate }: AcademyYearCalendarProps) {
  const monthAnchors = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(year, i, 1))),
    [year]
  );

  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 500, color: ink, margin: "0 0 16px" }}>{year}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {monthAnchors.map(monthAnchor => (
          <div key={monthAnchor.toISOString()}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: ink, margin: "0 0 6px", textAlign: "center" }}>
              {monthLabel(monthAnchor)}
            </h4>
            <CalendarGrid
              month={monthAnchor}
              workshops={workshops}
              selectedDateKey={null}
              onSelectDate={(dateKey) => onSelectDate(dateKey, monthAnchor)}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}
