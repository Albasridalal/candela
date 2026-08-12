import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

const SLOT_STEP_MINUTES = 15;
const MIN_LEAD_MINUTES = 30; // don't offer a slot starting less than 30 min from now

interface OpeningHoursDay {
  open: string;
  close: string;
}
type OpeningHours = Record<string, OpeningHoursDay | undefined>;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Returns available "HH:mm" start times for one staff member, one service,
 * on one date — intersecting branch opening hours, that staff's working
 * hours for the weekday, their time off, and their existing appointments.
 */
export async function getStaffAvailableSlots(params: {
  branchId: string;
  staffId: string;
  serviceDurationMinutes: number;
  date: string; // yyyy-MM-dd
}): Promise<string[]> {
  const { branchId, staffId, serviceDurationMinutes, date } = params;
  const supabase = createServiceRoleClient();

  const dayIndex = new Date(`${date}T00:00:00`).getDay(); // 0 = Sunday
  const dayKey = DAY_KEYS[dayIndex];

  const [{ data: branch }, { data: workingHours }, { data: timeOff }, { data: appointments }] =
    await Promise.all([
      supabase.from("branches").select("opening_hours").eq("id", branchId).single(),
      supabase
        .from("staff_working_hours")
        .select("*")
        .eq("staff_id", staffId)
        .eq("day_of_week", dayIndex)
        .maybeSingle(),
      supabase
        .from("staff_time_off")
        .select("*")
        .eq("staff_id", staffId)
        .lte("start_date", date)
        .gte("end_date", date),
      supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("staff_id", staffId)
        .neq("status", "cancelled")
        .gte("start_time", `${date}T00:00:00`)
        .lte("start_time", `${date}T23:59:59`),
    ]);

  if (timeOff && timeOff.length > 0) return []; // on leave that day

  if (!workingHours || !workingHours.is_working || !workingHours.start_time || !workingHours.end_time) {
    return []; // not scheduled to work that day
  }

  const openingHours = (branch?.opening_hours as OpeningHours | null) ?? null;
  const branchDay = openingHours?.[dayKey];
  if (!branchDay) return []; // branch closed that day

  const rangeStart = Math.max(toMinutes(workingHours.start_time), toMinutes(branchDay.open));
  const rangeEnd = Math.min(toMinutes(workingHours.end_time), toMinutes(branchDay.close));
  if (rangeEnd - rangeStart < serviceDurationMinutes) return [];

  const busyRanges = (appointments ?? []).map((a) => ({
    start: new Date(a.start_time).getHours() * 60 + new Date(a.start_time).getMinutes(),
    end: new Date(a.end_time).getHours() * 60 + new Date(a.end_time).getMinutes(),
  }));

  const now = new Date();
  const isToday = date === now.toISOString().slice(0, 10);
  const earliestToday = isToday ? now.getHours() * 60 + now.getMinutes() + MIN_LEAD_MINUTES : 0;

  const slots: string[] = [];
  for (
    let candidate = rangeStart;
    candidate + serviceDurationMinutes <= rangeEnd;
    candidate += SLOT_STEP_MINUTES
  ) {
    if (isToday && candidate < earliestToday) continue;
    const candidateEnd = candidate + serviceDurationMinutes;
    const overlaps = busyRanges.some((b) => candidate < b.end && b.start < candidateEnd);
    if (!overlaps) slots.push(toHHMM(candidate));
  }

  return slots;
}

/**
 * "Any available staff" mode: unions availability across every staff member
 * eligible for the service, returning each time paired with one staff id
 * who can actually take it (re-validated again at booking time).
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
