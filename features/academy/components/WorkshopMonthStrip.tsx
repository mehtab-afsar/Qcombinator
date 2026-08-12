"use client";

/**
 * Workshop timeline strip — one continuously horizontally-scrollable row of days (today through
 * +90 days), not a month-by-month grid paged with arrows. Days with a workshop are highlighted;
 * click one to expand it below the strip and register right there — same DayWorkshopPanel/
 * register flow the grid calendar (further down, in the "Calendar" view) uses.
 *
 * No prev/next chevrons — the strip scrolls (drag/wheel/touch) instead of paging. The one
 * control is "Today", which scrolls back to the start of the strip once you've moved away from it.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { bg, surf, bdr, ink, muted, blue, green } from "@/lib/constants/colors";
import { DayWorkshopPanel, type RegisterResult } from "@/features/academy/components/DayWorkshopPanel";
import { groupWorkshopsByDate, isTodayOrFuture, toDateKey } from "@/features/academy/lib/calendarDate";
import type { Workshop } from "@/features/academy/types/academy.types";

const DAYS_AHEAD = 90;
const CELL_WIDTH = 42;

interface StripDay {
  date: Date;
  dateKey: string;
  isToday: boolean;
}

interface WorkshopMonthStripProps {
  workshops: Workshop[];
  registeredIds: Set<string>;
  onRegister: (workshopId: string) => Promise<RegisterResult>;
  onUnregister: (workshopId: string) => Promise<RegisterResult>;
}

interface MonthStripDayCellProps {
  day: StripDay;
  dayWorkshops: Workshop[];
  isSelected: boolean;
  onSelect: () => void;
}

function MonthStripDayCell({ day, dayWorkshops, isSelected, onSelect }: MonthStripDayCellProps) {
  const hasEvent = dayWorkshops.length > 0;
  const isFutureEvent = hasEvent && isTodayOrFuture(day.dateKey);
  const dotColor = day.isToday ? blue : isFutureEvent ? green : muted;

  return (
    <button
      onClick={onSelect}
      disabled={!hasEvent}
      title={hasEvent ? (dayWorkshops.length === 1 ? dayWorkshops[0].title : `${dayWorkshops.length} workshops`) : undefined}
      style={{
        width: CELL_WIDTH, flexShrink: 0, aspectRatio: "0.62", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 4,
        borderRadius: 6, border: `1px solid ${isSelected ? ink : "transparent"}`,
        background: isSelected ? ink : hasEvent ? surf : "transparent",
        cursor: hasEvent ? "pointer" : "default",
        padding: 0,
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: day.isToday ? 700 : 400,
        color: isSelected ? bg : day.isToday ? blue : hasEvent ? ink : muted,
      }}>
        {day.date.getUTCDate()}
      </span>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: isSelected ? bg : dotColor,
        opacity: day.isToday || hasEvent ? (isSelected ? 0.85 : 1) : 0,
      }} />
    </button>
  );
}

export function WorkshopMonthStrip({ workshops, registeredIds, onRegister, onUnregister }: WorkshopMonthStripProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const workshopsByDate = useMemo(() => groupWorkshopsByDate(workshops), [workshops]);

  const days: StripDay[] = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayKey = toDateKey(today);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
      const dateKey = toDateKey(date);
      return { date, dateKey, isToday: dateKey === todayKey };
    });
  }, []);

  const hasAnyUpcoming = days.some(d => workshopsByDate.has(d.dateKey));
  const selectedWorkshops = selectedDateKey ? (workshopsByDate.get(selectedDateKey) ?? []) : [];
  const selectedDay = days.find(d => d.dateKey === selectedDateKey);

  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: 24, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: ink, margin: 0 }}>Next {DAYS_AHEAD} days</h3>
        <button
          onClick={() => scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" })}
          style={{
            fontSize: 12, fontWeight: 400, color: muted, background: bg,
            border: `1px solid ${bdr}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer",
          }}
        >
          Today
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-hide" style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4, scrollBehavior: "smooth" }}>
        {days.map(day => {
          const dayWorkshops = workshopsByDate.get(day.dateKey) ?? [];
          const isSelected = day.dateKey === selectedDateKey;

          return (
            <MonthStripDayCell
              key={day.dateKey}
              day={day}
              dayWorkshops={dayWorkshops}
              isSelected={isSelected}
              onSelect={() => dayWorkshops.length > 0 && setSelectedDateKey(isSelected ? null : day.dateKey)}
            />
          );
        })}
      </div>

      {!hasAnyUpcoming && (
        <p style={{ fontSize: 12, color: muted, textAlign: "center", marginTop: 16, marginBottom: 0 }}>
          No upcoming workshops with a scheduled time yet.
        </p>
      )}

      <AnimatePresence>
        {selectedDateKey && selectedWorkshops.length > 0 && selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <DayWorkshopPanel
              dateLabel={selectedDay.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
              workshops={selectedWorkshops}
              registeredIds={registeredIds}
              onRegister={onRegister}
              onUnregister={onUnregister}
              onClose={() => setSelectedDateKey(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
