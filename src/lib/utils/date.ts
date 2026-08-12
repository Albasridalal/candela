import { addMinutes, format, parseISO } from "date-fns";

export function formatTime(iso: string): string {
  return format(parseISO(iso), "h:mm a");
}

export function formatDateLabel(iso: string): string {
  return format(parseISO(iso), "EEE, MMM d");
}

export function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Appointment end time is always derived from service duration, never typed. */
export function computeEndTime(startIso: string, durationMinutes: number): string {
  return addMinutes(parseISO(startIso), durationMinutes).toISOString();
}

export function combineDateAndTime(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
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
