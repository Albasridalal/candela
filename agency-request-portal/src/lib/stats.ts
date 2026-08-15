import {
  daysPending,
  deliveredThisWeek,
  flagOf,
  isOpen,
  todayISO,
  turnaroundDays,
} from "./logic";
import type { RequestRecord } from "./types";

export type PortalStats = {
  open: number;
  newCount: number;
  inProgress: number;
  overdue: number;
  dueSoon: number;
  deliveredThisWeek: number;
  unassigned: number;
  /** Mean days pending across open requests, rounded to one decimal. */
  averageDaysPending: number | null;
  /** Mean submitted → delivered days across all delivered requests. */
  averageTurnaround: number | null;
};

export type DesignerLoad = {
  id: string;
  name: string;
  /** Assigned and not yet delivered. */
  pending: number;
  overdue: number;
  dueSoon: number;
  deliveredThisWeek: number;
  /** Longest wait among that designer's open requests. */
  oldestDaysPending: number;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

export function computeStats(
  requests: RequestRecord[],
  today: string = todayISO(),
): PortalStats {
  const open = requests.filter(isOpen);

  return {
    open: open.length,
    newCount: requests.filter((r) => r.status === "New").length,
    inProgress: requests.filter((r) => r.status === "In Progress").length,
    overdue: requests.filter((r) => flagOf(r, today) === "overdue").length,
    dueSoon: requests.filter((r) => flagOf(r, today) === "due-soon").length,
    deliveredThisWeek: requests.filter((r) => deliveredThisWeek(r, today)).length,
    unassigned: open.filter((r) => !r.designer).length,
    averageDaysPending: average(
      open.map((r) => daysPending(r, today)).filter((n): n is number => n !== null),
    ),
    averageTurnaround: average(
      requests.map((r) => turnaroundDays(r)).filter((n): n is number => n !== null),
    ),
  };
}

const UNASSIGNED_ID = "unassigned";

/**
 * Pending and overdue counts per designer, busiest first. Unassigned open work
 * is surfaced as its own row rather than hidden — it is the account manager's
 * queue to clear.
 */
export function computeDesignerLoad(
  requests: RequestRecord[],
  today: string = todayISO(),
): DesignerLoad[] {
  const byDesigner = new Map<string, DesignerLoad>();

  const bucket = (id: string, name: string): DesignerLoad => {
    const existing = byDesigner.get(id);
    if (existing) return existing;
    const created: DesignerLoad = {
      id,
      name,
      pending: 0,
      overdue: 0,
      dueSoon: 0,
      deliveredThisWeek: 0,
      oldestDaysPending: 0,
    };
    byDesigner.set(id, created);
    return created;
  };

  for (const request of requests) {
    const id = request.designer?.id ?? UNASSIGNED_ID;
    const name = request.designer?.name ?? "Unassigned";
    const row = bucket(id, name);

    if (isOpen(request)) {
      row.pending += 1;
      const flag = flagOf(request, today);
      if (flag === "overdue") row.overdue += 1;
      if (flag === "due-soon") row.dueSoon += 1;
      row.oldestDaysPending = Math.max(row.oldestDaysPending, daysPending(request, today) ?? 0);
    }
    if (deliveredThisWeek(request, today)) row.deliveredThisWeek += 1;
  }

  return [...byDesigner.values()]
    .filter((row) => row.pending > 0 || row.deliveredThisWeek > 0)
    .sort((a, b) => b.overdue - a.overdue || b.pending - a.pending || a.name.localeCompare(b.name));
}

/** Everything the alerts badge needs: overdue first, then due soon. */
export function alertRequests(
  requests: RequestRecord[],
  today: string = todayISO(),
): { overdue: RequestRecord[]; dueSoon: RequestRecord[]; total: number } {
  const overdue = requests.filter((r) => flagOf(r, today) === "overdue");
  const dueSoon = requests.filter((r) => flagOf(r, today) === "due-soon");
  const byDeadline = (a: RequestRecord, b: RequestRecord) =>
    (a.deadline ?? "").localeCompare(b.deadline ?? "");
  return {
    overdue: [...overdue].sort(byDeadline),
    dueSoon: [...dueSoon].sort(byDeadline),
    total: overdue.length + dueSoon.length,
  };
}
