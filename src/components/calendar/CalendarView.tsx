"use client";

import { useCallback, useEffect, useState } from "react";
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBranch } from "@/components/shared/BranchProvider";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentFormModal } from "./AppointmentFormModal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { AppointmentWithDetails } from "@/lib/types";
import { Branch, Staff } from "@/lib/types/database.types";
import { formatDateInput, formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 21;
const HOUR_HEIGHT = 64; // px per hour in day view
const HEADER_HEIGHT = 40; // h-10 header row above the hour grid

export function CalendarView({
  branches,
  autoOpenNew,
}: {
  branches: Branch[];
  autoOpenNew: boolean;
}) {
  const supabase = createClient();
  const { selectedBranch } = useBranch();

  const [view, setView] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(autoOpenNew);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const rangeStart = view === "day" ? currentDate : startOfWeek(currentDate);
  const rangeEnd = view === "day" ? currentDate : addDays(rangeStart, 6);

  const loadData = useCallback(async () => {
    if (!selectedBranch) return;
    setIsLoading(true);

    const { data: staffRows } = await supabase
      .from("staff")
      .select("*")
      .eq("branch_id", selectedBranch.id)
      .eq("employment_status", "active")
      .order("full_name");
    setStaff((staffRows as Staff[]) ?? []);

    const from = formatDateInput(rangeStart) + "T00:00:00";
    const to = formatDateInput(rangeEnd) + "T23:59:59";

    const { data } = await supabase
      .from("appointments")
      .select(
        `id, business_id, branch_id, customer_id, staff_id, start_time, end_time, status, notes, source, booking_reference, created_at, updated_at,
         customers ( full_name ),
         staff ( full_name ),
         appointment_services ( service_id, price, duration_minutes, services ( name ) )`
      )
      .eq("branch_id", selectedBranch.id)
      .gte("start_time", from)
      .lte("start_time", to)
      .order("start_time");

    type Row = {
      id: string;
      business_id: string;
      branch_id: string;
      customer_id: string;
      staff_id: string;
      start_time: string;
      end_time: string;
      status: AppointmentWithDetails["status"];
      notes: string | null;
      source: AppointmentWithDetails["source"];
      booking_reference: string | null;
      created_at: string;
      updated_at: string;
      customers: { full_name: string } | null;
      staff: { full_name: string } | null;
      appointment_services: {
        service_id: string;
        price: number;
        duration_minutes: number;
        services: { name: string } | null;
      }[];
    };

    const mapped: AppointmentWithDetails[] = ((data as unknown as Row[]) ?? []).map((row) => {
      const svc = row.appointment_services?.[0];
      return {
        id: row.id,
        business_id: row.business_id,
        branch_id: row.branch_id,
        customer_id: row.customer_id,
        staff_id: row.staff_id,
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status,
        notes: row.notes,
        source: row.source,
        booking_reference: row.booking_reference,
        created_at: row.created_at,
        updated_at: row.updated_at,
        customer_name: row.customers?.full_name ?? "Unknown",
        staff_name: row.staff?.full_name ?? "Unassigned",
        service_name: svc?.services?.name ?? "Service",
        service_price: svc?.price ?? 0,
        service_duration_minutes: svc?.duration_minutes ?? 30,
      };
    });

    setAppointments(mapped);
    setIsLoading(false);
  }, [selectedBranch, rangeStart, rangeEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
  }, [loadData]);

  function navigate(delta: number) {
    setCurrentDate((d) => addDays(d, view === "day" ? delta : delta * 7));
  }

  function openNew() {
    setEditingId(undefined);
    setFormOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setFormOpen(true);
  }

  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

  const showNowLine = view === "day" && isSameDay(currentDate, now);
  const gridHeight = hours.length * HOUR_HEIGHT;
  const minutesFromDayStart = (now.getHours() - DAY_START_HOUR) * 60 + now.getMinutes();
  const nowOffset = Math.min(Math.max((minutesFromDayStart / 60) * HOUR_HEIGHT, 0), gridHeight);
  const nowTop = HEADER_HEIGHT + nowOffset;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[9rem] text-center text-sm font-medium text-ink">
            {view === "day"
              ? format(currentDate, "EEE, MMM d yyyy")
              : `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border p-0.5">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize",
                  view === v ? "bg-brand text-white" : "text-ink-muted"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openNew} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> Add Appointment
          </Button>
        </div>
      </div>

      <Button size="sm" onClick={openNew} className="mb-4 w-full sm:hidden">
        <Plus className="h-4 w-4" /> Add Appointment
      </Button>

      {!selectedBranch ? (
        <EmptyState icon={CalendarDays} title="No branch selected" description="Create a branch first." />
      ) : isLoading ? (
        <div className="py-16 text-center text-sm text-ink-muted">Loading calendar…</div>
      ) : view === "day" ? (
        staff.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No active staff at this branch" />
        ) : (
          <div className="overflow-x-auto no-scrollbar rounded-card border border-border bg-surface">
            <div className="relative flex" style={{ minWidth: `${64 + staff.length * 160}px` }}>
              {/* Time gutter */}
              <div className="w-16 shrink-0 border-r border-border">
                <div className="h-10 border-b border-border" />
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b border-border px-1.5 pt-1 text-right text-[10px] text-ink-muted"
                  >
                    {format(new Date(2000, 0, 1, h), "h a")}
                  </div>
                ))}
              </div>

              {staff.map((member) => {
                const memberAppointments = appointments.filter(
                  (a) => a.staff_id === member.id && isSameDay(parseISO(a.start_time), currentDate)
                );
                return (
                  <div key={member.id} className="w-40 shrink-0 border-r border-border last:border-r-0">
                    <div className="flex h-10 items-center justify-center border-b border-border px-2">
                      <p className="truncate text-xs font-medium text-ink">{member.full_name}</p>
                    </div>
                    <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
                      {hours.map((h) => (
                        <div
                          key={h}
                          className="absolute inset-x-0 border-b border-border/60"
                          style={{ top: (h - DAY_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        />
                      ))}
                      {memberAppointments.map((appt) => {
                        const start = parseISO(appt.start_time);
                        const minutesFromStart =
                          (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes();
                        const top = (minutesFromStart / 60) * HOUR_HEIGHT;
                        const durationMin =
                          (parseISO(appt.end_time).getTime() - start.getTime()) / 60000;
                        const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 32);
                        return (
                          <AppointmentCard
                            key={appt.id}
                            appointment={appt}
                            compact
                            style={{ top, height }}
                            onClick={() => openEdit(appt.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {showNowLine && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 h-px bg-red-500"
                  style={{ top: nowTop, transform: "translateY(-50%)" }}
                />
              )}
            </div>
          </div>
        )
      ) : (
        <WeekList
          rangeStart={rangeStart}
          appointments={appointments}
          onSelect={openEdit}
        />
      )}

      <AppointmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
        branches={branches}
        defaultBranchId={selectedBranch?.id}
        defaultDate={formatDateInput(currentDate)}
        appointmentId={editingId}
      />
    </div>
  );
}

function WeekList({
  rangeStart,
  appointments,
  onSelect,
}: {
  rangeStart: Date;
  appointments: AppointmentWithDetails[];
  onSelect: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => {
        const dayAppointments = appointments
          .filter((a) => isSameDay(parseISO(a.start_time), day))
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        return (
          <div key={day.toISOString()} className="rounded-card border border-border bg-surface p-3">
            <p className="mb-2 text-sm font-semibold text-ink">{format(day, "EEE, MMM d")}</p>
            {dayAppointments.length === 0 ? (
              <p className="text-xs text-ink-muted">No appointments</p>
            ) : (
              <div className="space-y-2">
                {dayAppointments.map((appt) => (
                  <button
                    key={appt.id}
                    onClick={() => onSelect(appt.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border px-2.5 py-2 text-left hover:bg-surface-subtle"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">{appt.customer_name}</p>
                      <p className="truncate text-[11px] text-ink-muted">
                        {appt.service_name} · {appt.staff_name}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-ink-muted">
                      {formatTime(appt.start_time)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
