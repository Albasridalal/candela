import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Priority, RequestRecord, Status } from "./types";

/**
 * Every derived value in the portal (days pending, overdue, due soon) is
 * computed here rather than in the database, so the Supabase-backed and the
 * demo data sources can never drift apart.
 */

/** A deadline this many days out (or fewer) is flagged amber. */
export const DUE_SOON_DAYS = 2;

export type Flag = "overdue" | "due-soon" | "ok";

/** Today as `YYYY-MM-DD` in the server's local timezone. */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Parses a `YYYY-MM-DD` column into a local-midnight Date (no UTC shifting). */
function toDate(iso: string): Date {
  return parseISO(iso.slice(0, 10));
}

export function isOpen(request: Pick<RequestRecord, "status">): boolean {
  return request.status !== "Delivered";
}

/**
 * Days the request has been waiting: today − date_submitted, counted only
 * while the request is still open. Delivered requests return null — use
 * {@link turnaroundDays} for those.
 */
export function daysPending(
  request: Pick<RequestRecord, "status" | "date_submitted">,
  today: string = todayISO(),
): number | null {
  if (!isOpen(request)) return null;
  return Math.max(0, differenceInCalendarDays(toDate(today), toDate(request.date_submitted)));
}

/** How long a delivered request actually took, submitted → delivered. */
export function turnaroundDays(
  request: Pick<RequestRecord, "status" | "date_submitted" | "delivered_at">,
): number | null {
  if (request.status !== "Delivered" || !request.delivered_at) return null;
  return Math.max(
    0,
    differenceInCalendarDays(toDate(request.delivered_at), toDate(request.date_submitted)),
  );
}

/** Negative = the deadline has passed. Null when no deadline is set. */
export function daysToDeadline(
  request: Pick<RequestRecord, "deadline">,
  today: string = todayISO(),
): number | null {
  if (!request.deadline) return null;
  return differenceInCalendarDays(toDate(request.deadline), toDate(today));
}

/**
 * Overdue = deadline passed AND not yet delivered.
 * Due soon = deadline falls within the next {@link DUE_SOON_DAYS} days.
 */
export function flagOf(
  request: Pick<RequestRecord, "status" | "deadline">,
  today: string = todayISO(),
): Flag {
  if (!isOpen(request)) return "ok";
  const remaining = daysToDeadline(request, today);
  if (remaining === null) return "ok";
  if (remaining < 0) return "overdue";
  if (remaining <= DUE_SOON_DAYS) return "due-soon";
  return "ok";
}

export function isOverdue(
  request: Pick<RequestRecord, "status" | "deadline">,
  today?: string,
): boolean {
  return flagOf(request, today) === "overdue";
}

export function isDueSoon(
  request: Pick<RequestRecord, "status" | "deadline">,
  today?: string,
): boolean {
  return flagOf(request, today) === "due-soon";
}

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
const STATUS_RANK: Record<Status, number> = { New: 0, "In Progress": 1, Delivered: 2 };

export function priorityRank(priority: Priority): number {
  return PRIORITY_RANK[priority];
}

export function statusRank(status: Status): number {
  return STATUS_RANK[status];
}

/** True when `delivered_at` falls inside the last 7 days. */
export function deliveredThisWeek(
  request: Pick<RequestRecord, "status" | "delivered_at">,
  today: string = todayISO(),
): boolean {
  if (request.status !== "Delivered" || !request.delivered_at) return false;
  const age = differenceInCalendarDays(toDate(today), toDate(request.delivered_at));
  return age >= 0 && age < 7;
}

/** "in 3 days" / "today" / "4 days overdue" — used next to every deadline. */
export function describeDeadline(
  request: Pick<RequestRecord, "status" | "deadline">,
  today?: string,
): string | null {
  const remaining = daysToDeadline(request, today);
  if (remaining === null) return null;
  if (!isOpen(request)) return null;
  if (remaining < 0) {
    const late = Math.abs(remaining);
    return `${late} ${late === 1 ? "day" : "days"} overdue`;
  }
  if (remaining === 0) return "due today";
  if (remaining === 1) return "due tomorrow";
  return `in ${remaining} days`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(toDate(iso), "d MMM yyyy");
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMM yyyy, HH:mm");
}
