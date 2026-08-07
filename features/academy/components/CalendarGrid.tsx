"use client";

import { useMemo } from "react";
import { bg, surf, ink, muted, blue, green } from "@/lib/constants/colors";
import { getMonthGrid, workshopDateKey, isTodayOrFuture } from "@/features/academy/lib/calendarDate";
import type { Workshop } from "@/features/academy/types/academy.types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_COMPACT = ["S", "M", "T", "W", "T", "F", "S"];

interface CalendarGridProps {
  month: Date;
  workshops: Workshop[];
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
  /** Smaller cells/font, single-letter weekday labels — for the 12-up year view. */
  compact?: boolean;
}

export function CalendarGrid({ month, workshops, selectedDateKey, onSelectDate, compact = false }: CalendarGridProps) {
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

  const cellGap = compact ? 2 : 4;
  const cellRadius = compact ? 5 : 10;
  const dayFontSize = compact ? 9 : 13;
  const markerSize = compact ? 4 : 5;
  const weekdayFontSize = compact ? 9 : 10;
  const weekdayLabels = compact ? WEEKDAY_LABELS_COMPACT : WEEKDAY_LABELS;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: cellGap, marginBottom: 6 }}>
        {weekdayLabels.map((d, i) => (
          <div key={`wd-${i}`} style={{ textAlign: "center", fontSize: weekdayFontSize, fontWeight: 600, color: muted, letterSpacing: "0.06em", textTransform: "uppercase", padding: compact ? "2px 0" : "4px 0" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: cellGap }}>
        {cells.map(cell => {
          const count = countByDate.get(cell.dateKey) ?? 0;
          const hasEvent = count > 0;
          const isSelected = cell.dateKey === selectedDateKey;
          const isTodayCell = cell.isToday;
          const isFutureEvent = hasEvent && isTodayOrFuture(cell.dateKey);

          return (
            <button
              key={cell.dateKey}
              onClick={() => hasEvent && onSelectDate(cell.dateKey)}
              disabled={!hasEvent}
              style={{
                aspectRatio: "1", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                borderRadius: cellRadius, border: `1px solid ${isSelected ? ink : "transparent"}`,
                background: isSelected ? ink : hasEvent ? surf : "transparent",
                cursor: hasEvent ? "pointer" : "default",
                opacity: cell.inMonth ? 1 : 0.32,
                transition: "all 0.14s",
                padding: 0,
              }}
            >
              <span style={{
                fontSize: dayFontSize,
                fontWeight: isTodayCell ? 700 : 400,
                color: isSelected ? bg : isTodayCell ? blue : hasEvent ? ink : muted,
              }}>
                {cell.date.getUTCDate()}
              </span>
              {(isTodayCell || hasEvent) && (
                <span style={{
                  width: markerSize, height: markerSize, borderRadius: "50%",
                  background: isSelected ? bg : isTodayCell ? blue : isFutureEvent ? green : muted,
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
