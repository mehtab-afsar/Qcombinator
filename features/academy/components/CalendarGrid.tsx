"use client";

import { useMemo } from "react";
import { bg, surf, ink, muted } from "@/lib/constants/colors";
import { getMonthGrid, workshopDateKey } from "@/features/academy/lib/calendarDate";
import type { Workshop } from "@/features/academy/types/academy.types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarGridProps {
  month: Date;
  workshops: Workshop[];
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
}

export function CalendarGrid({ month, workshops, selectedDateKey, onSelectDate }: CalendarGridProps) {
  const cells = useMemo(() => getMonthGrid(month), [month]);

  // Only workshops with a real starts_at land on the grid — see calendarDate.ts.
  const countByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of workshops) {
      const key = workshopDateKey(w);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [workshops]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
        {WEEKDAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: muted, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map(cell => {
          const count = countByDate.get(cell.dateKey) ?? 0;
          const hasEvent = count > 0;
          const isSelected = cell.dateKey === selectedDateKey;

          return (
            <button
              key={cell.dateKey}
              onClick={() => hasEvent && onSelectDate(cell.dateKey)}
              disabled={!hasEvent}
              style={{
                aspectRatio: "1", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                borderRadius: 10, border: `1px solid ${isSelected ? ink : "transparent"}`,
                background: isSelected ? ink : hasEvent ? surf : "transparent",
                cursor: hasEvent ? "pointer" : "default",
                opacity: cell.inMonth ? 1 : 0.32,
                transition: "all 0.14s",
                padding: 0,
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: cell.isToday ? 700 : 400,
                color: isSelected ? bg : cell.isToday ? ink : hasEvent ? ink : muted,
              }}>
                {cell.date.getUTCDate()}
              </span>
              {hasEvent && (
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: isSelected ? bg : ink,
                  opacity: isSelected ? 0.85 : 1,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
