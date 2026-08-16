"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { TimeGrid, GridColumn, MoveTarget } from "./TimeGrid";
import { MonthGrid, monthGridStart } from "./MonthGrid";
import { AppointmentFormModal, AppointmentSlot } from "./AppointmentFormModal";
import {
  APPOINTMENT_SELECT,
  AppointmentWithDetails,
  mapAppointmentRow,
} from "@/lib/types";
import {
  Branch,
  Customer,
  OpeningHours,
  Service,
  Staff,
  StaffWorkingHours,
} from "@/lib/types/database.types";
import { combineDateAndTime } from "@/lib/utils/date";
import {
  addDaysToKey,
  dayOfWeekForKey,
  formatDateKey,
  formatDateKeyLong,
  formatMonthLabel,
  minutesToTime,
  salonWallClockToIso,
  monthShort,
  timeToMinutes,
  toSalonWallClock,
  todayInSalon,
  weekdayShort,
} from "@/lib/utils/timezone";
import { cn } from "@/lib/utils/cn";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DEFAULT_OPEN_MINUTES = 9 * 60;
const DEFAULT_CLOSE_MINUTES = 21 * 60;

type View = "day" | "week" | "month";

export function CalendarView({
  branch,
  businessId,
  autoOpenNew,
}: {
  branch: Branch | null;
  businessId: string;
  autoOpenNew?: boolean;
}) {
  const supabase = createClient();
  const { show } = useToast();

  const [view, setView] = useState<View>("day");
  const [dateKey, setDateKey] = useState(todayInSalon());
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffServices, setStaffServices] = useState<{ staff_id: string; service_id: string }[]>([]);
  const [workingHours, setWorkingHours] = useState<StaffWorkingHours[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithDetails | undefined>();
  const [slot, setSlot] = useState<AppointmentSlot | undefined>();

  const range = useMemo(() => {
    if (view === "day") return { from: dateKey, to: dateKey };
    if (view === "week") {
      const from = addDaysToKey(dateKey, -dayOfWeekForKey(dateKey));
      return { from, to: addDaysToKey(from, 6) };
    }
    const from = monthGridStart(dateKey);
    return { from, to: addDaysToKey(from, 41) };
  }, [view, dateKey]);

  // Reference data — staff, services, customers — changes rarely, so it loads
  // once and is shared with the appointment form.
  const loadReferenceData = useCallback(async () => {
    if (!branch) return;
    const [{ data: staffRows }, { data: serviceRows }, { data: customerRows }, { data: links }, { data: hours }] =
      await Promise.all([
        supabase
          .from("staff")
          .select("*")
          .eq("employment_status", "active")
          .order("full_name"),
        supabase.from("services").select("*").eq("is_active", true).order("name"),
        supabase.from("customers").select("*").order("full_name"),
        supabase.from("staff_services").select("staff_id, service_id"),
        supabase.from("staff_working_hours").select("*"),
      ]);

    setStaff((staffRows as Staff[]) ?? []);
    setServices((serviceRows as Service[]) ?? []);
    setCustomers((customerRows as Customer[]) ?? []);
    setStaffServices(links ?? []);
    setWorkingHours((hours as StaffWorkingHours[]) ?? []);
  }, [branch, supabase]);

  const loadAppointments = useCallback(async () => {
    if (!branch) return;
    // Only blank the grid on the first load; later refreshes update in place.
    if (!hasLoadedOnce.current) setIsLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("branch_id", branch.id)
      .gte("start_time", salonWallClockToIso(range.from, "00:00"))
      .lt("start_time", salonWallClockToIso(addDaysToKey(range.to, 1), "00:00"))
      .order("start_time");

    if (error) show("Couldn't load the calendar.", "error");
    setAppointments((data ?? []).map(mapAppointmentRow));
    hasLoadedOnce.current = true;
    setIsLoading(false);
  }, [branch, supabase, range.from, range.to, show]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (autoOpenNew) openCreate({ dateKey: todayInSalon(), staffId: null, time: "10:00" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenNew]);

  const visibleAppointments = useMemo(
    () => (staffFilter === "all" ? appointments : appointments.filter((a) => a.staff_id === staffFilter)),
    [appointments, staffFilter]
  );

  const openingHours = (branch?.opening_hours ?? null) as OpeningHours | null;

  function salonHoursFor(key: string): { open: number; close: number } | null {
    const day = openingHours?.[DAY_KEYS[dayOfWeekForKey(key)]];
    if (!day) return null;
    return { open: timeToMinutes(day.open), close: timeToMinutes(day.close) };
  }

  /** Grid bounds: the salon's opening hours, widened to fit every booking shown. */
  const bounds = useMemo(() => {
    const dates =
      view === "day"
        ? [dateKey]
        : Array.from({ length: view === "week" ? 7 : 42 }, (_, i) => addDaysToKey(range.from, i));

    let start = Infinity;
    let end = -Infinity;

    for (const key of dates) {
      const hours = salonHoursFor(key);
      if (hours) {
        start = Math.min(start, hours.open);
        end = Math.max(end, hours.close);
      }
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      start = DEFAULT_OPEN_MINUTES;
      end = DEFAULT_CLOSE_MINUTES;
    }

    for (const appointment of visibleAppointments) {
      const from = toSalonWallClock(appointment.start_time);
      const to = toSalonWallClock(appointment.end_time);
      start = Math.min(start, from.minutes);
      end = Math.max(end, to.date === from.date ? to.minutes : 24 * 60);
    }

    return {
      start: Math.max(0, Math.floor(start / 60) * 60),
      end: Math.min(24 * 60, Math.ceil(end / 60) * 60),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dateKey, range.from, visibleAppointments, openingHours]);

  /** Shading for the hours a column isn't bookable (salon shut / staff off). */
  function closedRanges(key: string, staffId: string | null) {
    const ranges: { start: number; end: number }[] = [];
    const salon = salonHoursFor(key);

    if (!salon) return [{ start: bounds.start, end: bounds.end }];
    if (salon.open > bounds.start) ranges.push({ start: bounds.start, end: salon.open });
    if (salon.close < bounds.end) ranges.push({ start: salon.close, end: bounds.end });

    if (staffId) {
      const shift = workingHours.find(
        (h) => h.staff_id === staffId && h.day_of_week === dayOfWeekForKey(key)
      );
      if (!shift || !shift.is_working || !shift.start_time || !shift.end_time) {
        return [{ start: bounds.start, end: bounds.end }];
      }
      const shiftStart = timeToMinutes(shift.start_time);
      const shiftEnd = timeToMinutes(shift.end_time);
      if (shiftStart > salon.open) ranges.push({ start: Math.max(bounds.start, salon.open), end: shiftStart });
      if (shiftEnd < salon.close) ranges.push({ start: shiftEnd, end: Math.min(bounds.end, salon.close) });
    }

    return ranges;
  }

  const columns: GridColumn[] = useMemo(() => {
    if (view === "day") {
      const members = staffFilter === "all" ? staff : staff.filter((s) => s.id === staffFilter);
      return members.map((member) => ({
        key: member.id,
        label: member.full_name,
        sublabel: member.job_title ?? undefined,
        dateKey,
        staffId: member.id,
        closedRanges: closedRanges(dateKey, member.id),
      }));
    }

    return Array.from({ length: 7 }, (_, i) => {
      const key = addDaysToKey(range.from, i);
      return {
        key,
        label: weekdayShort(key),
        sublabel: `${Number(key.slice(8))} ${monthShort(key)}`,
        dateKey: key,
        staffId: staffFilter === "all" ? null : staffFilter,
        closedRanges: closedRanges(key, staffFilter === "all" ? null : staffFilter),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, staff, staffFilter, dateKey, range.from, bounds.start, bounds.end, workingHours, openingHours]);

  const columnKeyOf = useCallback(
    (appointment: AppointmentWithDetails) =>
      view === "day" ? appointment.staff_id : toSalonWallClock(appointment.start_time).date,
    [view]
  );

  function navigate(delta: number) {
    if (view === "day") return setDateKey((key) => addDaysToKey(key, delta));
    if (view === "week") return setDateKey((key) => addDaysToKey(key, delta * 7));
    setDateKey((key) => {
      const [year, month] = key.split("-").map(Number);
      const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
      return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`;
    });
  }

  function openCreate(nextSlot: AppointmentSlot) {
    setEditing(undefined);
    setSlot({
      ...nextSlot,
      staffId: nextSlot.staffId ?? (staffFilter !== "all" ? staffFilter : staff[0]?.id ?? null),
    });
    setModalOpen(true);
  }

  function openEdit(appointment: AppointmentWithDetails) {
    setSlot(undefined);
    setEditing(appointment);
    setModalOpen(true);
  }

  async function moveAppointment({ appointment, dateKey: newDate, staffId, startMinutes }: MoveTarget) {
    const durationMinutes = Math.round(
      (new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60_000
    );
    const startIso = combineDateAndTime(newDate, minutesToTime(startMinutes));
    const endIso = new Date(new Date(startIso).getTime() + durationMinutes * 60_000).toISOString();

    // Optimistic move, rolled back if the database rejects it.
    const previous = appointments;
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointment.id ? { ...a, staff_id: staffId, start_time: startIso, end_time: endIso } : a
      )
    );

    const { error } = await supabase
      .from("appointments")
      .update({ staff_id: staffId, start_time: startIso, end_time: endIso })
      .eq("id", appointment.id);

    if (error) {
      setAppointments(previous);
      show(
        error.code === "23P01"
          ? "That staff member is already booked at that time."
          : "Couldn't move the appointment.",
        "error"
      );
      return;
    }

    show("Appointment moved");
    loadAppointments();
  }

  const shortRangeLabel =
    view === "day"
      ? formatDateKey(dateKey)
      : view === "week"
        ? `${formatDateKey(range.from)} – ${formatDateKey(range.to)}`
        : formatMonthLabel(dateKey);

  const rangeLabel =
    view === "day"
      ? formatDateKeyLong(dateKey)
      : view === "week"
        ? `${formatDateKey(range.from)} – ${formatDateKey(range.to)}`
        : formatMonthLabel(dateKey);

  if (!branch) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No salon set up yet"
        description="Add your salon details in Settings before using the calendar."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDateKey(todayInSalon())}>
              Today
            </Button>
            <p className="ml-2 hidden min-w-0 truncate text-base font-semibold text-ink lg:block">
              {rangeLabel}
            </p>
          </div>

          <div className="flex shrink-0 rounded-xl border border-border p-0.5">
            {(["day", "week", "month"] as View[]).map((option) => (
              <button
                key={option}
                onClick={() => setView(option)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  view === option ? "bg-brand text-white" : "text-ink-muted hover:text-ink"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink lg:hidden">
            {shortRangeLabel}
          </p>
          <div className="hidden flex-1 lg:block" />

          <div className="flex w-40 items-center gap-1.5">
            <Users className="h-4 w-4 shrink-0 text-ink-muted" />
            <Select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="h-9 text-xs"
              aria-label="Filter by staff"
            >
              <option value="all">All staff</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => openCreate({ dateKey, staffId: null, time: "10:00" })}
            className="h-9 shrink-0"
          >
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-card border border-border bg-surface py-20 text-center text-sm text-ink-muted">
          Loading calendar…
        </div>
      ) : view === "month" ? (
        <MonthGrid
          monthKey={dateKey}
          appointments={visibleAppointments}
          onSelectDay={(key) => {
            setDateKey(key);
            setView("day");
          }}
          onSelectAppointment={openEdit}
        />
      ) : columns.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No active staff yet"
          description="Add a staff member to start booking appointments into the calendar."
        />
      ) : (
        <>
          <TimeGrid
            columns={columns}
            appointments={visibleAppointments}
            columnKeyOf={columnKeyOf}
            startMinutes={bounds.start}
            endMinutes={bounds.end}
            columnMinWidth={view === "day" ? 168 : 132}
            onSelect={openEdit}
            onCreate={openCreate}
            onMove={moveAppointment}
          />
          <p className="mt-2 px-1 text-xs text-ink-muted">
            Tap an empty slot to book · drag a card to reschedule
            {view === "day" ? " or move it to another staff member" : ""}.
          </p>
        </>
      )}

      <AppointmentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadAppointments}
        businessId={businessId}
        branchId={branch.id}
        staff={staff}
        services={services}
        customers={customers}
        staffServices={staffServices}
        onCustomerCreated={(customer) =>
          setCustomers((prev) =>
            [...prev, customer].sort((a, b) => a.full_name.localeCompare(b.full_name))
          )
        }
        appointment={editing}
        slot={slot}
      />
    </div>
  );
}
