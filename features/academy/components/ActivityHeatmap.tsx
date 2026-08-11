"use client";

/**
 * A GitHub-style contribution heatmap — real agent_activity rows for this founder, bucketed
 * by day. Not Academy-specific data (workshop registrations alone are far too sparse for a
 * daily grid — a handful a year, not a handful a day); agent_activity is the real, continuously
 * written record of what a founder's team actually did for them, so every filled cell here is
 * a real thing that really happened, not a placeholder.
 */

import { useEffect, useState } from "react";
import { bdr, blue, muted, ink, alpha } from "@/lib/constants/colors";
import { toDateKey } from "@/features/academy/lib/calendarDate";
import { fetchActivityHeatmap } from "@/features/founder/services/activity.service";

const WEEKS = 53;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LEVEL_COLORS = [bdr, alpha(blue, 0.28), alpha(blue, 0.52), alpha(blue, 0.76), blue];

interface Cell {
  dateKey: string;
  count: number;
  inRange: boolean;
}

function buildWeeks(counts: Record<string, number>): Cell[][] {
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const start = new Date(todayUTC);
  start.setUTCDate(start.getUTCDate() - (WEEKS * 7 - 1));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // roll back to the preceding Sunday

  const weeks: Cell[][] = [];
  const cursor = new Date(start);
  while (cursor <= todayUTC) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const inRange = cursor <= todayUTC;
      const dateKey = toDateKey(cursor);
      week.push({ dateKey, count: inRange ? (counts[dateKey] ?? 0) : 0, inRange });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function levelFor(count: number, max: number): number {
  if (count === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

export function ActivityHeatmap() {
  const [weeks, setWeeks]         = useState<Cell[][] | null>(null);
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchActivityHeatmap().then(timestamps => {
      if (cancelled) return;
      const counts: Record<string, number> = {};
      for (const ts of timestamps) {
        const key = toDateKey(new Date(ts));
        counts[key] = (counts[key] ?? 0) + 1;
      }
      setActiveDays(Object.keys(counts).length);
      setWeeks(buildWeeks(counts));
    });
    return () => { cancelled = true; };
  }, []);

  if (!weeks) return null;

  const max = Math.max(1, ...weeks.flat().map(c => c.count));

  return (
    <div style={{ background: "transparent" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: ink, margin: 0 }}>Your activity</h2>
        <span style={{ fontSize: 12, color: muted }}>
          {activeDays} active day{activeDays === 1 ? "" : "s"} in the last year
        </span>
      </div>

      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {/* day-of-week labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, paddingTop: 1 }}>
          {DAY_LABELS.map((label, i) => (
            <span key={i} style={{ height: 11, fontSize: 9, color: muted, lineHeight: "11px" }}>{label}</span>
          ))}
        </div>

        {/* week columns */}
        <div style={{ display: "flex", gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map(cell => (
                <div
                  key={cell.dateKey}
                  title={cell.inRange ? `${cell.count} ${cell.count === 1 ? "activity" : "activities"} on ${formatDate(cell.dateKey)}` : undefined}
                  style={{
                    width: 11, height: 11, borderRadius: 3,
                    background: cell.inRange ? LEVEL_COLORS[levelFor(cell.count, max)] : "transparent",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}>
        <span style={{ fontSize: 10, color: muted }}>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
        ))}
        <span style={{ fontSize: 10, color: muted }}>More</span>
      </div>
    </div>
  );
}
