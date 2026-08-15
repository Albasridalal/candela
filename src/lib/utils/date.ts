import { addMinutes, format, parseISO } from "date-fns";

// Kuwait doesn't observe daylight saving, so this offset is constant year-round.
const BUSINESS_UTC_OFFSET = "+03:00";
const BUSINESS_TIMEZONE = "Asia/Kuwait";

/**
 * Re-expresses an absolute instant as a plain Date whose local getters
 * (getHours, getDate, ...) match Kuwait's wall clock — so date-fns'
 * `format`, which always reads the local getters, shows Kuwait time
 * even when this runs on a server whose own clock is UTC.
 */
function toBusinessLocalDate(iso: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parseISO(iso));
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return new Date(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
}

export function formatTime(iso: string): string {
  return format(toBusinessLocalDate(iso), "h:mm a");
}

export function formatDateLabel(iso: string): string {
  return format(toBusinessLocalDate(iso), "EEE, MMM d");
}

export function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Appointment end time is always derived from service duration, never typed. */
export function computeEndTime(startIso: string, durationMinutes: number): string {
  return addMinutes(parseISO(startIso), durationMinutes).toISOString();
}

/** dateStr/timeStr are always Kuwait wall-clock values (booking form, public /book). */
export function combineDateAndTime(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00${BUSINESS_UTC_OFFSET}`).toISOString();
}

/** True if [aStart,aEnd) overlaps [bStart,bEnd) — used for the same-employee overlap guard. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
