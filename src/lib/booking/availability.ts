import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { OpeningHours } from "@/lib/types/database.types";
import {
  dayOfWeekForKey,
  minutesToTime,
  nowMinutesInSalon,
  salonWallClockToIso,
  timeToMinutes,
  toSalonWallClock,
  todayInSalon,
} from "@/lib/utils/timezone";

const SLOT_STEP_MINUTES = 15;
const MIN_LEAD_MINUTES = 30; // don't offer a slot starting less than 30 min from now

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface Interval {
  start: number;
  end: number;
}

/**
 * Returns available "HH:mm" start times for one staff member, one service, on
 * one date — the intersection of salon opening hours, that staff member's
 * working hours for the weekday, their time off, and their existing bookings.
 *
 * All arithmetic happens in salon wall-clock minutes so the result is the same
 * whether this runs on a server in UTC or a laptop in another timezone.
 */
export async function getStaffAvailableSlots(params: {
  branchId: string;
  staffId: string;
  serviceDurationMinutes: number;
  date: string; // yyyy-MM-dd
}): Promise<string[]> {
  const { branchId, staffId, serviceDurationMinutes, date } = params;
  const supabase = createServiceRoleClient();

  if (!date || serviceDurationMinutes <= 0) return [];

  const dayIndex = dayOfWeekForKey(date);
  const dayKey = DAY_KEYS[dayIndex];

  // The appointment window is queried by instant, so widen it by a day on each
  // side and filter on the salon's calendar date afterwards.
  const windowStart = salonWallClockToIso(date, "00:00");
  const windowEnd = salonWallClockToIso(date, "00:00");

  const [{ data: branch }, { data: workingHours }, { data: timeOff }, { data: appointments }] =
    await Promise.all([
      supabase.from("branches").select("opening_hours").eq("id", branchId).maybeSingle(),
      supabase
        .from("staff_working_hours")
        .select("*")
        .eq("staff_id", staffId)
        .eq("day_of_week", dayIndex)
        .maybeSingle(),
      supabase
        .from("staff_time_off")
        .select("id")
        .eq("staff_id", staffId)
        .lte("start_date", date)
        .gte("end_date", date),
      supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("staff_id", staffId)
        .neq("status", "cancelled")
        .gte("start_time", new Date(new Date(windowStart).getTime() - 24 * 3600_000).toISOString())
        .lte("start_time", new Date(new Date(windowEnd).getTime() + 48 * 3600_000).toISOString()),
    ]);

  if (timeOff && timeOff.length > 0) return []; // on leave that day

  if (
    !workingHours ||
    !workingHours.is_working ||
    !workingHours.start_time ||
    !workingHours.end_time
  ) {
    return []; // not scheduled to work that day
  }

  const openingHours = (branch?.opening_hours as OpeningHours | null) ?? null;
  const salonDay = openingHours?.[dayKey];
  if (!salonDay) return []; // salon closed that day

  const rangeStart = Math.max(timeToMinutes(workingHours.start_time), timeToMinutes(salonDay.open));
  const rangeEnd = Math.min(timeToMinutes(workingHours.end_time), timeToMinutes(salonDay.close));
  if (rangeEnd - rangeStart < serviceDurationMinutes) return [];

  const busy: Interval[] = [];
  for (const appointment of appointments ?? []) {
    const start = toSalonWallClock(appointment.start_time);
    const end = toSalonWallClock(appointment.end_time);
    if (start.date !== date && end.date !== date) continue;
    busy.push({
      start: start.date === date ? start.minutes : 0,
      end: end.date === date ? end.minutes : 24 * 60,
    });
  }

  const isToday = date === todayInSalon();
  const earliest = isToday ? nowMinutesInSalon() + MIN_LEAD_MINUTES : 0;

  const slots: string[] = [];
  for (
    let candidate = rangeStart;
    candidate + serviceDurationMinutes <= rangeEnd;
    candidate += SLOT_STEP_MINUTES
  ) {
    if (candidate < earliest) continue;
    const candidateEnd = candidate + serviceDurationMinutes;
    const overlaps = busy.some((b) => candidate < b.end && b.start < candidateEnd);
    if (!overlaps) slots.push(minutesToTime(candidate));
  }

  return slots;
}

/**
 * "Any available staff" mode: unions availability across every staff member
 * eligible for the service, returning each time paired with one staff id who
 * can actually take it (re-validated again at booking time).
 */
export async function getAnyStaffAvailableSlots(params: {
  branchId: string;
  eligibleStaffIds: string[];
  serviceDurationMinutes: number;
  date: string;
}): Promise<{ time: string; staffId: string }[]> {
  const { branchId, eligibleStaffIds, serviceDurationMinutes, date } = params;

  const perStaff = await Promise.all(
    eligibleStaffIds.map(async (staffId) => ({
      staffId,
      slots: await getStaffAvailableSlots({ branchId, staffId, serviceDurationMinutes, date }),
    }))
  );

  const byTime = new Map<string, string>();
  for (const { staffId, slots } of perStaff) {
    for (const time of slots) {
      if (!byTime.has(time)) byTime.set(time, staffId);
    }
  }

  return Array.from(byTime.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, staffId]) => ({ time, staffId }));
}
