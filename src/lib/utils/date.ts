import {
  formatDateKey,
  formatInstantTime,
  salonDateKey,
  salonWallClockToIso,
  toSalonWallClock,
} from "./timezone";

/** Clock time of an appointment, in the salon's timezone: "2:30 PM". */
export function formatTime(iso: string): string {
  return formatInstantTime(iso);
}

/**
 * "Sat, 14 Mar" — accepts either a full timestamp or a plain yyyy-MM-dd date
 * (birthdays, time-off ranges), which must not be shifted by a timezone.
 */
export function formatDateLabel(value: string): string {
  const dateKey = value.length <= 10 ? value : toSalonWallClock(value).date;
  return formatDateKey(dateKey);
}

/** yyyy-MM-dd for a JS Date, read on the salon's clock. */
export function formatDateInput(date: Date): string {
  return salonDateKey(date);
}

/** Appointment end time is always derived from service duration, never typed. */
export function computeEndTime(startIso: string, durationMinutes: number): string {
  return new Date(new Date(startIso).getTime() + durationMinutes * 60_000).toISOString();
}

/** Salon wall-clock date + time ("2026-03-14", "14:30") -> exact instant. */
export function combineDateAndTime(dateStr: string, timeStr: string): string {
  return salonWallClockToIso(dateStr, timeStr);
}

/** True if [aStart,aEnd) overlaps [bStart,bEnd) — used for the double-booking guard. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/** Minutes between two instants. */
export function durationMinutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}
