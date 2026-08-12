"use client";

import { useMemo, useState } from "react";
import { bg, bdr, muted } from "@/lib/constants/colors";
import { CalendarHeader } from "@/features/academy/components/CalendarHeader";
import { CalendarGrid } from "@/features/academy/components/CalendarGrid";
import { DayWorkshopPanel, type RegisterResult } from "@/features/academy/components/DayWorkshopPanel";
import { groupWorkshopsByDate, shiftMonth, toDateKey } from "@/features/academy/lib/calendarDate";
import type { Workshop } from "@/features/academy/types/academy.types";

interface WorkshopCalendarProps {
  workshops: Workshop[];
  registeredIds: Set<string>;
  onRegister: (workshopId: string) => Promise<RegisterResult>;
  onUnregister: (workshopId: string) => Promise<RegisterResult>;
  /** Seeds the initial month/selection — used when the year view hands off a clicked day. */
  initialMonth?: Date;
  initialSelectedDateKey?: string | null;
}

export function WorkshopCalendar({ workshops, registeredIds, onRegister, onUnregister, initialMonth, initialSelectedDateKey }: WorkshopCalendarProps) {
  const [month, setMonth] = useState<Date>(() => {
    if (initialMonth) return initialMonth;
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(initialSelectedDateKey ?? null);

  const workshopsByDate = useMemo(() => groupWorkshopsByDate(workshops), [workshops]);

  const selectedWorkshops = selectedDateKey ? (workshopsByDate.get(selectedDateKey) ?? []) : [];

  const selectedDateLabel = selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    : "";

  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: 24, maxWidth: 460 }}>
      <CalendarHeader
        month={month}
        onPrev={() => { setMonth(m => shiftMonth(m, -1)); setSelectedDateKey(null); }}
        onNext={() => { setMonth(m => shiftMonth(m, 1)); setSelectedDateKey(null); }}
        onToday={() => {
          const now = new Date();
          setMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
          setSelectedDateKey(toDateKey(now));
        }}
      />
      <CalendarGrid
        month={month}
        workshops={workshops}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
      />
      {workshopsByDate.size === 0 && (
        <p style={{ fontSize: 12, color: muted, textAlign: "center", marginTop: 16, marginBottom: 0 }}>
          No upcoming workshops with a scheduled time yet.
        </p>
      )}
      {selectedDateKey && selectedWorkshops.length > 0 && (
        <DayWorkshopPanel
          dateLabel={selectedDateLabel}
          workshops={selectedWorkshops}
          registeredIds={registeredIds}
          onRegister={onRegister}
          onUnregister={onUnregister}
          onClose={() => setSelectedDateKey(null)}
        />
      )}
    </div>
  );
}
