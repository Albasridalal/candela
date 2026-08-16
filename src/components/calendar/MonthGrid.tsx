"use client";

import { AppointmentWithDetails } from "@/lib/types";
import { appointmentStatusConfig } from "@/lib/utils/status";
import { addDaysToKey, formatTimeLabel, toSalonWallClock, todayInSalon } from "@/lib/utils/timezone";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The Sunday on or before the first of the month that `dateKey` falls in. */
export function monthGridStart(dateKey: string): string {
  const [year, month] = dateKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  return addDaysToKey(
    `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-01`,
    -first.getUTCDay()
  );
}

export function MonthGrid({
  monthKey,
  appointments,
  onSelectDay,
  onSelectAppointment,
}: {
  /** Any date inside the month being displayed */
  monthKey: string;
  appointments: AppointmentWithDetails[];
  onSelectDay: (dateKey: string) => void;
  onSelectAppointment: (appointment: AppointmentWithDetails) => void;
}) {
  const today = todayInSalon();
  const currentMonth = monthKey.slice(0, 7);
  const start = monthGridStart(monthKey);
  const days = Array.from({ length: 42 }, (_, i) => addDaysToKey(start, i));

  const byDay = new Map<string, AppointmentWithDetails[]>();
  for (const appointment of appointments) {
    const key = toSalonWallClock(appointment.start_time).date;
    const list = byDay.get(key) ?? [];
    list.push(appointment);
    byDay.set(key, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="grid grid-cols-7 border-b border-border bg-surface-subtle">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold text-ink-muted">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((dateKey) => {
          const dayAppointments = byDay.get(dateKey) ?? [];
          const inMonth = dateKey.slice(0, 7) === currentMonth;
          const isToday = dateKey === today;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDay(dateKey)}
              className={cn(
                "flex min-h-[92px] flex-col gap-1 border-b border-r border-border p-1.5 text-left align-top last:border-r-0 hover:bg-surface-subtle sm:min-h-[116px]",
                !inMonth && "bg-surface-subtle/60"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday ? "bg-brand text-white" : inMonth ? "text-ink" : "text-ink-muted/60"
                )}
              >
                {Number(dateKey.slice(8))}
              </span>

              <div className="flex flex-col gap-0.5">
                {dayAppointments.slice(0, 3).map((appointment) => (
                  <span
                    key={appointment.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAppointment(appointment);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.stopPropagation();
                        onSelectAppointment(appointment);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1 truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight",
                      appointmentStatusConfig[appointment.status].card,
                      appointment.status === "cancelled" && "line-through opacity-60"
                    )}
                  >
                    <span className="shrink-0 font-medium text-ink">
                      {formatTimeLabel(toSalonWallClock(appointment.start_time).time)}
                    </span>
                    <span className="truncate text-ink-muted">{appointment.customer_name}</span>
                  </span>
                ))}
                {dayAppointments.length > 3 && (
                  <span className="px-1 text-[10px] font-medium text-brand-600">
                    +{dayAppointments.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
