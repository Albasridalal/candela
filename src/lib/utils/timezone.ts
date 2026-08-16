/**
 * The salon runs on one wall clock.
 *
 * Appointments are stored as `timestamptz` (a real instant), but everything a
 * salon cares about — opening hours, working hours, "10:30 on Tuesday" — is
 * wall-clock time in the salon's own timezone. Node on a server runs in UTC,
 * a phone runs in the visitor's timezone, so converting with plain
 * `new Date(...)` produces different results depending on where the code runs.
 *
 * These helpers convert between an instant and salon wall-clock time
 * explicitly, so the calendar, the availability engine and the public booking
 * page all agree no matter where they execute.
 *
 * Change the salon's timezone with NEXT_PUBLIC_SALON_TIMEZONE (an IANA name
 * such as "Asia/Kuwait" or "Europe/London").
 */

export const SALON_TIMEZONE = process.env.NEXT_PUBLIC_SALON_TIMEZONE || "Asia/Kuwait";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SALON_TIMEZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface SalonWallClock {
  /** yyyy-MM-dd in the salon's timezone */
  date: string;
  /** HH:mm in the salon's timezone */
  time: string;
  /** Minutes since midnight in the salon's timezone */
  minutes: number;
  /** 0 = Sunday … 6 = Saturday, in the salon's timezone */
  dayOfWeek: number;
}

function readParts(instant: Date) {
  const parts = partsFormatter.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24, // some ICU versions emit "24" at midnight
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** Offset of the salon timezone from UTC, in milliseconds, at a given instant. */
function offsetMs(instant: Date): number {
  const p = readParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - instant.getTime();
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Break an instant (ISO string or Date) into salon wall-clock pieces. */
export function toSalonWallClock(instant: string | Date): SalonWallClock {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const p = readParts(date);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
    minutes: p.hour * 60 + p.minute,
    dayOfWeek: p.weekday,
  };
}

/**
 * Turn a salon wall-clock date + time ("2026-03-14", "14:30") into the exact
 * instant it refers to. Two passes so it stays correct across a DST change.
 */
export function salonWallClockToDate(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour || 0, minute || 0);

  let instant = new Date(naive - offsetMs(new Date(naive)));
  instant = new Date(naive - offsetMs(instant));
  return instant;
}

/** Same as salonWallClockToDate, returned as an ISO string ready for Postgres. */
export function salonWallClockToIso(dateStr: string, timeStr: string): string {
  return salonWallClockToDate(dateStr, timeStr).toISOString();
}

/** Today's date (yyyy-MM-dd) in the salon's timezone. */
export function todayInSalon(): string {
  return toSalonWallClock(new Date()).date;
}

/** Current minutes-since-midnight in the salon's timezone. */
export function nowMinutesInSalon(): number {
  return toSalonWallClock(new Date()).minutes;
}

/** "09:05" -> 545 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 545 -> "09:05" */
export function minutesToTime(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

/** "14:30" -> "2:30 PM" */
export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m || 0)} ${suffix}`;
}

/** Salon-local clock time of an instant, e.g. "2:30 PM". */
export function formatInstantTime(instant: string | Date): string {
  return formatTimeLabel(toSalonWallClock(instant).time);
}

/** yyyy-MM-dd for a Date, read in the salon's timezone. */
export function salonDateKey(date: Date): string {
  return toSalonWallClock(date).date;
}

/** Parse a yyyy-MM-dd key into a Date positioned at salon midnight. */
export function salonDateKeyToDate(dateKey: string): Date {
  return salonWallClockToDate(dateKey, "00:00");
}

/** Add whole days to a yyyy-MM-dd key without crossing timezone wires. */
export function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday for a yyyy-MM-dd key. */
export function dayOfWeekForKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// Date labels are written out by hand rather than through Intl: Node and the
// browser ship different ICU builds, and the small punctuation differences
// between them ("Sun 16 Aug" vs "Sun, 16 Aug") break React hydration.
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-03-14" -> "Sat, 14 Mar" */
export function formatDateKey(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${WEEKDAYS_SHORT[dayOfWeekForKey(dateKey)]}, ${day} ${MONTHS_SHORT[month - 1]}`;
}

/** "2026-03-14" -> "Saturday, 14 March" */
export function formatDateKeyLong(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${WEEKDAYS_LONG[dayOfWeekForKey(dateKey)]}, ${day} ${MONTHS_LONG[month - 1]}`;
}

/** "2026-03-14" -> "March 2026" */
export function formatMonthLabel(dateKey: string): string {
  const [year, month] = dateKey.split("-").map(Number);
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

/** Short weekday name for a yyyy-MM-dd key, e.g. "Sat". */
export function weekdayShort(dateKey: string): string {
  return WEEKDAYS_SHORT[dayOfWeekForKey(dateKey)];
}

/** Short month name for a yyyy-MM-dd key, e.g. "Mar". */
export function monthShort(dateKey: string): string {
  return MONTHS_SHORT[Number(dateKey.slice(5, 7)) - 1];
}
